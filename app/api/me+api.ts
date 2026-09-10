import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { traderProfileShowcase } from '@/db/showcase-schema';
import { InvalidPostcodeError, lookupPostcode } from '@/lib/postcode';
import { getSql } from '@/lib/sql';
import { accountAccess, accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { categoryChangeAllowed, categoryChangeAvailableAt, traderWorkTypeLimit } from '@/lib/subscription';
import { roleSchema, traderProfileSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const [access, modes] = await Promise.all([accountAccess(userId), accountModes(userId)]);
    return Response.json({ ...user, ...modes, isAdmin: access.isAdmin, isSuspended: access.isSuspended });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const payload = roleSchema.parse(await request.json());
    const before = await accountModes(userId);
    const wasEnabled = payload.role === 'customer' ? before.customerEnabled : before.traderEnabled;

    if (payload.role === 'customer') {
      await getSql()`
        UPDATE users
        SET customer_enabled = true,
            active_mode = 'customer',
            role = COALESCE(role, 'customer'),
            updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else {
      await getSql()`
        UPDATE users
        SET trader_enabled = true,
            active_mode = 'trader',
            role = COALESCE(role, 'trader'),
            updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    const user = await ensureDbUser(userId);
    const [access, modes] = await Promise.all([accountAccess(userId), accountModes(userId)]);
    return Response.json({
      ...user,
      ...modes,
      isAdmin: access.isAdmin,
      isSuspended: access.isSuspended,
      wasEnabled,
    });
  } catch (error) { return jsonError(error); }
}

function missingShowcaseTable(error: unknown) {
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  return candidate?.code === '42P01'
    || candidate?.cause?.code === '42P01'
    || candidate?.message?.includes('trader_profile_showcase')
    || candidate?.cause?.message?.includes('trader_profile_showcase');
}

function sameCategories(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  return [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

export async function PUT(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const modes = await accountModes(userId);
    if (!modes.traderEnabled) throw new HttpError(403, 'Trader account required');
    const payload = traderProfileSchema.parse(await request.json());
    const { showcase } = payload;

    const tradeCategories = payload.tradeCategories?.length
      ? [...new Set(payload.tradeCategories)]
      : payload.tradeCategory ? [payload.tradeCategory] : [];
    const primaryTradeCategory = tradeCategories[0];
    if (!primaryTradeCategory) throw new HttpError(400, 'Select at least one trade category');

    const serviceSelections = Object.fromEntries(
      Object.entries(payload.serviceSelections ?? {})
        .filter(([category]) => tradeCategories.includes(category as (typeof tradeCategories)[number]))
        .map(([category, services]) => [category, [...new Set(services)]])
    );
    const flattenedServices = [...new Set(Object.values(serviceSelections).flat())];
    const legacySubSkills = flattenedServices.length ? flattenedServices : [...new Set(payload.subSkills ?? [])];

    let location;
    try { location = await lookupPostcode(payload.postcode); }
    catch (error) {
      if (error instanceof InvalidPostcodeError) throw new HttpError(400, error.message);
      throw error;
    }

    const db = getDb();
    const existingProfile = await db.query.traderProfiles.findFirst({
      where: eq(traderProfiles.userId, userId),
      columns: {
        tradeCategory: true,
        tradeCategories: true,
        serviceSelections: true,
        categoriesChangedAt: true,
        subscriptionTier: true,
        isSubscriptionActive: true,
        stripeSubscriptionId: true,
        postcode: true,
        createdAt: true,
      },
    });

    if (existingProfile?.postcode && existingProfile.postcode !== location.postcode) {
      throw new HttpError(403, 'Your published service base is locked to keep BuildPair jobs genuinely local. If your home or business base has moved, contact info@buildpair.co.uk to request an update. We may ask for reasonable evidence of the new location.');
    }

    const categoryLimit = traderWorkTypeLimit(existingProfile);
    if (tradeCategories.length > categoryLimit) {
      throw new HttpError(403, `Your current BuildPair plan allows up to ${categoryLimit} main trade categories. Remove some selections or upgrade your plan.`);
    }

    const existingCategories = existingProfile?.tradeCategories?.length
      ? existingProfile.tradeCategories
      : existingProfile?.tradeCategory ? [existingProfile.tradeCategory] : [];
    const categoriesChanged = Boolean(existingProfile) && !sameCategories(existingCategories, tradeCategories);
    if (categoriesChanged && !categoryChangeAllowed(existingProfile?.categoriesChangedAt)) {
      const availableAt = categoryChangeAvailableAt(existingProfile?.categoriesChangedAt);
      throw new HttpError(403, `Main trade categories can be changed once every 14 days. You can change them again on ${availableAt?.toLocaleDateString('en-GB')}. Specialist services can still be edited now.`);
    }

    const categoryChangedAt = existingProfile
      ? categoriesChanged ? new Date() : existingProfile.categoriesChangedAt
      : new Date();

    const values = {
      businessName: payload.businessName,
      tradeCategory: primaryTradeCategory,
      tradeCategories,
      serviceSelections,
      subSkills: legacySubSkills,
      categoriesChangedAt: categoryChangedAt,
      bio: payload.bio,
      postcode: location.postcode,
      locationLabel: location.locationLabel,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMiles: payload.radiusMiles,
      qualifications: payload.qualifications,
      externalLinks: payload.externalLinks,
      photos: payload.photos,
      selfCertified: payload.selfCertified,
    };

    const [profile] = await db.insert(traderProfiles).values({ userId, ...values }).onConflictDoUpdate({
      target: traderProfiles.userId,
      set: { ...values, updatedAt: new Date() },
    }).returning({
      id: traderProfiles.id,
      userId: traderProfiles.userId,
      businessName: traderProfiles.businessName,
      tradeCategory: traderProfiles.tradeCategory,
      tradeCategories: traderProfiles.tradeCategories,
      serviceSelections: traderProfiles.serviceSelections,
      categoriesChangedAt: traderProfiles.categoriesChangedAt,
      subscriptionTier: traderProfiles.subscriptionTier,
      isSubscriptionActive: traderProfiles.isSubscriptionActive,
      createdAt: traderProfiles.createdAt,
      updatedAt: traderProfiles.updatedAt,
    });

    if (showcase) {
      const showcaseValues = {
        template: showcase.template,
        colourTheme: showcase.colourTheme,
        coverPhotoUrl: showcase.coverPhotoUrl || null,
        profileImageUrl: showcase.profileImageUrl || null,
        logoUrl: showcase.logoUrl || null,
        yearsExperience: showcase.yearsExperience,
        yearEstablished: showcase.yearEstablished ?? null,
        serviceAreas: showcase.serviceAreas,
        beforeAfterProjects: showcase.beforeAfterProjects,
      };
      try {
        await db.insert(traderProfileShowcase).values({ userId, ...showcaseValues }).onConflictDoUpdate({
          target: traderProfileShowcase.userId,
          set: { ...showcaseValues, updatedAt: new Date() },
        });
      } catch (error) {
        if (!missingShowcaseTable(error)) throw error;
      }
    }

    return Response.json({
      ...profile,
      categoryLimit,
      categoryChangeAvailableAt: categoryChangeAvailableAt(profile?.categoriesChangedAt)?.toISOString() ?? null,
    });
  } catch (error) { return jsonError(error); }
}