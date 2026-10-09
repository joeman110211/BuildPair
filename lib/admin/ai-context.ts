import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

export const BUILDPAIR_PRODUCT_MAP = `
BuildPair is a UK home-improvement marketplace and project workflow platform with two account modes under one login: Homeowner and Tradesperson.

PUBLIC PRODUCT
- BuildPair is a launched UK marketplace. Homeowners and tradespeople can register now, homeowners can post jobs and compare quotes, and tradespeople can quote, message and manage work. BuildPay and paid membership checkout remain unavailable.
- The old launch waitlist is retained as historical contact and invitation records; it is not an active registration gate. Use normal account signup and current live marketplace journeys.
- Homeowners can describe work in plain English, search/match the right trade, browse trader profiles, post jobs, compare structured quotes, hire, message, track work, arrange direct payment and review. BuildPay is coming soon.
- Tradespeople can build a public business profile, select trade categories/services, discover suitable jobs, quote, manage accepted work, visits, milestones, messages, invoices, reviews and portfolio stories. Paid memberships and BuildPay checkout remain disabled during introductory access.
- Public information includes the homepage/search, trade directory and profiles, homeowner/trader product pages, pricing, advice, trust & safety, marketplace standards, payments information, building-regulations guidance, about/contact, terms and privacy.

HOMEOWNER WORKFLOW
- Homeowner registration and job posting are open now. Do not direct people to a pre-launch waiting list.
- Sign up/sign in with Clerk -> enable Homeowner mode -> dashboard.
- Find a trade with AI-assisted trade matching or browse the directory.
- Post a job with category/property details, photos and an optional Gemini-generated job specification.
- Receive and compare structured quotes, accept one, then manage the connected project record.
- Use job-linked messaging, milestones/payment records, notifications, saved trades and reviews.

TRADESPERSON WORKFLOW
- Tradesperson registration, profile setup, job discovery and quoting are open. Original waitlist records remain in the admin contact archive for historical reference.
- Sign up/sign in with Clerk -> enable Tradesperson mode -> onboarding/business profile.
- Profile contains business/trade/service-area details, bio, qualifications/credentials, media and portfolio/story content.
- Job board and saved searches help find work. Quote assistant helps draft scope/exclusions/payment wording while BuildPair calculates money deterministically.
- Accepted work connects jobs, quotes, visits, milestones, messages and invoices. Direct payment arrangements remain between the parties until BuildPay opens.
- Stripe payment and subscription capabilities are gated off for customers until formally enabled. Trader analytics and business tools are available as permitted by current account access.

AI FEATURES
- Trade Match: public/homeowner plain-English problem -> exact BuildPair trade categories.
- Job Spec: homeowner answers -> structured job specification.
- Quote Assistant: trader/job details -> professional scope/exclusions/payment wording; monetary totals are not delegated to AI.
- Message Assistant: conversation/job context -> summary plus three reply suggestions.
- Admin Assistant: owner/admin-only whole-product investigation with live marketplace and historical contact context plus confirmation-gated administrative actions. Elevated Admin Assistant tools are never exposed to homeowner, tradesperson, public or other AI features.
- AI calls use the server-only GEMINI_API_KEY. Per-user/IP limits and an application-wide paid-AI daily ceiling protect usage. AI request/response audit records are available only to administrators.

PLATFORM & SECURITY
- Clerk: authentication and account identity.
- Neon PostgreSQL: marketplace/application data, including the launch_waitlist table.
- Stripe: planned paid membership and BuildPay/Connect workflows, not available for current customer checkout.
- Cloudinary: uploaded job/profile/project media.
- Resend: transactional email/notifications.
- Gemini: AI assistance.
- Secrets remain server-side. Admin routes require administrator authentication. Public and authenticated APIs use database-backed rate limits.
- Moderation/reporting, message risk flags, credential review, account suspension/history and audit trails are owner/admin controls.

ADMIN CONSOLE
- Overview: headline numbers, attention items and shortcuts.
- Admin Assistant: plain-English product, operational and system questions plus confirmation-gated supported admin actions.
- Users & access: accounts, modes, subscriptions, suspensions and account history.
- Live users: current/recent presence.
- Trade profiles: business/profile data.
- Credentials: qualification/registration review.
- Jobs: job records and statuses.
- Marketplace activity: quotes, invoices, payments and major events.
- Messages: conversations and flagged messages.
- Photos & media: uploaded profile/job media.
- Moderation: reports and moderation decisions.
- Historical contacts: legacy pre-launch interest, contact consent, invitation history and associated account/reward status. New registration is open.
- Product insights: account and marketplace behaviour.
- Visitor analytics: public traffic/acquisition.
- System health: database, Clerk, Gemini, Cloudinary, Resend and Stripe.
`;

type AnyRow = Record<string, unknown>;

async function safeQuery<T extends AnyRow>(run: () => Promise<T[]>) {
  try { return await run(); }
  catch (error) {
    return [{ contextError: error instanceof Error ? error.message.slice(0, 160) : 'Query failed' } as unknown as T];
  }
}

