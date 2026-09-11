import { z } from 'zod';
import { addJobEvent } from '@/lib/notifications';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

const noteSchema = z.object({ milestoneId: z.uuid(), note: z.string().trim().min(5).max(1500) });

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount,
             m.dispute_reason AS "disputeReason", m.dispute_status AS "disputeStatus",
             m.dispute_response AS "disputeResponse", m.dispute_response_at AS "disputeResponseAt",
             m.dispute_escalated_at AS "disputeEscalatedAt", m.dispute_resolution_note AS "resolutionNote",
             m.refund_requested_at AS "refundRequestedAt", m.refund_approved_at AS "refundApprovedAt",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId",
             q.trader_id AS "traderId", tp.business_name AS "businessName"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      LEFT JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE m.dispute_status IN ('open', 'trader_response', 'escalated')
      ORDER BY CASE WHEN m.dispute_status = 'escalated' THEN 0 ELSE 1 END,
               COALESCE(m.dispute_escalated_at, m.disputed_at) ASC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const input = noteSchema.parse(await request.json());
    const rows = await getSql()`SELECT job_id AS "jobId", dispute_status AS "disputeStatus" FROM job_milestones WHERE id = ${input.milestoneId} LIMIT 1` as unknown as { jobId: string; disputeStatus: string }[];
    if (!rows[0] || rows[0].disputeStatus === 'none') throw new HttpError(404, 'BuildPay issue not found');
    await getSql()`UPDATE job_milestones SET dispute_resolution_note = ${input.note} WHERE id = ${input.milestoneId}`;
    await addJobEvent(rows[0].jobId, admin.user.id, 'payment_issue_admin_note', 'BuildPair admin note added', input.note, { milestoneId: input.milestoneId });
    return Response.json({ saved: true });
  } catch (error) { return jsonError(error); }
}
