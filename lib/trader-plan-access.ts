import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast, type TraderWorkTypeTier } from '@/lib/subscription';

export type TraderPlanAccessProfile = {
  subscriptionTier: TraderWorkTypeTier;
  isSubscriptionActive: boolean;
  trialEndsAt: string | null;
};

export async function requireTraderPlanSetupAccess(
  traderId: string,
  minimum: TraderWorkTypeTier,
  errorMessage: string,
): Promise<TraderPlanAccessProfile> {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier",
           is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles
    WHERE user_id = ${traderId}
    LIMIT 1
  ` as unknown as TraderPlanAccessProfile[];

  const profile = rows[0];
  if (!profile || !tierAtLeast(profile.subscriptionTier, minimum) || !hasPlanSetupAccess(profile, minimum)) {
    throw new HttpError(402, errorMessage);
  }
  return profile;
}
