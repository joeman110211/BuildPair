import { createClerkClient } from '@clerk/backend';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('grant_complimentary'), userId: z.string().min(1), tier: z.enum(['basic', 'featured']), reason: z.string().trim().max(1000).default('') }),
  z.object({ action: z.literal('revoke_complimentary'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
  z.object({ action: z.literal('suspend'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
  z.object({ action: z.literal('unsuspend'), userId: z.string().min(1), reason: z.string().trim().max(1000).default('') }),
]);

const deleteSchema = z.object({ userId: z.string().min(1), confirmation: z.literal('REMOVE USER') });

type DbUserSummary = {
  id: string;
  email: string | null;
  role: 'customer' | 'trader' | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode: 'customer' | 'trader' | null;
  isAdmin: boolean;
  isSuspended: boolean;
  suspensionReason: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  profileId: string | null;
  businessName: string | null;
  subscriptionTier: 'free' | 'basic' | 'featured' | null;
  paidSubscriptionTier: 'free' | 'basic' | 'featured' | null;
  complimentaryTier: 'free' | 'basic' | 'featured' | null;
  complimentaryGrantedAt: string | null;
  complimentaryReason: string | null;
  jobsCount: number;
  quotesCount: number;
  messagesCount: number;
  reviewsCount: number;
  invoicesCount: number;
  reportsCount: number;
  storiesCount: number;
  lastActivityAt: string | null;
};

function clerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  return secretKey ? createClerkClient({ secretKey }) : null;
}

async function listClerkUsers() {
  const clerk = clerkClient();
  if (!clerk) return [];
  const all = [];
  let offset = 0;
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const page = await clerk.users.getUserList({ limit: 100, offset });
    all.push(...page.data);
    if (!page.data.length || all.length >= page.totalCount) break;
    offset += page.data.length;
  }
  return all;
}

async function dbUserSummaries() {
  return await getSql()`
    SELECT
      u.id,
      u.email,
      u.role,
      coalesce(u.customer_enabled, false) AS "customerEnabled",
      coalesce(u.trader_enabled, false) AS "traderEnabled",
      u.active_mode AS "activeMode",
      coalesce(u.is_admin, false) AS "isAdmin",
      coalesce(u.is_suspended, false) AS "isSuspended",
      coalesce(u.suspension_reason, '') AS "suspensionReason",
      coalesce(u.is_deleted, false) AS "isDeleted",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      tp.id AS "profileId",
      tp.business_name AS "businessName",
      tp.subscription_tier AS "subscriptionTier",
      tp.paid_subscription_tier AS "paidSubscriptionTier",
      tp.complimentary_tier AS "complimentaryTier",
      tp.complimentary_granted_at AS "complimentaryGrantedAt",
      tp.complimentary_reason AS "complimentaryReason",
      (SELECT count(*)::int FROM jobs j WHERE j.customer_id = u.id) AS "jobsCount",
      (SELECT count(*)::int FROM quotes q WHERE q.trader_id = u.id) AS "quotesCount",
      (SELECT count(*)::int FROM messages m WHERE m.sender_id = u.id) AS "messagesCount",
      (SELECT count(*)::int FROM reviews r WHERE r.customer_id = u.id OR r.trader_id = u.id) AS "reviewsCount",
      (SELECT count(*)::int FROM invoices i WHERE i.trader_id = u.id OR i.customer_id = u.id) AS "invoicesCount",
      (SELECT count(*)::int FROM moderation_reports mr WHERE mr.reporter_id = u.id OR mr.subject_user_id = u.id) AS "reportsCount",
      (SELECT count(*)::int FROM trader_stories ts WHERE ts.trader_id = u.id) AS "storiesCount",
      greatest(
        u.updated_at,
        (SELECT max(j.created_at) FROM jobs j WHERE j.customer_id = u.id),
        (SELECT max(q.created_at) FROM quotes q WHERE q.trader_id = u.id),
        (SELECT max(m.created_at) FROM messages m WHERE m.sender_id = u.id),
        (SELECT max(r.created_at) FROM reviews r WHERE r.customer_id = u.id OR r.trader_id = u.id),
        (SELECT max(i.created_at) FROM invoices i WHERE i.trader_id = u.id OR i.customer_id = u.id),
        (SELECT max(ts.created_at) FROM trader_stories ts WHERE ts.trader_id = u.id)
      ) AS "lastActivityAt"
    FROM users u
    LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    ORDER BY u.created_at DESC
    LIMIT 2000
  ` as DbUserSummary[];
}

async function detailForUser(userId: string) {
  const sql = getSql();
  const activity = await sql`
    SELECT * FROM (
      SELECT j.created_at AS "createdAt", 'job_posted'::text AS kind, 'Posted a job'::text AS label,
             j.title::text AS detail, ('/customer/jobs/' || j.id::text)::text AS href
      FROM jobs j WHERE j.customer_id = ${userId}
      UNION ALL
      SELECT q.created_at, 'quote_sent', 'Sent a quote', coalesce(j.title, 'BuildPair job'), ('/trader/jobs/' || q.job_id::text)
      FROM quotes q LEFT JOIN jobs j ON j.id = q.job_id WHERE q.trader_id = ${userId}
      UNION ALL
      SELECT m.created_at, 'message_sent', 'Sent a message', coalesce(j.title, 'Job conversation'), NULL::text
      FROM messages m
      LEFT JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN jobs j ON j.id = c.job_id
      WHERE m.sender_id = ${userId}
      UNION ALL
      SELECT r.created_at, 'review', CASE WHEN r.customer_id = ${userId} THEN 'Left a review' ELSE 'Received a review' END,
             ('Rating ' || r.rating::text || '/5'), NULL::text
      FROM reviews r WHERE r.customer_id = ${userId} OR r.trader_id = ${userId}
      UNION ALL
      SELECT i.created_at, 'invoice', 'Created an invoice', i.invoice_number, NULL::text
      FROM invoices i WHERE i.trader_id = ${userId}
      UNION ALL
      SELECT v.created_at, 'variation', 'Created a job variation', v.title, NULL::text
      FROM job_variations v WHERE v.trader_id = ${userId} OR v.customer_id = ${userId}
      UNION ALL
      SELECT s.created_at, 'project_story', 'Published a project story', s.title,
             CASE WHEN tp.id IS NULL THEN NULL::text ELSE ('/(public)/traders/' || tp.id::text) END
      FROM trader_stories s LEFT JOIN trader_profiles tp ON tp.user_id = s.trader_id WHERE s.trader_id = ${userId}
      UNION ALL
      SELECT mr.created_at, 'report', CASE WHEN mr.reporter_id = ${userId} THEN 'Submitted a report' ELSE 'Was named in a report' END,
             replace(mr.reason, '_', ' '), NULL::text
      FROM moderation_reports mr WHERE mr.reporter_id = ${userId} OR mr.subject_user_id = ${userId}
      UNION ALL
      SELECT a.created_at, 'admin_action', ('Admin action: ' || replace(a.action_type, '_', ' ')),
             coalesce(a.details->>'reason', ''), NULL::text
      FROM admin_user_actions a WHERE a.subject_user_id = ${userId}
    ) events
    ORDER BY "createdAt" DESC
    LIMIT 80
  ` as { createdAt: string; kind: string; label: string; detail: string; href: string | null }[];

  const adminActions = await sql`
    SELECT id, admin_id AS "adminId", action_type AS "actionType", details, created_at AS "createdAt"
    FROM admin_user_actions
    WHERE subject_user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return { activity, adminActions };
}

function planName(tier: 'basic' | 'featured') {
  return tier === 'featured' ? 'BuildPair Pro' : 'BuildPair Plus';
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const requestedUserId = new URL(request.url).searchParams.get('userId');
    if (requestedUserId) return Response.json(await detailForUser(requestedUserId));

    const [dbRows, clerkUsers] = await Promise.all([dbUserSummaries(), listClerkUsers()]);
    const dbById = new Map(dbRows.map((row) => [row.id, row]));
    const seen = new Set<string>();
    const merged = clerkUsers.map((clerkUser) => {
      seen.add(clerkUser.id);
      const db = dbById.get(clerkUser.id);
      const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? db?.email ?? null;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
      const clerkCreatedAt = typeof clerkUser.createdAt === 'number' ? new Date(clerkUser.createdAt).toISOString() : null;
      return {
        ...db,
        id: clerkUser.id,
        email,
        name,
        clerkCreatedAt,
        role: db?.role ?? null,
        customerEnabled: db?.customerEnabled ?? false,
        traderEnabled: db?.traderEnabled ?? false,
        activeMode: db?.activeMode ?? null,
        isAdmin: db?.isAdmin ?? false,
        isSuspended: db?.isSuspended ?? false,
        suspensionReason: db?.suspensionReason ?? '',
        isDeleted: db?.isDeleted ?? false,
        profileId: db?.profileId ?? null,
        businessName: db?.businessName ?? null,
        subscriptionTier: db?.subscriptionTier ?? null,
        paidSubscriptionTier: db?.paidSubscriptionTier ?? null,
        complimentaryTier: db?.complimentaryTier ?? null,
        complimentaryGrantedAt: db?.complimentaryGrantedAt ?? null,
        complimentaryReason: db?.complimentaryReason ?? null,
        jobsCount: db?.jobsCount ?? 0,
        quotesCount: db?.quotesCount ?? 0,
        messagesCount: db?.messagesCount ?? 0,
        reviewsCount: db?.reviewsCount ?? 0,
        invoicesCount: db?.invoicesCount ?? 0,
        reportsCount: db?.reportsCount ?? 0,
        storiesCount: db?.storiesCount ?? 0,
        lastActivityAt: db?.lastActivityAt ?? null,
      };
    });

    for (const row of dbRows) {
      if (seen.has(row.id)) continue;
      merged.push({ ...row, name: null, clerkCreatedAt: null });
    }

    merged.sort((a, b) => new Date(b.clerkCreatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.clerkCreatedAt ?? a.createdAt ?? 0).getTime());
    return Response.json(merged);
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { user: admin } = await requireAdmin(request);
    const payload = actionSchema.parse(await request.json());
    if (payload.userId === admin.id && (payload.action === 'suspend' || payload.action === 'unsuspend')) {
      throw new HttpError(400, 'Administrators cannot suspend or restore themselves from this screen');
    }

    const sql = getSql();
    const rows = await sql`
      SELECT u.id, u.email, coalesce(u.is_admin, false) AS "isAdmin", coalesce(u.is_deleted, false) AS "isDeleted",
             tp.id AS "profileId", tp.paid_subscription_tier AS "paidSubscriptionTier", tp.complimentary_tier AS "complimentaryTier"
      FROM users u LEFT JOIN trader_profiles tp ON tp.user_id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    ` as { id: string; email: string | null; isAdmin: boolean; isDeleted: boolean; profileId: string | null; paidSubscriptionTier: 'basic' | 'featured' | null; complimentaryTier: 'basic' | 'featured' | null }[];
    const target = rows[0];
    if (!target || target.isDeleted) throw new HttpError(404, 'Active BuildPair account not found');

    let actionType = payload.action;
    const details: Record<string, unknown> = { reason: payload.reason };

    if (payload.action === 'grant_complimentary') {
      if (!target.profileId) throw new HttpError(400, 'Complimentary memberships can only be granted after the tradesperson has created a trade profile');
      const tier = payload.tier;
      const effectiveTier = tier === 'featured' || target.paidSubscriptionTier === 'featured' ? 'featured' : 'basic';
      await sql`
        UPDATE trader_profiles
        SET complimentary_tier = ${tier}::subscription_tier,
            complimentary_granted_at = now(),
            complimentary_granted_by = ${admin.id},
            complimentary_reason = ${payload.reason},
            subscription_tier = ${effectiveTier}::subscription_tier,
            is_subscription_active = true,
            updated_at = now()
        WHERE user_id = ${payload.userId}
      `;
      actionType = tier === 'featured' ? 'complimentary_pro_granted' : 'complimentary_plus_granted';
      details.tier = tier;
      await sql`
        INSERT INTO notifications(user_id, type, title, body, href)
        VALUES (${payload.userId}, 'complimentary_membership', ${`${planName(tier)} complimentary access`},
                ${`BuildPair has granted your account complimentary ${planName(tier)} access. No subscription charge has been created.`}, '/trader/subscription')
      `;
    } else if (payload.action === 'revoke_complimentary') {
      if (!target.profileId) throw new HttpError(400, 'Trade profile not found');
      await sql`
        UPDATE trader_profiles
        SET complimentary_tier = NULL,
            complimentary_granted_at = NULL,
            complimentary_granted_by = NULL,
            complimentary_reason = '',
            subscription_tier = coalesce(paid_subscription_tier, 'free'::subscription_tier),
            is_subscription_active = (paid_subscription_tier IS NOT NULL AND paid_subscription_tier <> 'free'::subscription_tier),
            updated_at = now()
        WHERE user_id = ${payload.userId}
      `;
    } else if (payload.action === 'suspend') {
      if (target.isAdmin) throw new HttpError(400, 'Administrator accounts cannot be suspended from User Control Centre');
      await sql`UPDATE users SET is_suspended = true, suspension_reason = ${payload.reason || 'Suspended by BuildPair administrator'}, updated_at = now() WHERE id = ${payload.userId}`;
    } else {
      await sql`UPDATE users SET is_suspended = false, suspension_reason = '', updated_at = now() WHERE id = ${payload.userId}`;
    }

    await sql`
      INSERT INTO admin_user_actions(admin_id, subject_user_id, subject_email, action_type, details)
      VALUES (${admin.id}, ${payload.userId}, ${target.email}, ${actionType}, ${JSON.stringify(details)}::jsonb)
    `;
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const { user: admin } = await requireAdmin(request);
    const payload = deleteSchema.parse(await request.json());
    if (payload.userId === admin.id) throw new HttpError(400, 'Administrators cannot remove their own account from User Control Centre');

    const sql = getSql();
    const rows = await sql`
      SELECT u.email, coalesce(u.is_admin, false) AS "isAdmin", coalesce(u.is_deleted, false) AS "isDeleted",
             tp.stripe_subscription_id AS "stripeSubscriptionId"
      FROM users u LEFT JOIN trader_profiles tp ON tp.user_id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    ` as { email: string | null; isAdmin: boolean; isDeleted: boolean; stripeSubscriptionId: string | null }[];
    const target = rows[0];
    if (target?.isAdmin) throw new HttpError(400, 'Administrator accounts cannot be removed from User Control Centre');

    let email = target?.email ?? null;
    const clerk = clerkClient();
    if (!email && clerk) {
      try {
        const clerkUser = await clerk.users.getUser(payload.userId);
        email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;
      } catch { /* Account may already be absent from Clerk. */ }
    }

    if (target?.stripeSubscriptionId) {
      try { await getStripe().subscriptions.cancel(target.stripeSubscriptionId); }
      catch (error) { console.warn('[buildpair-admin] Stripe subscription cancellation failed during user removal', { userId: payload.userId, error: error instanceof Error ? error.message : String(error) }); }
    }

    await sql`SELECT buildpair_delete_account(${payload.userId})`;
    if (clerk) {
      try { await clerk.users.deleteUser(payload.userId); }
      catch (error) { console.warn('[buildpair-admin] Clerk identity deletion needs retry', { userId: payload.userId, error: error instanceof Error ? error.message : String(error) }); }
    }

    await sql`
      INSERT INTO admin_user_actions(admin_id, subject_user_id, subject_email, action_type, details)
      VALUES (${admin.id}, ${payload.userId}, ${email}, 'account_removed', ${JSON.stringify({ reason: 'Removed by BuildPair administrator' })}::jsonb)
    `;
    return Response.json({ removed: true });
  } catch (error) { return jsonError(error); }
}
