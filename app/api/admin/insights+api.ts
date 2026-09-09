import { listAdminClerkIdentities } from '@/lib/admin-clerk';
import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

type DbUser = {
  id: string;
  role: string | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  profileId: string | null;
  businessName: string | null;
  tradeCategory: string | null;
  subscriptionTier: string | null;
  profileBio: string | null;
  profileUpdatedAt: string | null;
  lastSeenAt: string | null;
  lastPath: string | null;
  platform: string | null;
  jobsCount: number;
  quotesCount: number;
  messagesCount: number;
};

type AnalyticsAggregate = {
  userId: string;
  pageViews7d: number;
  pageViews30d: number;
  distinctPages30d: number;
  lastTrackedAt: string | null;
  lastTrackedPath: string | null;
};

async function analyticsAvailable() {
  const rows = await getSql()`
    SELECT
      to_regclass('public.user_activity_events') IS NOT NULL AS "eventsAvailable",
      to_regclass('public.user_flow_drafts') IS NOT NULL AS "draftsAvailable"
  ` as { eventsAvailable: boolean; draftsAvailable: boolean }[];
  return rows[0] ?? { eventsAvailable: false, draftsAvailable: false };
}

async function dbUsers() {
  return await getSql()`
    SELECT
      u.id,
      u.role,
      coalesce(u.customer_enabled, false) AS "customerEnabled",
      coalesce(u.trader_enabled, false) AS "traderEnabled",
      u.active_mode AS "activeMode",
      coalesce(u.is_admin, false) AS "isAdmin",
      coalesce(u.is_suspended, false) AS "isSuspended",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      tp.id AS "profileId",
      tp.business_name AS "businessName",
      tp.trade_category AS "tradeCategory",
      tp.subscription_tier AS "subscriptionTier",
      tp.bio AS "profileBio",
      tp.updated_at AS "profileUpdatedAt",
      up.last_seen_at AS "lastSeenAt",
      up.last_path AS "lastPath",
      up.client_platform AS "platform",
      (SELECT count(*)::int FROM jobs j WHERE j.customer_id = u.id) AS "jobsCount",
      (SELECT count(*)::int FROM quotes q WHERE q.trader_id = u.id) AS "quotesCount",
      (SELECT count(*)::int FROM messages m WHERE m.sender_id = u.id) AS "messagesCount"
    FROM users u
    LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    LEFT JOIN user_presence up ON up.user_id = u.id
    WHERE coalesce(u.is_deleted, false) = false
    ORDER BY coalesce(up.last_seen_at, u.updated_at) DESC
    LIMIT 2000
  ` as DbUser[];
}

async function aggregates() {
  return await getSql()`
    SELECT
      user_id AS "userId",
      count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= now() - interval '7 days')::int AS "pageViews7d",
      count(*) FILTER (WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days')::int AS "pageViews30d",
      count(DISTINCT path) FILTER (WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days')::int AS "distinctPages30d",
      max(created_at) AS "lastTrackedAt",
      (array_agg(path ORDER BY created_at DESC) FILTER (WHERE path IS NOT NULL))[1] AS "lastTrackedPath"
    FROM user_activity_events
    GROUP BY user_id
  ` as AnalyticsAggregate[];
}

