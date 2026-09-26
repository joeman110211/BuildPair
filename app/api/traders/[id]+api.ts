import { and, eq, sql } from 'drizzle-orm';
import { SUB_SKILLS, TRADE_CATEGORIES, type TradeCategory } from '@/constants/options';
import { getDb } from '@/db/client';
import { reviews, traderProfiles, users } from '@/db/schema';
import { traderProfileShowcase } from '@/db/showcase-schema';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { LAUNCH_DATE_ISO, MARKETPLACE_OPEN } from '@/lib/launch-config';
import { effectiveTraderCategories, hasActiveLeadAccess } from '@/lib/subscription';

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

function normaliseServiceSelections(categories: string[], stored: Record<string, string[]> | null | undefined, legacy: string[]) {
  const known = new Set<string>(TRADE_CATEGORIES);
  return Object.fromEntries(categories.map((category) => {
    const selected = Array.isArray(stored?.[category]) ? stored[category] : [];
    if (selected.length) return [category, selected];
    if (known.has(category)) return [category, [...SUB_SKILLS[category as TradeCategory]]];
    return [category, legacy];
  }));
}

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
      trialEndsAt: traderProfiles.trialEndsAt,
      createdAt: traderProfiles.createdAt,
    }).from(traderProfiles)
      .where(and(eq(traderProfiles.id, id), sql`NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ${traderProfiles.userId} AND (coalesce(u.is_suspended, false) = true OR coalesce(u.is_deleted, false) = true))`))
      .limit(1);
    if (!profile) throw new HttpError(404, 'Trader profile not found');

    const paidProfile = hasActiveLeadAccess(profile);
    const prelaunchProfile = !MARKETPLACE_OPEN;
    const tradeCategories = effectiveTraderCategories(profile, profile.tradeCategories, profile.tradeCategory);

    let viewerId: string | null = null;
    try {
      viewerId = await authenticatedUserId(request);
      await ensureDbUser(viewerId);
    } catch {
      viewerId = null;
    }
    const viewerIsOwner = viewerId === profile.userId;

    if (!paidProfile && !viewerIsOwner && !prelaunchProfile) {
      return Response.json({
        id: profile.id,
        businessName: profile.businessName,
        tradeCategory: profile.tradeCategory,
        tradeCategories,
        isSubscriptionActive: false,
        isPreview: false,
        publicLocked: true,
        viewerIsOwner: false,
        shareOnly: true,
        canRequestQuote: false,
        contact: null,
        contactLocked: true,
      });
    }

    const serviceSelections = normaliseServiceSelections(
      tradeCategories,
      profile.serviceSelections as Record<string, string[]> | null,
      profile.subSkills ?? [],
    );
    const publicLatitude = Number.isFinite(profile.latitude) ? Math.round((profile.latitude as number) * 100) / 100 : null;
    const publicLongitude = Number.isFinite(profile.longitude) ? Math.round((profile.longitude as number) * 100) / 100 : null;

    let showcase: Record<string, unknown> = {};
    try {
      const [storedShowcase] = await db.select().from(traderProfileShowcase).where(eq(traderProfileShowcase.userId, profile.userId)).limit(1);
      showcase = storedShowcase ?? {};
    } catch {
      console.warn('[buildpair-profile] Optional showcase data unavailable', { profileId: profile.id });
    }

    const sqlClient = getSql();
    let verifiedReviews: { id: string; rating: number; comment: string; createdAt: string }[] = [];
    if (paidProfile || prelaunchProfile || viewerIsOwner) {
      try {
        const projectReviews = await db.select({ id: reviews.id, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt })
          .from(reviews).where(and(eq(reviews.traderId, profile.userId), eq(reviews.verifiedCompletion, true))).limit(50);
        const externalReviews = await sqlClient`
          SELECT id, rating, comment, created_at AS "createdAt"
          FROM external_reviews
          WHERE trader_id = ${profile.userId}
          ORDER BY created_at DESC
          LIMIT 50
        ` as unknown as { id: string; rating: number; comment: string; createdAt: string }[];
        const normalisedProjectReviews = projectReviews.map((review) => ({
          ...review,
          createdAt: review.createdAt.toISOString(),
        }));
        verifiedReviews = [...normalisedProjectReviews, ...externalReviews]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50);
      } catch {
        console.warn('[buildpair-profile] Verified reviews unavailable', { profileId: profile.id });
      }
    }
    const reviewCount = paidProfile || prelaunchProfile || viewerIsOwner ? verifiedReviews.length : 0;
    const averageRating = reviewCount ? verifiedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;

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
        SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", status, NULL::text AS note
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

    const responseRows = await sqlClient`
      SELECT
        coalesce(avg(CASE WHEN EXISTS (
          SELECT 1 FROM messages m
          WHERE m.conversation_id = c.id AND m.sender_id = ${profile.userId}
        ) THEN 100.0 ELSE 0.0 END), 0)::float AS "responseRate",
        coalesce(avg(extract(epoch FROM (first_reply.created_at - c.created_at)) / 3600.0), 0)::float AS "averageResponseHours"
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id = ${profile.userId}
        ORDER BY m.created_at ASC
        LIMIT 1
      ) first_reply ON true
      WHERE c.trader_id = ${profile.userId}
    ` as unknown as { responseRate: number; averageResponseHours: number }[];
    const responseRate = Number(responseRows[0]?.responseRate ?? 0);
    const averageResponseHours = Number(responseRows[0]?.averageResponseHours ?? 0);

    let contact: { email: string | null; phone: string | null } | null = null;
    let savedByViewer = false;
    if (viewerId && (paidProfile || viewerIsOwner)) {
      const mayViewContact = viewerIsOwner || (MARKETPLACE_OPEN && Boolean((await sqlClient`
        SELECT 1
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        WHERE j.customer_id = ${viewerId}
          AND q.trader_id = ${profile.userId}
        LIMIT 1
      `).length));
      if (mayViewContact) {
        const [owner] = await db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, profile.userId)).limit(1);
        contact = owner ?? null;
      }
      const saved = await sqlClient`SELECT 1 FROM saved_traders WHERE customer_id = ${viewerId} AND trader_id = ${profile.userId} LIMIT 1`;
      savedByViewer = saved.length > 0;
    }

    if (!viewerIsOwner) {
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
      serviceSelections,
      externalLinks: viewerIsOwner || (MARKETPLACE_OPEN && paidProfile) ? profile.externalLinks : {},
      isSubscriptionActive: paidProfile,
      isPreview: false,
      publicLocked: false,
      viewerIsOwner,
      prelaunchProfile,
      foundingTrade: profile.createdAt.getTime() < new Date(LAUNCH_DATE_ISO).getTime(),
      shareOnly: !paidProfile && !prelaunchProfile,
      canRequestQuote: MARKETPLACE_OPEN && paidProfile,
      ...defaultShowcase,
      ...showcase,
      averageRating,
      reviewCount,
      reviews: verifiedReviews,
      credentials,
      verifiedCredentialCount: credentials.length,
      availability: profile.subscriptionTier !== 'free' ? availability : [],
      availabilitySummary: profile.subscriptionTier !== 'free' && availability.length ? 'Upcoming availability listed' : null,
      responseRate,
      averageResponseHours,
      stories,
      savedByViewer,
      contact,
      contactLocked: !contact,
    });
  } catch (error) { return jsonError(error); }
}
