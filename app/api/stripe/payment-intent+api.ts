import { z } from 'zod';
import { getDb } from '@/db/client';
import { payments } from '@/db/schema';
import { feeableQuoteAmount, stagePlatformFee, validateStripeStageAmount } from '@/lib/payment-protection';
import { platformFeePercent } from '@/lib/platform-fee';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

const schema = z.object({ milestoneId: z.uuid(), platform: z.enum(['native', 'web']).default('native') });

type PaymentRow = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  milestoneKind: 'materials' | 'deposit' | 'stage' | 'final';
  sortOrder: number;
  jobId: string;
  jobTitle: string;
  customerId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  traderId: string;
  quoteId: string;
  quoteTotal: number;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
};

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind", m.sort_order AS "sortOrder",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
             q.trader_id AS "traderId", q.id AS "quoteId", q.total_amount AS "quoteTotal",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled",
             tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE m.id = ${input.milestoneId}
      LIMIT 1
    ` as unknown as PaymentRow[];
    const row = rows[0];
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Payment stage not found');
    if (row.paymentMode !== 'buildpair') throw new HttpError(409, 'Choose BuildPair staged payments on the job before paying through BuildPair');
    if (row.milestoneStatus !== 'pending') {
      const label = row.milestoneStatus === 'paid' ? 'already released' : row.milestoneStatus === 'disputed' ? 'paused because an issue was raised' : 'already funded';
      throw new HttpError(409, `This payment stage is ${label}`);
    }
    if (!row.stripeAccountId || (!row.stripePayoutsEnabled && !row.stripeChargesEnabled)) throw new HttpError(409, 'The tradesperson must complete Stripe payout onboarding before BuildPair can take this payment');

    const earlier = await getSql()`
      SELECT title, status FROM job_milestones
      WHERE job_id = ${row.jobId} AND sort_order < ${row.sortOrder}
      ORDER BY sort_order ASC
    ` as unknown as { title: string; status: string }[];
    const unfinished = earlier.find((stage) => stage.status !== 'paid');
    if (unfinished) throw new HttpError(409, `${unfinished.title} must be completed and released before the next stage can be funded`);

    try { validateStripeStageAmount(row.milestoneAmount); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Payment amount is below Stripe minimum'); }

    const depositRows = await getSql()`
      SELECT COALESCE(SUM(amount), 0)::int AS "depositTotal"
      FROM job_milestones
      WHERE quote_id = ${row.quoteId} AND kind = 'deposit'
    ` as unknown as { depositTotal: number }[];
    const depositTotal = Math.max(0, Number(depositRows[0]?.depositTotal ?? 0));
    const platformFeeBase = feeableQuoteAmount(row.quoteTotal, depositTotal);

    const stripe = getStripe();
    const fee = stagePlatformFee(row.milestoneKind, row.quoteTotal, depositTotal);
    if (fee > row.milestoneAmount) throw new HttpError(409, 'The final payment is too small to cover the BuildPair transaction fee. The payment schedule must be revised.');
    const transferGroup = `buildpair_job_${row.jobId}`;
    const metadata = {
      buildpairJobId: row.jobId,
      milestoneId: row.milestoneId,
      customerId: customer.id,
      traderId: row.traderId,
      milestoneKind: row.milestoneKind,
      depositTotal: String(depositTotal),
      platformFeeBase: String(platformFeeBase),
      platformFeePercent: String(platformFeePercent()),
      platformFeeAmount: String(fee),
      transferGroup,
    };

    if (input.platform === 'web') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customer.email ?? undefined,
        line_items: [{ price_data: { currency: 'gbp', product_data: { name: `${row.milestoneTitle}: ${row.jobTitle}` }, unit_amount: row.milestoneAmount }, quantity: 1 }],
        payment_intent_data: { metadata, transfer_group: transferGroup },
        success_url: providerReturnUrl('payment', 'complete', { jobId: row.jobId }),
        cancel_url: providerReturnUrl('payment', 'cancelled', { jobId: row.jobId }),
        metadata,
      });
      return Response.json({ url: session.url });
    }

    const intent = await stripe.paymentIntents.create({
      amount: row.milestoneAmount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      transfer_group: transferGroup,
      metadata,
    });
    await getDb().insert(payments).values({
      jobId: row.jobId,
      milestoneId: row.milestoneId,
      customerId: customer.id,
      traderId: row.traderId,
      amount: row.milestoneAmount,
      platformFee: fee,
      stripePaymentIntentId: intent.id,
    });
    return Response.json({ clientSecret: intent.client_secret });
  } catch (error) { return jsonError(error); }
}
