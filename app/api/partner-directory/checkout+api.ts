import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError,jsonError } from '@/lib/server';
import { DIRECTORY_PRICE_PENCE,getDirectoryByToken,ensureDirectoryTable } from '@/lib/partner-directory';
import { getSql } from '@/lib/sql';
import { getStripe,appUrl } from '@/lib/stripe';
export async function POST(request:Request) {
 try {
   await assertRateLimit(request,'directory-checkout',8,3600);
   const {token}=z.object({token:z.string()}).parse(await request.json());
   const item=await getDirectoryByToken(token);
   if(item.status!=='approved')throw new HttpError(409,'Your listing must be approved before payment.');
   if(!process.env.STRIPE_WEBHOOK_SECRET?.trim())throw new HttpError(503,'Secure payment confirmation is not yet configured.');
   const stripe=getStripe();
   let customerId=item.customerId;
   if(!customerId){
     const c=await stripe.customers.create({email:item.contactEmail,metadata:{buildpairProduct:'partner_directory',listingId:item.id}},{idempotencyKey:`bp-directory-customer-${item.id}`});
     customerId=c.id;
     await getSql()`UPDATE buildpair_partner_directory SET stripe_customer_id=${customerId} WHERE id=${item.id}::uuid`;
   }
   if(item.checkoutSessionId){
     const previous=await stripe.checkout.sessions.retrieve(item.checkoutSessionId);
     if(previous.status==='open'&&previous.url)return Response.json({url:previous.url});
   }
   const session=await stripe.checkout.sessions.create({
     mode:'subscription',customer:customerId,client_reference_id:item.id,
     line_items:[{price_data:{currency:'gbp',unit_amount:DIRECTORY_PRICE_PENCE,recurring:{interval:'month'},
       product_data:{name:'BuildPair Partner Directory Listing',description:'Directory listing only. No extra advertising placements.'}},quantity:1}],
     success_url:`${appUrl()}/partners/manage?token=${token}&checkout=returned`,
     cancel_url:`${appUrl()}/partners/manage?token=${token}&checkout=cancelled`,
     metadata:{buildpairProduct:'partner_directory',listingId:item.id},
     subscription_data:{metadata:{buildpairProduct:'partner_directory',listingId:item.id}}
   },{idempotencyKey:`bp-directory-checkout-${item.id}-${Math.floor(Date.now()/1800000)}`});
   if(!session.url)throw new HttpError(502,'Payment provider could not start checkout.');
   await getSql()`UPDATE buildpair_partner_directory SET checkout_session_id=${session.id},updated_at=now() WHERE id=${item.id}::uuid`;
   return Response.json({url:session.url});
 }catch(err){return jsonError(err);}
}
