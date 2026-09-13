import { z } from 'zod';
import { BUILDPAY_FEE_TERMS_VERSION, buildPayCustomerFee } from '@/lib/buildpay-fees';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  jobId: z.uuid(),
  acknowledgedPaymentTerms: z.literal(true),
  acknowledgedBuildPayFee: z.literal(true),
});

type SelectionRow = {
  customerId: string;
  title: string;
  status: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  buildPayRequestedBy: 'trader' | 'customer' | null;
  buildPayFeeMode: 'trader_absorbs' | 'customer_pays' | null;
  buildPayCustomerFeeTotal: number;
  traderId: string;
  totalAmount: number;
  materialsCost: number;
  laborCost: number;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
};

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT j.customer_id AS "customerId", j.title, j.status, j.payment_mode AS "paymentMode",
             j.buildpay_requested_by AS "buildPayRequestedBy", j.buildpay_fee_mode AS "buildPayFeeMode",
             j.buildpay_customer_fee_total AS "buildPayCustomerFeeTotal",
             q.trader_id AS "traderId", q.total_amount AS "totalAmount", q.materials_cost AS "materialsCost", q.labor_cost AS "laborCost",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
      FROM jobs j
      JOIN quotes q ON q.id = j.accepted_quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE j.id = ${input.jobId}
      LIMIT 1
    ` as unknown as SelectionRow[];
    const row = rows[0];
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Active job not found');
    if (row.status !== 'in_progress') throw new HttpError(409, 'BuildPay is only available for an active accepted job');
    if (!row.stripeAccountId || !row.stripePayoutsEnabled) {
      await createNotification(row.traderId, { type: 'payout_setup_required', title: 'Set up payouts to use BuildPay', body: `${row.title}: the homeowner wants to use BuildPay, but your Stripe payout setup is not complete yet.`, href: '/trader/subscription', email: true });
      throw new HttpError(409, 'The tradesperson must finish Stripe payout setup before this job can use BuildPay. They have been notified.');
    }

    const economicsRows = await getSql()`
      SELECT count(*)::int AS "stageCount",
             COALESCE(SUM(CASE WHEN kind = 'materials' THEN amount ELSE 0 END), 0)::int AS "materialsStages"
      FROM job_milestones WHERE job_id = ${input.jobId}
    ` as unknown as { stageCount: number; materialsStages: number }[];
    const economics = economicsRows[0] ?? { stageCount: 0, materialsStages: 0 };
    if (economics.stageCount < 1) throw new HttpError(409, 'This job has no agreed payment schedule to use with BuildPay.');
    if (economics.materialsStages !== row.materialsCost) throw new HttpError(409, 'The BuildPay schedule must preserve the exact quoted materials amount before BuildPay can be selected.');

    if (row.buildPayRequestedBy === 'trader' && row.paymentMode === 'buildpair') {
      return Response.json({
        paymentMode: 'buildpair',
        buildPayRequestedBy: row.buildPayRequestedBy,
        buildPayFeeMode: row.buildPayFeeMode,
        buildPayCustomerFeeTotal: row.buildPayCustomerFeeTotal,
        allInTotal: row.totalAmount + row.buildPayCustomerFeeTotal,
      });
    }

    const fee = buildPayCustomerFee({
      contractAmount: row.totalAmount,
      laborServiceAmount: row.laborCost,
      plannedChargeCount: economics.stageCount,
    });
    await getSql()`
      UPDATE jobs
      SET payment_mode = 'buildpair', buildpay_requested_by = 'customer', buildpay_fee_mode = 'customer_pays',
          buildpay_customer_fee_total = ${fee.customerFee}, buildpay_fee_terms_version = ${BUILDPAY_FEE_TERMS_VERSION}, updated_at = now()
      WHERE id = ${input.jobId}
    `;
    await addJobEvent(input.jobId, customer.id, 'buildpay_selected', 'BuildPay selected by homeowner', `The homeowner chose optional BuildPay protection after accepting the contract. The ${formatPence(fee.customerFee)} BuildPay service fee was shown separately, making the all-in BuildPay total ${formatPence(fee.customerTotal)}.`, {
      buildPayRequestedBy: 'customer', buildPayFeeMode: 'customer_pays', buildPayCustomerFeeTotal: fee.customerFee,
      contractAmount: row.totalAmount, allInTotal: fee.customerTotal, feeTermsVersion: BUILDPAY_FEE_TERMS_VERSION,
      homeownerAcknowledgedPaymentTerms: true, homeownerAcknowledgedBuildPayFee: true,
    });
    await createNotification(row.traderId, { type: 'payment_mode_selected', title: 'Homeowner selected BuildPay', body: `${row.title}: the homeowner requested BuildPay and is paying the disclosed BuildPay service fee. Your accepted contract amount is not reduced by that fee.`, href: `/trader/jobs/${input.jobId}`, email: true });
    return Response.json({ paymentMode: 'buildpair', buildPayRequestedBy: 'customer', buildPayFeeMode: 'customer_pays', buildPayCustomerFeeTotal: fee.customerFee, allInTotal: fee.customerTotal });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
