import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-reviews';
import { HttpError, jsonError, requireRole } from '@/lib/server';

export async function POST(request: Request) {
  try {
    await requireRole(request, 'trader');
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (query.length < 3 || query.length > 180) throw new HttpError(400, 'Enter your business name and town or postcode');

    return Response.json({ places: await searchGooglePlaces(query) });
  } catch (error) {
    return jsonError(error);
  }
}
