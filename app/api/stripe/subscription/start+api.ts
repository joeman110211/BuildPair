import { HttpError, jsonError, requireRole } from '@/lib/server';
import { PAID_PLANS_OPEN } from '@/lib/launch-config';
import { tradeCheckout } from '@/lib/billing-checkout';

export async function GET(request: Request) {
  try {
    if (!PAID_PLANS_OPEN) throw new HttpError(423, 'No payment is required during your included Pro introductory access.');
    const trader = await requireRole(request, 'trader');
    const tier = new URL(request.url).searchParams.get('tier');
    if (tier !== 'core' && tier !== 'basic' && tier !== 'featured') throw new HttpError(400, 'Choose a valid BuildPair plan');
    return Response.redirect(await tradeCheckout(trader, tier), 303);
  } catch (error) { return jsonError(error); }
}
