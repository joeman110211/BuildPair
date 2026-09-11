import { z } from 'zod';
import { stagePlatformFee, validateStripeStageAmount, type FeeStage } from '@/lib/payment-protection';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

const schema = z.object({
  milestoneId: z.uuid().optional(),
  milestoneIds: z.array(z.uuid()).min(1).max(2).optional(),
  platform: z.enum(['native', 'web']).default('native'),
}).refine((value) => Boolean(value.milestoneId) !== Boolean(value.milestoneIds), {
  message: 'Provide one payment stage or a grouped initial payment',
});

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
  laborCost: number;
  materialsCost: number;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
};

type StageRow = FeeStage & { title: string; status: PaymentRow['milestoneStatus'] };

async function loadPaymentStage(id: string) {
  const rows = await getSql()`
    SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind", m.sort_order AS "sortOrder",
           j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
           q.trader_id AS "traderId", q.id AS "quoteId", q.total_amount AS "quoteTotal", q.labor_cost AS "laborCost", q.materials_cost AS "materialsCost",
           tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    WHERE m.id = ${id}
    LIMIT 1
  ` as unknown as PaymentRow[];
  return rows[0];
}

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const ids = [...new Set(input.milestoneIds ?? (input.milestoneId ? [input.milestoneId] : []))];
    const selected = (await Promise.all(ids.map(loadPaymentStage))).filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder);
    if (selected.length !== ids.length) throw new HttpError(404, 'One or more payment stages were not found');

    const row = selected[0];
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Payment stage not found');
    if (selected.some((stage) => stage.customerId !== customer.id || stage.jobId !== row.jobId || stage.quoteId !== row.quoteId || stage.traderId !== row.traderId)) {
      throw new HttpError(400, 'Grouped payments must belong to the same accepted quote');
    }
    if (row.paymentMode !== 'buildpair') throw new HttpError(409, 'Choose BuildPair Protected Payments on the job before paying this stage');
    if (selected.some((stage) => stage.milestoneStatus !== 'pending')) {
      throw new HttpError(409, 'Every selected payment stage must still be awaiting funding');
    }
    if (!row.stripeAccountId || !row.stripePayoutsEnabled) {
      throw new HttpError(409, 'The tradesperson must complete Stripe payout setup, including a payout destination, before BuildPair can process this payment');
    }

    const milestoneRows = await getSql()`
      SELECT id, title, amount, kind, status, sort_order AS "sortOrder"
      FROM job_milestones WHERE job_id = ${row.jobId}
      ORDER BY sort_order ASC
    ` as unknown as StageRow[];
    const firstUnfinishedIndex = milestoneRows.findIndex((stage) => stage.status !== 'paid');
    const firstUnfinished = firstUnfinishedIndex >= 0 ? milestoneRows[firstUnfinishedIndex] : undefined;
    if (!firstUnfinished || firstUnfinished.id !== selected[0].milestoneId) {
      throw new HttpError(409, `${firstUnfinished?.title ?? 'The next payment stage'} must be dealt with before this payment can be charged`);
    }

    if (selected.length === 2) {
      const secondExpected = milestoneRows[firstUnfinishedIndex + 1];
      const [materials, firstService] = selected;
      if (materials.milestoneKind !== 'materials' || !secondExpected || secondExpected.id !== firstService.milestoneId || firstService.milestoneKind === 'materials') {
        throw new HttpError(409, 'Only the initial materials payment and first protected work stage can be funded together');
      }
    } else {
      const earlier = milestoneRows.filter((stage) => stage.sortOrder < row.sortOrder);
      const unfinished = earlier.find((stage) => stage.status !== 'paid');
      if (unfinished) throw new HttpError(409, `${unfinished.title} must be completed and approved before the next payment stage can be charged`);
    }

    for (const stage of selected) {
      try { validateStripeStageAmount(stage.milestoneAmount); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Payment amount is below Stripe minimum'); }
      const fee = stagePlatformFee(stage.milestoneId, milestoneRows, row.laborCost);
      if (fee >= stage.milestoneAmount && stage.milestoneKind !== 'materials') {
        throw new HttpError(409, `${stage.milestoneTitle} is too small to cover its allocated BuildPair fee. Revise the payment schedule.`);
      }
    }

    const amount = selected.reduce((sum, stage) => sum + stage.milestoneAmount, 0);
    const platformFee = selected.reduce((sum, stage) => sum + stagePlatformFee(stage.milestoneId, milestoneRows, row.laborCost), 0);
    const stripe = getStripe();
    const transferGroup = `buildpair_job_${row.jobId}`;
    const metadata = {
      jobId: row.jobId,
      milestoneIds: selected.map((stage) => stage.milestoneId).join(','),
      customerId: customer.id,
      traderId: row.traderId,
      transferGroup,
      fundingVersion: '2026-09-11-v3',
    };

    if (input.platform === 'web') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: customer.email ?? undefined,
        line_items: selected.map((stage) => ({
          price_data: {
            currency: 'gbp',
            product_data: { name: `${stage.milestoneTitle}: ${row.jobTitle}` },
            unit_amount: stage.milestoneAmount,
          },
          quantity: 1,
        })),
        payment_intent_data: { metadata, transfer_group: transferGroup },
        success_url: providerReturnUrl('payment', 'complete', { jobId: row.jobId }),
        cancel_url: providerReturnUrl('payment', 'cancelled', { jobId: row.jobId }),
        metadata,
      });
      return Response.json({ url: session.url, amount, platformFee, milestoneIds: selected.map((stage) => stage.milestoneId) });
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      payment_method_types: ['card'],
      transfer_group: transferGroup,
      metadata,
    });
    return Response.json({ clientSecret: intent.client_secret, amount, platformFee, milestoneIds: selected.map((stage) => stage.milestoneId) });
  } catch (error) { return jsonError(error); }
}
