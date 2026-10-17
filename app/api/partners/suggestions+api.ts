import { ensurePartnersTables, partnerPlacementIds } from '@/lib/partners-store';
import { getSql } from '@/lib/sql';
import { authenticatedUserId, jsonError } from '@/lib/server';
import { requireTraderPlanSetupAccess } from '@/lib/trader-plan-access';

type PlacementId = typeof partnerPlacementIds[number];
type CampaignRow = {
  id: string; name: string; category: string; summary: string;
  logoUrl: string | null; offerText: string;
  memberOfferText: string; memberOfferTerms: string;
  placementLevel: string;
};

export async function GET(request: Request) {
  try {
    const placement = new URL(request.url).searchParams.get('placement');
    if (!placement || !partnerPlacementIds.includes(placement as PlacementId)) {
      return Response.json({ suggestion: null }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (placement === 'pro-member-benefits') {
      const userId = await authenticatedUserId(request);
      await requireTraderPlanSetupAccess(userId, 'featured', 'BuildPair Pro membership is required to access member offers.');
    }
    // The request only carries a fixed context string. No account, job, quote,
    // design, location, email, contact, search term or personalised profile data.
    await ensurePartnersTables();
    const rows = await getSql()`
      SELECT id, name, category, summary, logo_url AS "logoUrl",
        offer_text AS "offerText", member_offer_text AS "memberOfferText",
        member_offer_terms AS "memberOfferTerms", placement_level AS "placementLevel"
      FROM buildpair_partners
      WHERE status = 'live'
        AND ${placement} = ANY(placements)
        AND (starts_on IS NULL OR starts_on <= current_date)
        AND (ends_on IS NULL OR ends_on >= current_date)
        AND (${placement} <> 'pro-member-benefits' OR length(trim(member_offer_text)) > 0)
      ORDER BY CASE placement_level WHEN 'exclusive' THEN 0 WHEN 'featured' THEN 1 ELSE 2 END,
        CASE package WHEN 'founding' THEN 0 WHEN 'featured' THEN 1 ELSE 2 END,
        updated_at ASC
      LIMIT 1
    ` as CampaignRow[];
    const candidate = rows[0];
    return Response.json({
      suggestion: candidate || null,
    }, { headers: { 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding' } });
  } catch (error) { return jsonError(error); }
}
