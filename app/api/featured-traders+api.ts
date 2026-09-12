import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type FeaturedTraderRow = {
  id: string;
  userId: string;
  businessName: string;
  tradeCategory: string;
  locationLabel: string | null;
  photos: string[];
  subscriptionTier: 'basic' | 'featured';
  createdAt: string;
  averageRating: number;
  reviewCount: number;
  completedJobs: number;
};

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT tp.id,
             tp.user_id AS "userId",
             tp.business_name AS "businessName",
             tp.trade_category AS "tradeCategory",
             tp.location_label AS "locationLabel",
             tp.photos,
             tp.subscription_tier AS "subscriptionTier",
             tp.created_at AS "createdAt",
             coalesce((SELECT avg(r.rating)::float FROM reviews r WHERE r.trader_id = tp.user_id AND r.verified_completion = true), 0)::float AS "averageRating",
             (SELECT count(*)::int FROM reviews r WHERE r.trader_id = tp.user_id AND r.verified_completion = true) AS "reviewCount",
             (SELECT count(DISTINCT j.id)::int FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE q.trader_id = tp.user_id AND q.status = 'accepted' AND j.status = 'completed') AS "completedJobs"
      FROM trader_profiles tp
      WHERE tp.subscription_tier <> 'free'
        AND tp.is_subscription_active = true
        AND cardinality(tp.photos) > 0
        AND NOT EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = tp.user_id
            AND (coalesce(u.is_suspended, false) = true OR coalesce(u.is_deleted, false) = true OR coalesce(u.email, '') LIKE '%@buildpair.test')
        )
      ORDER BY
        CASE WHEN tp.subscription_tier = 'featured' THEN 0 ELSE 1 END,
        (SELECT count(*) FROM reviews r WHERE r.trader_id = tp.user_id AND r.verified_completion = true) DESC,
        tp.created_at ASC
      LIMIT 5
    ` as unknown as FeaturedTraderRow[];

    return Response.json({
      traders: rows.map((trader) => ({ ...trader, galleryCount: trader.photos.length })),
    }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=900' } });
  } catch (error) {
    return jsonError(error);
  }
}
