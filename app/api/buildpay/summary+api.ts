import { z } from 'zod';
import { buildPayCustomerFee } from '@/lib/buildpay-fees';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const querySchema = z.object({ jobId: z.uuid() });

type SummaryRow = {
  customerId: string;
  traderId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  buildPayRequestedBy: 'trader' | 'customer' | null;
  buildPayFeeMode: 'trader_absorbs' | 'customer_pays' | null;
  buildPayCustomerFeeTotal: number;
  buildPayFeeTermsVersion: string | null;
  totalAmount: number;
  laborCost: number;
};

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const url = new URL(request.url);
    const { jobId } = querySchema.parse({ jobId: url.searchParams.get('jobId') });
    const rows = await getSql()`
      SELECT j.customer_id AS "customerId", q.trader_id AS "traderId", j.payment_mode AS "paymentMode",
             j.buildpay_requested_by AS "buildPayRequestedBy", j.buildpay_fee_mode AS "buildPayFeeMode",
             j.buildpay_customer_fee_total AS "buildPayCustomerFeeTotal", j.buildpay_fee_terms_version AS "buildPayFeeTermsVersion",
             q.total_amount AS "totalAmount", q.labor_cost AS "laborCost"
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${jobId} LIMIT 1
    ` as unknown as SummaryRow[];
    const row = rows[0];
    if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(404, 'BuildPay summary not found');
    const stageRows = await getSql()`SELECT count(*)::int AS count FROM job_milestones WHERE job_id = ${jobId}` as unknown as { count: number }[];
    const plannedChargeCount = Math.max(1, stageRows[0]?.count ?? 1);
    const preview = buildPayCustomerFee({ contractAmount: row.totalAmount, laborServiceAmount: row.laborCost, plannedChargeCount });
    const customerFee = row.paymentMode === 'buildpair' ? row.buildPayCustomerFeeTotal : preview.customerFee;
    return Response.json({
      paymentMode: row.paymentMode,
      buildPayRequestedBy: row.buildPayRequestedBy,
      buildPayFeeMode: row.buildPayFeeMode,
      buildPayCustomerFeeTotal: customerFee,
      buildPayFeeTermsVersion: row.buildPayFeeTermsVersion,
      contractAmount: row.totalAmount,
      allInTotal: row.totalAmount + customerFee,
      previewCustomerFee: preview.customerFee,
      previewAllInTotal: preview.customerTotal,
      plannedChargeCount,
    });
  } catch (error) { return jsonError(error); }
}
