import { SUBSCRIPTION_TIERS } from '@/constants/options';
import { FOUNDING_PRO_START_ISO } from '@/lib/launch-config';

export const CATEGORY_CHANGE_COOLDOWN_DAYS = 14;

export const TRADER_WORK_TYPE_LIMITS = {
  free: SUBSCRIPTION_TIERS.free.categoryLimit,
  core: SUBSCRIPTION_TIERS.core.categoryLimit,
  basic: SUBSCRIPTION_TIERS.basic.categoryLimit,
  featured: SUBSCRIPTION_TIERS.featured.categoryLimit,
} as const;

export const TRADER_MONTHLY_QUOTE_LIMITS = {
  free: SUBSCRIPTION_TIERS.free.monthlyMarketplaceQuotes,
  core: SUBSCRIPTION_TIERS.core.monthlyMarketplaceQuotes,
  basic: SUBSCRIPTION_TIERS.basic.monthlyMarketplaceQuotes,
  featured: SUBSCRIPTION_TIERS.featured.monthlyMarketplaceQuotes,
} as const;

export const TRADER_SAVED_SEARCH_LIMITS = {
  free: SUBSCRIPTION_TIERS.free.savedSearchLimit,
  core: SUBSCRIPTION_TIERS.core.savedSearchLimit,
  basic: SUBSCRIPTION_TIERS.basic.savedSearchLimit,
  featured: SUBSCRIPTION_TIERS.featured.savedSearchLimit,
} as const;

export type TraderWorkTypeTier = keyof typeof TRADER_WORK_TYPE_LIMITS;
export type TraderAnalyticsLevel = 'none' | 'basic' | 'standard' | 'advanced';

const PLAN_RANK: Record<TraderWorkTypeTier, number> = {
  free: 0,
  core: 1,
  basic: 2,
  featured: 3,
};

export function traderWorkTypeLimit(profile?: {
  subscriptionTier?: TraderWorkTypeTier | null;
  tradeCategories?: readonly string[] | null;
}) {
  const planLimit = TRADER_WORK_TYPE_LIMITS[profile?.subscriptionTier ?? 'free'];
  const existingAllowance = profile?.tradeCategories?.length ?? 0;
  return Math.max(planLimit, existingAllowance);
}

export function traderMonthlyQuoteLimit(profile?: { subscriptionTier?: TraderWorkTypeTier | null }) {
  return TRADER_MONTHLY_QUOTE_LIMITS[profile?.subscriptionTier ?? 'free'];
}

export function traderSavedSearchLimit(profile?: { subscriptionTier?: TraderWorkTypeTier | null }) {
  return TRADER_SAVED_SEARCH_LIMITS[profile?.subscriptionTier ?? 'free'];
}

export function traderAnalyticsLevel(profile?: { subscriptionTier?: TraderWorkTypeTier | null }): TraderAnalyticsLevel {
  return SUBSCRIPTION_TIERS[profile?.subscriptionTier ?? 'free'].analyticsLevel;
}

export function tierAtLeast(tier: TraderWorkTypeTier | null | undefined, minimum: TraderWorkTypeTier) {
  return PLAN_RANK[tier ?? 'free'] >= PLAN_RANK[minimum];
}

export function hasActiveLeadAccess(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}, now = new Date()) {
  if (!profile.subscriptionTier || profile.subscriptionTier === 'free') return false;
  if (profile.isSubscriptionActive === true) return true;
  if (!profile.trialEndsAt) return false;

  const startsAt = new Date(FOUNDING_PRO_START_ISO).getTime();
  const endsAt = profile.trialEndsAt instanceof Date ? profile.trialEndsAt.getTime() : new Date(profile.trialEndsAt).getTime();
  const current = now.getTime();
  return Number.isFinite(endsAt) && current >= startsAt && current < endsAt;
}

export function isPubliclySearchable(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}) {
  return hasActiveLeadAccess(profile);
}

export function canShowPaidProfileExtras(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}) {
  return hasActiveLeadAccess(profile);
}

export function canUseTraderMessaging(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}) {
  return hasActiveLeadAccess(profile) && tierAtLeast(profile.subscriptionTier, 'core');
}

export function canUseGoogleReviews(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}) {
  return hasActiveLeadAccess(profile) && tierAtLeast(profile.subscriptionTier, 'basic');
}

export function canUseAvailabilityCalendar(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
  trialEndsAt?: Date | string | null;
}) {
  return hasActiveLeadAccess(profile) && tierAtLeast(profile.subscriptionTier, 'featured');
}

export function categoryChangeAvailableAt(lastChangedAt?: Date | string | null) {
  if (!lastChangedAt) return null;
  const changed = lastChangedAt instanceof Date ? lastChangedAt : new Date(lastChangedAt);
  return new Date(changed.getTime() + CATEGORY_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export function categoryChangeAllowed(lastChangedAt?: Date | string | null, now = new Date()) {
  const availableAt = categoryChangeAvailableAt(lastChangedAt);
  return !availableAt || availableAt.getTime() <= now.getTime();
}
