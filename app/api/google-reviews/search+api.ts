import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-reviews';

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (query.length < 3 || query.length > 180) throw new HttpError(400, 'Enter your business name and town or postcode');

    const places = await searchGooglePlaces(query);
    return Response.json({ places });
  } catch (error) { return jsonError(error); }
}
