import { z } from 'zod';
import { addJobEvent } from '@/lib/notifications';
import { MAX_ACTIVE_QUOTES_PER_JOB, quoteIntakeLabel } from '@/lib/quote-marketplace';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.object({ action: z.enum(['close', 'reopen']) });

type IntakeRow = {
  customerId: string;
  status: string;
  acceptedQuoteId: string | null;
  quoteIntakeClosedAt: string | null;
  activeQuoteCount: number;
  archivedQuoteCount: number;
};

async function readState(jobId: string) {
  const rows = await getSql()`
    SELECT j.customer_id AS "customerId", j.status, j.accepted_quote_id AS "acceptedQuoteId",
           j.quote_intake_closed_at AS "quoteIntakeClosedAt",
           count(q.id) FILTER (WHERE q.status = 'pending')::int AS "activeQuoteCount",
           count(q.id) FILTER (WHERE q.status IN ('declined','withdrawn'))::int AS "archivedQuoteCount"
    FROM jobs j
    LEFT JOIN quotes q ON q.job_id = j.id
    WHERE j.id = ${jobId}
    GROUP BY j.id
    LIMIT 1
  ` as unknown as IntakeRow[];
  return rows[0];
}

function publicState(row: IntakeRow) {
  const automaticallyFull = row.activeQuoteCount >= MAX_ACTIVE_QUOTES_PER_JOB;
  return {
    quoteIntakeClosedAt: row.quoteIntakeClosedAt,
    quoteIntakeClosed: Boolean(row.quoteIntakeClosedAt),
    activeQuoteCount: row.activeQuoteCount,
    archivedQuoteCount: row.archivedQuoteCount,
    canReceiveMoreQuotes: !row.acceptedQuoteId && ['open', 'quoted'].includes(row.status) && !row.quoteIntakeClosedAt && !automaticallyFull,
    intakeLabel: quoteIntakeLabel({ intakeClosedAt: row.quoteIntakeClosedAt, activeQuoteCount: row.activeQuoteCount }),
  };
}

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const customer = await requireRole(request, 'customer');
    const row = await readState(id);
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Job not found');
    return Response.json(publicState(row));
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = actionSchema.parse(await request.json());
    const row = await readState(id);
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Job not found');
    if (row.acceptedQuoteId || !['open', 'quoted'].includes(row.status)) throw new HttpError(409, 'Quote intake can only be changed before a quote is accepted');

    if (input.action === 'close') {
      if (!row.quoteIntakeClosedAt) {
        await getSql()`UPDATE jobs SET quote_intake_closed_at = now(), updated_at = now() WHERE id = ${id}`;
        await addJobEvent(id, customer.id, 'quote_intake_closed', 'Stopped receiving new quotes', 'The homeowner has enough quotes to compare. Existing quotes remain available for review and existing tradespeople can still respond to requested changes.');
      }
    } else {
      if (row.activeQuoteCount >= MAX_ACTIVE_QUOTES_PER_JOB) throw new HttpError(409, 'This job already has enough active quotes to compare. Decline one before reopening quote intake.');
      await getSql()`UPDATE jobs SET quote_intake_closed_at = NULL, updated_at = now() WHERE id = ${id}`;
      await addJobEvent(id, customer.id, 'quote_intake_reopened', 'Receiving new quotes again', 'The homeowner reopened this job to new quotes.');
    }

    const updated = await readState(id);
    if (!updated) throw new Error('Quote intake state could not be refreshed');
    return Response.json(publicState(updated));
  } catch (error) { return jsonError(error); }
}
