import { z } from 'zod';
import { MARKETPLACE_OPEN } from '@/lib/launch-config';
import { createNotification } from '@/lib/notifications';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({ token: z.string().min(32).max(200) });

export async function POST(request: Request) {
  try {
    if (!MARKETPLACE_OPEN) throw new HttpError(423, 'Managed homeowner projects and BuildPay open when BuildPair launches.');
    const customer = await requireRole(request, 'customer');
    const { token } = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT q.id, q.status, q.managed_job_id AS "managedJobId", q.customer_email AS "customerEmail",
             q.trader_id AS "traderId", q.job_title AS "jobTitle", u.email AS "accountEmail"
      FROM business_quotes q
      JOIN users u ON u.id = ${customer.id}
      WHERE q.share_token = ${token}
      LIMIT 1
    ` as unknown as { id: string; status: string; managedJobId: string | null; customerEmail: string | null; traderId: string; jobTitle: string; accountEmail: string | null }[];
    const quote = rows[0];
    if (!quote) throw new HttpError(404, 'Quote not found.');
    if (quote.status !== 'accepted') throw new HttpError(409, 'Accept the quote before adding it to your BuildPair projects.');
    if (!quote.customerEmail || !quote.accountEmail || quote.customerEmail.trim().toLowerCase() !== quote.accountEmail.trim().toLowerCase()) {
      throw new HttpError(403, 'Sign in with the same email address the tradesperson used on this quote.');
    }

    const claimed = await getSql()`SELECT claim_external_business_quote(${quote.id}::uuid, ${customer.id}) AS "jobId"` as unknown as { jobId: string }[];
    const jobId = claimed[0]?.jobId;
    if (!jobId) throw new HttpError(500, 'The project could not be created.');

    await createNotification(quote.traderId, {
      type: 'external_quote_claimed',
      title: 'External customer joined the project',
      body: `${quote.jobTitle}: the accepted outside-customer quote is now a managed BuildPair project.`,
      href: `/trader/jobs/${jobId}`,
      email: true,
    }).catch(() => undefined);

    return Response.json({ jobId, alreadyClaimed: Boolean(quote.managedJobId) });
  } catch (error) {
    return jsonError(error);
  }
}
