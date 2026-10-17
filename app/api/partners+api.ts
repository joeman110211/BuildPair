import { z } from 'zod';
import { ensurePartnersTables, partnerCategories, partnerPackages } from '@/lib/partners-store';
import { getSql } from '@/lib/sql';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError, HttpError } from '@/lib/server';

const enquiry = z.object({
  businessName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  category: z.enum(partnerCategories),
  package: z.enum(partnerPackages),
  message: z.string().trim().max(1200).default(''),
  website: z.string().max(200).default(''),
});
export async function GET() {
  try {
    await ensurePartnersTables();
    const rows = await getSql()`
      SELECT id, name, category, summary, website_url AS "websiteUrl",
        logo_url AS "logoUrl", offer_text AS "offerText", package
      FROM buildpair_partners
      WHERE status = 'live'
        AND (starts_on IS NULL OR starts_on <= current_date)
        AND (ends_on IS NULL OR ends_on >= current_date)
      ORDER BY CASE package WHEN 'founding' THEN 0 WHEN 'featured' THEN 1 ELSE 2 END, name
      LIMIT 100
    `;
    return Response.json({ partners: rows }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) { return jsonError(error); }
}
export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'partner-enquiry', 4, 3600);
    const payload = enquiry.parse(await request.json());
    if (payload.website) return Response.json({ received: true });
    await ensurePartnersTables();
    await getSql()`
      INSERT INTO buildpair_partner_enquiries (business_name, contact_name, email, category, package, message)
      VALUES (${payload.businessName}, ${payload.contactName}, ${payload.email.toLowerCase()}, ${payload.category}, ${payload.package}, ${payload.message})
    `;
    return Response.json({ received: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error); }
}
