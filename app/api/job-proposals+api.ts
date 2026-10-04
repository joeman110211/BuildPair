import { z } from 'zod';
import { createNotification } from '@/lib/notifications';
import { authenticatedUserId, accountModes, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasActiveLeadAccess, traderMonthlyQuoteLimit } from '@/lib/subscription';

const createSchema = z.object({
  jobId: z.string().uuid(),
  priceMin: z.number().int().min(0).nullable().optional(),
  priceMax: z.number().int().min(0).nullable().optional(),
  earliestStartAt: z.string().datetime().nullable().optional(),
  message: z.string().trim().min(10).max(1200),
  portfolioPhotos: z.array(z.string().url()).max(3).default([]),
  requiresSiteVisit: z.boolean().default(false),
}).refine((value) => value.priceMin == null || value.priceMax == null || value.priceMax >= value.priceMin, {
  message: 'Maximum estimate must be at least the minimum estimate.',
});

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['shortlist','decline','withdraw']),
});

type PlanRow = {
  subscriptionTier: 'free'|'core'|'basic'|'featured';
  isSubscriptionActive: boolean;
  trialEndsAt: string | null;
  tradeCategories: string[];
  tradeCategory: string;
  latitude: number | null;
  longitude: number | null;
  radiusMiles: number;
  photos: string[];
};

