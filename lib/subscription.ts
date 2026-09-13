import { SUBSCRIPTION_TIERS } from '@/constants/options';

export const CATEGORY_CHANGE_COOLDOWN_DAYS = 14;

export const TRADER_WORK_TYPE_LIMITS = {
  free: SUBSCRIPTION_TIERS.free.categoryLimit,
  basic: SUBSCRIPTION_TIERS.basic.categoryLimit,
  featured: SUBSCRIPTION_TIERS.featured.categoryLimit,
} as const;

export const TRADER_MONTHLY_QUOTE_LIMITS = {
  free: SUBSCRIPTION_TIERS.free.monthlyMarketplaceQuotes,
  basic: SUBSCRIPTION_TIERS.basic.monthlyMarketplaceQuotes,
  featured: SUBSCRIPTION_TIERS.featured.monthlyMarketplaceQuotes,
} as const;

export type TraderWorkTypeTier = keyof typeof TRADER_WORK_TYPE_LIMITS;

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

export function hasActiveLeadAccess(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
}) {
  return profile.subscriptionTier !== 'free' && profile.isSubscriptionActive === true;
}

export function isPubliclySearchable(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
}) {
  return hasActiveLeadAccess(profile);
}

export function canShowPaidProfileExtras(profile: {
  subscriptionTier?: TraderWorkTypeTier | null;
  isSubscriptionActive?: boolean | null;
}) {
  return hasActiveLeadAccess(profile);
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
