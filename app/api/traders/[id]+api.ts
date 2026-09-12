import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { reviews, traderProfiles, users } from '@/db/schema';
import { traderProfileShowcase } from '@/db/showcase-schema';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const defaultShowcase = {
  template: 'classic' as const,
  colourTheme: 'burnt_orange' as const,
  coverPhotoUrl: null,
  profileImageUrl: null,
  logoUrl: null,
  yearsExperience: 0,
  yearEstablished: null,
  serviceAreas: [] as string[],
  beforeAfterProjects: [] as { before: string; after: string; caption?: string }[],
};
const PUBLIC_REFERENCE_TYPES = ['gas_safe', 'niceic', 'napit', 'trustmark'] as const;

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const db = getDb();
    const [profile] = await db.select({
      id: traderProfiles.id,
      userId: traderProfiles.userId,
      businessName: traderProfiles.businessName,
      tradeCategory: traderProfiles.tradeCategory,
      tradeCategories: traderProfiles.tradeCategories,
      subSkills: traderProfiles.subSkills,
      serviceSelections: traderProfiles.serviceSelections,
      bio: traderProfiles.bio,
      radiusMiles: traderProfiles.radiusMiles,
      locationLabel: traderProfiles.locationLabel,
      latitude: traderProfiles.latitude,
      longitude: traderProfiles.longitude,
      qualifications: traderProfiles.qualifications,
      externalLinks: traderProfiles.externalLinks,
      photos: traderProfiles.photos,
      subscriptionTier: traderProfiles.subscriptionTier,
      isSubscriptionActive: traderProfiles.isSubscriptionActive,
      createdAt: traderProfiles.createdAt,
    }).from(traderProfiles)
      .where(and(eq(traderProfiles.id, id), sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${traderProfiles.userId} AND (coalesce(u.is_suspended, false) = true OR coalesce(u.is_deleted, false) = true))`))
      .limit(1);
    if (!profile) throw new HttpError(404, 'Trader profile not found');

    const paidProfile = profile.subscriptionTier !== 'free' && profile.isSubscriptionActive;
    const tradeCategories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
    const publicLatitude = Number.isFinite(profile.latitude) ? Math.round((profile.latitude as number) * 100) / 100 : null;
    const publicLongitude = Number.isFinite(profile.longitude) ? Math.round((profile.longitude as number) * 100) / 100 : null;

    let showcase: Record<string, unknown> = {};
    try {
      const [storedShowcase] = await db.select().from(traderProfileShowcase).where(eq(traderProfileShowcase.userId, profile.userId)).limit(1);
      showcase = storedShowcase ?? {};
    } catch {
      console.warn('[buildpair-profile] Optional showcase data unavailable', { profileId: profile.id });
    }

    let verifiedReviews: { id: string; rating: number; comment: string; createdAt: Date }[] = [];
    if (paidProfile) {
      try {
        verifiedReviews = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt })
          .from(reviews).where(and(eq(reviews.traderId, profile.userId), eq(reviews.verifiedCompletion, true))).limit(50);
      } catch {
        console.warn('[buildpair-profile] Verified reviews unavailable', { profileId: profile.id });
      }
    }
    const reviewCount = paidProfile ? verifiedReviews.length : 0;
    const averageRating = reviewCount ? verifiedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;

    const sqlClient = getSql();
    const [credentials, availability, stories] = await Promise.all([
      sqlClient`
        SELECT id, credential_type AS "credentialType", name, issuer,
               CASE WHEN credential_type = ANY(${PUBLIC_REFERENCE_TYPES}::text[]) THEN reference_number ELSE NULL END AS "referenceNumber",
               expires_at AS "expiresAt", verified_at AS "verifiedAt", status
        FROM trader_credentials
        WHERE trader_id = ${profile.userId} AND status = 'verified' AND (expires_at IS NULL OR expires_at > now())
        ORDER BY verified_at DESC NULLS LAST, created_at DESC
        LIMIT 50
      `,
      sqlClient`
        SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", status, note
        FROM trader_availability
        WHERE trader_id = ${profile.userId} AND ends_at >= now() AND status = 'available'
        ORDER BY starts_at ASC LIMIT 12
      `,
      sqlClient`
        SELECT id, title, location_label AS "locationLabel", summary, before_photos AS "beforePhotos",
               after_photos AS "afterPhotos", duration_days AS "durationDays", completed_at AS "completedAt", created_at AS "createdAt"
        FROM trader_stories WHERE trader_id = ${profile.userId}
        ORDER BY coalesce(completed_at, created_at) DESC LIMIT 12
      `,
    ]);

    let viewerId: string | null = null;
    let contact: { email: string | null; phone: string | null } | null = null;
    let savedByViewer = false;
    try {
      viewerId = await authenticatedUserId(request);
      await ensureDbUser(viewerId);
      if (paidProfile) {
        const mayViewContact = viewerId === profile.userId || Boolean((await sqlClient`
          SELECT 1
          FROM jobs j
          JOIN quotes q ON q.id = j.accepted_quote_id
          WHERE j.customer_id = ${viewerId}
            AND q.trader_id = ${profile.userId}
          LIMIT 1
        `).length);
        if (mayViewContact) {
          const [owner] = await db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, profile.userId)).limit(1);
          contact = owner ?? null;
        }
        const saved = await sqlClient`SELECT 1 FROM saved_traders WHERE customer_id = ${viewerId} AND trader_id = ${profile.userId} LIMIT 1`;
        savedByViewer = saved.length > 0;
      }
    } catch { /* guest or unrelated viewer: deliberately no contact details or saved state */ }

    if (viewerId !== profile.userId) {
      void sqlClient`
        INSERT INTO trader_profile_view_daily(trader_id, view_day, view_count)
        VALUES (${profile.userId}, current_date, 1)
        ON CONFLICT (trader_id, view_day)
        DO UPDATE SET view_count = trader_profile_view_daily.view_count + 1
      `.catch(() => undefined);
    }

    return Response.json({
      ...profile,
      latitude: publicLatitude,
      longitude: publicLongitude,
      tradeCategories,
      externalLinks: paidProfile ? profile.externalLinks : {},
      isSubscriptionActive: paidProfile,
      isPreview: false,
      shareOnly: !paidProfile,
      canRequestQuote: paidProfile,
      ...defaultShowcase,
      ...showcase,
      averageRating,
      reviewCount,
      reviews: verifiedReviews,
      credentials,
      verifiedCredentialCount: credentials.length,
      availability,
      availabilitySummary: availability.length ? 'Upcoming availability listed' : null,
      stories,
      savedByViewer,
      contact,
      contactLocked: !contact,
    });
  } catch (error) { return jsonError(error); }
}
