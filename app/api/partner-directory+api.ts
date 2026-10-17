import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError, HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { DIRECTORY_CATEGORIES, ensureDirectoryTable, newDirectoryToken, directoryTokenHash, directoryManageUrl, safeDirectoryLink, sendDirectoryEmail } from '@/lib/partner-directory';

const apply=z.object({
  businessName:z.string().trim().min(2).max(120),
  contactName:z.string().trim().min(2).max(100),
  email:z.string().trim().email().max(200),
  category:z.enum(DIRECTORY_CATEGORIES),
  description:z.string().trim().min(50).max(1200),
  websiteUrl:z.string().trim().max(500),
  website:z.string().max(120).default(''),
});
export async function GET(request:Request) {
  try {
    await ensureDirectoryTable();
    const params=new URL(request.url).searchParams;
    const q=(params.get('q')||'').trim().slice(0,70);
    const category=params.get('category') || '';
    if (category && !DIRECTORY_CATEGORIES.some(c=>c===category)) throw new HttpError(400,'Invalid category');
    const pattern = '%'+q.replace(/[\\%_]/g,'\\$&')+'%';
    // Only paid active listings. Fair daily ordering; exact name hits sort first.
    const rows=await getSql()`
      SELECT id,business_name AS "name",category,description AS summary,website_url AS "websiteUrl",
      logo_url AS "logoUrl",image_urls AS "images"
      FROM buildpair_partner_directory
      WHERE status IN ('active','cancel_pending')
        AND paid_until > now()
        AND (${category}='' OR category=${category})
        AND (${q}='' OR business_name ILIKE ${pattern} ESCAPE '\\'
          OR category ILIKE ${pattern} ESCAPE '\\'
          OR description ILIKE ${pattern} ESCAPE '\\')
      ORDER BY CASE WHEN lower(business_name)=lower(${q}) THEN 0 ELSE 1 END,
       md5(id::text || current_date::text)
      LIMIT 120
    `;
    return Response.json({listings:rows},{headers:{'Cache-Control':'public, max-age=60'}});
  } catch(err){return jsonError(err);}
}
export async function POST(request:Request) {
  try {
    await assertRateLimit(request,'partner-directory-apply-hour',3,3600);
    await assertRateLimit(request,'partner-directory-apply-day',6,86400);
    const p=apply.parse(await request.json());
    if (p.website) return Response.json({received:true});
    const link=safeDirectoryLink(p.websiteUrl);
    if(!link)throw new HttpError(400,'Please enter an HTTPS business website.');
    const token=newDirectoryToken();
    await ensureDirectoryTable();
    await getSql()`
      INSERT INTO buildpair_partner_directory
        (business_name,contact_name,contact_email,category,description,website_url,management_hash)
      VALUES (${p.businessName},${p.contactName},${p.email.toLowerCase()},${p.category},
        ${p.description},${link},${directoryTokenHash(token)})
    `;
    // The email link proves control of the address; no public listing or
    // payment begins until the applicant uploads and submits for review.
    try{
      await sendDirectoryEmail(p.email.toLowerCase(),'Complete your BuildPair directory application',
      `Hi ${p.contactName},\n\nThanks for applying to the BuildPair partner directory.\n\nOpen your private link to upload your logo and up to three images, then submit for review:\n${directoryManageUrl(token)}\n\nListings cost £24.99 a month only after approval and successful Stripe payment. This link controls your listing, so keep it private.\n\nBuildPair\ninfo@buildpair.co.uk`);
    }catch(err){throw err;}
    return Response.json({received:true},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(err){return jsonError(err);}
}
