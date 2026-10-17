import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError,jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getDirectoryByToken, ensureDirectoryTable, sendDirectoryEmail, safeDirectoryLink } from '@/lib/partner-directory';
import { appUrl,getStripe } from '@/lib/stripe';

const schema=z.object({token:z.string(),action:z.enum(['submit','cancel','remove'])});
export async function POST(request:Request) {
  try {
    await assertRateLimit(request,'directory-manage',20,3600);
    const p=schema.parse(await request.json());
    const item=await getDirectoryByToken(p.token);
    const sql=getSql();
    if(p.action==='submit'){
      if(item.status!=='awaiting_verification')throw new HttpError(409,'Already submitted for approval.');
      if(!item.logoUrl || item.imageUrls.length<1)throw new HttpError(400,'Please upload a logo and at least one image.');
      await sql`UPDATE buildpair_partner_directory SET status='pending_review',updated_at=now() WHERE id=${item.id}::uuid AND status='awaiting_verification'`;
      const owner=process.env.SUPPORT_EMAIL||'info@buildpair.co.uk';
      await sendDirectoryEmail(owner,'New directory listing to review',`New applicant: ${item.businessName}\nCategory: ${item.category}\nVisit https://www.buildpair.co.uk/admin/partners\nNo advertiser is published or charged before your approval.`);
      return Response.json({status:'pending_review'});
    }
    if(!['active','cancel_pending','approved'].includes(item.status))throw new HttpError(409,'There is no active listing to manage.');
    if(p.action==='cancel' && !item.subscriptionId)throw new HttpError(409,'No monthly payment is active. Use Remove listing instead.');
    if(item.subscriptionId){
      const stripe=getStripe();
      // Renewal stops but the already-paid term is preserved.
      await stripe.subscriptions.update(item.subscriptionId,{cancel_at_period_end:true},{idempotencyKey:`directory-stop-${item.id}`});
    }
    if(p.action==='remove'){
      await sql`UPDATE buildpair_partner_directory SET status='removed',cancelled_at=now(),updated_at=now() WHERE id=${item.id}::uuid`;
      return Response.json({status:'removed'});
    }
    await sql`UPDATE buildpair_partner_directory SET status='cancel_pending',cancelled_at=now(),updated_at=now() WHERE id=${item.id}::uuid AND status IN ('active','approved','cancel_pending')`;
    return Response.json({status:'cancel_pending'});
  }catch(err){return jsonError(err);}
}
export async function GET(request:Request) {
  try {
    await assertRateLimit(request,'directory-manage-read',50,3600);
    const token=new URL(request.url).searchParams.get('token')||'';
    const row=await getDirectoryByToken(token);
    return Response.json({listing:{name:row.businessName,category:row.category,description:row.description,
      websiteUrl:row.websiteUrl,logoUrl:row.logoUrl,images:row.imageUrls,
      status:row.status,paidUntil:row.paidUntil}},{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch(err){return jsonError(err);}
}
