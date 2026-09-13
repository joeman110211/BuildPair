import { getGooglePlaceReviews, googlePlacesConfigured } from '@/lib/google-reviews';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');

    const rows = await getSql()`
      SELECT place_id AS "placeId", connected_at AS "connectedAt", updated_at AS "updatedAt"
      FROM google_review_connections
      WHERE trader_id = ${userId}
      LIMIT 1
    ` as unknown as { placeId: string; connectedAt: string; updatedAt: string }[];
    const connection = rows[0] ?? null;
    if (!connection) return Response.json({ configured: googlePlacesConfigured(), connected: false, connection: null, google: null });
    if (!googlePlacesConfigured()) return Response.json({ configured: false, connected: true, connection, google: null });

    const google = await getGooglePlaceReviews(connection.placeId);
    return Response.json({ configured: true, connected: true, connection, google });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const profile = await getSql()`SELECT 1 FROM trader_profiles WHERE user_id = ${userId} LIMIT 1`;
    if (!profile.length) throw new HttpError(409, 'Create your BuildPair trade profile before connecting Google reviews');

    const body = await request.json() as { placeId?: unknown };
    const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
    if (!placeId || placeId.length > 255) throw new HttpError(400, 'Choose a Google business listing');

    const google = await getGooglePlaceReviews(placeId);
    await getSql()`
      INSERT INTO google_review_connections(trader_id, place_id)
      VALUES (${userId}, ${placeId})
      ON CONFLICT (trader_id)
      DO UPDATE SET place_id = excluded.place_id, updated_at = now()
    `;

    return Response.json({ configured: true, connected: true, google });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    await getSql()`DELETE FROM google_review_connections WHERE trader_id = ${userId}`;
    return Response.json({ connected: false });
  } catch (error) { return jsonError(error); }
}
