import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { getSql } from '@/lib/sql';

type AccountMode = 'customer' | 'trader';
type PaidTier = 'core' | 'basic' | 'featured';

type EmailContent = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let readyPromise: Promise<void> | null = null;

function appUrl() {
  return (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || '';
}

function greeting(name?: string | null) {
  const first = firstName(name);
  return first ? `Hi ${first},` : 'Hi,';
}

function money(amount: number, currency = 'gbp') {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
  } catch {
    return `£${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(unixSeconds?: number | null) {
  if (!unixSeconds) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(unixSeconds * 1000));
}

export function ensureTransactionalEmailTable() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS transactional_email_events (
        event_key text PRIMARY KEY,
        email text NOT NULL,
        kind text NOT NULL,
        status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'failed')),
        provider_message_id text,
        last_error text,
        sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS transactional_email_events_kind_idx ON transactional_email_events(kind, created_at DESC)`;
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}

async function claimEmail(eventKey: string, email: string, kind: string) {
  await ensureTransactionalEmailTable();
  const sql = getSql();
  const inserted = await sql`
    INSERT INTO transactional_email_events(event_key, email, kind, status)
    VALUES (${eventKey}, ${email.toLowerCase()}, ${kind}, 'sending')
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  ` as unknown as { event_key: string }[];
  if (inserted.length) return true;

  const retry = await sql`
    UPDATE transactional_email_events
    SET status = 'sending', email = ${email.toLowerCase()}, last_error = NULL, updated_at = now()
    WHERE event_key = ${eventKey}
      AND status = 'failed'
      AND updated_at < now() - interval '1 minute'
    RETURNING event_key
  ` as unknown as { event_key: string }[];
  return retry.length > 0;
}

async function markSent(eventKey: string, providerMessageId: string | null) {
  await getSql()`
    UPDATE transactional_email_events
    SET status = 'sent', provider_message_id = ${providerMessageId}, sent_at = now(), updated_at = now(), last_error = NULL
    WHERE event_key = ${eventKey}
  `;
}

async function markFailed(eventKey: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
  await getSql()`
    UPDATE transactional_email_events
    SET status = 'failed', last_error = ${message}, updated_at = now()
    WHERE event_key = ${eventKey}
  `;
}

async function deliver(content: EmailContent) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  const from = process.env.INVOICE_FROM_EMAIL?.trim() || 'BuildPair <info@buildpair.co.uk>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [content.to],
      reply_to: 'info@buildpair.co.uk',
      subject: content.subject,
      text: content.text,
      html: content.html,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(payload.message || `Email delivery failed (${response.status})`);
  return payload.id ?? null;
}

async function sendOnce(eventKey: string, kind: string, content: EmailContent) {
  const claimed = await claimEmail(eventKey, content.to, kind);
  if (!claimed) return false;
  try {
    const id = await deliver(content);
    await markSent(eventKey, id);
    return true;
  } catch (error) {
    await markFailed(eventKey, error);
    throw error;
  }
}

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f6;font-family:Arial,Helvetica,sans-serif;color:#102a43"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td style="padding:30px">${inner}<p style="font-size:13px;line-height:20px;color:#7b8794;margin:28px 0 0">BuildPair · Trusted local work, managed properly.<br>Questions or feedback? Reply to this email at info@buildpair.co.uk.</p></td></tr></table></td></tr></table></body></html>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0"><tr><td bgcolor="#D35400" style="background:#D35400;border-radius:11px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">${escapeHtml(label)}</a></td></tr></table>`;
}

