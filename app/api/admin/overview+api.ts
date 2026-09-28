import { listAdminClerkIdentities } from '@/lib/admin/clerk';
import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

type DbAccount = {
  id: string;
  email: string | null;
  customerEnabled: boolean;
  traderEnabled: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  lastPath: string | null;
  onlineNow: boolean;
  businessName: string | null;
};

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const sql = getSql();

    const [dbAccounts, clerkIdentities] = await Promise.all([
      sql`
        SELECT
          u.id,
          u.email,
          coalesce(u.customer_enabled, false) AS "customerEnabled",
          coalesce(u.trader_enabled, false) AS "traderEnabled",
          coalesce(u.is_suspended, false) AS "isSuspended",
          u.created_at AS "createdAt",
          up.last_seen_at AS "lastSeenAt",
          up.last_path AS "lastPath",
          (up.last_seen_at >= now() - interval '2 minutes') AS "onlineNow",
          tp.business_name AS "businessName"
        FROM users u
        LEFT JOIN user_presence up ON up.user_id = u.id
        LEFT JOIN trader_profiles tp ON tp.user_id = u.id
        WHERE coalesce(u.is_deleted, false) = false
        ORDER BY u.created_at DESC
        LIMIT 5000
      ` as Promise<DbAccount[]>,
      listAdminClerkIdentities().catch(() => null),
    ]);

    const dbById = new Map(dbAccounts.map((row) => [row.id, row]));
    const allClerkIds = new Set(clerkIdentities?.map((identity) => identity.id) ?? []);
    const realIdentities = clerkIdentities?.filter((identity) => !identity.isTestFixture) ?? null;
    const currentUserIds = realIdentities?.map((identity) => identity.id) ?? dbAccounts.map((row) => row.id);
    const currentUserIdSet = new Set(currentUserIds);
    const currentDbAccounts = dbAccounts.filter((row) => currentUserIdSet.has(row.id));

    const totalUsers = realIdentities?.length ?? currentDbAccounts.length;
    const homeownerMode = currentDbAccounts.filter((row) => row.customerEnabled).length;
    const traderMode = currentDbAccounts.filter((row) => row.traderEnabled).length;
    const dualMode = currentDbAccounts.filter((row) => row.customerEnabled && row.traderEnabled).length;
    const homeownerOnly = currentDbAccounts.filter((row) => row.customerEnabled && !row.traderEnabled).length;
    const traderOnly = currentDbAccounts.filter((row) => row.traderEnabled && !row.customerEnabled).length;
    const noMode = Math.max(0, totalUsers - currentDbAccounts.filter((row) => row.customerEnabled || row.traderEnabled).length);
    const suspendedUsers = currentDbAccounts.filter((row) => row.isSuspended).length;
    const onlineNow = currentDbAccounts.filter((row) => row.onlineNow).length;
    const active15m = currentDbAccounts.filter((row) => row.lastSeenAt && new Date(row.lastSeenAt).getTime() >= Date.now() - 15 * 60_000).length;
    const cutoff24h = Date.now() - 24 * 60 * 60_000;
    const newUsers24h = realIdentities
      ? realIdentities.filter((identity) => identity.createdAt && new Date(identity.createdAt).getTime() >= cutoff24h).length
      : currentDbAccounts.filter((row) => new Date(row.createdAt).getTime() >= cutoff24h).length;

    // Passing the current Clerk ids as JSON keeps every marketplace total tied to
    // identities that still exist in Clerk, and drops disposable E2E fixtures and
    // stale database-only rows from the owner-facing numbers.
    const currentIdsJson = JSON.stringify(currentUserIds);

    const [marketplaceRows, flaggedMessages, recentReports] = await Promise.all([
      sql`
        WITH current_users AS (
          SELECT jsonb_array_elements_text(${currentIdsJson}::jsonb) AS id
        )
        SELECT
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users)) AS "jobs",
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users) AND j.status = 'open') AS "openJobs",
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users) AND j.status = 'quoted') AS "quotedJobs",
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users) AND j.status = 'in_progress') AS "inProgressJobs",
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users) AND j.status = 'completed') AS "completedJobs",
          (SELECT count(*)::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users) AND j.status = 'cancelled') AS "cancelledJobs",
          (SELECT count(*)::int FROM trader_profiles tp WHERE tp.user_id IN (SELECT id FROM current_users)) AS "profiles",
          (SELECT count(*)::int FROM quotes q JOIN jobs j ON j.id = q.job_id WHERE q.trader_id IN (SELECT id FROM current_users) AND j.customer_id IN (SELECT id FROM current_users)) AS "quotes",
          (SELECT count(*)::int FROM quotes q JOIN jobs j ON j.id = q.job_id WHERE q.trader_id IN (SELECT id FROM current_users) AND j.customer_id IN (SELECT id FROM current_users) AND q.status = 'accepted') AS "acceptedQuotes",
          (SELECT count(*)::int FROM conversations c JOIN jobs j ON j.id = c.job_id WHERE j.customer_id IN (SELECT id FROM current_users)) AS "conversations",
          (SELECT count(*)::int FROM messages m WHERE m.sender_id IN (SELECT id FROM current_users)) AS "messages",
          (SELECT count(*)::int FROM messages m WHERE m.sender_id IN (SELECT id FROM current_users) AND coalesce(m.ai_risk_level, 'none') IN ('medium', 'high', 'severe')) AS "flaggedMessages",
          (SELECT count(*)::int FROM moderation_reports mr WHERE mr.status = 'open' AND (mr.reporter_id IN (SELECT id FROM current_users) OR mr.subject_user_id IN (SELECT id FROM current_users))) AS "openReports",
          (SELECT count(*)::int FROM reviews r WHERE r.customer_id IN (SELECT id FROM current_users) AND r.trader_id IN (SELECT id FROM current_users)) AS "reviews",
          (SELECT count(*)::int FROM invoices i WHERE i.trader_id IN (SELECT id FROM current_users) AND (i.customer_id IS NULL OR i.customer_id IN (SELECT id FROM current_users))) AS "invoices",
          (SELECT count(*)::int FROM invoices i WHERE i.trader_id IN (SELECT id FROM current_users) AND i.status = 'overdue') AS "overdueInvoices",
          (SELECT count(*)::int FROM payments p WHERE p.customer_id IN (SELECT id FROM current_users) AND p.trader_id IN (SELECT id FROM current_users)) AS "payments",
          (SELECT count(*)::int FROM payments p WHERE p.customer_id IN (SELECT id FROM current_users) AND p.trader_id IN (SELECT id FROM current_users) AND p.status = 'paid') AS "paidPayments",
          (SELECT coalesce(sum(p.amount), 0)::bigint FROM payments p WHERE p.customer_id IN (SELECT id FROM current_users) AND p.trader_id IN (SELECT id FROM current_users) AND p.status = 'paid') AS "grossPaymentsPence",
          (SELECT coalesce(sum(p.platform_fee), 0)::bigint FROM payments p WHERE p.customer_id IN (SELECT id FROM current_users) AND p.trader_id IN (SELECT id FROM current_users) AND p.status = 'paid') AS "platformFeesPence",
          (SELECT count(*)::int FROM trader_credentials tc WHERE tc.trader_id IN (SELECT id FROM current_users) AND tc.status = 'submitted') AS "pendingCredentials",
          (SELECT count(*)::int FROM trader_credentials tc WHERE tc.trader_id IN (SELECT id FROM current_users) AND tc.status = 'verified') AS "verifiedCredentials",
          (
            coalesce((SELECT sum(cardinality(j.photos))::int FROM jobs j WHERE j.customer_id IN (SELECT id FROM current_users)), 0)
            + coalesce((SELECT sum(cardinality(tp.photos))::int FROM trader_profiles tp WHERE tp.user_id IN (SELECT id FROM current_users)), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase s WHERE s.user_id IN (SELECT id FROM current_users) AND s.cover_photo_url IS NOT NULL AND s.cover_photo_url <> ''), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase s WHERE s.user_id IN (SELECT id FROM current_users) AND s.profile_image_url IS NOT NULL AND s.profile_image_url <> ''), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase s WHERE s.user_id IN (SELECT id FROM current_users) AND s.logo_url IS NOT NULL AND s.logo_url <> ''), 0)
            + coalesce((SELECT sum(cardinality(ts.before_photos) + cardinality(ts.after_photos))::int FROM trader_stories ts WHERE ts.trader_id IN (SELECT id FROM current_users)), 0)
          ) AS "mediaItems"
      `,
      sql`
        WITH current_users AS (SELECT jsonb_array_elements_text(${currentIdsJson}::jsonb) AS id)
        SELECT
          m.id,
          m.body,
          m.ai_risk_level AS "riskLevel",
          m.ai_moderation_reason AS "reason",
          m.created_at AS "createdAt",
          sender.email AS "senderEmail",
          j.title AS "jobTitle"
        FROM messages m
        LEFT JOIN users sender ON sender.id = m.sender_id
        LEFT JOIN conversations c ON c.id = m.conversation_id
        LEFT JOIN jobs j ON j.id = c.job_id
        WHERE m.sender_id IN (SELECT id FROM current_users)
          AND coalesce(m.ai_risk_level, 'none') IN ('medium', 'high', 'severe')
        ORDER BY m.created_at DESC
        LIMIT 10
      `,
      sql`
        WITH current_users AS (SELECT jsonb_array_elements_text(${currentIdsJson}::jsonb) AS id)
        SELECT
          mr.id,
          mr.reason,
          mr.status,
          mr.created_at AS "createdAt",
          reporter.email AS "reporterEmail",
          subject.email AS "subjectEmail"
        FROM moderation_reports mr
        LEFT JOIN users reporter ON reporter.id = mr.reporter_id
        LEFT JOIN users subject ON subject.id = mr.subject_user_id
        WHERE mr.reporter_id IN (SELECT id FROM current_users)
           OR mr.subject_user_id IN (SELECT id FROM current_users)
        ORDER BY mr.created_at DESC
        LIMIT 10
      `,
    ]);

    const recentUsers = realIdentities
      ? realIdentities.slice(0, 10).map((identity) => {
          const db = dbById.get(identity.id);
          return {
            id: identity.id,
            email: identity.email ?? db?.email ?? null,
            name: identity.name,
            businessName: db?.businessName ?? null,
            createdAt: identity.createdAt ?? db?.createdAt ?? new Date(0).toISOString(),
            lastSeenAt: db?.lastSeenAt ?? null,
            lastPath: db?.lastPath ?? null,
            onlineNow: db?.onlineNow ?? false,
            isSuspended: db?.isSuspended ?? false,
            customerEnabled: db?.customerEnabled ?? false,
            traderEnabled: db?.traderEnabled ?? false,
          };
        })
      : currentDbAccounts.slice(0, 10).map((db) => ({ ...db, name: null }));

    const marketplace = marketplaceRows[0] ?? {};
    return Response.json({
      metrics: {
        totalUsers,
        homeownerMode,
        traderMode,
        homeownerOnly,
        traderOnly,
        dualMode,
        noMode,
        suspendedUsers,
        newUsers24h,
        onlineNow,
        active15m,
        ...marketplace,
      },
      dataQuality: {
        identitySource: realIdentities ? 'clerk' : 'database',
        databaseActiveRows: dbAccounts.length,
        orphanedDbAccounts: clerkIdentities ? dbAccounts.filter((row) => !allClerkIds.has(row.id)).length : 0,
        testFixturesExcluded: clerkIdentities?.filter((identity) => identity.isTestFixture).length ?? 0,
      },
      recentUsers,
      flaggedMessages,
      recentReports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
