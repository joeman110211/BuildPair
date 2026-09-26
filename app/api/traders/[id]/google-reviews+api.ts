import { getGooglePlaceReviews, googlePlacesConfigured } from '@/lib/google-reviews';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(_request: Request, { id }: { id: string }) {
  try {
    const rows = await getSql()`
      SELECT grc.place_id AS "placeId",
             tp.subscription_tier AS "subscriptionTier",
             tp.is_subscription_active AS "isSubscriptionActive",
             tp.trial_ends_at AS "trialEndsAt"
      FROM trader_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN google_review_connections grc
        ON grc.trader_id = tp.user_id
       AND grc.verification_status = 'verified'
      WHERE tp.id = ${id}
        AND coalesce(u.is_suspended, false) = false
        AND coalesce(u.is_deleted, false) = false
      LIMIT 1
    ` as unknown as { placeId: string | null; subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];

    const row = rows[0];
    if (!row) throw new HttpError(404, 'Trader profile not found');
    const paidGoogle = (row.subscriptionTier === 'basic' || row.subscriptionTier === 'featured')
      && (row.isSubscriptionActive || (row.trialEndsAt && new Date(row.trialEndsAt).getTime() > Date.now()));
    if (!paidGoogle || !row.placeId) return Response.json({ connected: false, configured: googlePlacesConfigured(), google: null });
    if (!googlePlacesConfigured()) return Response.json({ connected: true, configured: false, google: null });

    return Response.json({ connected: true, configured: true, google: await getGooglePlaceReviews(row.placeId) });
  } catch (error) {
    return jsonError(error);
  }
}