export async function buildAdminLiveContext() {
  const sql = getSql();
  await ensureLaunchWaitlistTable();

  const [metrics, jobs, quotes, payments, reports, users, aiUsage, waitlistSummary, recentWaitlist] = await Promise.all([
    safeQuery(() => sql`
      SELECT
        (SELECT count(*)::int FROM users WHERE coalesce(is_deleted, false) = false) AS "users",
        (SELECT count(*)::int FROM users WHERE coalesce(is_deleted, false) = false AND coalesce(is_suspended, false) = true) AS "suspendedUsers",
        (SELECT count(*)::int FROM trader_profiles) AS "traderProfiles",
        (SELECT count(*)::int FROM jobs) AS "jobs",
        (SELECT count(*)::int FROM jobs WHERE status = 'open') AS "openJobs",
        (SELECT count(*)::int FROM jobs WHERE status = 'in_progress') AS "inProgressJobs",
        (SELECT count(*)::int FROM jobs WHERE status = 'completed') AS "completedJobs",
        (SELECT count(*)::int FROM quotes) AS "quotes",
        (SELECT count(*)::int FROM quotes WHERE status = 'accepted') AS "acceptedQuotes",
        (SELECT count(*)::int FROM conversations) AS "conversations",
        (SELECT count(*)::int FROM messages) AS "messages",
        (SELECT count(*)::int FROM moderation_reports WHERE status = 'open') AS "openReports",
        (SELECT count(*)::int FROM reviews) AS "reviews",
        (SELECT count(*)::int FROM invoices) AS "invoices",
        (SELECT count(*)::int FROM payments) AS "payments",
        (SELECT coalesce(sum(amount), 0)::bigint FROM payments WHERE status = 'paid') AS "paidVolumePence",
        (SELECT coalesce(sum(platform_fee), 0)::bigint FROM payments WHERE status = 'paid') AS "platformFeesPence"
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT id, title, category, status, urgency, created_at AS "createdAt"
      FROM jobs ORDER BY created_at DESC LIMIT 8
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT q.id, j.title AS "jobTitle", q.status, q.total_amount AS "totalPence", q.created_at AS "createdAt"
      FROM quotes q JOIN jobs j ON j.id = q.job_id
      ORDER BY q.created_at DESC LIMIT 8
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT p.id, j.title AS "jobTitle", p.status, p.amount AS "amountPence", p.platform_fee AS "platformFeePence", p.created_at AS "createdAt"
      FROM payments p JOIN jobs j ON j.id = p.job_id
      ORDER BY p.created_at DESC LIMIT 8
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT id, reason, status, created_at AS "createdAt"
      FROM moderation_reports ORDER BY created_at DESC LIMIT 8
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT id, coalesce(customer_enabled, false) AS "homeownerMode", coalesce(trader_enabled, false) AS "traderMode",
             coalesce(is_suspended, false) AS "suspended", created_at AS "createdAt"
      FROM users WHERE coalesce(is_deleted, false) = false
      ORDER BY created_at DESC LIMIT 8
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS "requests24h",
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND provider_called)::int AS "providerCalls24h",
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND status = 'blocked')::int AS "blocked24h",
        count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND status = 'error')::int AS "errors24h"
      FROM ai_request_logs
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT
        count(*) FILTER (WHERE status <> 'removed')::int AS "total",
        count(*) FILTER (WHERE status <> 'removed' AND audience = 'trader')::int AS "traders",
        count(*) FILTER (WHERE status <> 'removed' AND audience = 'homeowner')::int AS "homeowners",
        count(*) FILTER (WHERE status <> 'removed' AND tester_interest)::int AS "testers",
        count(*) FILTER (WHERE status = 'registered')::int AS "registered",
        count(*) FILTER (WHERE pro_reward_granted_at IS NOT NULL)::int AS "rewarded",
        count(*) FILTER (WHERE status <> 'removed' AND created_at >= now() - interval '24 hours')::int AS "joined24h",
        count(*) FILTER (WHERE status <> 'removed' AND created_at >= now() - interval '7 days')::int AS "joined7d"
      FROM launch_waitlist
    ` as Promise<AnyRow[]>),
    safeQuery(() => sql`
      SELECT audience, trade, tester_interest AS "testerInterest", source, status, created_at AS "createdAt"
      FROM launch_waitlist
      WHERE status <> 'removed'
      ORDER BY created_at DESC
      LIMIT 8
    ` as Promise<AnyRow[]>),
  ]);

  const configuration = {
    database: Boolean(process.env.DATABASE_URL?.trim()),
    clerk: Boolean(process.env.CLERK_SECRET_KEY?.trim() && process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()),
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    cloudinary: Boolean(process.env.CLOUDINARY_API_KEY?.trim() && process.env.CLOUDINARY_API_SECRET?.trim()),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    releaseSha: process.env.BUILDPAIR_BUILD_SHA?.trim() || null,
  };

  return JSON.stringify({
    capturedAt: new Date().toISOString(),
    configuration,
    metrics: metrics[0] ?? {},
    launchWaitlist: waitlistSummary[0] ?? {},
    recentWaitlist,
    recentJobs: jobs,
    recentQuotes: quotes,
    recentPayments: payments,
    recentReports: reports,
    recentAccounts: users,
    aiUsage: aiUsage[0] ?? {},
  }, null, 2).slice(0, 14000);
}
