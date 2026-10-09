import { getSql } from '@/lib/sql';
import { MARKETPLACE_OPEN, PAID_PROJECT_PLUS_OPEN } from '@/lib/launch-config';
import { HttpError } from '@/lib/server';
import { hasPlanSetupAccess } from '@/lib/subscription';

export const PROJECT_PLUS_PRICE_PENCE = 499;
export const PROJECT_PLUS_IMAGE_LIMIT = 10;
export const PROJECT_PLUS_PLANNER_LIMIT = 50;

export async function projectPlusEntitlement(userId: string) {
  const rows = await getSql()`
    SELECT u.project_plus_active AS "projectPlusActive", u.customer_enabled AS "customerEnabled",
           tp.subscription_tier AS "subscriptionTier",
           tp.is_subscription_active AS "isSubscriptionActive",
           tp.trial_ends_at AS "trialEndsAt"
    FROM users u
    LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  ` as unknown as { customerEnabled: boolean; projectPlusActive: boolean; subscriptionTier: 'free' | 'core' | 'basic' | 'featured' | null; isSubscriptionActive: boolean | null; trialEndsAt: string | null }[];
  const row = rows[0];
  const includedWithPro = Boolean(row?.subscriptionTier === 'featured' && hasPlanSetupAccess({
    subscriptionTier: row.subscriptionTier,
    isSubscriptionActive: row.isSubscriptionActive,
    trialEndsAt: row.trialEndsAt,
  }, 'featured'));
  // Keep the homeowner studio usable during launch while paid checkout is deliberately closed.
  // This is a capped introductory allowance, not an ongoing paid entitlement.
  const homeownerLaunchAccess = Boolean(MARKETPLACE_OPEN && !PAID_PROJECT_PLUS_OPEN && row?.customerEnabled);
  const complimentaryOnly = homeownerLaunchAccess && !row?.projectPlusActive && !includedWithPro;
  return {
    active: Boolean(row?.projectPlusActive || includedWithPro || homeownerLaunchAccess),
    source: includedWithPro ? 'pro' as const : row?.projectPlusActive ? 'subscription' as const : homeownerLaunchAccess ? 'launch' as const : 'none' as const,
    imageLimit: complimentaryOnly ? 2 : PROJECT_PLUS_IMAGE_LIMIT,
    plannerLimit: complimentaryOnly ? 10 : PROJECT_PLUS_PLANNER_LIMIT,
  };
}

async function consume(userId: string, field: 'image_generations' | 'planner_requests', limit: number) {
  if (!Number.isInteger(limit) || limit < 1) throw new HttpError(429, 'Project+ allowance used.');
  const rows = field === 'image_generations'
    ? await getSql()`
      INSERT INTO project_plus_usage(user_id, usage_month, image_generations, planner_requests)
      VALUES (${userId}, date_trunc('month', current_date)::date, 1, 0)
      ON CONFLICT (user_id, usage_month) DO UPDATE
      SET image_generations = project_plus_usage.image_generations + 1, updated_at = now()
      WHERE project_plus_usage.image_generations < ${limit}
      RETURNING image_generations AS "used", usage_month::text AS "month"
    `
    : await getSql()`
      INSERT INTO project_plus_usage(user_id, usage_month, image_generations, planner_requests)
      VALUES (${userId}, date_trunc('month', current_date)::date, 0, 1)
      ON CONFLICT (user_id, usage_month) DO UPDATE
      SET planner_requests = project_plus_usage.planner_requests + 1, updated_at = now()
      WHERE project_plus_usage.planner_requests < ${limit}
      RETURNING planner_requests AS "used", usage_month::text AS "month"
    `;
  const reservation = (rows as unknown as { used: number; month: string }[])[0];
  const used = Number(reservation?.used ?? 0);
  if (!used) throw new HttpError(429, field === 'image_generations' ? 'Project+ monthly room-design allowance used' : 'Project+ monthly planner allowance used');
  // Retain the reservation month so a failed request crossing midnight can be refunded correctly.
  return { used, month: reservation!.month };
}

export async function consumeProjectPlusImage(userId: string, limit: number) {
  return consume(userId, 'image_generations', limit);
}
export async function consumeProjectPlusPlanner(userId: string, limit: number) {
  return consume(userId, 'planner_requests', limit);
}

export async function refundProjectPlusUsage(userId: string, field: 'image' | 'plan', month: string) {
  if (field === 'image') await getSql()`UPDATE project_plus_usage SET image_generations = greatest(0, image_generations - 1), updated_at = now() WHERE user_id = ${userId} AND usage_month = ${month}::date`;
  else await getSql()`UPDATE project_plus_usage SET planner_requests = greatest(0, planner_requests - 1), updated_at = now() WHERE user_id = ${userId} AND usage_month = ${month}::date`;
}

export async function projectPlusUsage(userId: string) {
  const rows = await getSql()`
    SELECT image_generations AS "imagesUsed", planner_requests AS "plannerUsed"
    FROM project_plus_usage
    WHERE user_id = ${userId} AND usage_month = date_trunc('month', current_date)::date
    LIMIT 1
  ` as unknown as { imagesUsed: number; plannerUsed: number }[];
  return rows[0] ?? { imagesUsed: 0, plannerUsed: 0 };
}