async function consumeOpportunity(sql: ReturnType<typeof getSql>, job: {
  id: string;
  targetTraderId: string | null;
  responseLimit: number;
}, traderId: string, profile: PlanRow) {
  const existing = await sql`
    SELECT id FROM trader_job_offers WHERE job_id = ${job.id} AND trader_id = ${traderId} LIMIT 1
  `;
  if (existing.length) return;

  if (!job.targetTraderId) {
    const responses = await sql`
      SELECT count(DISTINCT trader_id)::int AS count
      FROM trader_job_offers
      WHERE job_id = ${job.id}
    ` as unknown as { count: number }[];
    if ((responses[0]?.count ?? 0) >= job.responseLimit) {
      throw new HttpError(409, 'This job has reached its current response limit. The homeowner can open more places if they want more proposals.');
    }
  }

  const directIsIncluded = Boolean(job.targetTraderId) && profile.subscriptionTier !== 'core';
  if (!directIsIncluded) {
    const limit = traderMonthlyQuoteLimit(profile);
    const usage = await sql`
      SELECT count(*)::int AS count
      FROM trader_job_offers
      WHERE trader_id = ${traderId}
        AND created_at >= date_trunc('month', now())
        AND created_at < date_trunc('month', now()) + interval '1 month'
    ` as unknown as { count: number }[];
    if ((usage[0]?.count ?? 0) >= limit) {
      throw new HttpError(402, `You have used all ${limit} marketplace offers for this month. Your allowance resets next month.`);
    }
  }

  await sql`
    INSERT INTO trader_job_offers(job_id, trader_id)
    VALUES (${job.id}, ${traderId})
    ON CONFLICT (job_id, trader_id) DO NOTHING
  `;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'jobId is required');
    const sql = getSql();

    if (activeMode === 'customer') {
      const owner = await sql`SELECT 1 FROM jobs WHERE id = ${jobId} AND customer_id = ${userId} LIMIT 1`;
      if (!owner.length) throw new HttpError(403, 'You cannot view proposals for this job');
      const rows = await sql`
        SELECT p.id, p.job_id AS "jobId", p.trader_id AS "traderId",
               p.price_min AS "priceMin", p.price_max AS "priceMax",
               p.earliest_start_at AS "earliestStartAt", p.message,
               p.portfolio_photos AS "portfolioPhotos", p.requires_site_visit AS "requiresSiteVisit",
               p.status, p.created_at AS "createdAt",
               tp.id AS "traderProfileId", tp.business_name AS "businessName",
               tp.trade_category AS "tradeCategory", tp.location_label AS "locationLabel",
               coalesce((SELECT avg(r.rating)::float FROM reviews r WHERE r.trader_id = p.trader_id), 0) AS "averageRating",
               (SELECT count(*)::int FROM reviews r WHERE r.trader_id = p.trader_id) AS "reviewCount",
               (SELECT count(*)::int FROM jobs j2 JOIN quotes q2 ON q2.id = j2.accepted_quote_id
                 WHERE q2.trader_id = p.trader_id AND j2.status = 'completed') AS "completedJobs",
               coalesce((SELECT avg(extract(epoch from (q3.created_at - j3.created_at)) / 3600.0)
                 FROM quotes q3 JOIN jobs j3 ON j3.id = q3.job_id WHERE q3.trader_id = p.trader_id), 0)::float AS "averageResponseHours"
        FROM job_proposals p
        JOIN trader_profiles tp ON tp.user_id = p.trader_id
        WHERE p.job_id = ${jobId} AND p.status <> 'withdrawn'
        ORDER BY CASE p.status WHEN 'shortlisted' THEN 0 WHEN 'sent' THEN 1 ELSE 2 END, p.created_at ASC
      `;
      return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (activeMode !== 'trader') throw new HttpError(403, 'Tradesperson mode is required');
    const rows = await sql`
      SELECT p.id, p.job_id AS "jobId", p.trader_id AS "traderId",
             p.price_min AS "priceMin", p.price_max AS "priceMax",
             p.earliest_start_at AS "earliestStartAt", p.message,
             p.portfolio_photos AS "portfolioPhotos", p.requires_site_visit AS "requiresSiteVisit",
             p.status, p.created_at AS "createdAt"
      FROM job_proposals p
      WHERE p.job_id = ${jobId} AND p.trader_id = ${userId}
      LIMIT 1
    `;
    return Response.json(rows[0] ?? null, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = createSchema.parse(await request.json());
    const sql = getSql();
    const jobRows = await sql`
      SELECT id, customer_id AS "customerId", target_trader_id AS "targetTraderId",
             category, status, latitude, longitude, response_limit AS "responseLimit"
      FROM jobs WHERE id = ${input.jobId} LIMIT 1
    ` as unknown as {
      id: string; customerId: string; targetTraderId: string | null; category: string;
      status: string; latitude: number | null; longitude: number | null; responseLimit: number;
    }[];
    const job = jobRows[0];
    if (!job) throw new HttpError(404, 'Job not found');
    if (job.targetTraderId && job.targetTraderId !== trader.id) throw new HttpError(403, 'This direct request belongs to another tradesperson');
    if (!['open','quoted'].includes(job.status)) throw new HttpError(409, 'This job is no longer open for proposals');

    const profileRows = await sql`
      SELECT tp.subscription_tier AS "subscriptionTier", tp.is_subscription_active AS "isSubscriptionActive",
             tp.trial_ends_at AS "trialEndsAt", tp.trade_categories AS "tradeCategories",
             tp.trade_category AS "tradeCategory", tp.latitude, tp.longitude,
             tp.radius_miles AS "radiusMiles", tp.photos
      FROM trader_profiles tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.user_id = ${trader.id}
        AND coalesce(u.is_suspended, false) = false
        AND coalesce(u.is_deleted, false) = false
      LIMIT 1
    ` as unknown as PlanRow[];
    const profile = profileRows[0];
    if (!profile || !hasActiveLeadAccess(profile)) throw new HttpError(402, 'BuildPair Core, Plus or Pro is required to send a proposal');

    const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
    if (!categories.includes(job.category)) throw new HttpError(403, 'This job does not match one of your selected trade categories');

    if (!job.targetTraderId) {
      if (profile.latitude == null || profile.longitude == null || job.latitude == null || job.longitude == null) {
        throw new HttpError(403, 'A valid service location is required to offer on this job');
      }
      const distance = await sql`
        SELECT (3959 * acos(least(1, greatest(-1,
          cos(radians(${profile.latitude})) * cos(radians(${job.latitude})) *
          cos(radians(${job.longitude}) - radians(${profile.longitude})) +
          sin(radians(${profile.latitude})) * sin(radians(${job.latitude}))
        ))))::float AS miles
      ` as unknown as { miles: number }[];
      if ((distance[0]?.miles ?? Infinity) > profile.radiusMiles) throw new HttpError(403, 'This job is outside your service radius');
    }

    await consumeOpportunity(sql, job, trader.id, profile);
    const allowedPhotos = input.portfolioPhotos.filter((url) => profile.photos?.includes(url)).slice(0, 3);
    const rows = await sql`
      INSERT INTO job_proposals(
        job_id, customer_id, trader_id, price_min, price_max, earliest_start_at,
        message, portfolio_photos, requires_site_visit
      )
      VALUES (
        ${job.id}, ${job.customerId}, ${trader.id}, ${input.priceMin ?? null}, ${input.priceMax ?? null},
        ${input.earliestStartAt ?? null}, ${input.message}, ${allowedPhotos}, ${input.requiresSiteVisit}
      )
      ON CONFLICT (job_id, trader_id)
      DO UPDATE SET price_min = excluded.price_min, price_max = excluded.price_max,
                    earliest_start_at = excluded.earliest_start_at, message = excluded.message,
                    portfolio_photos = excluded.portfolio_photos, requires_site_visit = excluded.requires_site_visit,
                    status = CASE WHEN job_proposals.status = 'converted' THEN job_proposals.status ELSE 'sent' END,
                    updated_at = now()
      RETURNING id, job_id AS "jobId", trader_id AS "traderId", price_min AS "priceMin",
                price_max AS "priceMax", earliest_start_at AS "earliestStartAt", message,
                portfolio_photos AS "portfolioPhotos", requires_site_visit AS "requiresSiteVisit",
                status, created_at AS "createdAt"
    `;
    await createNotification(job.customerId, {
      type: 'job_proposal',
      title: 'New proposal for your job',
      body: 'A tradesperson has sent a quick proposal with pricing and availability information.',
      href: `/customer/jobs/${job.id}`,
      email: true,
    });
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    const input = actionSchema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      SELECT p.id, p.job_id AS "jobId", p.customer_id AS "customerId", p.trader_id AS "traderId",
             tp.business_name AS "businessName"
      FROM job_proposals p JOIN trader_profiles tp ON tp.user_id = p.trader_id
      WHERE p.id = ${input.id} LIMIT 1
    ` as unknown as { id:string; jobId:string; customerId:string; traderId:string; businessName:string }[];
    const proposal = rows[0];
    if (!proposal) throw new HttpError(404, 'Proposal not found');

    if (input.action === 'withdraw') {
      if (activeMode !== 'trader' || proposal.traderId !== userId) throw new HttpError(403, 'You cannot withdraw this proposal');
      await sql`UPDATE job_proposals SET status = 'withdrawn', updated_at = now() WHERE id = ${input.id}`;
      return Response.json({ ok: true, status: 'withdrawn' });
    }

    if (activeMode !== 'customer' || proposal.customerId !== userId) throw new HttpError(403, 'You cannot update this proposal');
    const status = input.action === 'shortlist' ? 'shortlisted' : 'declined';
    await sql`UPDATE job_proposals SET status = ${status}, updated_at = now() WHERE id = ${input.id}`;
    if (status === 'shortlisted') {
      await createNotification(proposal.traderId, {
        type: 'proposal_shortlisted',
        title: 'Your proposal was shortlisted',
        body: `The homeowner shortlisted your proposal for this job.`,
        href: `/trader/job-board?jobId=${proposal.jobId}`,
        email: true,
      });
    }
    return Response.json({ ok: true, status });
  } catch (error) {
    return jsonError(error);
  }
}
