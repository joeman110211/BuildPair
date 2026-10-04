import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, quotes, traderProfiles } from '@/db/schema';
import { buildPayCustomerFee, buildPayFeeModeForRequest, plannedBuildPayChargeCount, type BuildPayFeeMode } from '@/lib/buildpay-fees';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { normalizeMaterialsFirstSchedule, paymentScheduleSchema, type PaymentStagePlan, validatePaymentSchedule } from '@/lib/payment-plan';
import { canAcceptNewQuote } from '@/lib/quote-marketplace';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { effectiveTraderCategories, hasActiveLeadAccess, traderMonthlyQuoteLimit } from '@/lib/subscription';
import { quoteSchema } from '@/lib/validation';

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function ensureMarketplaceOfferAllowance(traderId: string, jobId: string, profile: { subscriptionTier: 'free' | 'core' | 'basic' | 'featured' }) {
  const sql = getSql();
  const existing = await sql`SELECT id FROM trader_job_offers WHERE job_id = ${jobId} AND trader_id = ${traderId} LIMIT 1`;
  if (existing.length) return;
  const limit = traderMonthlyQuoteLimit(profile);
  const usage = await sql`
    SELECT count(*)::int AS count FROM trader_job_offers
    WHERE trader_id = ${traderId}
      AND created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now()) + interval '1 month'
  ` as unknown as { count: number }[];
  if ((usage[0]?.count ?? 0) >= limit) throw new HttpError(402, `You have used all ${limit} open-marketplace offers for this month. Your allowance resets next month.`);
  await sql`INSERT INTO trader_job_offers(job_id, trader_id) VALUES (${jobId}, ${traderId}) ON CONFLICT (job_id, trader_id) DO NOTHING`;
}

