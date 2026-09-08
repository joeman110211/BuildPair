import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, quotes } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { paymentScheduleSchema, validatePaymentSchedule } from '@/lib/payment-plan';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const payload = await request.json() as { action?: string; paymentSchedule?: unknown };
    const db = getDb();

    if (payload.action === 'withdraw') {
      if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
      const [candidate] = await db.select({ quote: quotes, job: jobs }).from(quotes).innerJoin(jobs, eq(jobs.id, quotes.jobId))
        .where(and(eq(quotes.id, id), eq(quotes.traderId, userId))).limit(1);
      if (!candidate) throw new HttpError(404, 'Quote not found');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status) || candidate.job.acceptedQuoteId) throw new HttpError(409, 'This quote can no longer be withdrawn');

      await db.update(quotes).set({ status: 'withdrawn', updatedAt: new Date() }).where(and(eq(quotes.id, id), eq(quotes.traderId, userId), eq(quotes.status, 'pending')));
      await db.update(jobs).set({ status: 'open', updatedAt: new Date() }).where(and(
        eq(jobs.id, candidate.job.id),
        isNull(jobs.acceptedQuoteId),
        sql`not exists (select 1 from quotes q where q.job_id = ${candidate.job.id} and q.status = 'pending')`,
      ));
      await addJobEvent(candidate.job.id, userId, 'quote_withdrawn', 'Quote withdrawn', 'A tradesperson withdrew their quote.', { quoteId: id });
      await createNotification(candidate.job.customerId, {
        type: 'quote_withdrawn', title: 'A quote was withdrawn', body: `A tradesperson withdrew their quote for ${candidate.job.title}.`, href: `/customer/jobs/${candidate.job.id}`,
      });
      return Response.json({ withdrawn: true });
    }

    const [candidate] = await db.select({ quote: quotes, job: jobs }).from(quotes).innerJoin(jobs, eq(jobs.id, quotes.jobId))
      .where(eq(quotes.id, id)).limit(1);
    if (!candidate) throw new HttpError(404, 'Quote not found');

    if (payload.action === 'decline') {
      if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This quote can no longer be declined');
      await db.update(quotes).set({ status: 'declined', updatedAt: new Date() }).where(eq(quotes.id, id));
      await addJobEvent(candidate.job.id, userId, 'quote_declined', 'Quote declined', 'The homeowner declined this quote.', { quoteId: id, traderId: candidate.quote.traderId });
      await createNotification(candidate.quote.traderId, {
        type: 'quote_declined', title: 'Your quote was declined', body: `${candidate.job.title}: the homeowner has declined this quote.`, href: '/trader/my-jobs', email: true,
      });
      return Response.json({ declined: true });
    }

    if (payload.action === 'edit_payment_plan') {
      if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This quote can no longer be changed');
      let schedule;
      try {
        schedule = validatePaymentSchedule(paymentScheduleSchema.parse(payload.paymentSchedule), candidate.quote.totalAmount);
      } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : 'Invalid payment stages');
      }
      await getSql()`
        UPDATE quotes
        SET payment_schedule = ${JSON.stringify(schedule)}::jsonb,
            payment_schedule_status = 'customer_edited',
            payment_schedule_revision = payment_schedule_revision + 1,
            payment_schedule_updated_by = ${userId},
            updated_at = now()
        WHERE id = ${id}
      `;
      await addJobEvent(candidate.job.id, userId, 'payment_plan_edited', 'Payment stages edited', 'The homeowner proposed a revised payment schedule without changing the quote total.', { quoteId: id });
      await createNotification(candidate.quote.traderId, {
        type: 'payment_plan_changed', title: 'Homeowner edited your payment stages', body: `${candidate.job.title}: review and accept the revised stages before the quote can be accepted.`, href: '/trader/messages', email: true,
      });
      return Response.json({ updated: true, paymentSchedule: schedule, paymentScheduleStatus: 'customer_edited' });
    }

    if (payload.action === 'accept_payment_plan') {
      if (!modes.traderEnabled || candidate.quote.traderId !== userId) throw new HttpError(403, 'Tradesperson account required');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This payment plan can no longer be accepted');
      const rows = await getSql()`SELECT payment_schedule_status AS "status" FROM quotes WHERE id = ${id} LIMIT 1` as unknown as { status: string }[];
      if (rows[0]?.status !== 'customer_edited') throw new HttpError(409, 'There is no homeowner-edited payment plan waiting for approval');
      await getSql()`UPDATE quotes SET payment_schedule_status = 'agreed', payment_schedule_updated_by = ${userId}, updated_at = now() WHERE id = ${id}`;
      await addJobEvent(candidate.job.id, userId, 'payment_plan_agreed', 'Payment stages agreed', 'The tradesperson accepted the homeowner revised payment schedule.', { quoteId: id });
      await createNotification(candidate.job.customerId, {
        type: 'payment_plan_agreed', title: 'Payment stages agreed', body: `${candidate.job.title}: the tradesperson accepted your revised stages. You can now accept the quote.`, href: `/customer/compare/${candidate.job.id}`, email: true,
      });
      return Response.json({ agreed: true });
    }

    if (payload.action !== 'accept') throw new HttpError(400, 'Unsupported quote action');
    if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
    if (!['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This job already has an accepted quote');
    if (candidate.quote.status !== 'pending') throw new HttpError(409, 'This quote is no longer available');
    if (candidate.quote.validUntil && candidate.quote.validUntil.getTime() < Date.now()) throw new HttpError(409, 'This quote has expired. Ask the tradesperson for an updated quote.');
    const planRows = await getSql()`SELECT payment_schedule_status AS "status" FROM quotes WHERE id = ${id} LIMIT 1` as unknown as { status: string }[];
    if (planRows[0]?.status === 'customer_edited') throw new HttpError(409, 'The tradesperson must accept your edited payment stages before you can accept this quote');

    const otherQuotes = await db.select({ traderId: quotes.traderId }).from(quotes)
      .where(and(eq(quotes.jobId, candidate.job.id), eq(quotes.status, 'pending')));

    await db.execute(sql`select accept_job_quote(${id}::uuid, ${userId}::text)`);
    if (candidate.quote.proposedStartAt) {
      await db.update(jobs).set({ scheduledStartAt: candidate.quote.proposedStartAt, updatedAt: new Date() }).where(eq(jobs.id, candidate.job.id));
    }
    await addJobEvent(candidate.job.id, userId, 'quote_accepted', 'Quote accepted', 'The homeowner accepted the quote. Next choose BuildPair staged payments or an unprotected private payment arrangement.', { quoteId: id, traderId: candidate.quote.traderId, totalAmount: candidate.quote.totalAmount });
    await createNotification(candidate.quote.traderId, {
      type: 'quote_accepted',
      title: 'Your quote was accepted',
      body: `You have won ${candidate.job.title}. Open the job to see the agreed payment stages and what is due next.`,
      href: `/trader/jobs/${candidate.job.id}`,
      email: true,
    });
    await createNotification(candidate.job.customerId, {
      type: 'job_started',
      title: 'Quote accepted. Choose how to manage payments',
      body: `${candidate.job.title} is now an active project. Choose BuildPair staged payments or record that you are paying privately.`,
      href: `/customer/jobs/${candidate.job.id}`,
    });
    await Promise.allSettled(otherQuotes.filter((quote) => quote.traderId !== candidate.quote.traderId).map((quote) => createNotification(quote.traderId, {
      type: 'quote_declined', title: 'Customer chose another quote', body: `${candidate.job.title} has been awarded to another tradesperson.`, href: '/trader/my-jobs',
    })));
    return Response.json({ accepted: true, scheduledStartAt: candidate.quote.proposedStartAt ?? null });
  } catch (error) { return jsonError(error); }
}