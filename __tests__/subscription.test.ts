import { describe, expect, it } from 'vitest';
import {
  CATEGORY_CHANGE_COOLDOWN_DAYS,
  categoryChangeAllowed,
  categoryChangeAvailableAt,
  effectiveTraderCategories,
  hasActiveLeadAccess,
  traderAvailabilityEntitlement,
  traderMonthlyQuoteLimit,
  traderSavedSearchLimit,
  traderWorkTypeLimit,
  tierAtLeast,
  TRADER_AVAILABILITY,
  TRADER_MONTHLY_QUOTE_LIMITS,
  TRADER_SAVED_SEARCH_LIMITS,
  TRADER_WORK_TYPE_LIMITS,
} from '@/lib/subscription';

describe('BuildPair trade plan entitlements', () => {
  it('does not grandfather legacy profiles above the current plan category limit', () => {
    const legacy = ['Tiling', 'Bathrooms', 'Plumbing', 'Electrical', 'Kitchens', 'Carpentry & Joinery', 'Roofing & Roofline'];
    expect(traderWorkTypeLimit({ subscriptionTier: 'featured', tradeCategories: legacy })).toBe(6);
    expect(effectiveTraderCategories({ subscriptionTier: 'featured' }, legacy)).toEqual(legacy.slice(0, 6));
    expect(effectiveTraderCategories({ subscriptionTier: 'basic' }, legacy)).toEqual(legacy.slice(0, 4));
    expect(effectiveTraderCategories({ subscriptionTier: 'core' }, legacy)).toEqual(legacy.slice(0, 2));
  });

  it('uses the agreed 2, 2, 4, 6 main-category ladder', () => {
    expect(TRADER_WORK_TYPE_LIMITS).toEqual({ free: 2, core: 2, basic: 4, featured: 6 });
    expect(traderWorkTypeLimit()).toBe(2);
    expect(traderWorkTypeLimit({ subscriptionTier: 'core' })).toBe(2);
    expect(traderWorkTypeLimit({ subscriptionTier: 'basic' })).toBe(4);
    expect(traderWorkTypeLimit({ subscriptionTier: 'featured' })).toBe(6);
  });

  it('uses the agreed 0, 5, 15, 35 marketplace-opportunity ladder', () => {
    expect(TRADER_MONTHLY_QUOTE_LIMITS).toEqual({ free: 0, core: 5, basic: 15, featured: 35 });
    expect(traderMonthlyQuoteLimit()).toBe(0);
    expect(traderMonthlyQuoteLimit({ subscriptionTier: 'core' })).toBe(5);
    expect(traderMonthlyQuoteLimit({ subscriptionTier: 'basic' })).toBe(15);
    expect(traderMonthlyQuoteLimit({ subscriptionTier: 'featured' })).toBe(35);
  });

  it('uses 0, 1, 5, unlimited saved-search limits', () => {
    expect(TRADER_SAVED_SEARCH_LIMITS).toEqual({ free: 0, core: 1, basic: 5, featured: null });
    expect(traderSavedSearchLimit({ subscriptionTier: 'core' })).toBe(1);
    expect(traderSavedSearchLimit({ subscriptionTier: 'basic' })).toBe(5);
    expect(traderSavedSearchLimit({ subscriptionTier: 'featured' })).toBeNull();
  });

  it('scales optional public availability without exposing a private diary', () => {
    expect(TRADER_AVAILABILITY).toEqual({
      free: { horizonDays: 0, maxSlots: 0, label: 'Not included' },
      core: { horizonDays: 60, maxSlots: 1, label: 'Next available window' },
      basic: { horizonDays: 84, maxSlots: 24, label: '12-week calendar' },
      featured: { horizonDays: 183, maxSlots: 180, label: '6-month calendar' },
    });
    expect(traderAvailabilityEntitlement({ subscriptionTier: 'core' }).maxSlots).toBe(1);
    expect(traderAvailabilityEntitlement({ subscriptionTier: 'basic' }).horizonDays).toBe(84);
    expect(traderAvailabilityEntitlement({ subscriptionTier: 'featured' }).horizonDays).toBe(183);
  });

  it('orders plan entitlements without turning membership into trust', () => {
    expect(tierAtLeast('core', 'core')).toBe(true);
    expect(tierAtLeast('core', 'basic')).toBe(false);
    expect(tierAtLeast('basic', 'core')).toBe(true);
    expect(tierAtLeast('featured', 'basic')).toBe(true);
  });

  it('keeps Starter Free browse-only even when an old active flag exists', () => {
    expect(hasActiveLeadAccess({ subscriptionTier: 'free', isSubscriptionActive: true })).toBe(false);
  });

  it('requires an active paid subscription for marketplace/direct lead access', () => {
    expect(hasActiveLeadAccess({ subscriptionTier: 'core', isSubscriptionActive: true })).toBe(true);
    expect(hasActiveLeadAccess({ subscriptionTier: 'basic', isSubscriptionActive: true })).toBe(true);
    expect(hasActiveLeadAccess({ subscriptionTier: 'featured', isSubscriptionActive: true })).toBe(true);
    expect(hasActiveLeadAccess({ subscriptionTier: 'basic', isSubscriptionActive: false })).toBe(false);
    expect(hasActiveLeadAccess({ subscriptionTier: 'featured', isSubscriptionActive: false })).toBe(false);
  });

  it('activates free Pro trials immediately and expires them on the recorded end date', () => {
    const founding = {
      subscriptionTier: 'featured' as const,
      isSubscriptionActive: false,
      trialEndsAt: '2027-01-15T00:00:00.000Z',
    };
    expect(hasActiveLeadAccess(founding, new Date('2026-10-08T22:59:59.000Z'))).toBe(true);
    expect(hasActiveLeadAccess(founding, new Date('2026-10-14T23:00:00.000Z'))).toBe(true);
    expect(hasActiveLeadAccess(founding, new Date('2027-01-14T23:59:59.000Z'))).toBe(true);
    expect(hasActiveLeadAccess(founding, new Date('2027-01-15T00:00:00.000Z'))).toBe(false);
  });
});

describe('trade-category change cooldown', () => {
  it('uses a 14-day cooldown', () => {
    expect(CATEGORY_CHANGE_COOLDOWN_DAYS).toBe(14);
    const changedAt = new Date('2026-09-01T12:00:00.000Z');
    expect(categoryChangeAvailableAt(changedAt)?.toISOString()).toBe('2026-09-15T12:00:00.000Z');
  });

  it('allows first-time selection and blocks changes inside the cooldown', () => {
    expect(categoryChangeAllowed(null, new Date('2026-09-02T12:00:00.000Z'))).toBe(true);
    expect(categoryChangeAllowed('2026-09-01T12:00:00.000Z', new Date('2026-09-10T12:00:00.000Z'))).toBe(false);
    expect(categoryChangeAllowed('2026-09-01T12:00:00.000Z', new Date('2026-09-15T12:00:00.000Z'))).toBe(true);
  });
});
