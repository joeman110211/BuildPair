import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const proposeSchema = z.object({
  jobId: z.string().uuid(),
  proposedAt: z.iso.datetime(),
  note: z.string().trim().max(1000).default(''),
});

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['accept', 'decline', 'cancel', 'complete']),
});

type SiteVisitRow = {
  id: string;
  jobId: string;
  customerId: string;
  traderId: string;
  proposedAt: string;
  status: 'proposed' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  note: string;
  respondedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type VisitContext = SiteVisitRow & {
  jobTitle: string;
  jobStatus: string;
  conversationId: string | null;
};

function visitLabel(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');

    const rows = await getSql()`
      SELECT id,
             job_id AS "jobId",
             customer_id AS "customerId",
             trader_id AS "traderId",
             proposed_at AS "proposedAt",
             status,
             note,
             responded_at AS "respondedAt",
             completed_at AS "completedAt",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM job_site_visits
      WHERE job_id = ${jobId}
        AND (customer_id = ${userId} OR trader_id = ${userId})
      ORDER BY created_at DESC
      LIMIT 20
    ` as unknown as SiteVisitRow[];
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const payload = proposeSchema.parse(await request.json());
    const proposed = new Date(payload.proposedAt);
    if (proposed.getTime() <= Date.now()) throw new HttpError(400, 'Choose a future date and time for the site visit');

    const sql = getSql();
    const jobs = await sql`
      SELECT j.id AS "jobId",
             j.title AS "jobTitle",
             j.customer_id AS "customerId",
             j.status AS "jobStatus",
             c.id AS "conversationId"
      FROM jobs j
      LEFT JOIN conversations c
        ON c.job_id = j.id
       AND c.customer_id = j.customer_id
       AND c.trader_id = ${trader.id}
      WHERE j.id = ${payload.jobId}
        AND (j.target_trader_id = ${trader.id} OR c.id IS NOT NULL)
      LIMIT 1
    ` as unknown as { jobId: string; jobTitle: string; customerId: string; jobStatus: string; conversationId: string | null }[];
    const job = jobs[0];
    if (!job) throw new HttpError(403, 'Open the BuildPair job conversation before arranging a site visit');
    if (!['open', 'quoted'].includes(job.jobStatus)) throw new HttpError(409, 'A pre-quote site visit can only be arranged before a quote is accepted');

    const current = await sql`
      SELECT id
      FROM job_site_visits
      WHERE job_id = ${payload.jobId}
        AND trader_id = ${trader.id}
        AND status IN ('proposed', 'confirmed')
      ORDER BY created_at DESC
      LIMIT 1
    ` as unknown as { id: string }[];

    const rows = current[0]
      ? await sql`
          UPDATE job_site_visits
          SET proposed_at = ${proposed.toISOString()},
              note = ${payload.note},
              status = 'proposed',
              responded_at = NULL,
              completed_at = NULL,
              updated_at = now()
          WHERE id = ${current[0].id}
          RETURNING id,
                    job_id AS "jobId",
                    customer_id AS "customerId",
                    trader_id AS "traderId",
                    proposed_at AS "proposedAt",
                    status,
                    note,
                    responded_at AS "respondedAt",
                    completed_at AS "completedAt",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
        `
      : await sql`
          INSERT INTO job_site_visits(job_id, customer_id, trader_id, proposed_at, note)
          VALUES (${payload.jobId}, ${job.customerId}, ${trader.id}, ${proposed.toISOString()}, ${payload.note})
          RETURNING id,
                    job_id AS "jobId",
                    customer_id AS "customerId",
                    trader_id AS "traderId",
                    proposed_at AS "proposedAt",
                    status,
                    note,
                    responded_at AS "respondedAt",
                    completed_at AS "completedAt",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
        `;

    const visit = rows[0] as unknown as SiteVisitRow | undefined;
    if (!visit) throw new Error('Site visit could not be saved');
    const when = visitLabel(visit.proposedAt);
    await addJobEvent(payload.jobId, trader.id, 'site_visit_proposed', 'Site visit proposed', `${when}${payload.note ? ` · ${payload.note}` : ''}`, { siteVisitId: visit.id });
    await createNotification(job.customerId, {
      type: 'site_visit_proposed',
      title: 'Site visit requested before quote',
      body: `${job.jobTitle}: the tradesperson would like to visit on ${when} before giving a firm quote.`,
      href: job.conversationId ? `/customer/messages/${job.conversationId}` : `/customer/jobs/${payload.jobId}`,
      email: true,
    });
    return Response.json(visit, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = actionSchema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      SELECT v.id,
             v.job_id AS "jobId",
             v.customer_id AS "customerId",
             v.trader_id AS "traderId",
             v.proposed_at AS "proposedAt",
             v.status,
             v.note,
             v.responded_at AS "respondedAt",
             v.completed_at AS "completedAt",
             v.created_at AS "createdAt",
             v.updated_at AS "updatedAt",
             j.title AS "jobTitle",
             j.status AS "jobStatus",
             c.id AS "conversationId"
      FROM job_site_visits v
      JOIN jobs j ON j.id = v.job_id
      LEFT JOIN conversations c
        ON c.job_id = v.job_id
       AND c.customer_id = v.customer_id
       AND c.trader_id = v.trader_id
      WHERE v.id = ${payload.id}
        AND (v.customer_id = ${userId} OR v.trader_id = ${userId})
      LIMIT 1
    ` as unknown as VisitContext[];
    const visit = rows[0];
    if (!visit) throw new HttpError(404, 'Site visit not found');

    let nextStatus: SiteVisitRow['status'];
    let eventType: string;
    let eventTitle: string;
    let recipientId: string;
    let notificationTitle: string;
    let notificationBody: string;

    if (payload.action === 'accept') {
      if (userId !== visit.customerId) throw new HttpError(403, 'Only the homeowner can confirm this visit');
      if (visit.status !== 'proposed') throw new HttpError(409, 'This visit is no longer awaiting confirmation');
      nextStatus = 'confirmed'; eventType = 'site_visit_confirmed'; eventTitle = 'Site visit confirmed'; recipientId = visit.traderId;
      notificationTitle = 'Site visit confirmed'; notificationBody = `${visit.jobTitle}: the homeowner confirmed ${visitLabel(visit.proposedAt)}.`;
    } else if (payload.action === 'decline') {
      if (userId !== visit.customerId) throw new HttpError(403, 'Only the homeowner can decline this visit');
      if (visit.status !== 'proposed') throw new HttpError(409, 'This visit is no longer awaiting a response');
      nextStatus = 'declined'; eventType = 'site_visit_declined'; eventTitle = 'Site visit declined'; recipientId = visit.traderId;
      notificationTitle = 'Site visit declined'; notificationBody = `${visit.jobTitle}: the homeowner declined the proposed visit. Agree another time in the job conversation.`;
    } else if (payload.action === 'cancel') {
      if (userId !== visit.traderId) throw new HttpError(403, 'Only the tradesperson can cancel this proposed visit');
      if (!['proposed', 'confirmed'].includes(visit.status)) throw new HttpError(409, 'This visit can no longer be cancelled');
      nextStatus = 'cancelled'; eventType = 'site_visit_cancelled'; eventTitle = 'Site visit cancelled'; recipientId = visit.customerId;
      notificationTitle = 'Site visit cancelled'; notificationBody = `${visit.jobTitle}: the tradesperson cancelled the planned visit. Agree another time in the job conversation.`;
    } else {
      if (userId !== visit.traderId) throw new HttpError(403, 'Only the tradesperson can mark the visit complete');
      if (visit.status !== 'confirmed') throw new HttpError(409, 'Confirm the site visit before marking it complete');
      nextStatus = 'completed'; eventType = 'site_visit_completed'; eventTitle = 'Site visit completed'; recipientId = visit.customerId;
      notificationTitle = 'Site visit completed'; notificationBody = `${visit.jobTitle}: the site visit is recorded as complete. The tradesperson can now prepare the BuildPair quote.`;
    }

    const updated = await sql`
      UPDATE job_site_visits
      SET status = ${nextStatus},
          responded_at = CASE WHEN ${nextStatus} IN ('confirmed', 'declined') THEN now() ELSE responded_at END,
          completed_at = CASE WHEN ${nextStatus} = 'completed' THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE id = ${payload.id}
      RETURNING id,
                job_id AS "jobId",
                customer_id AS "customerId",
                trader_id AS "traderId",
                proposed_at AS "proposedAt",
                status,
                note,
                responded_at AS "respondedAt",
                completed_at AS "completedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
    ` as unknown as SiteVisitRow[];

    await addJobEvent(visit.jobId, userId, eventType, eventTitle, visitLabel(visit.proposedAt), { siteVisitId: visit.id });
    const recipientPath = recipientId === visit.customerId ? 'customer' : 'trader';
    await createNotification(recipientId, {
      type: eventType,
      title: notificationTitle,
      body: notificationBody,
      href: visit.conversationId ? `/${recipientPath}/messages/${visit.conversationId}` : recipientPath === 'customer' ? `/customer/jobs/${visit.jobId}` : '/trader/job-board',
      email: nextStatus === 'confirmed',
    });
    return Response.json(updated[0]);
  } catch (error) { return jsonError(error); }
}
