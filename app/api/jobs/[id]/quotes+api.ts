import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const customer = await requireRole(request, 'customer');
    const db = getDb();
    const job = await db.query.jobs.findFirst({ where: and(eq(jobs.id, id), eq(jobs.customerId, customer.id)) });
    if (!job) throw new HttpError(404, 'Job not found');
    const rows = await getSql()`
      SELECT q.id, q.job_id AS "jobId", q.trader_id AS "traderId",
             q.labor_cost AS "laborCost", q.materials_cost AS "materialsCost", q.vat_amount AS "vatAmount",
             q.deposit_amount AS "depositAmount", q.total_amount AS "totalAmount", q.payment_terms AS "paymentTerms",
             q.payment_schedule AS "paymentSchedule", q.payment_schedule_status AS "paymentScheduleStatus",
             q.payment_schedule_revision AS "paymentScheduleRevision",
             q.scope, q.exclusions, q.notes, q.duration_days AS "durationDays", q.warranty_months AS "warrantyMonths",
             q.proposed_start_at AS "proposedStartAt", q.valid_until AS "validUntil", q.status,
             tp.business_name AS "businessName"
      FROM quotes q
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE q.job_id = ${id}
      ORDER BY q.created_at ASC
    `;
    return Response.json({ job, quotes: rows });
  } catch (error) { return jsonError(error); }
}
