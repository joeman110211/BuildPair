import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, quotes, reviews, traderProfiles } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const db = getDb();
    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
    if (!job) throw new HttpError(404, 'Job not found');
    const accepted = job.acceptedQuoteId ? await db.query.quotes.findFirst({ where: eq(quotes.id, job.acceptedQuoteId) }) : null;
    const allowed = job.customerId === userId || accepted?.traderId === userId;
    if (!allowed) throw new HttpError(403, 'You cannot access this job');

    const modeRows = await getSql()`SELECT payment_mode AS "paymentMode" FROM jobs WHERE id = ${id} LIMIT 1` as unknown as { paymentMode: 'undecided' | 'buildpair' | 'external' }[];
    const milestones = await getSql()`
      SELECT id, job_id AS "jobId", quote_id AS "quoteId", title, amount, status, kind,
             trigger_description AS "triggerDescription", sort_order AS "sortOrder", release_mode AS "releaseMode",
             completed_at AS "completedAt", paid_at AS "paidAt", funded_at AS "fundedAt",
             release_requested_at AS "releaseRequestedAt", release_approved_at AS "releaseApprovedAt",
             disputed_at AS "disputedAt", dispute_reason AS "disputeReason", payment_method AS "paymentMethod"
      FROM job_milestones WHERE job_id = ${id} ORDER BY sort_order ASC, created_at ASC
    `;
    const existingReview = job.customerId === userId ? await db.query.reviews.findFirst({ where: and(eq(reviews.jobId, id), eq(reviews.customerId, userId)) }) : null;
    let trader = null;
    if (accepted) trader = await db.query.traderProfiles.findFirst({ where: eq(traderProfiles.userId, accepted.traderId) });
    const payoutRows = accepted ? await getSql()`SELECT stripe_payouts_enabled AS "stripePayoutsEnabled" FROM trader_profiles WHERE user_id = ${accepted.traderId} LIMIT 1` as unknown as { stripePayoutsEnabled: boolean }[] : [];
    const variations = await getSql()`
      SELECT id, job_id AS "jobId", trader_id AS "traderId", customer_id AS "customerId", title, description,
             amount_delta AS "amountDelta", duration_delta_days AS "durationDeltaDays", status,
             created_at AS "createdAt", responded_at AS "respondedAt"
      FROM job_variations WHERE job_id = ${id} ORDER BY created_at DESC
    `;
    const timeline = await getSql()`
      SELECT id, event_type AS "eventType", title, description, metadata, actor_id AS "actorId", created_at AS "createdAt"
      FROM job_events WHERE job_id = ${id} ORDER BY created_at ASC
    `;
    return Response.json({ job: { ...job, paymentMode: modeRows[0]?.paymentMode ?? 'undecided' }, acceptedQuote: accepted, milestones, trader: trader ? { ...trader, stripePayoutsEnabled: payoutRows[0]?.stripePayoutsEnabled ?? false } : null, existingReview, variations, timeline });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const payload = await request.json() as { action?: string; mode?: 'buildpair' | 'external' };
    const db = getDb();

    if (payload.action === 'cancel') {
      if (!modes.customerEnabled) throw new HttpError(403, 'Customer account required');
      const pendingTraders = await db.select({ traderId: quotes.traderId }).from(quotes).where(and(eq(quotes.jobId, id), eq(quotes.status, 'pending')));
      const [cancelled] = await db.update(jobs).set({ status: 'cancelled', updatedAt: new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.customerId, userId), isNull(jobs.acceptedQuoteId), inArray(jobs.status, ['open', 'quoted']))).returning();
      if (!cancelled) throw new HttpError(409, 'Only open jobs can be cancelled before a quote is accepted');
      await db.update(quotes).set({ status: 'declined', updatedAt: new Date() }).where(and(eq(quotes.jobId, id), eq(quotes.status, 'pending')));
      await addJobEvent(id, userId, 'job_cancelled', 'Job cancelled', cancelled.title);
      await Promise.allSettled(pendingTraders.map(({ traderId }) => createNotification(traderId, { type: 'job_cancelled', title: 'Job cancelled by homeowner', body: `${cancelled.title} is no longer accepting quotes.`, href: '/trader/my-jobs' })));
      return Response.json({ cancelled: true });
    }

    if (payload.action === 'set_payment_mode') {
      if (!modes.customerEnabled || !payload.mode) throw new HttpError(403, 'Homeowner payment choice required');
      const rows = await getSql()`
        SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode",
               q.trader_id AS "traderId", tp.stripe_account_id AS "stripeAccountId",
               tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        JOIN trader_profiles tp ON tp.user_id = q.trader_id
        WHERE j.id = ${id}
        LIMIT 1
      ` as unknown as { customerId: string; title: string; status: string; paymentMode: string; traderId: string; stripeAccountId: string | null; stripeChargesEnabled: boolean; stripePayoutsEnabled: boolean }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Active job not found');
      if (row.status !== 'in_progress') throw new HttpError(409, 'Payment choice is only available for an active accepted job');
      if (payload.mode === 'buildpair' && (!row.stripeAccountId || (!row.stripePayoutsEnabled && !row.stripeChargesEnabled))) {
        await createNotification(row.traderId, {
          type: 'payout_setup_required',
          title: 'Set up payouts to use BuildPair payments',
          body: `${row.title}: the homeowner wants to use BuildPair payments, but your Stripe payout setup is not complete yet.`,
          href: '/trader/subscription',
          email: true,
        });
        throw new HttpError(409, 'The tradesperson must finish Stripe payout setup before this job can use BuildPair payments. They have been notified.');
      }
      if (row.paymentMode === 'buildpair' && payload.mode === 'external') {
        const collected = await getSql()`SELECT 1 FROM payments WHERE job_id = ${id} AND status IN ('funded', 'released', 'paid', 'disputed') LIMIT 1`;
        if (collected.length) throw new HttpError(409, 'This job already has a BuildPair payment and can no longer switch to private payment');
      }
      await getSql()`UPDATE jobs SET payment_mode = ${payload.mode}, updated_at = now() WHERE id = ${id}`;
      if (payload.mode === 'buildpair') {
        await addJobEvent(id, userId, 'buildpair_payments_selected', 'BuildPair staged payments selected', 'The homeowner chose to keep the agreed payment stages and payment record inside BuildPair.');
        await createNotification(row.traderId, { type: 'payment_mode_selected', title: 'BuildPair payments selected', body: `${row.title}: the homeowner chose BuildPair staged payments. The next agreed stage must be funded before work on that stage progresses.`, href: `/trader/jobs/${id}`, email: true });
      } else {
        await addJobEvent(id, userId, 'external_payments_selected', 'Private payment arrangement selected', 'The homeowner chose to arrange payment outside BuildPair. BuildPair cannot process, control or recover private payments.');
        await createNotification(row.traderId, { type: 'external_payment_selected', title: 'Private payment arrangement selected', body: `${row.title}: the homeowner chose to arrange payments outside BuildPair. BuildPair payment-stage protections will not apply to those payments.`, href: `/trader/jobs/${id}`, email: true });
      }
      return Response.json({ paymentMode: payload.mode });
    }

    if (payload.action === 'complete_external') {
      if (!modes.customerEnabled) throw new HttpError(403, 'Homeowner account required');
      const rows = await getSql()`
        SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode", q.trader_id AS "traderId"
        FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
        WHERE j.id = ${id} LIMIT 1
      ` as unknown as { customerId: string; title: string; status: string; paymentMode: 'undecided' | 'buildpair' | 'external'; traderId: string }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Active job not found');
      if (row.status !== 'in_progress' || row.paymentMode !== 'external') throw new HttpError(409, 'Only an active privately managed job can be closed this way');
      const pendingVariation = await getSql()`SELECT 1 FROM job_variations WHERE job_id = ${id} AND status = 'pending' LIMIT 1`;
      if (pendingVariation.length) throw new HttpError(409, 'Resolve outstanding variations before closing the project');
      await db.update(jobs).set({ status: 'completed', updatedAt: new Date() }).where(eq(jobs.id, id));
      await addJobEvent(id, userId, 'external_job_completed', 'Privately managed job marked complete', 'The homeowner marked the project complete. BuildPair did not process or verify private payments on this job.');
      await createNotification(row.traderId, {
        type: 'external_job_completed',
        title: 'Privately managed job marked complete',
        body: `${row.title}: the homeowner marked the project complete. Private payment status is not verified by BuildPair.`,
        href: `/trader/jobs/${id}`,
        email: true,
      });
      return Response.json({ completed: true, paymentVerification: 'external_unverified' });
    }

    if (payload.action !== 'complete') throw new HttpError(400, 'Unsupported job action');
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
    const rows = await getSql()`
      SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode", q.trader_id AS "traderId"
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${id} LIMIT 1
    ` as unknown as { customerId: string; title: string; status: string; paymentMode: 'undecided' | 'buildpair' | 'external'; traderId: string }[];
    const owned = rows[0];
    if (!owned || owned.traderId !== userId) throw new HttpError(404, 'Job not found');
    if (owned.status !== 'in_progress') throw new HttpError(409, 'Only work in progress can be marked complete');
    const pendingVariation = await getSql()`SELECT 1 FROM job_variations WHERE job_id = ${id} AND status = 'pending' LIMIT 1`;
    if (pendingVariation.length) throw new HttpError(409, 'Resolve outstanding job variations before marking the work complete');
    if (owned.paymentMode === 'undecided') throw new HttpError(409, 'The homeowner must choose BuildPair or private payments first');
    if (owned.paymentMode === 'buildpair') {
      const unpaid = await getSql()`SELECT title FROM job_milestones WHERE job_id = ${id} AND status <> 'paid' ORDER BY sort_order ASC LIMIT 1` as unknown as { title: string }[];
      if (unpaid[0]) throw new HttpError(409, `${unpaid[0].title} must be completed and released before the job can be marked complete`);
    }
    await db.update(jobs).set({ status: 'completed', updatedAt: new Date() }).where(eq(jobs.id, id));
    await addJobEvent(id, userId, 'work_completed', 'Tradesperson marked work complete', owned.title);
    await createNotification(owned.customerId, {
      type: 'work_completed', title: 'Work marked complete', body: `${owned.title} has been marked complete. Review the project history and leave feedback when you are satisfied.`, href: `/customer/jobs/${id}`, email: true,
    });
    return Response.json({ completed: true });
  } catch (error) { return jsonError(error); }
}
