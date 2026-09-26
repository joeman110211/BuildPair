import { accountModes, authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type Action = { id: string; priority: number; kind: string; title: string; body: string; href: string };

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const mode = modes.activeMode ?? user.role;
    const actions: Action[] = [];

    if (mode === 'customer' && modes.customerEnabled) {
      const jobs = await getSql()`
        SELECT j.id, j.title, j.status, j.payment_mode AS "paymentMode",
               m.id AS "milestoneId", m.title AS "milestoneTitle", m.status AS "milestoneStatus", m.kind AS "milestoneKind"
        FROM jobs j
        LEFT JOIN LATERAL (
          SELECT id, title, status, kind
          FROM job_milestones
          WHERE job_id = j.id AND status <> 'paid'
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        ) m ON true
        WHERE j.customer_id = ${userId}
          AND j.status IN ('open','quoted','in_progress')
        ORDER BY j.updated_at DESC
      ` as unknown as { id:string; title:string; status:string; paymentMode:string|null; milestoneId:string|null; milestoneTitle:string|null; milestoneStatus:string|null; milestoneKind:string|null }[];

      for (const job of jobs) {
        if (job.status === 'quoted') actions.push({ id:`quote:${job.id}`, priority:20, kind:'quote', title:`Review quotes · ${job.title}`, body:'A tradesperson has priced the job. Compare the active quotes, scope and payment stages.', href:`/customer/compare/${job.id}` });
        else if (job.status === 'in_progress' && (job.paymentMode ?? 'undecided') === 'undecided') actions.push({ id:`setup:${job.id}`, priority:5, kind:'setup', title:`Finish job setup · ${job.title}`, body:'Confirm the private job details, agreed start and payment route so both sides know what happens next.', href:`/customer/jobs/${job.id}/start` });
        else if (job.status === 'in_progress' && job.milestoneStatus === 'disputed') actions.push({ id:`issue:${job.id}`, priority:1, kind:'issue', title:`Resolve payment issue · ${job.title}`, body:`${job.milestoneTitle ?? 'A BuildPay stage'} is paused while an issue is resolved.`, href:`/customer/jobs/${job.id}` });
        else if (job.status === 'in_progress' && job.milestoneStatus === 'completed') actions.push({ id:`release:${job.id}`, priority:2, kind:'payment', title:`Review completed stage · ${job.title}`, body:`${job.milestoneTitle ?? 'A work stage'} is waiting for your release decision.`, href:`/customer/jobs/${job.id}` });
        else if (job.status === 'in_progress' && (job.paymentMode ?? '') === 'buildpair' && job.milestoneStatus === 'pending') actions.push({ id:`fund:${job.id}`, priority:8, kind:'payment', title:`Check next BuildPay stage · ${job.title}`, body:`${job.milestoneTitle ?? 'The next stage'} is waiting for funding or setup.`, href:`/customer/jobs/${job.id}` });
      }

      const care = await getSql()`
        SELECT e.id, e.job_id AS "jobId", e.title, e.entry_type AS "entryType", e.due_at AS "dueAt", j.title AS "jobTitle"
        FROM job_workspace_entries e
        JOIN jobs j ON j.id = e.job_id
        WHERE j.customer_id = ${userId}
          AND e.visibility = 'shared'
          AND e.entry_type IN ('warranty','aftercare')
          AND e.due_at IS NOT NULL
          AND e.due_at <= now() + interval '30 days'
          AND e.status NOT IN ('done','approved','archived')
        ORDER BY e.due_at ASC
        LIMIT 10
      ` as unknown as { id:string; jobId:string; title:string; entryType:string; dueAt:string; jobTitle:string }[];
      for (const item of care) actions.push({ id:`care:${item.id}`, priority:30, kind:'aftercare', title:`${item.entryType === 'warranty' ? 'Warranty' : 'Aftercare'} due · ${item.title}`, body:`${item.jobTitle} · ${new Date(item.dueAt).toLocaleDateString('en-GB')}`, href:'/customer/home-record' });
    }

    if (mode === 'trader' && modes.traderEnabled) {
      const jobs = await getSql()`
        SELECT j.id, j.title,
               m.title AS "milestoneTitle", m.status AS "milestoneStatus"
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        LEFT JOIN LATERAL (
          SELECT title, status
          FROM job_milestones
          WHERE job_id = j.id AND status <> 'paid'
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        ) m ON true
        WHERE q.trader_id = ${userId} AND j.status = 'in_progress'
        ORDER BY j.updated_at DESC
      ` as unknown as { id:string; title:string; milestoneTitle:string|null; milestoneStatus:string|null }[];
      for (const job of jobs) {
        if (job.milestoneStatus === 'disputed') actions.push({ id:`issue:${job.id}`, priority:1, kind:'issue', title:`Respond to project issue · ${job.title}`, body:`${job.milestoneTitle ?? 'A payment stage'} is paused. Keep the response and evidence with the project.`, href:`/trader/jobs/${job.id}` });
        else if (job.milestoneStatus === 'funded') actions.push({ id:`funded:${job.id}`, priority:10, kind:'payment', title:`Funded stage in progress · ${job.title}`, body:`Complete the agreed trigger for ${(job.milestoneTitle ?? 'the current stage').toLowerCase()}, then request release in BuildPair.`, href:`/trader/jobs/${job.id}` });
      }

      const quotes = await getSql()`
        SELECT id, quote_number AS "quoteNumber", customer_name AS "customerName", job_title AS "jobTitle"
        FROM business_quotes
        WHERE trader_id = ${userId}
          AND status IN ('sent','viewed')
          AND updated_at <= now() - interval '48 hours'
        ORDER BY updated_at ASC
        LIMIT 10
      ` as unknown as { id:string; quoteNumber:string; customerName:string; jobTitle:string }[];
      for (const quote of quotes) actions.push({ id:`business-quote:${quote.id}`, priority:25, kind:'quote', title:`Quote follow-up · ${quote.customerName}`, body:`${quote.quoteNumber} for ${quote.jobTitle} has been waiting at least 48 hours. A controlled reminder is available.`, href:'/trader/quotes' });

      const invoices = await getSql()`
        SELECT id, invoice_number AS "invoiceNumber", customer_name AS "customerName", due_at AS "dueAt", status
        FROM invoices
        WHERE trader_id = ${userId}
          AND status IN ('sent','overdue')
          AND (status = 'overdue' OR due_at IS NULL OR due_at <= now() + interval '3 days')
        ORDER BY due_at NULLS FIRST
        LIMIT 10
      ` as unknown as { id:string; invoiceNumber:string; customerName:string; dueAt:string|null; status:string }[];
      for (const invoice of invoices) actions.push({ id:`invoice:${invoice.id}`, priority:invoice.status === 'overdue' ? 3 : 22, kind:'invoice', title:`${invoice.status === 'overdue' ? 'Overdue invoice' : 'Invoice due soon'} · ${invoice.customerName}`, body:`${invoice.invoiceNumber}${invoice.dueAt ? ` · due ${new Date(invoice.dueAt).toLocaleDateString('en-GB')}` : ''}. Open invoices to review or send a controlled reminder.`, href:'/trader/invoices' });
    }

    actions.sort((a,b) => a.priority - b.priority || a.title.localeCompare(b.title));
    return Response.json({ mode, title: 'Needs attention', actions: actions.slice(0, 30) });
  } catch (error) { return jsonError(error); }
}
