import { googlePlacesConfigured, searchGooglePlaces } from '@/lib/google-reviews';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';


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

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireGoogleReviewPlan(trader.id);
    if (!googlePlacesConfigured()) throw new HttpError(503, 'Google reviews are not configured yet');

    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (query.length < 3 || query.length > 180) throw new HttpError(400, 'Enter your business name and town or postcode');

    return Response.json({ places: await searchGooglePlaces(query) });
  } catch (error) {
    return jsonError(error);
  }
}
