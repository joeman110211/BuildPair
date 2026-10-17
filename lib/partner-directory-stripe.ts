import type Stripe from 'stripe';
import { ensureDirectoryTable } from '@/lib/partner-directory';
import { getSql } from '@/lib/sql';

export async function syncDirectorySubscription(subscription:Stripe.Subscription){
  if(subscription.metadata.buildpairProduct!=='partner_directory')return false;
  const id=subscription.metadata.listingId;
  if(!/^[0-9a-f-]{36}$/i.test(id || ''))return true;
  await ensureDirectoryTable();
  const item=subscription.items.data[0];
  // Use Stripe's verified subscription item period rather than local clocks.
  const until=(item as typeof item & {current_period_end?:number}).current_period_end ??
    (subscription as Stripe.Subscription & {current_period_end?:number}).current_period_end;
  const paidThrough=until?new Date(until*1000).toISOString():null;
  const active=['active','trialing'].includes(subscription.status);
  const canceled=subscription.cancel_at_period_end;
  await getSql()`
    UPDATE buildpair_partner_directory SET
      stripe_subscription_id=${subscription.id},
      paid_until=COALESCE(${paidThrough}::timestamptz,paid_until),
      status=CASE
        WHEN status IN ('removed','rejected','suspended') THEN status
        WHEN ${!active} AND status='approved' THEN 'approved'
        WHEN ${!active} THEN 'payment_issue'
        WHEN ${canceled} THEN 'cancel_pending'
        WHEN status IN ('approved','active','cancel_pending','payment_issue') THEN 'active'
        ELSE status END,
      updated_at=now()
    WHERE id=${id}::uuid
      AND (stripe_subscription_id IS NULL OR stripe_subscription_id=${subscription.id})
  `;
  return true;
}
export async function directorySubscriptionDeleted(subscription:Stripe.Subscription){
  if(subscription.metadata.buildpairProduct!=='partner_directory')return false;
  await ensureDirectoryTable();
  await getSql()`
    UPDATE buildpair_partner_directory SET
       status=CASE WHEN status IN ('removed','rejected','suspended') THEN status ELSE 'payment_issue' END,
       updated_at=now()
    WHERE stripe_subscription_id=${subscription.id}
  `;
  return true;
}
