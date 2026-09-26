import {
  getGooglePlaceIdentity,
  getGooglePlaceReviews,
  googlePlacesConfigured,
  matchGoogleBusiness,
  type BuildPairBusinessIdentity,
} from '@/lib/google-reviews';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';

type ConnectionRow = {
  placeId: string;
  verificationStatus: 'verified' | 'pending_review' | 'rejected';
  matchScore: number;
  matchReasons: string[];
  connectedAt: string;
  updatedAt: string;
};

async function connectionFor(traderId: string) {
  const rows = await getSql()`
    SELECT place_id AS "placeId",
           verification_status AS "verificationStatus",
           match_score AS "matchScore",
           match_reasons AS "matchReasons",
           connected_at AS "connectedAt",
           updated_at AS "updatedAt"
    FROM google_review_connections
    WHERE trader_id = ${traderId}
    LIMIT 1
  ` as unknown as ConnectionRow[];
  return rows[0] ?? null;
}


async function requireGoogleReviewPlan(traderId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier",
           is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles
    WHERE user_id = ${traderId}
    LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const profile = rows[0];
  if (!profile || !tierAtLeast(profile.subscriptionTier, 'basic') || !hasPlanSetupAccess(profile, 'basic')) {
    throw new HttpError(402, 'Google review connection is included with BuildPair Plus and Pro.');
  }
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireGoogleReviewPlan(trader.id);
    if (!googlePlacesConfigured()) return Response.json({ configured: false, connected: false, connection: null, google: null });

    const connection = await connectionFor(trader.id);
    if (!connection) return Response.json({ configured: true, connected: false, connection: null, google: null });

    const google = await getGooglePlaceReviews(connection.placeId);
    return Response.json({ configured: true, connected: true, connection, google });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const body = await request.json() as { placeId?: unknown };
    const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
    if (!placeId || placeId.length > 255) throw new HttpError(400, 'Choose a Google business listing');

    const profileRows = await getSql()`
      SELECT tp.business_name AS "businessName",
             tp.postcode,
             tp.location_label AS "locationLabel",
             tp.external_links AS "externalLinks",
             u.email,
             u.phone
      FROM trader_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.user_id = ${trader.id}
      LIMIT 1
    ` as unknown as {
      businessName: string;
      postcode: string | null;
      locationLabel: string | null;
      externalLinks: Record<string, string> | null;
      email: string | null;
      phone: string | null;
    }[];
    const profile = profileRows[0];
    if (!profile) throw new HttpError(409, 'Create your BuildPair trade profile before connecting Google reviews');

    const googleIdentity = await getGooglePlaceIdentity(placeId);
    const buildPairIdentity: BuildPairBusinessIdentity = {
      businessName: profile.businessName,
      postcode: profile.postcode,
      locationLabel: profile.locationLabel,
      phone: profile.phone,
      email: profile.email,
      websiteUri: profile.externalLinks?.website ?? null,
    };
    const match = matchGoogleBusiness(buildPairIdentity, googleIdentity);

    const rows = await getSql()`
      INSERT INTO google_review_connections(
        trader_id, place_id, verification_status, match_score, match_reasons, reviewed_by, reviewed_at
      )
      VALUES (${trader.id}, ${placeId}, ${match.status}, ${match.score}, ${match.reasons}, NULL, NULL)
      ON CONFLICT (trader_id)
      DO UPDATE SET
        place_id = excluded.place_id,
        verification_status = excluded.verification_status,
        match_score = excluded.match_score,
        match_reasons = excluded.match_reasons,
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = now()
      RETURNING place_id AS "placeId",
                verification_status AS "verificationStatus",
                match_score AS "matchScore",
                match_reasons AS "matchReasons",
                connected_at AS "connectedAt",
                updated_at AS "updatedAt"
    ` as unknown as ConnectionRow[];

    return Response.json({
      configured: true,
      connected: true,
      connection: rows[0],
      google: await getGooglePlaceReviews(placeId),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await getSql()`DELETE FROM google_review_connections WHERE trader_id = ${trader.id}`;
    return Response.json({ connected: false });
  } catch (error) {
    return jsonError(error);
  }
}
