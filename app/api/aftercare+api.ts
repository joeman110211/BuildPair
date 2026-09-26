import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const createSchema = z.object({
  jobId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  note: z.string().trim().max(2000).default(''),
  dueAt: z.string().datetime(),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['done', 'dismiss', 'reopen']),
});

type Participant = { customerId: string; traderId: string | null };

async function participant(jobId: string, userId: string) {
  const rows = await getSql()`
    SELECT j.customer_id AS "customerId", q.trader_id AS "traderId"
    FROM jobs j
    LEFT JOIN quotes q ON q.id = j.accepted_quote_id
    WHERE j.id = ${jobId}
    LIMIT 1
  ` as unknown as Participant[];
  const row = rows[0];
  if (!row || (row.customerId !== userId && row.traderId !== userId)) {
    throw new HttpError(403, 'Only people on this BuildPair project can view its aftercare.');
  }
  return row;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId || !z.string().uuid().safeParse(jobId).success) throw new HttpError(400, 'Valid jobId required.');
    await participant(jobId, userId);
    const rows = await getSql()`
      SELECT id, job_id AS "jobId", title, note, due_at AS "dueAt", status,
             last_sent_at AS "lastSentAt", send_count AS "sendCount",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM project_aftercare_reminders
      WHERE job_id = ${jobId}
      ORDER BY CASE WHEN status IN ('pending','sent') THEN 0 ELSE 1 END, due_at ASC
      LIMIT 100
    `;
    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = createSchema.parse(await request.json());
    const relationship = await participant(input.jobId, trader.id);
    if (relationship.traderId !== trader.id) throw new HttpError(403, 'Only the tradesperson on this project can schedule aftercare.');
    if (new Date(input.dueAt).getTime() <= Date.now()) throw new HttpError(400, 'Choose a future date for the aftercare reminder.');
    if (new Date(input.dueAt).getTime() > Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) throw new HttpError(400, 'Aftercare reminders can be scheduled up to 10 years ahead.');

    const rows = await getSql()`
      INSERT INTO project_aftercare_reminders(job_id, trader_id, customer_id, title, note, due_at)
      VALUES (${input.jobId}, ${trader.id}, ${relationship.customerId}, ${input.title}, ${input.note}, ${input.dueAt}::timestamptz)
      RETURNING id, job_id AS "jobId", title, note, due_at AS "dueAt", status,
                last_sent_at AS "lastSentAt", send_count AS "sendCount", created_at AS "createdAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = updateSchema.parse(await request.json());
    const existing = await getSql()`
      SELECT id, job_id AS "jobId"
      FROM project_aftercare_reminders
      WHERE id = ${input.id}
      LIMIT 1
    ` as unknown as { id: string; jobId: string }[];
    const row = existing[0];
    if (!row) throw new HttpError(404, 'Aftercare reminder not found.');
    await participant(row.jobId, userId);
    const next = input.action === 'done' ? 'done' : input.action === 'dismiss' ? 'dismissed' : 'pending';
    const rows = await getSql()`
      UPDATE project_aftercare_reminders
      SET status = ${next}, updated_at = now()
      WHERE id = ${input.id}
      RETURNING id, status, updated_at AS "updatedAt"
    `;
    return Response.json(rows[0]);
  } catch (error) {
    return jsonError(error);
  }
}
