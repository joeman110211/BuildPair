import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, quotes, reviews, traderProfiles } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { validateProtectedPaymentEconomics } from '@/lib/payment-protection';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { BUILDPAY_OPEN } from '@/lib/launch-config';

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

    const modeRows = await getSql()`
      SELECT payment_mode AS "paymentMode", start_agreed_at AS "startAgreedAt", start_proposed_by AS "startProposedBy",
             scheduled_start_at AS "scheduledStartAt"
      FROM jobs WHERE id = ${id} LIMIT 1
    ` as unknown as { paymentMode: 'undecided' | 'buildpair' | 'external'; startAgreedAt: string | null; startProposedBy: string | null; scheduledStartAt: string | null }[];
    const jobState = modeRows[0];
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
    const variations = await getSql()`SELECT id, job_id AS "jobId", trader_id AS "traderId", customer_id AS "customerId", title, description, amount_delta AS "amountDelta", duration_delta_days AS "durationDeltaDays", status, created_at AS "createdAt", responded_at AS "respondedAt" FROM job_variations WHERE job_id = ${id} ORDER BY created_at DESC`;
    const timeline = await getSql()`SELECT id, event_type AS "eventType", title, description, metadata, actor_id AS "actorId", created_at AS "createdAt" FROM job_events WHERE job_id = ${id} ORDER BY created_at ASC`;
    return Response.json({
      job: {
        ...job,
        paymentMode: jobState?.paymentMode ?? 'undecided',
        startAgreedAt: jobState?.startAgreedAt ?? null,
        startProposedBy: jobState?.startProposedBy ?? null,
        scheduledStartAt: jobState?.scheduledStartAt ?? job.scheduledStartAt,
      },
      acceptedQuote: accepted,
      milestones,
      trader: trader ? { ...trader, stripePayoutsEnabled: payoutRows[0]?.stripePayoutsEnabled ?? false } : null,
      existingReview,
      variations,
      timeline,
    });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const payload = await request.json() as { action?: string; mode?: 'buildpair' | 'external'; acknowledgedPaymentTerms?: boolean; startAt?: string };
    if (!BUILDPAY_OPEN && payload.action === 'set_payment_mode' && payload.mode === 'buildpair') throw new HttpError(423, 'BuildPay is coming soon. Choose direct payment.');
    const db = getDb();

    if (payload.action === 'cancel') {
      if (!modes.customerEnabled) throw new HttpError(403, 'Customer account required');
      const pendingTraders = await db.select({ traderId: quotes.traderId }).from(quotes).where(and(eq(quotes.jobId, id), eq(quotes.status, 'pending')));
      const [cancelled] = await db.update(jobs).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(jobs.id, id), eq(jobs.customerId, userId), isNull(jobs.acceptedQuoteId), inArray(jobs.status, ['open', 'quoted']))).returning();
      if (!cancelled) throw new HttpError(409, 'Only open jobs can be cancelled before a quote is accepted');
      await db.update(quotes).set({ status: 'declined', updatedAt: new Date() }).where(and(eq(quotes.jobId, id), eq(quotes.status, 'pending')));
      await addJobEvent(id, userId, 'job_cancelled', 'Job cancelled', cancelled.title);
      await Promise.allSettled(pendingTraders.map(({ traderId }) => createNotification(traderId, { type: 'job_cancelled', title: 'Job cancelled by homeowner', body: `${cancelled.title} is no longer accepting quotes.`, href: '/trader/my-jobs' })));
      return Response.json({ cancelled: true });
    }

    if (payload.action === 'propose_start') {
      if (!modes.traderEnabled) throw new HttpError(403, 'Tradesperson account required');
      const startAt = payload.startAt ? new Date(payload.startAt) : null;
      if (!startAt || Number.isNaN(startAt.getTime())) throw new HttpError(400, 'Choose a valid start date and time');
      if (startAt.getTime() < Date.now() - 60 * 60 * 1000) throw new HttpError(400, 'The proposed start time cannot be in the past');
      if (startAt.getTime() > Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) throw new HttpError(400, 'Choose a start date within the next two years');
      const rows = await getSql()`
        SELECT j.customer_id AS "customerId", j.title, j.status, q.trader_id AS "traderId"
        FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE j.id = ${id} LIMIT 1
      ` as unknown as { customerId: string; title: string; status: string; traderId: string }[];
      const row = rows[0];
      if (!row || row.traderId !== userId) throw new HttpError(404, 'Awarded job not found');
      if (row.status !== 'in_progress') throw new HttpError(409, 'A start date can only be proposed for an active awarded job');
      await getSql()`UPDATE jobs SET scheduled_start_at = ${startAt.toISOString()}, start_agreed_at = NULL, start_proposed_by = ${userId}, updated_at = now() WHERE id = ${id}`;
      const when = formatUkDateTime(startAt);
      await addJobEvent(id, userId, 'job_start_proposed', 'Start date proposed', `${when} proposed by the tradesperson. The homeowner must confirm it before the opening BuildPay payment can be taken.`, { startAt: startAt.toISOString() });
      await createNotification(row.customerId, { type: 'job_start_proposed', title: `Start proposed · ${when}`, body: `${row.title}: confirm the proposed start date and time in BuildPair before making the opening BuildPay payment.`, href: `/customer/jobs/${id}/start`, email: true });
      return Response.json({ proposed: true, scheduledStartAt: startAt.toISOString(), startAgreedAt: null });
    }

    if (payload.action === 'confirm_start') {
      if (!modes.customerEnabled) throw new HttpError(403, 'Homeowner account required');
      const rows = await getSql()`
        SELECT j.customer_id AS "customerId", j.title, j.status, j.scheduled_start_at AS "scheduledStartAt", q.trader_id AS "traderId"
        FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE j.id = ${id} LIMIT 1
      ` as unknown as { customerId: string; title: string; status: string; scheduledStartAt: string | null; traderId: string }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Awarded job not found');
      if (row.status !== 'in_progress' || !row.scheduledStartAt) throw new HttpError(409, 'The tradesperson must propose a start date and time first');
      await getSql()`UPDATE jobs SET start_agreed_at = now(), updated_at = now() WHERE id = ${id}`;
      const when = formatUkDateTime(new Date(row.scheduledStartAt));
      await addJobEvent(id, userId, 'job_start_agreed', 'Start date agreed', `${when} confirmed by the homeowner.`, { startAt: row.scheduledStartAt });
      await createNotification(row.traderId, { type: 'job_start_agreed', title: `Start agreed · ${when}`, body: `${row.title}: the homeowner confirmed the start date and time. BuildPay setup can now move to the opening payment.`, href: `/trader/jobs/${id}`, email: true });
      return Response.json({ confirmed: true, scheduledStartAt: row.scheduledStartAt, startAgreedAt: new Date().toISOString() });
    }

    if (payload.action === 'set_payment_mode') {
      if (!modes.customerEnabled || !payload.mode) throw new HttpError(403, 'Homeowner payment choice required');
      if (payload.mode === 'buildpair' && payload.acknowledgedPaymentTerms !== true) throw new HttpError(400, 'Confirm that you reviewed the agreed payment stages and understand your responsibility for later BuildPay release approvals.');
      const rows = await getSql()`
        SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode",
               q.trader_id AS "traderId", q.total_amount AS "totalAmount", q.materials_cost AS "materialsCost", q.labor_cost AS "laborCost",
               tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
        FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id JOIN trader_profiles tp ON tp.user_id = q.trader_id
        WHERE j.id = ${id} LIMIT 1
      ` as unknown as { customerId: string; title: string; status: string; paymentMode: string; traderId: string; totalAmount: number; materialsCost: number; laborCost: number; stripeAccountId: string | null; stripeChargesEnabled: boolean; stripePayoutsEnabled: boolean }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Active job not found');
      if (row.status !== 'in_progress') throw new HttpError(409, 'Payment choice is only available for an active accepted job');

      if (payload.mode === 'buildpair') {
        if (!row.stripeAccountId || (!row.stripePayoutsEnabled && !row.stripeChargesEnabled)) {
          await createNotification(row.traderId, { type: 'payout_setup_required', title: 'Set up payouts to use BuildPay', body: `${row.title}: the homeowner wants to use BuildPay, but your Stripe payout setup is not complete yet.`, href: '/trader/subscription', email: true });
          throw new HttpError(409, 'The tradesperson must finish Stripe payout setup before this job can use BuildPay. They have been notified.');
        }
        const economicsRows = await getSql()`
          SELECT count(*)::int AS "stageCount",
                 COALESCE(SUM(CASE WHEN kind = 'materials' THEN amount ELSE 0 END), 0)::int AS "materialsStages",
                 count(*) FILTER (WHERE kind = 'materials')::int AS "materialsStageCount"
          FROM job_milestones WHERE job_id = ${id}
        ` as unknown as { stageCount: number; materialsStages: number; materialsStageCount: number }[];
        const economics = economicsRows[0] ?? { stageCount: 0, materialsStages: 0, materialsStageCount: 0 };
        if (economics.materialsStages !== row.materialsCost) throw new HttpError(409, 'The BuildPay schedule must contain a materials stage equal to the exact quoted materials amount before BuildPay can be selected.');
        const plannedChargeCount = Math.max(1, economics.stageCount - (economics.materialsStageCount > 0 && economics.stageCount > 1 ? 1 : 0));
        try {
          validateProtectedPaymentEconomics({ totalAmount: row.totalAmount, materialsAmount: row.materialsCost, laborServiceAmount: row.laborCost, chargeCount: plannedChargeCount });
        } catch (error) {
          throw new HttpError(409, error instanceof Error ? error.message : 'This BuildPay schedule cannot safely cover its processing costs.');
        }
      }

      if (row.paymentMode === 'buildpair' && payload.mode === 'external') {
        const collected = await getSql()`SELECT 1 FROM payments WHERE job_id = ${id} AND status IN ('funded', 'released', 'paid', 'disputed') LIMIT 1`;
        if (collected.length) throw new HttpError(409, 'This job already has a BuildPay payment and can no longer switch that payment to a direct arrangement');
      }
      await getSql()`UPDATE jobs SET payment_mode = ${payload.mode}, updated_at = now() WHERE id = ${id}`;
      if (payload.mode === 'buildpair') {
        await addJobEvent(id, userId, 'buildpay_selected', 'BuildPay selected', 'The homeowner selected BuildPay. The opening payment can combine the quoted materials with the first protected work stage. Materials release only after the tradesperson acknowledges the payment; work-stage money remains controlled until its agreed trigger is completed and the homeowner approves release.', { paymentTermsVersion: '2026-09-11-buildpay-v4', homeownerAcknowledgedPaymentTerms: true });
        await createNotification(row.traderId, { type: 'payment_mode_selected', title: 'BuildPay selected', body: `${row.title}: the homeowner selected BuildPay. BuildPair charges 1% only on labour/service value; materials and VAT are excluded, and Stripe processing is recovered at cost from controlled service payouts.`, href: `/trader/jobs/${id}`, email: true });
      } else {
        await addJobEvent(id, userId, 'direct_payments_selected', 'Direct payment selected', 'The homeowner chose to arrange payment directly with the tradesperson. BuildPair may record user confirmations but does not receive, hold, protect, release, refund, recover or independently verify money paid directly.');
        await createNotification(row.traderId, { type: 'external_payment_selected', title: 'Direct payment selected', body: `${row.title}: the homeowner chose to pay you directly. BuildPay controls do not apply; BuildPair can still keep the quote, messages, variations and two-party payment record.`, href: `/trader/jobs/${id}`, email: true });
      }
      return Response.json({ paymentMode: payload.mode });
    }

    if (payload.action === 'complete_external') {
      if (!modes.customerEnabled) throw new HttpError(403, 'Homeowner account required');
      const rows = await getSql()`SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode", q.trader_id AS "traderId" FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE j.id = ${id} LIMIT 1` as unknown as { customerId: string; title: string; status: string; paymentMode: 'undecided' | 'buildpair' | 'external'; traderId: string }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Active job not found');
      if (row.status !== 'in_progress' || row.paymentMode !== 'external') throw new HttpError(409, 'Only an active directly paid job can be closed this way');
      const pendingVariation = await getSql()`SELECT 1 FROM job_variations WHERE job_id = ${id} AND status = 'pending' LIMIT 1`;
      if (pendingVariation.length) throw new HttpError(409, 'Resolve outstanding variations before closing the project');
      await db.update(jobs).set({ status: 'completed', updatedAt: new Date() }).where(eq(jobs.id, id));
      await addJobEvent(id, userId, 'external_job_completed', 'Directly paid job marked complete', 'The homeowner marked the project complete. BuildPair did not process or independently verify direct payments on this job.');
      await createNotification(row.traderId, { type: 'external_job_completed', title: 'Directly paid job marked complete', body: `${row.title}: the homeowner marked the project complete. Direct payment status is based only on the project confirmations users chose to record.`, href: `/trader/jobs/${id}`, email: true });
      return Response.json({ completed: true, paymentVerification: 'external_user_declaration_only' });
    }

    if (payload.action !== 'complete') throw new HttpError(400, 'Unsupported job action');
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
    const rows = await getSql()`SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode", q.trader_id AS "traderId" FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE j.id = ${id} LIMIT 1` as unknown as { customerId: string; title: string; status: string; paymentMode: 'undecided' | 'buildpair' | 'external'; traderId: string }[];
    const owned = rows[0];
    if (!owned || owned.traderId !== userId) throw new HttpError(404, 'Job not found');
    if (owned.status !== 'in_progress') throw new HttpError(409, 'Only work in progress can be marked complete');
    const pendingVariation = await getSql()`SELECT 1 FROM job_variations WHERE job_id = ${id} AND status = 'pending' LIMIT 1`;
    if (pendingVariation.length) throw new HttpError(409, 'Resolve outstanding job variations before marking the work complete');
    if (owned.paymentMode === 'undecided') throw new HttpError(409, 'The homeowner must choose BuildPay or direct payments first');
    if (owned.paymentMode === 'buildpair') {
      const unpaid = await getSql()`SELECT title FROM job_milestones WHERE job_id = ${id} AND status <> 'paid' ORDER BY sort_order ASC LIMIT 1` as unknown as { title: string }[];
      if (unpaid[0]) throw new HttpError(409, `${unpaid[0].title} must be completed and released before the job can be marked complete`);
    }
    await db.update(jobs).set({ status: 'completed', updatedAt: new Date() }).where(eq(jobs.id, id));
    await addJobEvent(id, userId, 'work_completed', 'Tradesperson marked work complete', owned.title);
    await createNotification(owned.customerId, { type: 'work_completed', title: 'Work marked complete', body: `${owned.title} has been marked complete. Review the project history and leave feedback when you are satisfied.`, href: `/customer/jobs/${id}`, email: true });
    return Response.json({ completed: true });
  } catch (error) { return jsonError(error); }
}

function formatUkDateTime(value: Date) {
  return value.toLocaleString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
