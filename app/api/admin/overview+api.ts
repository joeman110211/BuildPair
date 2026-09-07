import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const sql = getSql();

    const [metricsRows, recentUsers, flaggedMessages, recentReports] = await Promise.all([
      sql`
        SELECT
          (SELECT count(*)::int FROM users WHERE coalesce(is_deleted, false) = false) AS "totalUsers",
          (SELECT count(*)::int FROM users WHERE coalesce(is_deleted, false) = false AND coalesce(customer_enabled, false) = true) AS "homeowners",
          (SELECT count(*)::int FROM users WHERE coalesce(is_deleted, false) = false AND coalesce(trader_enabled, false) = true) AS "tradespeople",
          (SELECT count(*)::int FROM users WHERE coalesce(is_suspended, false) = true) AS "suspendedUsers",
          (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '24 hours') AS "newUsers24h",
          (SELECT count(*)::int FROM user_presence WHERE last_seen_at >= now() - interval '2 minutes') AS "onlineNow",
          (SELECT count(*)::int FROM user_presence WHERE last_seen_at >= now() - interval '15 minutes') AS "active15m",
          (SELECT count(*)::int FROM jobs) AS "jobs",
          (SELECT count(*)::int FROM jobs WHERE status = 'open') AS "openJobs",
          (SELECT count(*)::int FROM trader_profiles) AS "profiles",
          (SELECT count(*)::int FROM conversations) AS "conversations",
          (SELECT count(*)::int FROM messages) AS "messages",
          (SELECT count(*)::int FROM messages WHERE coalesce(ai_risk_level, 'none') IN ('medium', 'high', 'severe')) AS "flaggedMessages",
          (SELECT count(*)::int FROM moderation_reports WHERE status = 'open') AS "openReports",
          (SELECT count(*)::int FROM reviews) AS "reviews",
          (SELECT count(*)::int FROM quotes) AS "quotes",
          (SELECT count(*)::int FROM invoices) AS "invoices",
          (SELECT count(*)::int FROM payments) AS "payments",
          (
            coalesce((SELECT sum(cardinality(photos))::int FROM jobs), 0)
            + coalesce((SELECT sum(cardinality(photos))::int FROM trader_profiles), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase WHERE cover_photo_url IS NOT NULL AND cover_photo_url <> ''), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase WHERE profile_image_url IS NOT NULL AND profile_image_url <> ''), 0)
            + coalesce((SELECT count(*)::int FROM trader_profile_showcase WHERE logo_url IS NOT NULL AND logo_url <> ''), 0)
            + coalesce((SELECT sum(cardinality(before_photos) + cardinality(after_photos))::int FROM trader_stories), 0)
          ) AS "mediaItems"
      `,
      sql`
        SELECT
          u.id,
          u.email,
          u.role,
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
        LIMIT 10
      `,
      sql`
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
        WHERE coalesce(m.ai_risk_level, 'none') IN ('medium', 'high', 'severe')
        ORDER BY m.created_at DESC
        LIMIT 10
      `,
      sql`
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
        ORDER BY mr.created_at DESC
        LIMIT 10
      `,
    ]);

    return Response.json({
      metrics: metricsRows[0] ?? {},
      recentUsers,
      flaggedMessages,
      recentReports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
