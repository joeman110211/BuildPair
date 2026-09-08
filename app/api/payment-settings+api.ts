import { platformFeePercent } from '@/lib/platform-fee';

export async function GET() {
  return Response.json({
    platformFeePercent: platformFeePercent(),
    feeChargedOn: 'final_payment',
    feeBasis: 'accepted_quote_total',
  });
}
