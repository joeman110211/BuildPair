import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

type StrengthItem = {
  key: string;
  label: string;
  complete: boolean;
  href: string;
};

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const rows = await getSql()`
      SELECT
        tp.business_name AS "businessName",
        tp.trade_categories AS "tradeCategories",
        tp.service_selections AS "serviceSelections",
        tp.bio,
        tp.postcode,
        tp.location_label AS "locationLabel",
        tp.photos,
        s.profile_image_url AS "profileImageUrl",
        s.logo_url AS "logoUrl",
        (SELECT count(*)::int FROM trader_stories st WHERE st.trader_id = tp.user_id) AS "storyCount",
        (SELECT count(*)::int
           FROM trader_credentials tc
          WHERE tc.trader_id = tp.user_id
            AND tc.status = 'verified'
            AND (tc.expires_at IS NULL OR tc.expires_at > now())) AS "verifiedCredentialCount",
        EXISTS (
          SELECT 1 FROM google_review_connections grc
          WHERE grc.trader_id = tp.user_id AND grc.verification_status = 'verified'
        ) AS "googleReviewsConnected",
        EXISTS (
          SELECT 1 FROM trader_availability ta
          WHERE ta.trader_id = tp.user_id AND ta.status = 'available' AND ta.ends_at >= now()
        ) AS "hasAvailability"
      FROM trader_profiles tp
      LEFT JOIN trader_profile_showcase s ON s.user_id = tp.user_id
      WHERE tp.user_id = ${trader.id}
      LIMIT 1
    ` as unknown as {
      businessName: string;
      tradeCategories: string[];
      serviceSelections: Record<string, string[]>;
      bio: string;
      postcode: string | null;
      locationLabel: string | null;
      photos: string[];
      profileImageUrl: string | null;
      logoUrl: string | null;
      storyCount: number;
      verifiedCredentialCount: number;
      googleReviewsConnected: boolean;
      hasAvailability: boolean;
    }[];

    const profile = rows[0];
    if (!profile) return Response.json({ score: 0, completed: 0, total: 0, items: [] }, { headers: { 'Cache-Control': 'no-store' } });

    const selectedServices = Object.values(profile.serviceSelections ?? {}).flat().filter(Boolean);
    const items: StrengthItem[] = [
      { key: 'business', label: 'Business details', complete: profile.businessName.trim().length >= 2, href: '/trader/profile' },
      { key: 'trades', label: 'Trade categories and services', complete: (profile.tradeCategories?.length ?? 0) > 0 && selectedServices.length > 0, href: '/trader/profile' },
      { key: 'area', label: 'Working area', complete: Boolean(profile.postcode || profile.locationLabel), href: '/trader/profile' },
      { key: 'bio', label: 'Business description', complete: profile.bio.trim().length >= 80, href: '/trader/profile' },
      { key: 'identity', label: 'Profile image or logo', complete: Boolean(profile.profileImageUrl || profile.logoUrl), href: '/trader/profile' },
      { key: 'work', label: 'Work photos', complete: (profile.photos?.length ?? 0) >= 3, href: '/trader/profile' },
      { key: 'portfolio', label: 'Project portfolio', complete: profile.storyCount > 0, href: '/trader/profile' },
      { key: 'credentials', label: 'Verified credentials', complete: profile.verifiedCredentialCount > 0, href: '/trader/trust' },
      { key: 'reviews', label: 'Google reviews connection', complete: profile.googleReviewsConnected, href: '/trader/google-reviews' },
      { key: 'availability', label: 'Availability', complete: profile.hasAvailability, href: '/trader/trust' },
    ];

    const completed = items.filter((item) => item.complete).length;
    const score = Math.round((completed / items.length) * 100);
    return Response.json({ score, completed, total: items.length, items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
