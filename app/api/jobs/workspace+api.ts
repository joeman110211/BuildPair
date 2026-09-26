import { z } from 'zod';
import { assertApprovedMediaUrls } from '@/lib/media-safety';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const entryType = z.enum(['task','note','progress','material','expense','snag','document','handover','warranty','aftercare']);
const visibility = z.enum(['shared','trader_only']);
const createSchema = z.object({
  jobId: z.string().uuid(),
  entryType,
  visibility: visibility.default('shared'),
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().max(4000).default(''),
  amount: z.number().int().nonnegative().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  mediaUrl: z.string().url().nullable().optional(),
});
const updateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['done','reopen','approve','archive']),
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
  if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(403, 'Only people on this BuildPair project can use its workspace.');
  return { ...row, role: row.traderId === userId ? 'trader' as const : 'customer' as const };
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId || !z.string().uuid().safeParse(jobId).success) throw new HttpError(400, 'Valid jobId required');
    const access = await participant(jobId, userId);
    const rows = await getSql()`
      SELECT id, job_id AS "jobId", created_by AS "createdBy", entry_type AS "entryType",
             visibility, title, body, amount, status, media_url AS "mediaUrl",
             due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM job_workspace_entries
      WHERE job_id = ${jobId}
        AND (${access.role}::text = 'trader' OR visibility = 'shared')
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, due_at NULLS LAST, created_at DESC
      LIMIT 300
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = createSchema.parse(await request.json());
    const access = await participant(input.jobId, userId);
    if (access.role === 'customer' && !['note','snag'].includes(input.entryType)) {
      throw new HttpError(403, 'Homeowners can add project notes and snagging items. The tradesperson manages tasks, progress, materials and handover records.');
    }
    if (access.role === 'customer' && input.visibility !== 'shared') throw new HttpError(403, 'Homeowner workspace entries are shared with the tradesperson.');
    if (input.mediaUrl) await assertApprovedMediaUrls(userId, access.role === 'trader' ? 'trader' : 'job', [input.mediaUrl]);
    const rows = await getSql()`
      INSERT INTO job_workspace_entries(job_id, created_by, entry_type, visibility, title, body, amount, media_url, due_at)
      VALUES (${input.jobId}, ${userId}, ${input.entryType}, ${input.visibility}, ${input.title}, ${input.body}, ${input.amount ?? null}, ${input.mediaUrl ?? null}, ${input.dueAt ?? null}::timestamptz)
      RETURNING id, job_id AS "jobId", created_by AS "createdBy", entry_type AS "entryType", visibility, title, body, amount, status, media_url AS "mediaUrl", due_at AS "dueAt", created_at AS "createdAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = updateSchema.parse(await request.json());
    const current = await getSql()`
      SELECT e.id, e.job_id AS "jobId", e.created_by AS "createdBy", e.entry_type AS "entryType", e.visibility, e.status
      FROM job_workspace_entries e WHERE e.id = ${input.id} LIMIT 1
    ` as unknown as { id: string; jobId: string; createdBy: string; entryType: string; visibility: string; status: string }[];
    const row = current[0];
    if (!row) throw new HttpError(404, 'Workspace item not found');
    const access = await participant(row.jobId, userId);
    if (access.role === 'customer' && row.visibility !== 'shared') throw new HttpError(403, 'This is a private tradesperson workspace item.');
    if (access.role === 'customer' && !['snag','note'].includes(row.entryType)) throw new HttpError(403, 'Only the tradesperson can update this workspace item.');
    const nextStatus = input.action === 'done' ? 'done' : input.action === 'approve' ? 'approved' : input.action === 'archive' ? 'archived' : 'open';
    const rows = await getSql()`
      UPDATE job_workspace_entries
      SET status = ${nextStatus},
          completed_at = CASE WHEN ${nextStatus} IN ('done','approved') THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = ${input.id}
      RETURNING id, status, completed_at AS "completedAt", updated_at AS "updatedAt"
    `;
    return Response.json(rows[0]);
  } catch (error) { return jsonError(error); }
}
