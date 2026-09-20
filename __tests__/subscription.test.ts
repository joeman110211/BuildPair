import { describe, expect, it } from 'vitest';
import {
  CATEGORY_CHANGE_COOLDOWN_DAYS,
  categoryChangeAllowed,
  categoryChangeAvailableAt,
  hasActiveLeadAccess,
  traderMonthlyQuoteLimit,
  traderWorkTypeLimit,
  TRADER_MONTHLY_QUOTE_LIMITS,
  TRADER_WORK_TYPE_LIMITS,
} from '@/lib/subscription';

describe('BuildPair trade plan entitlements', () => {
  it('uses the agreed 2, 4, 6 main-category ladder', () => {
    expect(TRADER_WORK_TYPE_LIMITS).toEqual({ free: 2, basic: 4, featured: 6 });
    expect(traderWorkTypeLimit()).toBe(2);
    expect(traderWorkTypeLimit({ subscriptionTier: 'basic' })).toBe(4);
    expect(traderWorkTypeLimit({ subscriptionTier: 'featured' })).toBe(6);
  });

  it('uses the agreed 0, 15, 35 marketplace-offer ladder', () => {
    expect(TRADER_MONTHLY_QUOTE_LIMITS).toEqual({ free: 0, basic: 15, featured: 35 });
    expect(traderMonthlyQuoteLimit()).toBe(0);
    expect(traderMonthlyQuoteLimit({ subscriptionTier: 'basic' })).toBe(15);
    expect(traderMonthlyQuoteLimit({ subscriptionTier: 'featured' })).toBe(35);
  });

  it('keeps Starter Free browse-only even when an old active flag exists', () => {
    expect(hasActiveLeadAccess({ subscriptionTier: 'free', isSubscriptionActive: true })).toBe(false);
  });

  it('requires an active paid subscription for marketplace/direct lead access', () => {
    expect(hasActiveLeadAccess({ subscriptionTier: 'basic', isSubscriptionActive: true })).toBe(true);
    expect(hasActiveLeadAccess({ subscriptionTier: 'featured', isSubscriptionActive: true })).toBe(true);
    expect(hasActiveLeadAccess({ subscriptionTier: 'basic', isSubscriptionActive: false })).toBe(false);
    expect(hasActiveLeadAccess({ subscriptionTier: 'featured', isSubscriptionActive: false })).toBe(false);
  });

  it('keeps founding Pro dormant before launch and activates it only for the reserved launch window', () => {
    const founding = {
      subscriptionTier: 'featured' as const,
      isSubscriptionActive: false,
      trialEndsAt: '2027-01-15T00:00:00.000Z',
    };
    expect(hasActiveLeadAccess(founding, new Date('2026-10-14T22:59:59.000Z'))).toBe(false);
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
