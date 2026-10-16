import { requireOwnerAdmin } from '@/lib/admin/owner';
import { assertRateLimit } from '@/lib/rate-limit';
import { getSql } from '@/lib/sql';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';

const PROVIDERS = ['render', 'neon', 'clerk', 'gemini', 'resend', 'cloudinary', 'stripe', 'github', 'godaddy', 'datadog'] as const;
type Provider = (typeof PROVIDERS)[number];

type CostRow = {
  provider: Provider;
  amountMinor: string | null;
  monthlyBudgetMinor: string | null;
  currency: 'GBP' | 'USD';
  billingPeriod: 'monthly' | 'annual' | 'usage' | 'one-off';
  invoiceDate: string | null;
  note: string;
  updatedAt: string;
};

async function cloudinaryUsage() {
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() || 'qrrcn7ma';
  if (!key || !secret) return { state: 'unconfigured' as const, detail: 'Cloudinary credentials are not configured for usage reporting.' };
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/usage`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!response.ok) return { state: 'unavailable' as const, detail: `Provider usage query returned HTTP ${response.status}` };
    const json = await response.json() as {
      plan?: string;
      credits?: { usage?: number; limit?: number; used_percent?: number };
    };
    const used = Number(json.credits?.usage);
    const limit = Number(json.credits?.limit);
    return {
      state: 'live' as const,
      plan: json.plan ?? 'Not supplied',
      creditsUsed: Number.isFinite(used) ? used : null,
      creditsLimit: Number.isFinite(limit) ? limit : null,
    };
  } catch {
    return { state: 'unavailable' as const, detail: 'Cloudinary usage could not be fetched right now.' };
  }
}

function validMinor(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 100000000000) {
    throw new HttpError(400, 'Amounts must be non-negative whole pennies/cents within the permitted range.');
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const { user } = await requireAdmin(request);
    await assertRateLimit(request, 'admin-operating-costs-read', 60, 3600, user.id);
    const sql = getSql();
    const [rows, activity, cloudinary] = await Promise.all([
      sql`
        SELECT provider, amount_minor::text AS "amountMinor",
          monthly_budget_minor::text AS "monthlyBudgetMinor",
          currency, billing_period AS "billingPeriod",
          invoice_date::text AS "invoiceDate", note,
          updated_at AS "updatedAt"
        FROM admin_operating_costs
        ORDER BY provider
      ` as Promise<CostRow[]>,
      sql`
        SELECT
          (SELECT count(*)::int FROM ai_request_logs
           WHERE provider_called = true AND created_at >= date_trunc('month', now())) AS "aiCallsMonth",
          (SELECT count(*)::int FROM ai_request_logs
           WHERE provider_called = true AND created_at >= now() - interval '24 hours') AS "aiCalls24h",
          (SELECT count(*)::int FROM transactional_email_events
           WHERE status = 'sent' AND created_at >= date_trunc('month', now())) AS "emailsMonth"
      ` as Promise<{ aiCallsMonth: number; aiCalls24h: number; emailsMonth: number }[]>,
      cloudinaryUsage(),
    ]);

    return Response.json({
      entries: rows,
      usage: { ...activity[0], cloudinary },
      // Other providers do not expose their invoices to BuildPair yet. Never treat
      // a missing integration as a £0 bill.
      billingConnections: {
        render: false,
        neon: false,
        clerk: false,
        gemini: false,
        resend: false,
        cloudinary: false,
        stripe: false,
        github: false,
        godaddy: false,
        datadog: false,
      },
      generatedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireOwnerAdmin(request);
    await assertRateLimit(request, 'admin-operating-costs-write', 30, 3600, user.id);
    const input = await request.json() as Record<string, unknown>;
    const provider = input.provider;
    if (typeof provider !== 'string' || !PROVIDERS.includes(provider as Provider)) throw new HttpError(400, 'Unknown provider.');
    const currency = input.currency;
    if (currency !== 'GBP' && currency !== 'USD') throw new HttpError(400, 'Choose GBP or USD.');
    const billingPeriod = input.billingPeriod;
    if (!['monthly', 'annual', 'usage', 'one-off'].includes(String(billingPeriod))) throw new HttpError(400, 'Invalid billing period.');
    const amount = validMinor(input.amountMinor);
    const budget = validMinor(input.monthlyBudgetMinor);
    const date = input.invoiceDate;
    if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) {
      throw new HttpError(400, 'Invoice date must be YYYY-MM-DD or blank.');
    }
    const note = input.note;
    if (typeof note !== 'string' || note.length > 400) throw new HttpError(400, 'Notes cannot exceed 400 characters.');

    const sql = getSql();
    await sql`
      INSERT INTO admin_operating_costs
        (provider, amount_minor, monthly_budget_minor, currency, billing_period, invoice_date, note, updated_by, updated_at)
      VALUES (${provider}, ${amount}, ${budget}, ${currency}, ${billingPeriod}, ${date}::date, ${note}, ${user.id}, now())
      ON CONFLICT (provider) DO UPDATE SET
        amount_minor = excluded.amount_minor,
        monthly_budget_minor = excluded.monthly_budget_minor,
        currency = excluded.currency,
        billing_period = excluded.billing_period,
        invoice_date = excluded.invoice_date,
        note = excluded.note,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;
    return Response.json({ saved: true });
  } catch (error) {
    return jsonError(error);
  }
}
