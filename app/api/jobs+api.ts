import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobs, traderProfiles } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { InvalidPostcodeError, lookupPostcode, outwardCode } from '@/lib/postcode';
import { assertRateLimit } from '@/lib/rate-limit';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { jobSchema } from '@/lib/validation';

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    const db = getDb();
    let rows;

    if (activeMode === 'customer' && modes.customerEnabled) {
      rows = (await db.select().from(jobs).where(eq(jobs.customerId, user.id)).orderBy(desc(jobs.createdAt)))
        .map((job) => ({ ...job, isPreview: false }));
    } else if (activeMode === 'trader' && modes.traderEnabled) {
      const [profile] = await db.select({
        tradeCategory: traderProfiles.tradeCategory,
        tradeCategories: traderProfiles.tradeCategories,
        subscriptionTier: traderProfiles.subscriptionTier,
        isSubscriptionActive: traderProfiles.isSubscriptionActive,
        latitude: traderProfiles.latitude,
        longitude: traderProfiles.longitude,
        radiusMiles: traderProfiles.radiusMiles,
      }).from(traderProfiles).where(eq(traderProfiles.userId, user.id)).limit(1);
      if (!profile) throw new HttpError(409, 'Complete your trader profile first');

      const acceptedCategories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
      const acceptedWork = sql`${jobs.acceptedQuoteId} in (select id from quotes where trader_id = ${user.id})`;
      const directWork = eq(jobs.targetTraderId, user.id);
      const withinRadius = profile.latitude != null && profile.longitude != null
        ? sql`${jobs.latitude} is not null and ${jobs.longitude} is not null and (
            3959 * acos(least(1, greatest(-1,
              cos(radians(${profile.latitude})) * cos(radians(${jobs.latitude})) *
              cos(radians(${jobs.longitude}) - radians(${profile.longitude})) +
              sin(radians(${profile.latitude})) * sin(radians(${jobs.latitude}))
            )))
          ) <= ${profile.radiusMiles}`
        : sql`false`;
      const openMarketplace = and(
        inArray(jobs.status, ['open', 'quoted']),
        sql`${jobs.targetTraderId} is null`,
        inArray(jobs.category, acceptedCategories),
        withinRadius,
      );

      const access = or(acceptedWork, directWork, openMarketplace)!;
      const databaseRows = await db.select().from(jobs).where(access).orderBy(desc(jobs.isEmergency), desc(jobs.createdAt)).limit(100);
      rows = databaseRows.map((job) => ({ ...job, isPreview: false }));
      rows = rows.map((job) => {
        const openMarketplaceJob = job.targetTraderId == null && ['open', 'quoted'].includes(job.status);
        return openMarketplaceJob
          ? { ...job, postcode: outwardCode(job.postcode), latitude: null, longitude: null }
          : job;
      });
    } else {
      throw new HttpError(403, 'Choose an account mode first');
    }

    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'customer');
    await assertRateLimit(request, 'post-job', 20, 3600, user.id);
    const payload = jobSchema.parse(await request.json());
    if (payload.isEmergency) {
      await assertRateLimit(request, 'post-emergency-job-hour', 3, 3600, user.id);
      await assertRateLimit(request, 'post-emergency-job-day', 10, 86400, user.id);
    }
    const db = getDb();

    let location;
    try {
      location = await lookupPostcode(payload.postcode);
    } catch (error) {
      if (error instanceof InvalidPostcodeError) throw new HttpError(400, error.message);
      throw error;
    }

    let targetPlan: string | null = null;
    if (payload.targetTraderId) {
      const targets = await getSql()`
        SELECT tp.trade_category AS "tradeCategory",
               CASE WHEN cardinality(tp.trade_categories) > 0 THEN tp.trade_categories ELSE ARRAY[tp.trade_category]::text[] END AS "tradeCategories",
               tp.subscription_tier AS "subscriptionTier",
               tp.is_subscription_active AS "isSubscriptionActive",
               tp.latitude,
               tp.longitude,
               tp.radius_miles AS "radiusMiles"
        FROM trader_profiles tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.user_id = ${payload.targetTraderId}
          AND coalesce(u.is_suspended, false) = false
          AND coalesce(u.is_deleted, false) = false
        LIMIT 1
      ` as unknown as {
        tradeCategory: string;
        tradeCategories: string[];
        subscriptionTier: string;
        isSubscriptionActive: boolean;
        latitude: number | null;
        longitude: number | null;
        radiusMiles: number;
      }[];
      const target = targets[0];
      if (!target || !target.isSubscriptionActive || target.subscriptionTier === 'free') throw new HttpError(409, 'This tradesperson is not currently accepting direct BuildPair leads');
      if (!target.tradeCategories.includes(payload.category)) throw new HttpError(400, `This direct request must use one of the tradesperson's listed trade categories.`);
      if (target.latitude == null || target.longitude == null) throw new HttpError(409, 'This tradesperson does not currently have a valid service location');
      if (distanceMiles(target.latitude, target.longitude, location.latitude, location.longitude) > target.radiusMiles) {
        throw new HttpError(409, 'This job is outside the tradesperson’s published service radius');
      }
      targetPlan = target.subscriptionTier;
    }

    const [job] = await db.insert(jobs).values({
      customerId: user.id,
      targetTraderId: payload.targetTraderId ?? null,
      title: payload.title,
      category: payload.category,
      propertyType: payload.propertyType,
      postcode: location.postcode,
      locationLabel: location.locationLabel,
      latitude: location.latitude,
      longitude: location.longitude,
      urgency: payload.urgency,
      description: payload.description,
      aiGeneratedSpec: payload.aiGeneratedSpec ?? null,
      budgetRange: payload.budgetRange,
      photos: payload.photos,
      isEmergency: payload.isEmergency,
    }).returning();
    if (!job) throw new Error('Job could not be created');

    await addJobEvent(job.id, user.id, 'job_posted', payload.isEmergency ? 'Emergency job posted' : 'Job posted', payload.title, { category: payload.category, emergency: payload.isEmergency });

    let conversationId: string | null = null;
    if (payload.targetTraderId) {
      const conversations = await getSql()`
        INSERT INTO conversations(job_id, customer_id, trader_id)
        VALUES (${job.id}, ${user.id}, ${payload.targetTraderId})
        ON CONFLICT (job_id, customer_id, trader_id)
        DO UPDATE SET updated_at = now()
        RETURNING id
      ` as unknown as { id: string }[];
      conversationId = conversations[0]?.id ?? null;
      const proTarget = targetPlan === 'featured';
      await createNotification(payload.targetTraderId, {
        type: proTarget ? 'pro_direct_lead' : 'direct_lead',
        title: payload.isEmergency ? 'Emergency direct job request' : proTarget ? 'Pro priority · New direct job request' : 'New direct job request',
        body: `${payload.title} has been sent directly to you.${proTarget ? ' Pro alerts include immediate email delivery.' : ''}`,
        href: '/trader/job-board',
        email: payload.isEmergency || proTarget,
      });
    } else {
      const matched = await getSql()`
        SELECT DISTINCT tp.user_id AS "userId", tp.subscription_tier AS "subscriptionTier"
        FROM trader_profiles tp
        JOIN users u ON u.id = tp.user_id
        WHERE ${payload.category} = ANY(CASE WHEN cardinality(tp.trade_categories) > 0 THEN tp.trade_categories ELSE ARRAY[tp.trade_category]::text[] END)
          AND tp.subscription_tier <> 'free'
          AND tp.is_subscription_active = true
          AND coalesce(u.is_suspended, false) = false
          AND coalesce(u.is_deleted, false) = false
          AND tp.latitude IS NOT NULL AND tp.longitude IS NOT NULL
          AND (3959 * acos(least(1, greatest(-1,
            cos(radians(tp.latitude)) * cos(radians(${location.latitude})) *
            cos(radians(${location.longitude}) - radians(tp.longitude)) +
            sin(radians(tp.latitude)) * sin(radians(${location.latitude}))
          )))) <= tp.radius_miles
        LIMIT 100
      ` as unknown as { userId: string; subscriptionTier: 'basic' | 'featured' }[];

      await Promise.allSettled(matched.map(({ userId, subscriptionTier }) => {
        const pro = subscriptionTier === 'featured';
        return createNotification(userId, {
          type: payload.isEmergency
            ? pro ? 'pro_emergency_job_match' : 'emergency_job_match'
            : pro ? 'pro_priority_job_match' : 'job_match',
          title: payload.isEmergency
            ? `${pro ? 'Pro priority · ' : ''}Emergency ${payload.category} job nearby`
            : pro ? `Pro priority · New ${payload.category} job match` : `New ${payload.category} job match`,
          body: `${payload.title} · ${outwardCode(location.postcode) ?? location.locationLabel}${pro ? ' · Priority alert also sent by email' : ''}`,
          href: '/trader/job-board',
          email: payload.isEmergency || pro,
        });
      }));
    }

    return Response.json({ ...job, isPreview: false, conversationId }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
