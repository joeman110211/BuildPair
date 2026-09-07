import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const like = `%${q}%`;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 300) || 300, 1), 500);

    const rows = await getSql()`
      SELECT
        tp.id,
        tp.user_id AS "userId",
        u.email,
        tp.business_name AS "businessName",
        tp.trade_category AS "tradeCategory",
        tp.trade_categories AS "tradeCategories",
        tp.sub_skills AS "subSkills",
        tp.bio,
        tp.radius_miles AS "radiusMiles",
        tp.postcode,
        tp.location_label AS "locationLabel",
        tp.qualifications,
        tp.external_links AS "externalLinks",
        tp.photos,
        tp.self_certified AS "selfCertified",
        tp.subscription_tier::text AS "subscriptionTier",
        tp.is_subscription_active AS "subscriptionActive",
        tp.stripe_charges_enabled AS "stripeChargesEnabled",
        tp.created_at AS "createdAt",
        tp.updated_at AS "updatedAt",
        s.template,
        s.colour_theme AS "colourTheme",
        s.cover_photo_url AS "coverPhotoUrl",
        s.profile_image_url AS "profileImageUrl",
        s.logo_url AS "logoUrl",
        s.years_experience AS "yearsExperience",
        s.year_established AS "yearEstablished",
        s.service_areas AS "serviceAreas",
        s.before_after_projects AS "beforeAfterProjects",
        up.last_seen_at AS "lastSeenAt",
        up.last_path AS "lastPath",
        (up.last_seen_at >= now() - interval '2 minutes') AS "onlineNow",
        (SELECT count(*)::int FROM reviews r WHERE r.trader_id = tp.user_id) AS "reviewsCount",
        coalesce((SELECT round(avg(r.rating)::numeric, 2) FROM reviews r WHERE r.trader_id = tp.user_id), 0) AS "averageRating",
        coalesce((SELECT sum(v.view_count)::int FROM trader_profile_view_daily v WHERE v.trader_id = tp.user_id), 0) AS "profileViews",
        (SELECT count(*)::int FROM quotes q2 WHERE q2.trader_id = tp.user_id) AS "quotesCount",
        (SELECT count(*)::int FROM trader_stories st WHERE st.trader_id = tp.user_id) AS "storiesCount"
      FROM trader_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN trader_profile_showcase s ON s.user_id = tp.user_id
      LEFT JOIN user_presence up ON up.user_id = tp.user_id
      WHERE (${q} = '' OR tp.business_name ILIKE ${like} OR tp.bio ILIKE ${like} OR tp.trade_category ILIKE ${like} OR coalesce(u.email, '') ILIKE ${like})
      ORDER BY tp.updated_at DESC
      LIMIT ${limit}
    `;

    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
