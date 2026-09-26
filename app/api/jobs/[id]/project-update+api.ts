import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { assertRateLimit } from '@/lib/rate-limit';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  reason: z.enum(['weather','materials','illness_staffing','access','site_condition','customer_change','availability','other']),
  note: z.string().trim().min(8).max(1200),
  revisedDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

const reasonLabel: Record<string,string> = {
  weather: 'Weather',
  materials: 'Materials / delivery',
  illness_staffing: 'Illness / staffing',
  access: 'Access issue',
  site_condition: 'Unexpected site condition',
  customer_change: 'Customer decision / scope change',
  availability: 'Availability',
  other: 'Other',
};

export async function POST(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    await assertRateLimit(request, 'project-update', 20, 86400, userId);
    const input = schema.parse(await request.json());

    const rows = await getSql()`
      SELECT j.id, j.title, j.status, j.customer_id AS "customerId", q.trader_id AS "traderId"
      FROM jobs j
      JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${id}
      LIMIT 1
    ` as unknown as { id:string; title:string; status:string; customerId:string; traderId:string }[];
    const job = rows[0];
    if (!job || (job.customerId !== userId && job.traderId !== userId)) throw new HttpError(404, 'Active project not found');
    if (job.status !== 'in_progress') throw new HttpError(409, 'Project updates are available while the job is in progress');

    const label = reasonLabel[input.reason] ?? 'Project update';
    const revised = input.revisedDate ? ` · Revised / expected date: ${new Date(`${input.revisedDate}T12:00:00Z`).toLocaleDateString('en-GB')}` : '';
    const description = `${label}: ${input.note}${revised}`;
    await addJobEvent(id, userId, 'project_update', 'Project update', description, { reason: input.reason, revisedDate: input.revisedDate || null });

    const otherUserId = userId === job.customerId ? job.traderId : job.customerId;
    const href = userId === job.customerId ? `/trader/jobs/${id}` : `/customer/jobs/${id}`;
    await createNotification(otherUserId, {
      type: 'project_update',
      title: `Project update · ${job.title}`,
      body: description,
      href,
      email: true,
    });

    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
