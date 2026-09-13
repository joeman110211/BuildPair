import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, quotes } from '@/db/schema';
import { BUILDPAY_FEE_TERMS_VERSION, buildPayCustomerFee, type BuildPayFeeMode, type BuildPayRequestedBy } from '@/lib/buildpay-fees';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { fullFundingSchedule, paymentScheduleSchema, type PaymentStagePlan, validatePaymentSchedule } from '@/lib/payment-plan';
import { validateProtectedPaymentEconomics } from '@/lib/payment-protection';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type QuotePaymentTermsRow = {
  paymentSchedule: unknown;
  status: string;
  buildPayRequestedBy: BuildPayRequestedBy | null;
  buildPayFeeMode: BuildPayFeeMode | null;
  buildPayCustomerFeeEstimate: number;
};

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const payload = await request.json() as {
      action?: string;
      paymentSchedule?: unknown;
      paymentPlanChoice?: 'full' | 'milestones';
      acknowledgedPaymentSchedule?: boolean;
      acknowledgedBuildPayFee?: boolean;
    };
    const db = getDb();

    if (payload.action === 'withdraw') {
      if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
      const [candidate] = await db.select({ quote: quotes, job: jobs }).from(quotes).innerJoin(jobs, eq(jobs.id, quotes.jobId)).where(and(eq(quotes.id, id), eq(quotes.traderId, userId))).limit(1);
      if (!candidate) throw new HttpError(404, 'Quote not found');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status) || candidate.job.acceptedQuoteId) throw new HttpError(409, 'This quote can no longer be withdrawn');
      await db.update(quotes).set({ status: 'withdrawn', updatedAt: new Date() }).where(and(eq(quotes.id, id), eq(quotes.traderId, userId), eq(quotes.status, 'pending')));
      await db.update(jobs).set({ status: 'open', updatedAt: new Date() }).where(and(eq(jobs.id, candidate.job.id), isNull(jobs.acceptedQuoteId), sql`not exists (select 1 from quotes q where q.job_id = ${candidate.job.id} and q.status = 'pending')`));
      await addJobEvent(candidate.job.id, userId, 'quote_withdrawn', 'Quote withdrawn', 'A tradesperson withdrew their quote.', { quoteId: id });
      await createNotification(candidate.job.customerId, { type: 'quote_withdrawn', title: 'A quote was withdrawn', body: `A tradesperson withdrew their quote for ${candidate.job.title}.`, href: `/customer/jobs/${candidate.job.id}` });
      return Response.json({ withdrawn: true });
    }

    const [candidate] = await db.select({ quote: quotes, job: jobs }).from(quotes).innerJoin(jobs, eq(jobs.id, quotes.jobId)).where(eq(quotes.id, id)).limit(1);
    if (!candidate) throw new HttpError(404, 'Quote not found');

    if (payload.action === 'decline') {
      if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This quote can no longer be declined');
      await db.update(quotes).set({ status: 'declined', updatedAt: new Date() }).where(eq(quotes.id, id));
      await db.update(jobs).set({ status: 'open', updatedAt: new Date() }).where(and(eq(jobs.id, candidate.job.id), isNull(jobs.acceptedQuoteId), sql`not exists (select 1 from quotes q where q.job_id = ${candidate.job.id} and q.status = 'pending')`));
      await addJobEvent(candidate.job.id, userId, 'quote_declined', 'Quote declined', 'The homeowner declined this quote.', { quoteId: id, traderId: candidate.quote.traderId });
      await createNotification(candidate.quote.traderId, { type: 'quote_declined', title: 'Your quote was declined', body: `${candidate.job.title}: the homeowner has declined this quote.`, href: '/trader/my-jobs', email: true });
      return Response.json({ declined: true });
    }

    if (payload.action === 'edit_payment_plan') {
      if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This quote can no longer be changed');
      let schedule: PaymentStagePlan[];
      try { schedule = validatePaymentSchedule(paymentScheduleSchema.parse(payload.paymentSchedule), candidate.quote.totalAmount, candidate.quote.materialsCost); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid payment stages'); }

      const termsRows = await getSql()`
        SELECT buildpay_requested_by AS "buildPayRequestedBy", buildpay_fee_mode AS "buildPayFeeMode"
        FROM quotes WHERE id = ${id} LIMIT 1
      ` as unknown as { buildPayRequestedBy: BuildPayRequestedBy | null; buildPayFeeMode: BuildPayFeeMode | null }[];
      const existing = termsRows[0];
      const buildPayRequestedBy: BuildPayRequestedBy = existing?.buildPayRequestedBy === 'trader' ? 'trader' : 'customer';
      const buildPayFeeMode: BuildPayFeeMode = existing?.buildPayRequestedBy === 'trader' && existing.buildPayFeeMode === 'trader_absorbs' ? 'trader_absorbs' : 'customer_pays';
      const buildPayCustomerFeeEstimate = buildPayFeeMode === 'customer_pays'
        ? buildPayCustomerFee({ contractAmount: candidate.quote.totalAmount, laborServiceAmount: candidate.quote.laborCost, plannedChargeCount: schedule.length }).customerFee
        : 0;

      await getSql()`
        UPDATE quotes
        SET payment_schedule = ${JSON.stringify(schedule)}::jsonb, payment_schedule_status = 'customer_edited',
            payment_schedule_revision = payment_schedule_revision + 1, payment_schedule_updated_by = ${userId},
            buildpay_requested_by = ${buildPayRequestedBy}, buildpay_fee_mode = ${buildPayFeeMode},
            buildpay_customer_fee_estimate = ${buildPayCustomerFeeEstimate}, updated_at = now()
        WHERE id = ${id}
      `;
      await addJobEvent(candidate.job.id, userId, 'payment_plan_edited', 'Payment stages edited', buildPayRequestedBy === 'customer'
        ? 'The homeowner proposed a revised staged payment schedule and requested BuildPay protection. The quote total and materials amount are unchanged; the optional BuildPay service fee is shown separately.'
        : 'The homeowner proposed a revised payment schedule without changing the quote total, materials amount or the tradesperson’s existing BuildPay fee choice.', { quoteId: id, buildPayRequestedBy, buildPayFeeMode, buildPayCustomerFeeEstimate });
      await createNotification(candidate.quote.traderId, { type: 'payment_plan_changed', title: 'Homeowner edited your payment stages', body: `${candidate.job.title}: review and accept the revised stages before the quote can be accepted.${buildPayRequestedBy === 'customer' ? ' The homeowner requested BuildPay and will pay the disclosed BuildPay service fee.' : ''}`, href: `/trader/quotes/review?quoteId=${encodeURIComponent(id)}`, email: true });
      return Response.json({ updated: true, paymentSchedule: schedule, paymentScheduleStatus: 'customer_edited', buildPayRequestedBy, buildPayFeeMode, buildPayCustomerFeeEstimate });
    }

    if (payload.action === 'accept_payment_plan') {
      if (!modes.traderEnabled || candidate.quote.traderId !== userId) throw new HttpError(403, 'Tradesperson account required');
      if (payload.acknowledgedPaymentSchedule !== true) throw new HttpError(400, 'Confirm that you reviewed the revised payment stages and understand your responsibility when later marking stages complete or requesting release.');
      if (candidate.quote.status !== 'pending' || !['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This payment plan can no longer be accepted');
      const rows = await getSql()`SELECT payment_schedule_status AS "status" FROM quotes WHERE id = ${id} LIMIT 1` as unknown as { status: string }[];
      if (rows[0]?.status !== 'customer_edited') throw new HttpError(409, 'There is no homeowner-edited payment plan waiting for approval');
      await getSql()`UPDATE quotes SET payment_schedule_status = 'agreed', payment_schedule_updated_by = ${userId}, updated_at = now() WHERE id = ${id}`;
      await addJobEvent(candidate.job.id, userId, 'payment_plan_agreed', 'Payment stages agreed', 'The tradesperson accepted the homeowner revised payment schedule and its recorded BuildPay fee responsibility. Controlled stages may only be requested for release when their agreed trigger has genuinely been reached.', { quoteId: id, tradespersonAcknowledgedPaymentSchedule: true });
      await createNotification(candidate.job.customerId, { type: 'payment_plan_agreed', title: 'Payment stages agreed', body: `${candidate.job.title}: the tradesperson accepted your revised stages. You can now accept the quote.`, href: `/customer/compare/${candidate.job.id}`, email: true });
      return Response.json({ agreed: true });
    }

    if (payload.action !== 'accept') throw new HttpError(400, 'Unsupported quote action');
    if (!modes.customerEnabled || candidate.job.customerId !== userId) throw new HttpError(403, 'Customer account required');
    if (payload.acknowledgedPaymentSchedule !== true) throw new HttpError(400, 'Confirm that you have reviewed the quote and payment schedule before accepting.');
    if (!['open', 'quoted'].includes(candidate.job.status)) throw new HttpError(409, 'This job already has an accepted quote');
    if (candidate.quote.status !== 'pending') throw new HttpError(409, 'This quote is no longer available');
    if (candidate.quote.validUntil && candidate.quote.validUntil.getTime() < Date.now()) throw new HttpError(409, 'This quote has expired. Ask the tradesperson for an updated quote.');

    const planRows = await getSql()`
      SELECT payment_schedule AS "paymentSchedule", payment_schedule_status AS "status",
             buildpay_requested_by AS "buildPayRequestedBy", buildpay_fee_mode AS "buildPayFeeMode",
             buildpay_customer_fee_estimate AS "buildPayCustomerFeeEstimate"
      FROM quotes WHERE id = ${id} LIMIT 1
    ` as unknown as QuotePaymentTermsRow[];
    const quoteTerms = planRows[0];
    if (quoteTerms?.status === 'customer_edited') throw new HttpError(409, 'The tradesperson must accept your edited payment stages before you can accept this quote');

    const paymentPlanChoice = payload.paymentPlanChoice ?? 'milestones';
    let acceptedSchedule: PaymentStagePlan[];
    if (paymentPlanChoice === 'full') {
      acceptedSchedule = validatePaymentSchedule(fullFundingSchedule(candidate.quote.totalAmount, candidate.quote.materialsCost), candidate.quote.totalAmount, candidate.quote.materialsCost);
      await getSql()`UPDATE quotes SET payment_schedule = ${JSON.stringify(acceptedSchedule)}::jsonb, payment_schedule_status = 'agreed', payment_schedule_revision = payment_schedule_revision + 1, payment_schedule_updated_by = ${userId}, updated_at = now() WHERE id = ${id}`;
    } else {
      try { acceptedSchedule = validatePaymentSchedule(paymentScheduleSchema.parse(quoteTerms?.paymentSchedule ?? []), candidate.quote.totalAmount, candidate.quote.materialsCost); }
      catch (error) { throw new HttpError(409, error instanceof Error ? error.message : 'The staged payment plan needs to be revised before acceptance.'); }
    }

    const buildPayRequestedBy = quoteTerms?.buildPayRequestedBy ?? null;
    const buildPayFeeMode = buildPayRequestedBy ? (quoteTerms?.buildPayFeeMode ?? 'customer_pays') : null;
    const buildPayCustomerFeeTotal = buildPayRequestedBy && buildPayFeeMode === 'customer_pays'
      ? buildPayCustomerFee({ contractAmount: candidate.quote.totalAmount, laborServiceAmount: candidate.quote.laborCost, plannedChargeCount: acceptedSchedule.length }).customerFee
      : 0;
    if (buildPayRequestedBy && buildPayFeeMode === 'customer_pays' && payload.acknowledgedBuildPayFee !== true) {
      throw new HttpError(400, `Confirm the BuildPay service fee and all-in total before accepting this quote.`);
    }

    if (buildPayRequestedBy) {
      const payoutRows = await getSql()`
        SELECT stripe_account_id AS "stripeAccountId", stripe_charges_enabled AS "stripeChargesEnabled", stripe_payouts_enabled AS "stripePayoutsEnabled"
        FROM trader_profiles WHERE user_id = ${candidate.quote.traderId} LIMIT 1
      ` as unknown as { stripeAccountId: string | null; stripeChargesEnabled: boolean; stripePayoutsEnabled: boolean }[];
      const payout = payoutRows[0];
      if (!payout?.stripeAccountId || (!payout.stripePayoutsEnabled && !payout.stripeChargesEnabled)) throw new HttpError(409, 'The tradesperson must finish Stripe payout setup before a BuildPay quote can be accepted.');
      if (buildPayFeeMode === 'trader_absorbs') {
        try {
          validateProtectedPaymentEconomics({
            totalAmount: candidate.quote.totalAmount,
            materialsAmount: candidate.quote.materialsCost,
            laborServiceAmount: candidate.quote.laborCost,
            chargeCount: acceptedSchedule.length,
          });
        } catch (error) { throw new HttpError(409, error instanceof Error ? error.message : 'This BuildPay schedule cannot safely cover its processing costs.'); }
      }
    }

    await getSql()`UPDATE quotes SET buildpay_customer_fee_estimate = ${buildPayCustomerFeeTotal}, updated_at = now() WHERE id = ${id}`;
    const otherQuotes = await db.select({ traderId: quotes.traderId }).from(quotes).where(and(eq(quotes.jobId, candidate.job.id), eq(quotes.status, 'pending')));
    await db.execute(sql`select accept_job_quote(${id}::uuid, ${userId}::text)`);
    if (buildPayRequestedBy) {
      await getSql()`
        UPDATE jobs
        SET payment_mode = 'buildpair', buildpay_requested_by = ${buildPayRequestedBy}, buildpay_fee_mode = ${buildPayFeeMode},
            buildpay_customer_fee_total = ${buildPayCustomerFeeTotal}, buildpay_fee_terms_version = ${BUILDPAY_FEE_TERMS_VERSION}, updated_at = now()
        WHERE id = ${candidate.job.id}
      `;
    } else {
      await getSql()`
        UPDATE jobs
        SET buildpay_requested_by = NULL, buildpay_fee_mode = NULL, buildpay_customer_fee_total = 0, buildpay_fee_terms_version = NULL, updated_at = now()
        WHERE id = ${candidate.job.id}
      `;
    }
    if (candidate.quote.proposedStartAt) await db.update(jobs).set({ scheduledStartAt: candidate.quote.proposedStartAt, updatedAt: new Date() }).where(eq(jobs.id, candidate.job.id));

    const feeCopy = buildPayRequestedBy
      ? buildPayFeeMode === 'customer_pays'
        ? ` BuildPay is part of the accepted deal; its ${formatPence(buildPayCustomerFeeTotal)} service fee was shown separately, making the all-in BuildPay total ${formatPence(candidate.quote.totalAmount + buildPayCustomerFeeTotal)}.`
        : ' BuildPay is part of the accepted deal and the tradesperson chose to absorb its payment costs, so the homeowner total stays at the quoted contract price.'
      : ' The payment route is chosen next.';
    await addJobEvent(candidate.job.id, userId, 'quote_accepted', 'Quote and payment schedule accepted', paymentPlanChoice === 'full'
      ? `The homeowner accepted the quote with materials first and one remaining service-balance stage.${feeCopy}`
      : `The homeowner accepted the quote with the agreed staged payment schedule.${feeCopy}`, { quoteId: id, traderId: candidate.quote.traderId, totalAmount: candidate.quote.totalAmount, paymentPlanChoice, homeownerAcknowledgedPaymentSchedule: true, buildPayRequestedBy, buildPayFeeMode, buildPayCustomerFeeTotal, buildPayFeeTermsVersion: buildPayRequestedBy ? BUILDPAY_FEE_TERMS_VERSION : null, homeownerAcknowledgedBuildPayFee: buildPayFeeMode === 'customer_pays' ? true : undefined });
    await createNotification(candidate.quote.traderId, { type: 'quote_accepted', title: 'Your quote was accepted', body: `You have won ${candidate.job.title}. The agreed ${paymentPlanChoice === 'full' ? 'one-balance' : 'staged'} payment schedule is now attached to the project.${buildPayRequestedBy ? ' BuildPay terms are locked to the accepted quote.' : ''}`, href: `/trader/jobs/${candidate.job.id}`, email: true });
    await createNotification(candidate.job.customerId, { type: 'job_started', title: 'Quote accepted · finish job setup', body: `${candidate.job.title} is now active. Confirm the private job address${buildPayRequestedBy ? ' and start details before the opening BuildPay payment' : ', then choose BuildPay or direct payment'}.`, href: `/customer/jobs/${candidate.job.id}/start`, email: true });
    await Promise.allSettled(otherQuotes.filter((quote) => quote.traderId !== candidate.quote.traderId).map((quote) => createNotification(quote.traderId, { type: 'quote_declined', title: 'Customer chose another quote', body: `${candidate.job.title} has been awarded to another tradesperson.`, href: '/trader/my-jobs' })));
    return Response.json({ accepted: true, paymentPlanChoice, paymentMode: buildPayRequestedBy ? 'buildpair' : 'undecided', buildPayRequestedBy, buildPayFeeMode, buildPayCustomerFeeTotal, scheduledStartAt: candidate.quote.proposedStartAt ?? null, next: `/customer/jobs/${candidate.job.id}/start` });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
