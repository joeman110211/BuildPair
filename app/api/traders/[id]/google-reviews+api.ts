import { getGooglePlaceReviews, googlePlacesConfigured } from '@/lib/google-reviews';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(_request: Request, { id }: { id: string }) {
  try {
    const rows = await getSql()`
      SELECT tp.user_id AS "userId", tp.subscription_tier AS "subscriptionTier",
             tp.is_subscription_active AS "isSubscriptionActive", grc.place_id AS "placeId"
      FROM trader_profiles tp
      LEFT JOIN google_review_connections grc ON grc.trader_id = tp.user_id
      LEFT JOIN users u ON u.id = tp.user_id
      WHERE tp.id = ${id}
        AND coalesce(u.is_suspended, false) = false
        AND coalesce(u.is_deleted, false) = false
      LIMIT 1
    ` as unknown as { userId: string; subscriptionTier: string; isSubscriptionActive: boolean; placeId: string | null }[];

    const row = rows[0];
    if (!row) throw new HttpError(404, 'Trader profile not found');
    const paidProfile = row.subscriptionTier !== 'free' && row.isSubscriptionActive;
    if (!paidProfile || !row.placeId) return Response.json({ connected: false, google: null });
    if (!googlePlacesConfigured()) return Response.json({ connected: true, configured: false, google: null });

    const google = await getGooglePlaceReviews(row.placeId);
    return Response.json({ connected: true, configured: true, google });
  } catch (error) { return jsonError(error); }
}
