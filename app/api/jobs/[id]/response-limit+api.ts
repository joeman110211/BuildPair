import { z } from 'zod';
import { JOB_RESPONSE_LIMIT_STEP, MAX_JOB_RESPONSE_LIMIT } from '@/lib/marketplace-quality';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.object({ action: z.literal('expand') });

async function state(jobId: string, customerId: string) {
  const rows = await getSql()`
    SELECT j.response_limit AS "responseLimit",
           count(DISTINCT o.trader_id)::int AS "responseCount"
    FROM jobs j
    LEFT JOIN trader_job_offers o ON o.job_id = j.id
    WHERE j.id = ${jobId} AND j.customer_id = ${customerId}
    GROUP BY j.id
    LIMIT 1
  ` as unknown as { responseLimit: number; responseCount: number }[];
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Job not found');
  return {
    responseLimit: row.responseLimit,
    responseCount: row.responseCount,
    remaining: Math.max(0, row.responseLimit - row.responseCount),
    canOpenMore: row.responseLimit < MAX_JOB_RESPONSE_LIMIT,
  };
}

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const customer = await requireRole(request, 'customer');
    return Response.json(await state(id, customer.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const customer = await requireRole(request, 'customer');
    actionSchema.parse(await request.json());
    const sql = getSql();
    const updated = await sql`
      UPDATE jobs
      SET response_limit = least(${MAX_JOB_RESPONSE_LIMIT}, response_limit + ${JOB_RESPONSE_LIMIT_STEP}),
          updated_at = now()
      WHERE id = ${id} AND customer_id = ${customer.id}
        AND status IN ('open','quoted')
      RETURNING id
    `;
    if (!updated.length) throw new HttpError(404, 'Open job not found');
    return Response.json(await state(id, customer.id));
  } catch (error) {
    return jsonError(error);
  }
}
