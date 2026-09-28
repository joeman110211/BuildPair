import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-reviews';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { requireTraderPlanSetupAccess } from '@/lib/trader-plan-access';

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireTraderPlanSetupAccess(trader.id, 'basic', 'Google review connection is included with BuildPair Plus and Pro.');
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (query.length < 3 || query.length > 180) throw new HttpError(400, 'Enter your business name and town or postcode');

    return Response.json({ places: await searchGooglePlaces(query) });
  } catch (error) {
    return jsonError(error);
  }
}