export async function sendWelcomeEmailOnce(args: {
  userId: string;
  email: string;
  name?: string | null;
  mode?: AccountMode | null;
}) {
  const base = appUrl();
  const hello = greeting(args.name);

  if (args.mode === 'customer') {
    const postUrl = `${base}/customer/new-job`;
    const subject = 'Welcome to BuildPair — get your first job moving';
    const text = `${hello}\n\nWelcome to BuildPair. The quickest way to get started is to post your first job. Add what needs doing, your area and a few photos if they help, then compare tradespeople and quotes in one place.\n\nPost your first job: ${postUrl}\n\nYou can message tradespeople, compare structured quotes and manage the job from your BuildPair account.\n\nBuildPair\n${base}`;
    const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:28px;line-height:34px;margin:0 0 16px">Welcome to BuildPair</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0">The quickest way to get started is to post your first job. Tell us what needs doing, add your area and a few photos if they help, then compare tradespeople and quotes in one place.</p>${button('Post your first job', postUrl)}<div style="background:#FFF7F0;border-radius:12px;padding:18px"><strong>What happens next</strong><p style="font-size:15px;line-height:23px;color:#425466;margin:8px 0 0">Compare profiles and structured quotes, message tradespeople, and keep the job organised from your BuildPair account.</p></div>`);
    return sendOnce(`welcome:${args.userId}`, 'welcome_customer', { to: args.email, subject, text, html });
  }

  if (args.mode === 'trader') {
    const profileUrl = `${base}/trader/onboarding`;
    const jobsUrl = `${base}/trader/job-board`;
    const membershipUrl = `${base}/trader/subscription`;
    const subject = 'Welcome to BuildPair — finish your profile and start finding work';
    const text = `${hello}\n\nWelcome to BuildPair. Start by finishing your tradesperson profile with your services, service area, photos, qualifications and business details.\n\nFinish your profile: ${profileUrl}\nBrowse jobs: ${jobsUrl}\n\nMembership options:\nStarter Free — build and share your profile and browse marketplace jobs.\nBuildPair Plus — £19.99/month: searchable profile, 15 open-marketplace offers per month, direct quote requests, messaging and AI-assisted tools.\nBuildPair Pro — £29.99/month: everything in Plus, 35 open-marketplace offers per month, a modest search boost, advanced analytics and priority new-job alerts.\n\nView membership: ${membershipUrl}\n\nBuildPair\n${base}`;
    const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:28px;line-height:34px;margin:0 0 16px">Welcome to BuildPair</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0">Build a profile homeowners can actually understand and trust. Add your services, service area, work photos, qualifications and business details first.</p>${button('Finish your profile', profileUrl)}<p style="font-size:15px;line-height:23px;color:#425466"><a href="${escapeHtml(jobsUrl)}" style="color:#D35400;font-weight:700">Browse available jobs</a> when your profile is ready.</p><div style="background:#FFF7F0;border-radius:12px;padding:18px;margin-top:22px"><strong style="font-size:17px">Want more from BuildPair?</strong><p style="font-size:14px;line-height:21px;color:#425466;margin:10px 0 8px"><strong>Starter Free</strong> lets you build and share your profile and browse jobs.</p><p style="font-size:14px;line-height:21px;color:#425466;margin:8px 0"><strong>Core · £9.99/month</strong> adds 5 marketplace opportunities, outside-customer quotes/invoices, messaging, basic stats and simple availability.</p><p style="font-size:14px;line-height:21px;color:#425466;margin:8px 0"><strong>Plus · £19.99/month</strong> adds 15 marketplace offers, unlimited direct requests, the full Quote Builder, managed outside-customer projects, AI tools and richer analytics.</p><p style="font-size:14px;line-height:21px;color:#425466;margin:8px 0 0"><strong>Pro · £29.99/month</strong> includes 35 offers, advanced analytics, priority alerts, six-month availability, advanced project tools and Project+ planning.</p>${button('View membership options', membershipUrl)}</div>`);
    return sendOnce(`welcome:${args.userId}`, 'welcome_trader', { to: args.email, subject, text, html });
  }

  const subject = 'Welcome to BuildPair';
  const accountUrl = `${base}/auth/account`;
  const text = `${hello}\n\nWelcome to BuildPair. Your account is ready. Choose how you want to use BuildPair and we’ll guide you through the next steps.\n\nContinue: ${accountUrl}\n\nBuildPair\n${base}`;
  const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:28px;line-height:34px;margin:0 0 16px">Welcome to BuildPair</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0">Your account is ready. Choose how you want to use BuildPair and we’ll guide you through the next steps.</p>${button('Continue to BuildPair', accountUrl)}`);
  return sendOnce(`welcome:${args.userId}`, 'welcome', { to: args.email, subject, text, html });
}

export async function sendSubscriptionReceiptOnce(args: {
  subscriptionId: string;
  invoiceId: string;
  email: string;
  name?: string | null;
  tier: PaidTier;
  amountPaid: number;
  currency?: string | null;
  invoiceNumber?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  nextBillingAt?: number | null;
}) {
  const base = appUrl();
  const plan = SUBSCRIPTION_TIERS[args.tier];
  const paid = money(args.amountPaid, args.currency || 'gbp');
  const nextDate = formatDate(args.nextBillingAt);
  const manageUrl = `${base}/trader/subscription`;
  const receiptUrl = args.hostedInvoiceUrl || args.invoicePdf || null;
  const featureLines = plan.features.map((feature) => `• ${feature}`).join('\n');
  const hello = greeting(args.name);
  const subject = `${plan.name} is active — payment receipt`;
  const text = `${hello}\n\nYour ${plan.name} membership is active.\n\nPayment received: ${paid}\nPlan: ${plan.name}\nBilling: monthly${args.invoiceNumber ? `\nReceipt / invoice: ${args.invoiceNumber}` : ''}${nextDate ? `\nNext renewal: ${nextDate}` : ''}\n\nWhat your plan includes:\n${featureLines}\n\nManage membership: ${manageUrl}${receiptUrl ? `\nView Stripe receipt/invoice: ${receiptUrl}` : ''}\n\nYour membership renews automatically each month until cancelled.\n\nBuildPair\n${base}`;
  const featuresHtml = plan.features.map((feature) => `<li style="margin:7px 0">${escapeHtml(feature)}</li>`).join('');
  const receiptButton = receiptUrl ? button('View payment receipt', receiptUrl) : '';
  const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:28px;line-height:34px;margin:0 0 16px">${escapeHtml(plan.name)} is active</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0 0 20px">Thanks for subscribing. Here is a record of what you have signed up for.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FA;border-radius:12px;padding:16px"><tr><td style="padding:6px 0;color:#667085">Payment received</td><td align="right" style="padding:6px 0;font-weight:700">${escapeHtml(paid)}</td></tr><tr><td style="padding:6px 0;color:#667085">Plan</td><td align="right" style="padding:6px 0;font-weight:700">${escapeHtml(plan.name)}</td></tr><tr><td style="padding:6px 0;color:#667085">Billing</td><td align="right" style="padding:6px 0;font-weight:700">Monthly</td></tr>${args.invoiceNumber ? `<tr><td style="padding:6px 0;color:#667085">Receipt / invoice</td><td align="right" style="padding:6px 0;font-weight:700">${escapeHtml(args.invoiceNumber)}</td></tr>` : ''}${nextDate ? `<tr><td style="padding:6px 0;color:#667085">Next renewal</td><td align="right" style="padding:6px 0;font-weight:700">${escapeHtml(nextDate)}</td></tr>` : ''}</table><h2 style="font-size:20px;margin:24px 0 10px">What you get</h2><ul style="font-size:15px;line-height:22px;color:#425466;padding-left:20px">${featuresHtml}</ul>${receiptButton}${button('Manage membership', manageUrl)}<p style="font-size:13px;line-height:20px;color:#667085">Your membership renews automatically each month until cancelled. Stripe securely processes the payment. This email confirms your BuildPair subscription; use the linked Stripe invoice/receipt for the payment record when available.</p>`);
  return sendOnce(`subscription:${args.subscriptionId}:purchase`, 'subscription_purchase', { to: args.email, subject, text, html });
}