function fallbackSchedule(totalAmount: number, materialsAmount: number, depositAmount: number): PaymentStagePlan[] {
  const stages: PaymentStagePlan[] = [];
  const materials = Math.max(0, Math.min(totalAmount, materialsAmount));
  const serviceBalance = Math.max(0, totalAmount - materials);
  if (materials > 0) stages.push({ key: 'materials', title: 'Materials payment', amount: materials, kind: 'materials', trigger: 'Due after quote acceptance so agreed materials can be ordered.', sortOrder: stages.length + 1 });
  const deposit = Math.max(0, Math.min(serviceBalance, depositAmount));
  if (deposit > 0 && deposit < serviceBalance) stages.push({ key: 'deposit', title: 'Protected start deposit', amount: deposit, kind: 'deposit', trigger: 'Released after the agreed start/material-arrival point is confirmed.', sortOrder: stages.length + 1 });
  const finalAmount = serviceBalance - (deposit > 0 && deposit < serviceBalance ? deposit : 0);
  if (finalAmount > 0) stages.push({ key: 'final', title: 'Final payment', amount: finalAmount, kind: 'final', trigger: 'Released after the agreed work is complete and approved.', sortOrder: stages.length + 1 });
  return stages;
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const rows = await getDb().select().from(quotes).where(eq(quotes.traderId, trader.id)).orderBy(desc(quotes.updatedAt));
    const plans = await getSql()`
      SELECT id, cost_items AS "costItems", payment_schedule AS "paymentSchedule", payment_schedule_status AS "paymentScheduleStatus",
             payment_schedule_revision AS "paymentScheduleRevision", buildpay_requested_by AS "buildPayRequestedBy",
             buildpay_fee_mode AS "buildPayFeeMode", buildpay_customer_fee_estimate AS "buildPayCustomerFeeEstimate"
      FROM quotes WHERE trader_id = ${trader.id}
    ` as unknown as { id: string; costItems: unknown[]; paymentSchedule: PaymentStagePlan[]; paymentScheduleStatus: string; paymentScheduleRevision: number; buildPayRequestedBy: 'trader' | 'customer' | null; buildPayFeeMode: BuildPayFeeMode | null; buildPayCustomerFeeEstimate: number }[];
    const byId = new Map(plans.map((plan) => [plan.id, plan]));
    return Response.json(rows.map((row) => ({ ...row, ...(byId.get(row.id) ?? {}) })));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await assertRateLimit(request, 'send-quote', 60, 3600, trader.id);
    const db = getDb();
    const profile = await db.query.traderProfiles.findFirst({ where: eq(traderProfiles.userId, trader.id) });
    if (!profile) throw new HttpError(409, 'Complete your trader profile before quoting');

    const raw = await request.json() as Record<string, unknown>;
    const payload = quoteSchema.parse(raw);
    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, payload.jobId) });
    if (!job || !['open', 'quoted'].includes(job.status)) throw new HttpError(409, 'This job is not open for quotes');
    if (job.targetTraderId && job.targetTraderId !== trader.id) throw new HttpError(403, 'This direct request belongs to another tradesperson');
    if (!hasActiveLeadAccess(profile)) throw new HttpError(402, 'An active BuildPair Core, Plus or Pro membership is required to send quotes and use pre-award messaging');

    const intakeRows = await getSql()`
      SELECT j.quote_intake_closed_at AS "quoteIntakeClosedAt",
             (
               SELECT count(DISTINCT responder.trader_id)::int
               FROM (
                 SELECT q.trader_id FROM quotes q WHERE q.job_id = j.id AND q.status = 'pending'
                 UNION
                 SELECT p.trader_id FROM job_proposals p WHERE p.job_id = j.id AND p.status IN ('pending','shortlisted')
               ) responder
             ) AS "activeQuoteCount",
             (
               EXISTS(SELECT 1 FROM quotes q WHERE q.job_id = j.id AND q.trader_id = ${trader.id} AND q.status = 'pending')
               OR EXISTS(SELECT 1 FROM job_proposals p WHERE p.job_id = j.id AND p.trader_id = ${trader.id} AND p.status IN ('pending','shortlisted'))
             ) AS "traderAlreadyQuoted"
      FROM jobs j
      WHERE j.id = ${payload.jobId}
      LIMIT 1
    ` as unknown as { quoteIntakeClosedAt: string | null; activeQuoteCount: number; traderAlreadyQuoted: boolean | null }[];
    const intake = intakeRows[0];
    if (!intake || !canAcceptNewQuote({ intakeClosedAt: intake.quoteIntakeClosedAt, activeQuoteCount: intake.activeQuoteCount, traderAlreadyQuoted: Boolean(intake.traderAlreadyQuoted) })) {
      throw new HttpError(409, 'The homeowner has enough quotes to compare and is not accepting additional quotes right now.');
    }

    const visitRows = await getSql()`
      SELECT status
      FROM job_site_visits
      WHERE job_id = ${payload.jobId} AND trader_id = ${trader.id}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    ` as unknown as { status: string }[];
    if (visitRows[0]?.status === 'confirmed') {
      throw new HttpError(409, 'Mark the confirmed site visit completed in BuildPair before sending the post-visit quote.');
    }

    if (!job.targetTraderId) {
      const listedCategories = effectiveTraderCategories(profile, profile.tradeCategories, profile.tradeCategory);
      if (!listedCategories.includes(job.category)) throw new HttpError(403, 'This marketplace job does not match one of your selected trade categories');
      if (profile.latitude == null || profile.longitude == null || job.latitude == null || job.longitude == null) throw new HttpError(403, 'Location matching is required to quote this marketplace job');
      const miles = distanceMiles(profile.latitude, profile.longitude, job.latitude, job.longitude);
      if (miles > profile.radiusMiles) throw new HttpError(403, 'This marketplace job is outside your service radius');
      await ensureMarketplaceOfferAllowance(trader.id, job.id, profile);
    }

    const totalAmount = payload.laborCost + payload.materialsCost + payload.vatAmount;
    const suppliedSchedule = raw.paymentSchedule == null ? fallbackSchedule(totalAmount, payload.materialsCost, payload.depositAmount) : paymentScheduleSchema.parse(raw.paymentSchedule);
    let paymentSchedule: PaymentStagePlan[];
    try {
      paymentSchedule = raw.paymentSchedule == null ? validatePaymentSchedule(suppliedSchedule, totalAmount, payload.materialsCost) : normalizeMaterialsFirstSchedule(suppliedSchedule, totalAmount, payload.materialsCost);
    } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid payment plan'); }

    const requestBuildPay = raw.requestBuildPay === true;
    const requestedFeeMode = raw.buildPayFeeMode === 'trader_absorbs' ? 'trader_absorbs' : raw.buildPayFeeMode === 'customer_pays' ? 'customer_pays' : null;
    let buildPayFeeMode: BuildPayFeeMode | null = null;
    let buildPayCustomerFeeEstimate = 0;
    if (requestBuildPay) {
      if (!profile.stripeAccountId || !profile.stripePayoutsEnabled) throw new HttpError(409, 'Finish Stripe payout setup before sending a quote that requires BuildPay.');
      buildPayFeeMode = buildPayFeeModeForRequest('trader', requestedFeeMode);
      if (buildPayFeeMode === 'customer_pays') {
        buildPayCustomerFeeEstimate = buildPayCustomerFee({ contractAmount: totalAmount, laborServiceAmount: payload.laborCost, plannedChargeCount: plannedBuildPayChargeCount(paymentSchedule) }).customerFee;
      }
    }

    const validUntil = payload.validUntil ? new Date(payload.validUntil) : null;
    const proposedStartAt = payload.proposedStartAt ? new Date(payload.proposedStartAt) : null;
    const quoteValues = {
      jobId: payload.jobId, traderId: trader.id, laborCost: payload.laborCost, materialsCost: payload.materialsCost,
      vatAmount: payload.vatAmount, depositAmount: payload.depositAmount, totalAmount, paymentTerms: payload.paymentTerms,
      scope: payload.scope ?? null, exclusions: payload.exclusions ?? null, notes: payload.notes ?? null,
      durationDays: payload.durationDays ?? null, warrantyMonths: payload.warrantyMonths ?? null, proposedStartAt, validUntil,
    };
    const [quote] = await db.insert(quotes).values(quoteValues).onConflictDoUpdate({ target: [quotes.jobId, quotes.traderId], set: { ...quoteValues, status: 'pending', updatedAt: new Date() } }).returning();
    if (!quote) throw new Error('Quote could not be saved');

    const costItems = Array.isArray(raw.costItems) ? raw.costItems : [];
    await getSql()`
      UPDATE quotes
      SET cost_items = ${JSON.stringify(costItems)}::jsonb,
          payment_schedule = ${JSON.stringify(paymentSchedule)}::jsonb,
          payment_schedule_status = 'proposed', payment_schedule_revision = payment_schedule_revision + 1,
          payment_schedule_updated_by = ${trader.id},
          buildpay_requested_by = ${requestBuildPay ? 'trader' : null},
          buildpay_fee_mode = ${buildPayFeeMode},
          buildpay_customer_fee_estimate = ${buildPayCustomerFeeEstimate}, updated_at = now()
      WHERE id = ${quote.id}
    `;
    await getSql()`
      UPDATE job_proposals
      SET status = 'converted', responded_at = coalesce(responded_at, now()), updated_at = now()
      WHERE job_id = ${payload.jobId} AND trader_id = ${trader.id} AND status IN ('pending','shortlisted')
    `;
    await db.update(jobs).set({ status: 'quoted', updatedAt: new Date() }).where(eq(jobs.id, payload.jobId));
    const conversations = await getSql()`INSERT INTO conversations(job_id, customer_id, trader_id) VALUES (${payload.jobId}, ${job.customerId}, ${trader.id}) ON CONFLICT (job_id, customer_id, trader_id) DO UPDATE SET updated_at = now() RETURNING id` as unknown as { id: string }[];

    const buildPayCopy = requestBuildPay ? buildPayFeeMode === 'trader_absorbs' ? ' BuildPay is requested and the tradesperson has chosen to absorb the BuildPay fee.' : ` BuildPay is requested with an estimated ${formatPence(buildPayCustomerFeeEstimate)} service fee shown separately to the homeowner.` : '';
    await addJobEvent(payload.jobId, trader.id, 'quote_received', 'Quote received', `${profile.businessName} submitted a quote with ${paymentSchedule.length} payment stage${paymentSchedule.length === 1 ? '' : 's'}.${buildPayCopy}`, { quoteId: quote.id, totalAmount, materialsAmount: payload.materialsCost, laborServiceAmount: payload.laborCost, buildPayRequestedBy: requestBuildPay ? 'trader' : null, buildPayFeeMode, buildPayCustomerFeeEstimate });
    await createNotification(job.customerId, { type: 'quote_received', title: `New quote from ${profile.businessName}`, body: `A quote for ${job.title} is ready to review, including its payment schedule${requestBuildPay ? ' and BuildPay terms' : ''}.`, href: `/customer/compare/${job.id}`, email: true });
    return Response.json({ ...quote, costItems, paymentSchedule, paymentScheduleStatus: 'proposed', buildPayRequestedBy: requestBuildPay ? 'trader' : null, buildPayFeeMode, buildPayCustomerFeeEstimate, conversationId: conversations[0]?.id ?? null }, { status: 201 });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
