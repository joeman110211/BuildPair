import { totalPlatformFee } from '@/lib/payment-protection';

export type BuildPayRequestedBy = 'trader' | 'customer';
export type BuildPayFeeMode = 'trader_absorbs' | 'customer_pays';

export const BUILDPAY_FEE_TERMS_VERSION = '2026-09-13-v1';

function numberSetting(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * BuildPay's customer-facing service fee is not presented as a card surcharge.
 * These settings estimate the cost of providing BuildPay and are deliberately
 * configurable so pricing can change without rewriting the payment flow.
 */
export function buildPayServiceCostPercent() {
  return numberSetting('BUILDPAY_SERVICE_COST_PERCENT', 1.5, 0, 10);
}

export function buildPayServiceCostFixedPence() {
  return Math.round(numberSetting('BUILDPAY_SERVICE_COST_FIXED_PENCE', 20, 0, 1000));
}

export function buildPayFeeModeForRequest(requestedBy: BuildPayRequestedBy, traderChoice?: BuildPayFeeMode | null): BuildPayFeeMode {
  if (requestedBy === 'customer') return 'customer_pays';
  return traderChoice === 'trader_absorbs' ? 'trader_absorbs' : 'customer_pays';
}

/**
 * Price the BuildPay service by the agreed stage count and freeze that figure
 * before acceptance. Some stages can later be funded together in one card
 * payment; BuildPair does not re-price the fee at checkout in either direction.
 */
export function plannedBuildPayChargeCount(stages: { kind: string }[]) {
  return Math.max(1, stages.length);
}

/**
 * Customer-paid BuildPay pricing is fixed before funding starts. We gross up
 * the service-cost allowance because Stripe's percentage applies to the full
 * amount collected, including the BuildPay service fee itself.
 *
 * BuildPair's platform fee remains 1% (configurable) of labour/service only.
 * Materials and VAT remain outside that platform-fee base.
 */
export function buildPayCustomerFee(args: {
  contractAmount: number;
  laborServiceAmount: number;
  plannedChargeCount: number;
}) {
  const contractAmount = Math.max(0, Math.round(args.contractAmount));
  const platformFee = totalPlatformFee(Math.max(0, Math.round(args.laborServiceAmount)));
  const chargeCount = Math.max(1, Math.round(args.plannedChargeCount));
  const rate = buildPayServiceCostPercent() / 100;
  const fixedAllowance = buildPayServiceCostFixedPence() * chargeCount;
  if (rate >= 1) throw new Error('BuildPay service cost percentage must be below 100%');

  const customerTotal = Math.ceil((contractAmount + platformFee + fixedAllowance) / (1 - rate));
  const customerFee = Math.max(0, customerTotal - contractAmount);
  const serviceCostAllowance = Math.max(0, customerFee - platformFee);
  return { contractAmount, customerFee, customerTotal, platformFee, serviceCostAllowance, plannedChargeCount: chargeCount };
}

export type BuildPayFeeStage = { id: string; amount: number; sortOrder: number };

/** Allocate a frozen customer BuildPay fee across contract stages exactly. */
export function allocateCustomerBuildPayFee(stages: BuildPayFeeStage[], totalCustomerFee: number) {
  const result = new Map<string, number>();
  for (const stage of stages) result.set(stage.id, 0);
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const weightTotal = ordered.reduce((sum, stage) => sum + Math.max(0, stage.amount), 0);
  const fee = Math.max(0, Math.round(totalCustomerFee));
  if (!fee || !weightTotal || !ordered.length) return result;

  let allocated = 0;
  ordered.forEach((stage, index) => {
    const value = index === ordered.length - 1
      ? fee - allocated
      : Math.floor(fee * Math.max(0, stage.amount) / weightTotal);
    const safe = Math.max(0, value);
    result.set(stage.id, safe);
    allocated += safe;
  });
  return result;
}
