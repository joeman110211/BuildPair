import { z } from 'zod';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const noteSchema = z.object({
  contactKey: z.string().trim().min(1).max(320),
  note: z.string().trim().min(1).max(2000),
  followUpAt: z.string().datetime().nullable().optional(),
});

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['complete','reopen']),
});

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const contactKey = new URL(request.url).searchParams.get('contactKey')?.trim();
    if (!contactKey) throw new HttpError(400, 'Customer key is required');

    const quotes = await getSql()`
      SELECT q.id, q.quote_number AS "quoteNumber", q.job_title AS "jobTitle", q.job_address AS "jobAddress",
             q.total_amount AS "totalAmount", q.status, q.managed_job_id AS "managedJobId",
             q.warranty_text AS "warrantyText", q.created_at AS "createdAt", q.updated_at AS "updatedAt",
             q.customer_name AS "customerName", q.customer_email AS "customerEmail", q.customer_phone AS "customerPhone"
      FROM business_quotes q
      WHERE q.trader_id = ${trader.id}
        AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = ${contactKey}
      ORDER BY q.updated_at DESC
    `;

    const invoices = await getSql()`
      SELECT i.id, i.invoice_number AS "invoiceNumber", i.total_amount AS "totalAmount", i.status,
             i.due_at AS "dueAt", i.created_at AS "createdAt", i.updated_at AS "updatedAt",
             i.customer_name AS "customerName", i.customer_email AS "customerEmail"
      FROM invoices i
      WHERE i.trader_id = ${trader.id}
        AND coalesce(nullif(lower(trim(i.customer_email)), ''), lower(trim(i.customer_name)) || ':') = ${contactKey}
      ORDER BY i.updated_at DESC
    `;

    const notes = await getSql()`
      SELECT id, note, follow_up_at AS "followUpAt", completed_at AS "completedAt",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM trader_customer_notes
      WHERE trader_id = ${trader.id} AND contact_key = ${contactKey}
      ORDER BY coalesce(follow_up_at, created_at) DESC
    `;

    const aftercare = await getSql()`
      SELECT e.id, e.job_id AS "jobId", e.entry_type AS "entryType", e.title, e.body,
             e.due_at AS "dueAt", e.status, e.created_at AS "createdAt"
      FROM job_workspace_entries e
      JOIN business_quotes q ON q.managed_job_id = e.job_id
      WHERE q.trader_id = ${trader.id}
        AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = ${contactKey}
        AND e.entry_type IN ('warranty','aftercare','handover')
        AND e.status <> 'archived'
      ORDER BY e.due_at NULLS LAST, e.created_at DESC
    `;

    const firstQuote = quotes[0] as Record<string, unknown> | undefined;
    const firstInvoice = invoices[0] as Record<string, unknown> | undefined;
    const name = String(firstQuote?.customerName ?? firstInvoice?.customerName ?? 'Customer');
    const email = (firstQuote?.customerEmail ?? firstInvoice?.customerEmail ?? null) as string | null;
    const phone = (firstQuote?.customerPhone ?? null) as string | null;
    const addresses = [...new Set(quotes.map((row) => (row as { jobAddress?: string | null }).jobAddress).filter((value): value is string => Boolean(value?.trim())))];
    const outstandingValue = invoices.reduce((sum, row) => ['sent','overdue'].includes(String((row as { status?: string }).status))
      ? sum + Number((row as { totalAmount?: number }).totalAmount ?? 0) : sum, 0);
    const managedJobs = [...new Set(quotes.map((row) => (row as { managedJobId?: string | null }).managedJobId).filter((value): value is string => Boolean(value)))];
    const nextFollowUp = (notes as { followUpAt?: string | null; completedAt?: string | null }[])
      .filter((row) => row.followUpAt && !row.completedAt && new Date(row.followUpAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.followUpAt!).getTime() - new Date(b.followUpAt!).getTime())[0]?.followUpAt ?? null;

    return Response.json({
      contactKey, name, email, phone, addresses, outstandingValue, managedJobs, nextFollowUp,
      quotes, invoices, notes, aftercare,
    });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = noteSchema.parse(await request.json());
    const rows = await getSql()`
      INSERT INTO trader_customer_notes(trader_id, contact_key, note, follow_up_at)
      VALUES (${trader.id}, ${input.contactKey}, ${input.note}, ${input.followUpAt ?? null})
      RETURNING id, note, follow_up_at AS "followUpAt", completed_at AS "completedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = actionSchema.parse(await request.json());
    const rows = await getSql()`
      UPDATE trader_customer_notes
      SET completed_at = CASE WHEN ${input.action} = 'complete' THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = ${input.id} AND trader_id = ${trader.id}
      RETURNING id, note, follow_up_at AS "followUpAt", completed_at AS "completedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    if (!rows.length) throw new HttpError(404, 'Customer note not found');
    return Response.json(rows[0]);
  } catch (error) { return jsonError(error); }
}
