import { describe, expect, it } from 'vitest';
import { jobReadiness } from '@/lib/job-readiness';
import { profileStrength } from '@/lib/profile-strength';
import type { TraderProfile } from '@/types';

describe('feature readiness scoring', () => {
  it('keeps homeowner job readiness advisory rather than treating photos as essential', () => {
    const result = jobReadiness({
      directRequest: false,
      category: 'Tiling',
      propertyType: 'House',
      postcode: 'TW15 3AA',
      urgency: 'Flexible',
      budgetRange: '£1,000 - £2,500',
      title: 'Retile bathroom floor',
      description: 'Remove the old floor tiles, prepare the substrate and install new porcelain floor tiles with matching grout.',
      photos: [],
    });
    expect(result.essentialComplete).toBe(true);
    expect(result.percent).toBeLessThan(100);
    expect(result.items.find((item) => item.key === 'photos')?.complete).toBe(false);
  });

  it('scores a completed trade profile at 100 percent for applicable Starter signals', () => {
    const profile = {
      subscriptionTier: 'free',
      businessName: 'Example Tiling',
      bio: 'Experienced wall and floor tiler providing careful preparation, accurate setting out and professional finishes across residential projects.',
      tradeCategory: 'Tiling',
      tradeCategories: ['Tiling'],
      serviceSelections: { Tiling: ['Floor tiling'] },
      postcode: 'TW15 3AA',
      radiusMiles: 20,
      photos: ['one','two','three'],
      profileImageUrl: 'https://example.com/photo.jpg',
      qualifications: ['NVQ'],
      verifiedCredentialCount: 0,
      storyCount: 1,
    } as unknown as TraderProfile;
    expect(profileStrength(profile).percent).toBe(100);
  });
});
