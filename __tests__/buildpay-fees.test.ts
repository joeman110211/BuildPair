import { afterEach, describe, expect, it } from 'vitest';
import {
  allocateCustomerBuildPayFee,
  buildPayCustomerFee,
  buildPayFeeModeForRequest,
} from '@/lib/buildpay-fees';

const originalPlatformFeePercent = process.env.PLATFORM_FEE_PERCENT;
const originalServicePercent = process.env.BUILDPAY_SERVICE_COST_PERCENT;
const originalServiceFixed = process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE;

afterEach(() => {
  if (originalPlatformFeePercent === undefined) delete process.env.PLATFORM_FEE_PERCENT;
  else process.env.PLATFORM_FEE_PERCENT = originalPlatformFeePercent;
  if (originalServicePercent === undefined) delete process.env.BUILDPAY_SERVICE_COST_PERCENT;
  else process.env.BUILDPAY_SERVICE_COST_PERCENT = originalServicePercent;
  if (originalServiceFixed === undefined) delete process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE;
  else process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE = originalServiceFixed;
});

describe('BuildPay fee responsibility', () => {
  it('forces homeowner-requested BuildPay to customer-paid mode', () => {
    expect(buildPayFeeModeForRequest('customer', 'trader_absorbs')).toBe('customer_pays');
    expect(buildPayFeeModeForRequest('trader', 'trader_absorbs')).toBe('trader_absorbs');
    expect(buildPayFeeModeForRequest('trader', 'customer_pays')).toBe('customer_pays');
  });

  it('grosses up a £2,000 labour-only job so the service allowance covers the fee on the fee', () => {
    process.env.PLATFORM_FEE_PERCENT = '1';
    process.env.BUILDPAY_SERVICE_COST_PERCENT = '1.5';
    process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE = '20';
    expect(buildPayCustomerFee({ contractAmount: 200_000, laborServiceAmount: 200_000, plannedChargeCount: 1 })).toEqual({
      contractAmount: 200_000,
      customerFee: 5_097,
      customerTotal: 205_097,
      platformFee: 2_000,
      serviceCostAllowance: 3_097,
      plannedChargeCount: 1,
    });
  });

  it('accounts for the fixed service-cost allowance across a staged job', () => {
    process.env.PLATFORM_FEE_PERCENT = '1';
    process.env.BUILDPAY_SERVICE_COST_PERCENT = '1.5';
    process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE = '20';
    const result = buildPayCustomerFee({ contractAmount: 200_000, laborServiceAmount: 200_000, plannedChargeCount: 3 });
    expect(result.customerFee).toBe(5_138);
    expect(result.customerTotal).toBe(205_138);
    expect(result.platformFee).toBe(2_000);
  });

  it('keeps BuildPair platform commission off materials while pricing the overall BuildPay service', () => {
    process.env.PLATFORM_FEE_PERCENT = '1';
    process.env.BUILDPAY_SERVICE_COST_PERCENT = '1.5';
    process.env.BUILDPAY_SERVICE_COST_FIXED_PENCE = '20';
    const result = buildPayCustomerFee({ contractAmount: 200_000, laborServiceAmount: 150_000, plannedChargeCount: 3 });
    expect(result.platformFee).toBe(1_500);
    expect(result.customerFee).toBe(4_630);
    expect(result.customerTotal).toBe(204_630);
  });

  it('allocates the frozen customer fee exactly across stages with no rounding loss', () => {
    const allocations = allocateCustomerBuildPayFee([
      { id: 'materials', amount: 50_000, sortOrder: 1 },
      { id: 'stage', amount: 75_000, sortOrder: 2 },
      { id: 'final', amount: 75_000, sortOrder: 3 },
    ], 5_138);
    expect([...allocations.values()].reduce((sum, value) => sum + value, 0)).toBe(5_138);
    expect(allocations.get('materials')).toBe(1_284);
    expect(allocations.get('stage')).toBe(1_926);
    expect(allocations.get('final')).toBe(1_928);
  });
});
