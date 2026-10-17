import { z } from 'zod';
import { requireOwnerAdmin } from '@/lib/admin/owner';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError,HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { ensureDirectoryTable,newDirectoryToken,directoryTokenHash,directoryManageUrl,sendDirectoryEmail } from '@/lib/partner-directory';

const update=z.object({id:z.string().uuid(),action:z.enum(['approve','reject','suspend'])});
export async function GET(request:Request) {
  try{
    const {user}=await requireOwnerAdmin(request);
    await assertRateLimit(request,'admin-directory',60,3600,user.id);
    await ensureDirectoryTable();
    const list=await getSql()`
      SELECT id,business_name AS "name",contact_name AS "contactName",
        contact_email AS "email",category,description,
        website_url AS "websiteUrl",logo_url AS "logoUrl",image_urls AS "images",
        status,paid_until AS "paidUntil",stripe_subscription_id AS "subscriptionId",
        created_at AS "createdAt",admin_notes AS "adminNotes"
      FROM buildpair_partner_directory ORDER BY created_at DESC LIMIT 300
    `;
    return Response.json({applications:list},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return jsonError(e);}
}
export async function POST(request:Request) {
  try {
    const {user}=await requireOwnerAdmin(request);
    await assertRateLimit(request,'admin-directory-write',30,3600,user.id);
    const p=update.parse(await request.json());
    await ensureDirectoryTable();
    const sql=getSql();
    const rows=await sql`SELECT id, business_name AS name,contact_email AS email,status,
      stripe_subscription_id AS "subscriptionId"
      FROM buildpair_partner_directory WHERE id=${p.id}::uuid LIMIT 1` as {id:string;name:string;email:string;status:string;subscriptionId:string|null}[];
    const row=rows[0];if(!row)throw new HttpError(404,'Listing not found');
    if(p.action==='approve'){
      if(!['pending_review','approved'].includes(row.status))throw new HttpError(409,'Only reviewed applications can be approved.');
      const token=newDirectoryToken();
      await sql`UPDATE buildpair_partner_directory SET status='approved',
        management_hash=${directoryTokenHash(token)},reviewed_at=now(),updated_at=now()
        WHERE id=${p.id}::uuid AND status IN ('pending_review','approved')`;
      await sendDirectoryEmail(row.email,'Your BuildPair directory application is approved',
        `Your application for ${row.name} has been approved.\n\nComplete secure payment of £24.99 per month here:\n${directoryManageUrl(token)}\n\nYour listing only goes live after Stripe confirms payment. You may cancel renewal or remove your listing at any time. Once published, contact info@buildpair.co.uk for changes to approved images, links or copy.\n\nBuildPair`);
      return Response.json({status:'approved'});
    }
    if(p.action==='reject'){
      if(row.subscriptionId)throw new HttpError(409,'Use suspend for a paid listing.');
      await sql`UPDATE buildpair_partner_directory SET status='rejected',updated_at=now()
        WHERE id=${p.id}::uuid AND status IN ('pending_review','awaiting_verification','approved')`;
      return Response.json({status:'rejected'});
    }
    // Suspensions apply to live listings without inadvertently cancelling Stripe
    // billing: the owner must arrange cancellation/refund separately when appropriate.
    if(!['active','cancel_pending'].includes(row.status))throw new HttpError(409,'Only an active listing may be suspended.');
    await sql`UPDATE buildpair_partner_directory SET status='suspended',updated_at=now() WHERE id=${p.id}::uuid`;
    return Response.json({status:'suspended'});
  }catch(e){return jsonError(e);}
}
