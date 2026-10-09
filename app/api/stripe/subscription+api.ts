import { z } from 'zod';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { PAID_PLANS_OPEN } from '@/lib/launch-config';
import { tradeCheckout } from '@/lib/billing-checkout';

const inputSchema = z.object({ tier: z.enum(['core', 'basic', 'featured']) });

export async function POST(request: Request) {
  try {
    if (!PAID_PLANS_OPEN) throw new HttpError(423, 'No payment is required during your included Pro introductory access.');
    const trader = await requireRole(request, 'trader');
    const { tier } = inputSchema.parse(await request.json());
    return Response.json({ url: await tradeCheckout(trader, tier) });
  } catch (error) { return jsonError(error); }
}