async function detail(userId: string, tracking: { eventsAvailable: boolean; draftsAvailable: boolean }) {
  const sql = getSql();
  const baseRows = await sql`
    SELECT
      u.id,
      u.role,
      coalesce(u.customer_enabled, false) AS "customerEnabled",
      coalesce(u.trader_enabled, false) AS "traderEnabled",
      u.active_mode AS "activeMode",
      coalesce(u.is_admin, false) AS "isAdmin",
      coalesce(u.is_suspended, false) AS "isSuspended",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      tp.id AS "profileId",
      tp.business_name AS "businessName",
      tp.trade_category AS "tradeCategory",
      tp.subscription_tier AS "subscriptionTier",
      tp.bio AS "profileBio",
      tp.updated_at AS "profileUpdatedAt",
      up.last_seen_at AS "lastSeenAt",
      up.last_path AS "lastPath",
      up.client_platform AS "platform",
      (SELECT count(*)::int FROM jobs j WHERE j.customer_id = u.id) AS "jobsCount",
      (SELECT count(*)::int FROM quotes q WHERE q.trader_id = u.id) AS "quotesCount",
      (SELECT count(*)::int FROM messages m WHERE m.sender_id = u.id) AS "messagesCount"
    FROM users u
    LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    LEFT JOIN user_presence up ON up.user_id = u.id
    WHERE u.id = ${userId} AND coalesce(u.is_deleted, false) = false
    LIMIT 1
  ` as DbUser[];

  const clerk = await listAdminClerkIdentities();
  const identity = clerk?.find((item) => item.id === userId && !item.isTestFixture) ?? null;

  let events: unknown[] = [];
  let drafts: unknown[] = [];
  let signals: string[] = [];

  if (tracking.eventsAvailable) {
    events = await sql`
      SELECT id, event_type AS "eventType", path, flow, step, details, created_at AS "createdAt"
      FROM user_activity_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    const signalRows = await sql`
      SELECT
        EXISTS(
          SELECT 1 FROM user_activity_events e
          WHERE e.user_id = ${userId}
            AND e.event_type = 'page_view'
            AND e.path LIKE '/customer/new-job%'
            AND e.created_at > coalesce((SELECT max(j.created_at) FROM jobs j WHERE j.customer_id = ${userId}), '1970-01-01'::timestamptz)
        ) AS "possibleJobDropoff",
        EXISTS(
          SELECT 1 FROM user_activity_events e
          WHERE e.user_id = ${userId}
            AND e.event_type = 'page_view'
            AND (e.path LIKE '/trader/onboarding%' OR e.path LIKE '/trader/profile%')
            AND NOT EXISTS (SELECT 1 FROM trader_profiles tp WHERE tp.user_id = ${userId})
        ) AS "possibleProfileDropoff"
    ` as { possibleJobDropoff: boolean; possibleProfileDropoff: boolean }[];
    if (signalRows[0]?.possibleJobDropoff) signals.push('Visited the job-posting flow after their most recent saved job, but no later job was created.');
    if (signalRows[0]?.possibleProfileDropoff) signals.push('Visited trade profile/onboarding pages but no trade profile was completed.');
  }

  if (tracking.draftsAvailable) {
    drafts = await sql`
      SELECT flow, current_step AS "currentStep", status, fields, started_at AS "startedAt", updated_at AS "updatedAt", completed_at AS "completedAt"
      FROM user_flow_drafts
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
  }

  return {
    user: baseRows[0] ?? null,
    identity,
    tracking,
    events,
    drafts,
    signals,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const userId = new URL(request.url).searchParams.get('userId');
    const tracking = await analyticsAvailable();
    if (userId) return Response.json(await detail(userId, tracking));

    const [rows, clerk, analytics] = await Promise.all([
      dbUsers(),
      listAdminClerkIdentities(),
      tracking.eventsAvailable ? aggregates() : Promise.resolve([] as AnalyticsAggregate[]),
    ]);

    const dbById = new Map(rows.map((row) => [row.id, row]));
    const analyticsById = new Map(analytics.map((row) => [row.userId, row]));
    const realClerk = clerk?.filter((item) => !item.isTestFixture) ?? null;

    const users = realClerk
      ? realClerk.map((identity) => {
          const db = dbById.get(identity.id);
          const metric = analyticsById.get(identity.id);
          return {
            id: identity.id,
            email: identity.email,
            name: identity.name,
            clerkCreatedAt: identity.createdAt,
            ...(db ?? {}),
            customerEnabled: db?.customerEnabled ?? false,
            traderEnabled: db?.traderEnabled ?? false,
            isAdmin: db?.isAdmin ?? false,
            isSuspended: db?.isSuspended ?? false,
            profileId: db?.profileId ?? null,
            businessName: db?.businessName ?? null,
            tradeCategory: db?.tradeCategory ?? null,
            subscriptionTier: db?.subscriptionTier ?? null,
            lastSeenAt: db?.lastSeenAt ?? null,
            lastPath: db?.lastPath ?? null,
            platform: db?.platform ?? null,
            jobsCount: db?.jobsCount ?? 0,
            quotesCount: db?.quotesCount ?? 0,
            messagesCount: db?.messagesCount ?? 0,
            pageViews7d: metric?.pageViews7d ?? 0,
            pageViews30d: metric?.pageViews30d ?? 0,
            distinctPages30d: metric?.distinctPages30d ?? 0,
            lastTrackedAt: metric?.lastTrackedAt ?? null,
            lastTrackedPath: metric?.lastTrackedPath ?? null,
          };
        })
      : rows.map((db) => ({
          ...db,
          email: null,
          name: null,
          clerkCreatedAt: null,
          pageViews7d: analyticsById.get(db.id)?.pageViews7d ?? 0,
          pageViews30d: analyticsById.get(db.id)?.pageViews30d ?? 0,
          distinctPages30d: analyticsById.get(db.id)?.distinctPages30d ?? 0,
          lastTrackedAt: analyticsById.get(db.id)?.lastTrackedAt ?? null,
          lastTrackedPath: analyticsById.get(db.id)?.lastTrackedPath ?? null,
        }));

    return Response.json({ users, tracking });
  } catch (error) {
    return jsonError(error);
  }
}
