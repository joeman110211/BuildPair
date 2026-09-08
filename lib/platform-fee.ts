export function platformFeePercent() {
  return Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 1)));
}

export function platformFeeAmount(totalAmount: number) {
  return Math.round(totalAmount * platformFeePercent() / 100);
}
