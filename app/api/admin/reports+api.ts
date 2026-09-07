import { z } from 'zod';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['reviewed', 'actioned', 'dismissed']),
  adminNotes: z.string().trim().max(4000).default(''),
  accountAction: z.enum(['none', 'warn', 'suspend', 'unsuspend']).default('none'),
  conversationAction: z.enum(['none', 'warn', 'restrict', 'close', 'reopen']).default('none'),
});

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const rows = await getSql()`
      SELECT r.id,
             r.reporter_id AS "reporterId",
             reporter.email AS "reporterEmail",
             r.subject_user_id AS "subjectUserId",
             subject.email AS "subjectEmail",
             subject.is_suspended AS "subjectSuspended",
             r.message_id AS "messageId",
             m.body AS "messageBody",
             m.ai_risk_level AS "messageRiskLevel",
             m.ai_moderation_reason AS "messageModerationReason",
             r.review_id AS "reviewId",
             rv.comment AS "reviewComment",
             r.job_id AS "jobId",
             j.title AS "jobTitle",
             c.id AS "conversationId",
             c.moderation_status AS "conversationStatus",
             c.moderation_reason AS "conversationReason",
             c.moderation_updated_at AS "conversationModerationUpdatedAt",
             customer.email AS "customerEmail",
             trader.email AS "traderEmail",
             coalesce((
               SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', history.id,
                   'senderId', history.sender_id,
                   'body', history.body,
                   'aiRiskLevel', history.ai_risk_level,
                   'aiModerationReason', history.ai_moderation_reason,
                   'createdAt', history.created_at
                 ) ORDER BY history.created_at
               )
               FROM (
                 SELECT mh.id, mh.sender_id, mh.body, mh.ai_risk_level, mh.ai_moderation_reason, mh.created_at
                 FROM messages mh
                 WHERE mh.conversation_id = c.id
                 ORDER BY mh.created_at DESC
                 LIMIT 40
               ) history
             ), '[]'::jsonb) AS "conversationMessages",
             r.reason,
             r.details,
             r.status,
             r.admin_notes AS "adminNotes",
             r.resolved_by AS "resolvedBy",
             r.created_at AS "createdAt",
             r.resolved_at AS "resolvedAt"
      FROM moderation_reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users subject ON subject.id = r.subject_user_id
      LEFT JOIN messages m ON m.id = r.message_id
      LEFT JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN users customer ON customer.id = c.customer_id
      LEFT JOIN users trader ON trader.id = c.trader_id
      LEFT JOIN reviews rv ON rv.id = r.review_id
      LEFT JOIN jobs j ON j.id = r.job_id
      ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 250
    ` as Record<string, unknown>[];
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { user: admin } = await requireAdmin(request);
    const payload = actionSchema.parse(await request.json());
    const sql = getSql();
    const reports = await sql`
      SELECT r.subject_user_id AS "subjectUserId", m.conversation_id AS "conversationId"
      FROM moderation_reports r
      LEFT JOIN messages m ON m.id = r.message_id
      WHERE r.id = ${payload.id}
      LIMIT 1
    ` as { subjectUserId: string | null; conversationId: string | null }[];
    const report = reports[0];
    if (!report) throw new HttpError(404, 'Report not found');

    if (payload.accountAction !== 'none') {
      if (!report.subjectUserId) throw new HttpError(400, 'This report has no account target');
      if (report.subjectUserId === admin.id) throw new HttpError(400, 'Administrators cannot take account action against themselves from this screen');
      if (payload.accountAction === 'warn') {
        await sql`
          INSERT INTO notifications(user_id, type, title, body, href)
          VALUES (
            ${report.subjectUserId},
            'moderation_warning',
            'BuildPair account warning',
            ${payload.adminNotes || 'BuildPair has reviewed a marketplace report involving your account. Please review the Marketplace Standards and keep future activity professional, accurate and safe.'},
            '/(public)/marketplace-standards'
          )
        `;
      } else if (payload.accountAction === 'suspend') {
        await sql`UPDATE users SET is_suspended = true, suspension_reason = ${payload.adminNotes || 'Suspended after moderation review'}, updated_at = now() WHERE id = ${report.subjectUserId}`;
      } else {
        await sql`UPDATE users SET is_suspended = false, suspension_reason = '', updated_at = now() WHERE id = ${report.subjectUserId}`;
      }
    }

    if (payload.conversationAction !== 'none') {
      if (!report.conversationId) throw new HttpError(400, 'This report is not linked to a job conversation');
      const nextStatus = payload.conversationAction === 'warn'
        ? 'warned'
        : payload.conversationAction === 'restrict'
          ? 'restricted'
          : payload.conversationAction === 'close'
            ? 'closed'
            : 'open';
      const reason = payload.conversationAction === 'reopen'
        ? ''
        : payload.adminNotes || `BuildPair moderation action: ${payload.conversationAction}`;
      await sql`
        UPDATE conversations
        SET moderation_status = ${nextStatus},
            moderation_reason = ${reason},
            moderation_updated_at = now(),
            updated_at = now()
        WHERE id = ${report.conversationId}
      `;
    }

    const rows = await sql`
      UPDATE moderation_reports
      SET status = ${payload.status}, admin_notes = ${payload.adminNotes}, resolved_by = ${admin.id}, resolved_at = now()
      WHERE id = ${payload.id}
      RETURNING id, status, admin_notes AS "adminNotes", resolved_at AS "resolvedAt"
    ` as { id: string; status: string; adminNotes: string; resolvedAt: string }[];
    return Response.json(rows[0]);
  } catch (error) { return jsonError(error); }
}
