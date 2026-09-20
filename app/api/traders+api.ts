import { LAUNCH_DATE_ISO, MARKETPLACE_LIVE } from '@/lib/launch-config';
import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type DirectoryTrader = {
  id: string;
  userId: string;
  businessName: string;
  tradeCategory: string;
  tradeCategories: string[];
  subSkills: string[];
  serviceSelections: Record<string, string[]>;
  bio: string;
  radiusMiles: number;
  locationLabel: string | null;
  externalLinks: Record<string, string>;
  photos: string[];
  subscriptionTier: 'basic' | 'featured';
  isSubscriptionActive: boolean;
  averageRating: number;
  reviewCount: number;
  verifiedCredentialCount: number;
  availabilitySummary: string | null;
  rankingScore: number;
};

export async function GET(request: Request) {
  if (!MARKETPLACE_LIVE) return Response.json([]);
  const url = new URL(request.url);
  const trade = url.searchParams.get('trade');

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT tp.id,
             tp.user_id AS "userId",
             tp.business_name AS "businessName",
             tp.trade_category AS "tradeCategory",
             CASE WHEN cardinality(tp.trade_categories) > 0 THEN tp.trade_categories ELSE ARRAY[tp.trade_category]::text[] END AS "tradeCategories",
             tp.sub_skills AS "subSkills",
             tp.service_selections AS "serviceSelections",
             tp.bio,
             tp.radius_miles AS "radiusMiles",
             tp.location_label AS "locationLabel",
             tp.external_links AS "externalLinks",
             tp.photos,
             tp.subscription_tier AS "subscriptionTier",
             tp.is_subscription_active AS "isSubscriptionActive",
             coalesce(avg(r.rating), 0)::float AS "averageRating",
             count(r.id)::int AS "reviewCount",
             (SELECT count(*)::int
                FROM trader_credentials tc
               WHERE tc.trader_id = tp.user_id
                 AND tc.status = 'verified'
                 AND (tc.expires_at IS NULL OR tc.expires_at > now())) AS "verifiedCredentialCount",
             (SELECT CASE WHEN count(*) > 0 THEN 'Available soon' ELSE NULL END
                FROM trader_availability ta
               WHERE ta.trader_id = tp.user_id
                 AND ta.status = 'available'
                 AND ta.ends_at >= now()
                 AND ta.starts_at <= now() + interval '30 days') AS "availabilitySummary",
             (
               coalesce(avg(r.rating), 0) * 10
               + least(count(r.id), 20) * 0.5
               + least((SELECT count(*) FROM trader_credentials tc WHERE tc.trader_id = tp.user_id AND tc.status = 'verified' AND (tc.expires_at IS NULL OR tc.expires_at > now())), 5) * 3
               + CASE WHEN char_length(trim(tp.bio)) >= 100 THEN 8 ELSE 3 END
               + CASE WHEN cardinality(tp.photos) > 0 THEN 6 ELSE 0 END
               + CASE WHEN tp.service_selections <> '{}'::jsonb THEN 6 ELSE 0 END
               + CASE WHEN cardinality(tp.qualifications) > 0 THEN 5 ELSE 0 END
               + coalesce((
                   SELECT avg(CASE WHEN EXISTS (
                     SELECT 1 FROM messages m
                     WHERE m.conversation_id = c.id AND m.sender_id = tp.user_id
                   ) THEN 1.0 ELSE 0.0 END)
                   FROM conversations c
                   WHERE c.trader_id = tp.user_id
                 ), 1.0) * 10
               + CASE WHEN tp.subscription_tier = 'featured' THEN 8 ELSE 0 END
             )::float AS "rankingScore"
      FROM trader_profiles tp
      LEFT JOIN reviews r
        ON r.trader_id = tp.user_id AND r.verified_completion = true
      WHERE tp.subscription_tier <> 'free'
        AND (
          tp.is_subscription_active = true
          OR (
            tp.subscription_tier = 'featured'
            AND tp.trial_ends_at IS NOT NULL
            AND now() >= ${LAUNCH_DATE_ISO}::timestamptz
            AND now() < ${LAUNCH_DATE_ISO}::timestamptz + interval '3 months'
          )
        )
        AND tp.user_id NOT LIKE 'seed_demo_trader_%'
        AND NOT EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = tp.user_id
            AND (
              coalesce(u.is_suspended, false) = true
              OR coalesce(u.is_deleted, false) = true
              OR coalesce(u.email, '') LIKE '%@buildpair.test'
            )
        )
        AND (
          ${trade}::text IS NULL
          OR ${trade} = ANY(CASE WHEN cardinality(tp.trade_categories) > 0 THEN tp.trade_categories ELSE ARRAY[tp.trade_category]::text[] END)
        )
      GROUP BY tp.id
      ORDER BY "rankingScore" DESC, coalesce(avg(r.rating), 0) DESC, tp.updated_at DESC
      LIMIT 100
    ` as unknown as DirectoryTrader[];

    return Response.json(rows.map((trader) => ({ ...trader, isPreview: false })));
  } catch (error) {
    return jsonError(error);
  }
}
