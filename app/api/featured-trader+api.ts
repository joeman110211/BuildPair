import { LAUNCH_DATE_ISO, MARKETPLACE_LIVE } from '@/lib/launch-config';
import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type FeaturedTraderRow = {
  id: string;
  userId: string;
  businessName: string;
  tradeCategory: string;
  tradeCategories: string[];
  bio: string;
  locationLabel: string | null;
  photos: string[];
  qualifications: string[];
  subscriptionTier: 'free' | 'basic' | 'featured';
  isSubscriptionActive: boolean;
  createdAt: string;
  trialEndsAt: string | null;
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
  verifiedCredentialCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function currentWeekStart(date = new Date()) {
  const midnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (midnight.getUTCDay() + 6) % 7;
  midnight.setUTCDate(midnight.getUTCDate() - daysSinceMonday);
  return midnight;
}

function toPublicTrader(trader: FeaturedTraderRow, overrideUserId?: string) {
  return {
    ...trader,
    galleryCount: trader.photos.length,
    isOverride: trader.userId === overrideUserId,
  };
}

export async function GET() {
  if (!MARKETPLACE_LIVE) return Response.json({ trader: null, traders: [] });
  try {
    const sql = getSql();
    const weekStart = currentWeekStart();
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const weekSerial = Math.floor(weekStart.getTime() / WEEK_MS);

    const rows = await sql`
      SELECT tp.id,
             tp.user_id AS "userId",
             tp.business_name AS "businessName",
             tp.trade_category AS "tradeCategory",
             CASE WHEN cardinality(tp.trade_categories) > 0 THEN tp.trade_categories ELSE ARRAY[tp.trade_category]::text[] END AS "tradeCategories",
             tp.bio,
             tp.location_label AS "locationLabel",
             tp.photos,
             tp.qualifications,
             tp.subscription_tier AS "subscriptionTier",
             tp.is_subscription_active AS "isSubscriptionActive",
             tp.trial_ends_at AS "trialEndsAt",
             tp.created_at AS "createdAt",
             coalesce((
               SELECT avg(review_data.rating)::float
               FROM (
                 SELECT r.rating
                 FROM reviews r
                 WHERE r.trader_id = tp.user_id
                   AND r.verified_completion = true
                   AND r.created_at < ${weekStart.toISOString()}::timestamptz
                 UNION ALL
                 SELECT er.rating
                 FROM external_reviews er
                 WHERE er.trader_id = tp.user_id
               ) review_data
             ), 0)::float AS "averageRating",
             (SELECT count(*)::int
                FROM (
                  SELECT r.id
                  FROM reviews r
                  WHERE r.trader_id = tp.user_id
                    AND r.verified_completion = true
                    AND r.created_at < ${weekStart.toISOString()}::timestamptz
                  UNION ALL
                  SELECT er.id
                  FROM external_reviews er
                  WHERE er.trader_id = tp.user_id
                ) review_data) AS "reviewCount",
             (SELECT count(DISTINCT j.id)::int
                FROM jobs j
                JOIN quotes q ON q.id = j.accepted_quote_id
               WHERE q.trader_id = tp.user_id
                 AND q.status = 'accepted'
                 AND j.status = 'completed'
                 AND j.updated_at < ${weekStart.toISOString()}::timestamptz) AS "completedJobs",
             (SELECT count(*)::int
                FROM trader_credentials tc
               WHERE tc.trader_id = tp.user_id
                 AND tc.status = 'verified'
                 AND (tc.expires_at IS NULL OR tc.expires_at > now())) AS "verifiedCredentialCount"
      FROM trader_profiles tp
      WHERE tp.user_id NOT LIKE 'seed_demo_trader_%'
        AND NOT EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = tp.user_id
            AND (
              coalesce(u.is_suspended, false) = true
              OR coalesce(u.is_deleted, false) = true
              OR coalesce(u.email, '') LIKE '%@buildpair.test'
            )
      )
      ORDER BY tp.user_id ASC
      LIMIT 250
    ` as unknown as FeaturedTraderRow[];

    const ranked = [...rows].sort((a, b) => (
      b.completedJobs - a.completedJobs
      || b.reviewCount - a.reviewCount
      || b.averageRating - a.averageRating
      || Number(b.photos.length > 0) - Number(a.photos.length > 0)
      || a.userId.localeCompare(b.userId)
    ));

    const launch = new Date(LAUNCH_DATE_ISO);
    const foundingEnd = new Date(launch);
    foundingEnd.setMonth(foundingEnd.getMonth() + 3);
    const now = new Date();
    const paid = ranked.filter((trader) => trader.subscriptionTier !== 'free' && (
      trader.isSubscriptionActive
      || (trader.subscriptionTier === 'featured' && Boolean(trader.trialEndsAt) && now >= launch && now < foundingEnd)
    ));
    const paidEligible = paid.filter((trader) => new Date(trader.createdAt).getTime() < weekStart.getTime());

    const overrideWeek = process.env.FEATURED_TRADER_OVERRIDE_WEEK?.trim();
    const overrideUserId = process.env.FEATURED_TRADER_OVERRIDE_USER_ID?.trim();
    const secondUserId = process.env.FEATURED_TRADER_SECOND_USER_ID?.trim();
    const override = overrideWeek === weekStartIso && overrideUserId
      ? paid.find((trader) => trader.userId === overrideUserId)
      : undefined;

    const selected = override
      ?? (paidEligible.length ? paidEligible[weekSerial % paidEligible.length] : undefined)
      ?? paid[0];
    const nextRefreshAt = new Date(weekStart.getTime() + WEEK_MS).toISOString();

    if (!selected) {
      return Response.json({ trader: null, traders: [], weekStart: weekStartIso, nextRefreshAt });
    }

    const pinnedSecond = secondUserId && secondUserId !== selected.userId
      ? paid.find((trader) => trader.userId === secondUserId)
      : undefined;
    const ordered = [
      selected,
      ...(pinnedSecond ? [pinnedSecond] : []),
      ...paid.filter((trader) => trader.userId !== selected.userId && trader.userId !== pinnedSecond?.userId),
    ];
    const traders = ordered.slice(0, 6).map((trader) => toPublicTrader(trader, override?.userId));

    return Response.json({
      trader: traders[0] ?? null,
      traders,
      weekStart: weekStartIso,
      nextRefreshAt,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800' },
    });
  } catch (error) {
    return jsonError(error);
  }
}
