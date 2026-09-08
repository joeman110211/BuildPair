import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { traderProfileShowcase } from '@/db/showcase-schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { categoryChangeAvailableAt, hasActiveLeadAccess, traderMonthlyQuoteLimit, traderWorkTypeLimit } from '@/lib/subscription';

function missingShowcaseTable(error: unknown) {
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  return candidate?.code === '42P01'
    || candidate?.cause?.code === '42P01'
    || candidate?.message?.includes('trader_profile_showcase')
    || candidate?.cause?.message?.includes('trader_profile_showcase');
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const db = getDb();
    const [profile] = await db.select({
      id: traderProfiles.id,
      userId: traderProfiles.userId,
      businessName: traderProfiles.businessName,
      tradeCategory: traderProfiles.tradeCategory,
      subSkills: traderProfiles.subSkills,
      tradeCategories: traderProfiles.tradeCategories,
      serviceSelections: traderProfiles.serviceSelections,
      categoriesChangedAt: traderProfiles.categoriesChangedAt,
      bio: traderProfiles.bio,
      radiusMiles: traderProfiles.radiusMiles,
      qualifications: traderProfiles.qualifications,
      externalLinks: traderProfiles.externalLinks,
      photos: traderProfiles.photos,
      selfCertified: traderProfiles.selfCertified,
      subscriptionTier: traderProfiles.subscriptionTier,
      isSubscriptionActive: traderProfiles.isSubscriptionActive,
      trialEndsAt: traderProfiles.trialEndsAt,
      stripeSubscriptionId: traderProfiles.stripeSubscriptionId,
      stripeCustomerId: traderProfiles.stripeCustomerId,
      stripeAccountId: traderProfiles.stripeAccountId,
      stripeChargesEnabled: traderProfiles.stripeChargesEnabled,
      postcode: traderProfiles.postcode,
      locationLabel: traderProfiles.locationLabel,
      latitude: traderProfiles.latitude,
      longitude: traderProfiles.longitude,
      createdAt: traderProfiles.createdAt,
      updatedAt: traderProfiles.updatedAt,
    }).from(traderProfiles).where(eq(traderProfiles.userId, trader.id)).limit(1);
    if (!profile) throw new HttpError(404, 'Trader profile not found');

    let showcase = undefined;
    try {
      [showcase] = await db.select().from(traderProfileShowcase).where(eq(traderProfileShowcase.userId, trader.id)).limit(1);
    } catch (error) {
      if (!missingShowcaseTable(error)) throw error;
    }

    const usageRows = await getSql()`
      SELECT count(*)::int AS count
      FROM trader_job_offers
      WHERE trader_id = ${trader.id}
        AND created_at >= date_trunc('month', now())
        AND created_at < date_trunc('month', now()) + interval '1 month'
    ` as unknown as { count: number }[];
    const resetRows = await getSql()`
      SELECT (date_trunc('month', now()) + interval '1 month') AS "resetAt"
    ` as unknown as { resetAt: string }[];
    const payoutRows = await getSql()`SELECT stripe_payouts_enabled AS "stripePayoutsEnabled" FROM trader_profiles WHERE user_id = ${trader.id} LIMIT 1` as unknown as { stripePayoutsEnabled: boolean }[];

    const normalisedCategories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
    const active = hasActiveLeadAccess(profile);
    return Response.json({
      ...profile,
      ...(showcase ?? {}),
      stripePayoutsEnabled: payoutRows[0]?.stripePayoutsEnabled ?? false,
      tradeCategories: normalisedCategories,
      isSubscriptionActive: active,
      categoryLimit: traderWorkTypeLimit(profile),
      categoryChangeAvailableAt: categoryChangeAvailableAt(profile.categoriesChangedAt)?.toISOString() ?? null,
      monthlyQuotesUsed: usageRows[0]?.count ?? 0,
      monthlyQuoteLimit: traderMonthlyQuoteLimit(profile),
      monthlyQuoteResetAt: resetRows[0]?.resetAt ?? null,
    });
  } catch (error) { return jsonError(error); }
}