export async function sendQuoteReminderOnce(args: {
  eventKey: string;
  email: string;
  customerName?: string | null;
  businessName: string;
  quoteNumber: string;
  jobTitle: string;
  totalAmount: number;
  shareUrl: string;
  validUntil?: string | null;
}) {
  const hello = greeting(args.customerName);
  const valid = args.validUntil ? new Date(args.validUntil).toLocaleDateString('en-GB') : null;
  const subject = `Reminder: quote ${args.quoteNumber} from ${args.businessName}`;
  const text = `${hello}\n\nJust a reminder that ${args.businessName} sent you quote ${args.quoteNumber} for ${args.jobTitle}.\n\nQuote total: ${money(args.totalAmount)}${valid ? `\nValid until: ${valid}` : ''}\n\nReview the quote: ${args.shareUrl}\n\nThis is an optional BuildPair reminder. The tradesperson can see whether the quote was viewed, but BuildPair will not keep pestering you indefinitely.\n\nBuildPair`;
  const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:26px;line-height:32px;margin:0 0 14px">A quick quote reminder</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0"><strong>${escapeHtml(args.businessName)}</strong> sent you quote <strong>${escapeHtml(args.quoteNumber)}</strong> for ${escapeHtml(args.jobTitle)}.</p><div style="background:#FFF7F0;border-radius:12px;padding:18px;margin-top:18px"><strong style="font-size:20px">${escapeHtml(money(args.totalAmount))}</strong>${valid ? `<p style="margin:6px 0 0;color:#667085">Valid until ${escapeHtml(valid)}</p>` : ''}</div>${button('Review quote', args.shareUrl)}<p style="font-size:13px;line-height:20px;color:#667085">This is an optional BuildPair reminder. Automatic reminders are deliberately limited so customers are not spammed.</p>`);
  return sendOnce(args.eventKey, 'quote_reminder', { to: args.email, subject, text, html });
}

export async function sendInvoiceReminderOnce(args: {
  eventKey: string;
  email: string;
  customerName?: string | null;
  businessName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueAt?: string | Date | null;
  overdue?: boolean;
}) {
  const hello = greeting(args.customerName);
  const due = args.dueAt ? new Date(args.dueAt).toLocaleDateString('en-GB') : null;
  const subject = args.overdue
    ? `Invoice ${args.invoiceNumber} is overdue · ${args.businessName}`
    : `Reminder: invoice ${args.invoiceNumber} from ${args.businessName}`;
  const status = args.overdue ? 'is now overdue' : due ? `is due on ${due}` : 'is still outstanding';
  const text = `${hello}\n\nA payment reminder from ${args.businessName}: invoice ${args.invoiceNumber} for ${money(args.totalAmount)} ${status}.\n\nIf you have already paid, no action is needed. If there is a problem with the invoice, contact the tradesperson before making payment.\n\nBuildPair`;
  const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:26px;line-height:32px;margin:0 0 14px">${args.overdue ? 'Invoice overdue' : 'Invoice reminder'}</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0">A payment reminder from <strong>${escapeHtml(args.businessName)}</strong>.</p><div style="background:#FFF7F0;border-radius:12px;padding:18px;margin-top:18px"><p style="margin:0;color:#667085">Invoice ${escapeHtml(args.invoiceNumber)}</p><strong style="font-size:22px">${escapeHtml(money(args.totalAmount))}</strong><p style="margin:6px 0 0;color:#667085">${escapeHtml(status)}</p></div><p style="font-size:14px;line-height:21px;color:#667085">If you have already paid, no action is needed. If something is wrong with the invoice, contact the tradesperson before making payment.</p>`);
  return sendOnce(args.eventKey, 'invoice_reminder', { to: args.email, subject, text, html });
}

