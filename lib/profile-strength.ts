import type { TraderProfile } from '@/types';

export type ProfileStrengthItem = {
  key: string;
  label: string;
  complete: boolean;
  href: string;
};

export type ProfileStrength = {
  percent: number;
  complete: number;
  total: number;
  items: ProfileStrengthItem[];
};

export function profileStrength(profile: TraderProfile): ProfileStrength {
  const categories = profile.tradeCategories?.length ? profile.tradeCategories : profile.tradeCategory ? [profile.tradeCategory] : [];
  const serviceCount = Object.values(profile.serviceSelections ?? {}).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);
  const paidForAvailability = profile.subscriptionTier !== 'free';
  const googleEligible = profile.subscriptionTier === 'basic' || profile.subscriptionTier === 'featured';

  const items: ProfileStrengthItem[] = [
    { key: 'business', label: 'Business details', complete: Boolean(profile.businessName?.trim() && profile.bio?.trim().length >= 80), href: '/trader/profile' },
    { key: 'services', label: 'Trades and services', complete: categories.length > 0 && serviceCount > 0, href: '/trader/onboarding' },
    { key: 'area', label: 'Working area', complete: Boolean((profile.postcode || profile.locationLabel) && (profile.radiusMiles ?? 0) > 0), href: '/trader/profile' },
    { key: 'photos', label: 'Work photos', complete: (profile.photos?.length ?? 0) >= 3, href: '/trader/profile' },
    { key: 'identity', label: 'Profile image or business logo', complete: Boolean(profile.profileImageUrl || profile.logoUrl), href: '/trader/profile' },
    { key: 'trust', label: 'Qualifications or verified credentials', complete: (profile.verifiedCredentialCount ?? 0) > 0 || (profile.qualifications?.length ?? 0) > 0, href: '/trader/trust' },
    { key: 'portfolio', label: 'Portfolio story', complete: (profile.storyCount ?? 0) > 0 || (profile.beforeAfterProjects?.length ?? 0) > 0, href: '/trader/stories' },
    ...(paidForAvailability ? [{ key: 'availability', label: 'Availability', complete: (profile.availabilityCount ?? 0) > 0, href: '/trader/calendar' }] : []),
    ...(googleEligible ? [{ key: 'google', label: 'Google reviews connection', complete: Boolean(profile.googleReviewConnected), href: '/trader/google-reviews' }] : []),
  ];

  const complete = items.filter((item) => item.complete).length;
  return { percent: items.length ? Math.round((complete / items.length) * 100) : 0, complete, total: items.length, items };
}
