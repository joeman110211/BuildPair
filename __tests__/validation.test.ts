import { describe, expect, it } from 'vitest';
import { SUB_SKILLS, TRADE_CATEGORIES } from '@/constants/options';
import { jobSchema, quoteSchema, traderProfileSchema } from '@/lib/validation';

const validJob = {
  title: 'Retile main bathroom walls',
  category: 'Tiling' as const,
  propertyType: 'House' as const,
  postcode: 'TW18 4AB',
  urgency: 'Within 2 weeks' as const,
  description: 'Remove the old wall tiles, prepare the substrate and fit new porcelain tiles around the bath and shower area.',
  budgetRange: '£1,500–£5,000' as const,
  photos: [],
};

const validTraderProfile = {
  businessName: 'Example Tiling',
  tradeCategory: 'Tiling' as const,
  tradeCategories: ['Tiling'] as const,
  serviceSelections: { Tiling: ['Bathroom tiling', 'Wall tiling'] },
  subSkills: ['Bathroom tiling', 'Wall tiling'],
  bio: 'Experienced wall and floor tiler covering domestic bathroom and flooring projects across Surrey and West London.',
  radiusMiles: 25,
  postcode: 'TW18 4AB',
  qualifications: [],
  externalLinks: {},
  photos: [],
  selfCertified: true as const,
};

const validQuote = {
  jobId: '10000000-0000-4000-8000-000000000001',
  laborCost: 100000,
  materialsCost: 50000,
  vatAmount: 0,
  depositAmount: 30000,
  paymentTerms: '£300 deposit with the balance due on completion',
  scope: 'Remove the existing wall tiles, prepare the background and install the agreed new tiles with grout and silicone finish.',
  durationDays: 5,
  proposedStartAt: '2099-01-10T12:00:00.000Z',
};

describe('marketplace validation', () => {
  it('accepts a valid customer job', () => {
    expect(jobSchema.parse(validJob)).toMatchObject({ category: 'Tiling', postcode: 'TW18 4AB' });
  });

  it('accepts a short custom title for a direct quote request', () => {
    const result = jobSchema.safeParse({ ...validJob, targetTraderId: 'user_test_trader', title: 'wood' });
    expect(result.success).toBe(true);
  });

  it('still requires a useful title for an open marketplace job', () => {
    const result = jobSchema.safeParse({ ...validJob, title: 'wood' });
    expect(result.success).toBe(false);
  });

  it('rejects an unrealistically short job description', () => {
    expect(jobSchema.safeParse({ ...validJob, description: 'Tile it please' }).success).toBe(false);
  });

  it('rejects a quote where the deposit consumes the whole total', () => {
    const result = quoteSchema.safeParse({ ...validQuote, depositAmount: 150000 });
    expect(result.success).toBe(false);
  });

  it('accepts a sensible staged quote with a clear scope and programme', () => {
    expect(quoteSchema.safeParse(validQuote).success).toBe(true);
  });

  it('requires at least 50 characters in the included scope', () => {
    const result = quoteSchema.safeParse({ ...validQuote, scope: 'Tile bathroom walls.' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('at least 50 characters'))).toBe(true);
  });

  it('only accepts estimated durations from the fixed quote options', () => {
    expect(quoteSchema.safeParse({ ...validQuote, durationDays: 13 }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...validQuote, durationDays: 14 }).success).toBe(true);
  });

  it('requires a future proposed start date', () => {
    expect(quoteSchema.safeParse({ ...validQuote, proposedStartAt: '2020-01-01T12:00:00.000Z' }).success).toBe(false);
  });

  it('accepts a complete trader profile ready for publication', () => {
    expect(traderProfileSchema.safeParse(validTraderProfile).success).toBe(true);
  });

  it('requires traders to self-certify before a profile can be saved', () => {
    expect(traderProfileSchema.safeParse({ ...validTraderProfile, selfCertified: false }).success).toBe(false);
  });

  it('requires at least one main trade category before publication', () => {
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      tradeCategory: undefined,
      tradeCategories: [],
      serviceSelections: {},
      subSkills: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes('at least one trade category'))).toBe(true);
  });

  it('allows profile setup with more than six main trade categories', () => {
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      tradeCategory: TRADE_CATEGORIES[0],
      tradeCategories: TRADE_CATEGORIES.slice(0, 7),
      serviceSelections: { Tiling: ['Bathroom tiling'] },
    });
    expect(result.success).toBe(true);
  });

  it('allows broad renovation profiles with more than 100 selected service labels', () => {
    const manyServices = TRADE_CATEGORIES.flatMap((category) => SUB_SKILLS[category]).slice(0, 120);
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      tradeCategory: TRADE_CATEGORIES[0],
      tradeCategories: TRADE_CATEGORIES.slice(0, 10),
      serviceSelections: { Tiling: ['Bathroom tiling'] },
      subSkills: manyServices,
    });
    expect(result.success).toBe(true);
  });

  it('caps the stored profile at the available trade taxonomy size', () => {
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      tradeCategories: [...TRADE_CATEGORIES, 'Tiling'],
      serviceSelections: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message.includes(`no more than ${TRADE_CATEGORIES.length} trade categories`))).toBe(true);
  });

  it('rejects a service that does not belong to the selected category', () => {
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      serviceSelections: { Tiling: ['Boiler installation'] },
    });
    expect(result.success).toBe(false);
  });

  it('requires a trader bio of at least 50 characters', () => {
    const result = traderProfileSchema.safeParse({ ...validTraderProfile, bio: 'Experienced tiler, reliable and tidy.' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toContain('at least 50 characters');
  });

  it('rejects a future business establishment year', () => {
    const result = traderProfileSchema.safeParse({
      ...validTraderProfile,
      showcase: {
        template: 'modern' as const,
        colourTheme: 'burnt_orange' as const,
        yearsExperience: 5,
        yearEstablished: new Date().getFullYear() + 1,
        serviceAreas: [],
        beforeAfterProjects: [],
      },
    });
    expect(result.success).toBe(false);
  });
});