export async function sendAftercareReminderOnce(args: {
  eventKey: string;
  email: string;
  customerName?: string | null;
  businessName: string;
  jobTitle: string;
  title: string;
  note?: string | null;
  projectUrl?: string | null;
}) {
  const hello = greeting(args.customerName);
  const subject = `${args.title} · ${args.businessName}`;
  const text = `${hello}\n\nA BuildPair aftercare reminder from ${args.businessName} about ${args.jobTitle}:\n\n${args.title}${args.note ? `\n${args.note}` : ''}${args.projectUrl ? `\n\nOpen the project record: ${args.projectUrl}` : ''}\n\nBuildPair`;
  const action = args.projectUrl ? button('Open project record', args.projectUrl) : '';
  const html = shell(`<p style="font-size:16px;line-height:24px;margin:0 0 14px">${escapeHtml(hello)}</p><h1 style="font-size:26px;line-height:32px;margin:0 0 14px">${escapeHtml(args.title)}</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0">An aftercare reminder from <strong>${escapeHtml(args.businessName)}</strong> about ${escapeHtml(args.jobTitle)}.</p>${args.note ? `<div style="background:#FFF7F0;border-radius:12px;padding:18px;margin-top:18px">${escapeHtml(args.note)}</div>` : ''}${action}`);
  return sendOnce(args.eventKey, 'aftercare_reminder', { to: args.email, subject, text, html });
}
