import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

export const PROJECT_PLUS_PRICE_PENCE = 499;
export const PROJECT_PLUS_IMAGE_LIMIT = 10;
export const PROJECT_PLUS_PLANNER_LIMIT = 50;

export async function projectPlusEntitlement(userId: string) {
  const rows = await getSql()`
    SELECT u.project_plus_active AS "projectPlusActive",
           tp.subscription_tier AS "subscriptionTier",
           tp.is_subscription_active AS "isSubscriptionActive",
           tp.trial_ends_at AS "trialEndsAt"
    FROM users u
    LEFT JOIN trader_profiles tp ON tp.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  ` as unknown as { projectPlusActive: boolean; subscriptionTier: 'free' | 'core' | 'basic' | 'featured' | null; isSubscriptionActive: boolean | null; trialEndsAt: string | null }[];
  const row = rows[0];
  const includedWithPro = Boolean(row?.subscriptionTier === 'featured' && hasPlanSetupAccess({
    subscriptionTier: row.subscriptionTier,
    isSubscriptionActive: row.isSubscriptionActive,
    trialEndsAt: row.trialEndsAt,
  }, 'featured'));
  return {
    active: Boolean(row?.projectPlusActive || includedWithPro),
    source: includedWithPro ? 'pro' as const : row?.projectPlusActive ? 'subscription' as const : 'none' as const,
    imageLimit: PROJECT_PLUS_IMAGE_LIMIT,
    plannerLimit: PROJECT_PLUS_PLANNER_LIMIT,
  };
}

async function consume(userId: string, field: 'image_generations' | 'planner_requests', limit: number) {
  const rows = field === 'image_generations'
    ? await getSql()`
      INSERT INTO project_plus_usage(user_id, usage_month, image_generations, planner_requests)
      VALUES (${userId}, date_trunc('month', current_date)::date, 1, 0)
      ON CONFLICT (user_id, usage_month) DO UPDATE
      SET image_generations = project_plus_usage.image_generations + 1, updated_at = now()
      WHERE project_plus_usage.image_generations < ${limit}
      RETURNING image_generations AS "used"
    `
    : await getSql()`
      INSERT INTO project_plus_usage(user_id, usage_month, image_generations, planner_requests)
      VALUES (${userId}, date_trunc('month', current_date)::date, 0, 1)
      ON CONFLICT (user_id, usage_month) DO UPDATE
      SET planner_requests = project_plus_usage.planner_requests + 1, updated_at = now()
      WHERE project_plus_usage.planner_requests < ${limit}
      RETURNING planner_requests AS "used"
    `;
  const used = Number((rows as unknown as { used: number }[])[0]?.used ?? 0);
  if (!used) throw new Error(field === 'image_generations' ? 'Project+ monthly room-design allowance used' : 'Project+ monthly planner allowance used');
  return used;
}

export async function consumeProjectPlusImage(userId: string) {
  return consume(userId, 'image_generations', PROJECT_PLUS_IMAGE_LIMIT);
}
export async function consumeProjectPlusPlanner(userId: string) {
  return consume(userId, 'planner_requests', PROJECT_PLUS_PLANNER_LIMIT);
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
