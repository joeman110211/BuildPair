import { z } from 'zod';
import { requireOwnerAdmin } from '@/lib/admin/owner';
import { assertRateLimit } from '@/lib/rate-limit';
import { ensurePartnersTables, partnerCategories, partnerPackages, partnerPlacementIds, partnerPlacementLevels, safePartnerUrl } from '@/lib/partners-store';
import { getSql } from '@/lib/sql';
import { HttpError, jsonError } from '@/lib/server';

const listing = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  category: z.enum(partnerCategories),
  summary: z.string().trim().max(600),
  websiteUrl: z.string().trim().max(500),
  logoUrl: z.string().trim().max(500).default(''),
  offerText: z.string().trim().max(250).default(''),
  placements: z.array(z.enum(partnerPlacementIds)).max(5).default([]),
  placementLevel: z.enum(partnerPlacementLevels).default('standard'),
  memberOfferText: z.string().trim().max(250).default(''),
  memberOfferTerms: z.string().trim().max(500).default(''),
  package: z.enum(partnerPackages),
  termMonths: z.union([z.literal(6),z.literal(12)]),
  pricePence: z.number().int().min(0).max(100000000),
  status: z.enum(['draft','live','paused']),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});
const enquiryUpdate = z.object({ id: z.string().uuid(), status: z.enum(['new','contacted','closed']) });

export async function GET(request: Request) {
  try {
    const { user } = await requireOwnerAdmin(request);
    await assertRateLimit(request, 'admin-partners-read', 90, 3600, user.id);
    await ensurePartnersTables();
    const sql = getSql();
    const [partners, enquiries] = await Promise.all([
      sql`SELECT id, name, category, summary, website_url AS "websiteUrl", logo_url AS "logoUrl",
        offer_text AS "offerText", placements, placement_level AS "placementLevel",
        member_offer_text AS "memberOfferText", member_offer_terms AS "memberOfferTerms", package, term_months AS "termMonths",
        price_pence AS "pricePence", status, starts_on::text AS "startsOn",
        ends_on::text AS "endsOn", click_count AS "clickCount", updated_at AS "updatedAt"
        FROM buildpair_partners ORDER BY created_at DESC LIMIT 300`,
      sql`SELECT id, business_name AS "businessName", contact_name AS "contactName", email,
        category, package, message, status, created_at AS "createdAt"
        FROM buildpair_partner_enquiries ORDER BY created_at DESC LIMIT 300`,
    ]);
    return Response.json({ partners, enquiries }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireOwnerAdmin(request);
    await assertRateLimit(request, 'admin-partners-write', 80, 3600, user.id);
    const p = listing.parse(await request.json());
    const website = safePartnerUrl(p.websiteUrl);
    const logo = p.logoUrl ? safePartnerUrl(p.logoUrl) : null;
    if (!website || (p.logoUrl && !logo)) throw new HttpError(400, 'Use a valid HTTPS website and logo URL.');
    if ((p.startsOn && !Number.isFinite(Date.parse(p.startsOn))) || (p.endsOn && !Number.isFinite(Date.parse(p.endsOn))) || (p.startsOn && p.endsOn && p.endsOn < p.startsOn)) throw new HttpError(400, 'Check the listing dates.');
    if (p.placements.includes('pro-member-benefits') && !p.memberOfferText) throw new HttpError(400, 'Enter a verified Pro member offer before enabling that placement.');
    await ensurePartnersTables();
    const sql = getSql();
    if (p.status === 'live' && p.placementLevel === 'exclusive' && p.placements.length) {
      const existing = await sql`
        SELECT name FROM buildpair_partners WHERE status='live' AND placement_level='exclusive'
          AND id <> coalesce(${p.id}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
          AND placements && string_to_array(${p.placements.join(',')}, ',')
          AND (ends_on IS NULL OR ends_on >= current_date)
        LIMIT 1
      `;
      if(existing.length) throw new HttpError(409, 'An active exclusive sponsor already occupies one of those placements.');
    }
    if (p.id) {
      const rows = await sql`UPDATE buildpair_partners SET name=${p.name}, category=${p.category}, summary=${p.summary},
        website_url=${website}, logo_url=${logo}, offer_text=${p.offerText},
        placements=string_to_array(${p.placements.join(',')}, ','), placement_level=${p.placementLevel},
        member_offer_text=${p.memberOfferText}, member_offer_terms=${p.memberOfferTerms}, package=${p.package},
        term_months=${p.termMonths}, price_pence=${p.pricePence}, status=${p.status},
        starts_on=${p.startsOn}::date, ends_on=${p.endsOn}::date, updated_at=now()
        WHERE id=${p.id}::uuid RETURNING id`;
      if (!rows.length) throw new HttpError(404, 'Partner not found');
    } else {
      await sql`INSERT INTO buildpair_partners
        (name, category, summary, website_url, logo_url, offer_text, placements, placement_level, member_offer_text, member_offer_terms, package, term_months, price_pence, status, starts_on, ends_on)
        VALUES (${p.name},${p.category},${p.summary},${website},${logo},${p.offerText},
          string_to_array(${p.placements.join(',')}, ','),${p.placementLevel},${p.memberOfferText},${p.memberOfferTerms},${p.package},${p.termMonths},${p.pricePence},${p.status},${p.startsOn}::date,${p.endsOn}::date)`;
    }
    return Response.json({ saved: true });
  } catch (error) { return jsonError(error); }
}
export async function PATCH(request: Request) {
  try {
    const { user } = await requireOwnerAdmin(request);
    await assertRateLimit(request, 'admin-partners-write', 80, 3600, user.id);
    const p = enquiryUpdate.parse(await request.json());
    await ensurePartnersTables();
    const rows = await getSql()`UPDATE buildpair_partner_enquiries SET status=${p.status}, updated_at=now()
      WHERE id=${p.id}::uuid RETURNING id`;
    if (!rows.length) throw new HttpError(404, 'Enquiry not found');
    return Response.json({ saved: true });
  } catch (error) { return jsonError(error); }
}
