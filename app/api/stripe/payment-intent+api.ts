import { z } from 'zod';
import { getDb } from '@/db/client';
import { payments } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

const schema = z.object({ milestoneId: z.uuid(), platform: z.enum(['native', 'web']).default('native') });

type PaymentRow = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: 'pending' | 'completed' | 'paid';
  milestoneKind: 'materials' | 'deposit' | 'stage' | 'final';
  jobId: string;
  jobTitle: string;
  customerId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  traderId: string;
  quoteTotal: number;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
};

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
             q.trader_id AS "traderId", q.total_amount AS "quoteTotal",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled"
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
    if (row.milestoneStatus === 'paid') throw new HttpError(409, 'This payment stage is already paid');
    const upfront = row.milestoneKind === 'materials' || row.milestoneKind === 'deposit';
    if (!upfront && row.milestoneStatus !== 'completed') throw new HttpError(409, 'The tradesperson must mark this stage complete before it can be paid');
    if (!row.stripeAccountId || !row.stripeChargesEnabled) throw new HttpError(409, 'The tradesperson must complete Stripe payout onboarding before BuildPair can take this payment');

    const stripe = getStripe();
    const feePercent = Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 4)));
    const overallFee = Math.round(row.quoteTotal * feePercent / 100);
    const fee = row.milestoneKind === 'final' ? Math.min(row.milestoneAmount, overallFee) : 0;
    const metadata = {
      buildpairJobId: row.jobId,
      milestoneId: row.milestoneId,
      customerId: customer.id,
      traderId: row.traderId,
      milestoneKind: row.milestoneKind,
      platformFeePercent: String(feePercent),
    };

    if (input.platform === 'web') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customer.email ?? undefined,
        line_items: [{ price_data: { currency: 'gbp', product_data: { name: `${row.milestoneTitle}: ${row.jobTitle}` }, unit_amount: row.milestoneAmount }, quantity: 1 }],
        payment_intent_data: { application_fee_amount: fee, transfer_data: { destination: row.stripeAccountId }, metadata },
        success_url: providerReturnUrl('payment', 'complete'),
        cancel_url: providerReturnUrl('payment', 'cancelled'),
        metadata,
      });
      return Response.json({ url: session.url });
    }

    const intent = await stripe.paymentIntents.create({
      amount: row.milestoneAmount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: fee,
      transfer_data: { destination: row.stripeAccountId },
      metadata,
    });
    await getDb().insert(payments).values({ jobId: row.jobId, milestoneId: row.milestoneId, customerId: customer.id, traderId: row.traderId, amount: row.milestoneAmount, platformFee: fee, stripePaymentIntentId: intent.id });
    return Response.json({ clientSecret: intent.client_secret });
  } catch (error) { return jsonError(error); }
}
