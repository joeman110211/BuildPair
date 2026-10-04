import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { MAX_ACTIVE_QUOTES_PER_JOB } from '@/lib/quote-marketplace';
import { assertRateLimit } from '@/lib/rate-limit';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { effectiveTraderCategories, hasActiveLeadAccess, traderMonthlyQuoteLimit } from '@/lib/subscription';

const createSchema = z.object({
  jobId: z.string().uuid(),
  estimateMin: z.number().int().min(0).max(100_000_000),
  estimateMax: z.number().int().min(0).max(100_000_000),
  availableFrom: z.string().trim().max(20).nullable().optional(),
  note: z.string().trim().min(20).max(1200),
  portfolioUrls: z.array(z.string().url().max(1000)).max(3).default([]),
  siteVisitRequired: z.boolean().default(false),
}).refine((value) => value.estimateMax >= value.estimateMin, { message: 'Maximum estimate must be at least the minimum estimate' });

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['shortlist','decline','withdraw']),
});

function miles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const r = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function activeResponderCount(jobId: string) {
  const rows = await getSql()`
    SELECT count(DISTINCT trader_id)::int AS count
    FROM (
      SELECT trader_id FROM quotes WHERE job_id = ${jobId} AND status = 'pending'
      UNION
      SELECT trader_id FROM job_proposals WHERE job_id = ${jobId} AND status IN ('pending','shortlisted')
    ) responders
  ` as unknown as { count: number }[];
  return rows[0]?.count ?? 0;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');

    const jobs = await getSql()`SELECT customer_id AS "customerId" FROM jobs WHERE id = ${jobId} LIMIT 1` as unknown as { customerId: string }[];
    const job = jobs[0];
    if (!job) throw new HttpError(404, 'Job not found');

    if (job.customerId === userId) {
      const rows = await getSql()`
        SELECT p.id, p.job_id AS "jobId", p.trader_id AS "traderId",
               p.estimate_min AS "estimateMin", p.estimate_max AS "estimateMax",
               p.available_from AS "availableFrom", p.note,
               p.portfolio_urls AS "portfolioUrls", p.site_visit_required AS "siteVisitRequired",
               p.status, p.created_at AS "createdAt", p.updated_at AS "updatedAt",
               tp.business_name AS "businessName", tp.trade_category AS "tradeCategory",
               coalesce(avg(r.rating), 0)::float AS "averageRating",
               count(r.id)::int AS "reviewCount",
               coalesce((
                 SELECT avg(extract(epoch FROM (first_reply.created_at - c.created_at)) / 3600.0)
                 FROM conversations c
                 JOIN LATERAL (
                   SELECT m.created_at FROM messages m
                   WHERE m.conversation_id = c.id AND m.sender_id = p.trader_id
                   ORDER BY m.created_at ASC LIMIT 1
                 ) first_reply ON true
                 WHERE c.trader_id = p.trader_id
               ), 0)::float AS "averageResponseHours"
        FROM job_proposals p
        JOIN trader_profiles tp ON tp.user_id = p.trader_id
        LEFT JOIN reviews r ON r.trader_id = p.trader_id
        WHERE p.job_id = ${jobId} AND p.status <> 'withdrawn'
        GROUP BY p.id, tp.business_name, tp.trade_category
        ORDER BY CASE p.status WHEN 'shortlisted' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, p.created_at
      `;
      return Response.json(rows);
    }

    const rows = await getSql()`
      SELECT id, job_id AS "jobId", trader_id AS "traderId",
             estimate_min AS "estimateMin", estimate_max AS "estimateMax",
             available_from AS "availableFrom", note, portfolio_urls AS "portfolioUrls",
             site_visit_required AS "siteVisitRequired", status,
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM job_proposals
      WHERE job_id = ${jobId} AND trader_id = ${userId}
      LIMIT 1
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await assertRateLimit(request, 'quick-proposal', 40, 3600, trader.id);
    const input = createSchema.parse(await request.json());
    const sql = getSql();

    const jobs = await sql`
      SELECT id, customer_id AS "customerId", target_trader_id AS "targetTraderId",
             title, category, status, latitude, longitude, quote_intake_closed_at AS "quoteIntakeClosedAt"
      FROM jobs WHERE id = ${input.jobId} LIMIT 1
    ` as unknown as { id:string; customerId:string; targetTraderId:string|null; title:string; category:string; status:string; latitude:number|null; longitude:number|null; quoteIntakeClosedAt:string|null }[];
    const job = jobs[0];
    if (!job || !['open','quoted'].includes(job.status)) throw new HttpError(409, 'This job is no longer open for proposals');
    if (job.targetTraderId && job.targetTraderId !== trader.id) throw new HttpError(403, 'This direct request belongs to another tradesperson');

    const profiles = await sql`
      SELECT business_name AS "businessName", trade_category AS "tradeCategory",
             trade_categories AS "tradeCategories", subscription_tier AS "subscriptionTier",
             is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt",
             latitude, longitude, radius_miles AS "radiusMiles", photos
      FROM trader_profiles WHERE user_id = ${trader.id} LIMIT 1
    ` as unknown as {
      businessName:string; tradeCategory:string; tradeCategories:string[]; subscriptionTier:'free'|'core'|'basic'|'featured';
      isSubscriptionActive:boolean; trialEndsAt:string|null; latitude:number|null; longitude:number|null; radiusMiles:number; photos:string[];
    }[];
    const profile = profiles[0];
    if (!profile || !hasActiveLeadAccess(profile)) throw new HttpError(402, 'An active BuildPair Core, Plus or Pro membership is required to send a proposal');

    const already = await sql`SELECT id FROM job_proposals WHERE job_id = ${job.id} AND trader_id = ${trader.id} LIMIT 1`;
    if (!already.length && !job.targetTraderId) {
      if (job.quoteIntakeClosedAt) throw new HttpError(409, 'The homeowner has paused new responses for this job');
      if ((await activeResponderCount(job.id)) >= MAX_ACTIVE_QUOTES_PER_JOB) throw new HttpError(409, 'This job already has enough active tradespeople for the homeowner to compare');
      const categories = effectiveTraderCategories(profile, profile.tradeCategories, profile.tradeCategory);
      if (!categories.includes(job.category)) throw new HttpError(403, 'This job does not match one of your selected trade categories');
      if (profile.latitude == null || profile.longitude == null || job.latitude == null || job.longitude == null) throw new HttpError(403, 'Location matching is required for this marketplace job');
      if (miles(profile.latitude, profile.longitude, job.latitude, job.longitude) > profile.radiusMiles) throw new HttpError(403, 'This marketplace job is outside your service radius');

      const limit = traderMonthlyQuoteLimit(profile);
      const usage = await sql`
        SELECT count(*)::int AS count FROM trader_job_offers
        WHERE trader_id = ${trader.id}
          AND created_at >= date_trunc('month', now())
          AND created_at < date_trunc('month', now()) + interval '1 month'
      ` as unknown as { count:number }[];
      if ((usage[0]?.count ?? 0) >= limit) throw new HttpError(402, `You have used all ${limit} open-marketplace offers for this month. Your allowance resets next month.`);
      await sql`INSERT INTO trader_job_offers(job_id, trader_id) VALUES (${job.id}, ${trader.id}) ON CONFLICT (job_id, trader_id) DO NOTHING`;
    }

    const allowedPhotos = new Set(profile.photos ?? []);
    const portfolioUrls = input.portfolioUrls.filter((url) => allowedPhotos.has(url)).slice(0, 3);
    const rows = await sql`
      INSERT INTO job_proposals(job_id, customer_id, trader_id, estimate_min, estimate_max, available_from, note, portfolio_urls, site_visit_required, status)
      VALUES (${job.id}, ${job.customerId}, ${trader.id}, ${input.estimateMin}, ${input.estimateMax}, ${input.availableFrom || null}, ${input.note}, ${portfolioUrls}, ${input.siteVisitRequired}, 'pending')
      ON CONFLICT (job_id, trader_id) DO UPDATE SET
        estimate_min = EXCLUDED.estimate_min,
        estimate_max = EXCLUDED.estimate_max,
        available_from = EXCLUDED.available_from,
        note = EXCLUDED.note,
        portfolio_urls = EXCLUDED.portfolio_urls,
        site_visit_required = EXCLUDED.site_visit_required,
        status = 'pending',
        responded_at = NULL,
        shortlisted_at = NULL,
        updated_at = now()
      RETURNING id, job_id AS "jobId", trader_id AS "traderId", estimate_min AS "estimateMin",
                estimate_max AS "estimateMax", available_from AS "availableFrom", note,
                portfolio_urls AS "portfolioUrls", site_visit_required AS "siteVisitRequired",
                status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const proposal = rows[0];
    await addJobEvent(job.id, trader.id, 'quick_proposal_received', 'Quick proposal received', `${profile.businessName} sent an early price and availability proposal before a full quote.`, { proposalId: (proposal as { id?:string })?.id });
    await createNotification(job.customerId, {
      type: 'quick_proposal_received',
      title: `New proposal from ${profile.businessName}`,
      body: `${job.title}: review the estimated price, availability and relevant work before deciding who to shortlist.`,
      href: `/customer/jobs/${job.id}`,
      email: true,
    });
    return Response.json(proposal, { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = actionSchema.parse(await request.json());
    const sql = getSql();
    const rows = await sql`
      SELECT p.id, p.job_id AS "jobId", p.customer_id AS "customerId", p.trader_id AS "traderId",
             p.status, j.title, tp.business_name AS "businessName"
      FROM job_proposals p
      JOIN jobs j ON j.id = p.job_id
      JOIN trader_profiles tp ON tp.user_id = p.trader_id
      WHERE p.id = ${input.id}
      LIMIT 1
    ` as unknown as { id:string; jobId:string; customerId:string; traderId:string; status:string; title:string; businessName:string }[];
    const proposal = rows[0];
    if (!proposal) throw new HttpError(404, 'Proposal not found');

    if (input.action === 'withdraw') {
      if (userId !== proposal.traderId) throw new HttpError(403, 'Only the tradesperson can withdraw this proposal');
      if (!['pending','shortlisted'].includes(proposal.status)) throw new HttpError(409, 'This proposal can no longer be withdrawn');
      await sql`UPDATE job_proposals SET status = 'withdrawn', responded_at = now(), updated_at = now() WHERE id = ${proposal.id}`;
      await createNotification(proposal.customerId, { type:'quick_proposal_withdrawn', title:'Proposal withdrawn', body:`${proposal.businessName} withdrew their early proposal for ${proposal.title}.`, href:`/customer/jobs/${proposal.jobId}` });
      return Response.json({ ok:true, status:'withdrawn' });
    }

    if (userId !== proposal.customerId) throw new HttpError(403, 'Only the homeowner can respond to this proposal');
    if (!['pending','shortlisted'].includes(proposal.status)) throw new HttpError(409, 'This proposal is no longer awaiting a decision');

    if (input.action === 'decline') {
      await sql`UPDATE job_proposals SET status='declined', responded_at=now(), updated_at=now() WHERE id=${proposal.id}`;
      await createNotification(proposal.traderId, { type:'quick_proposal_declined', title:'Proposal not shortlisted', body:`The homeowner did not shortlist your early proposal for ${proposal.title}.`, href:'/trader/job-board' });
      return Response.json({ ok:true, status:'declined' });
    }

    await sql`UPDATE job_proposals SET status='shortlisted', shortlisted_at=now(), responded_at=now(), updated_at=now() WHERE id=${proposal.id}`;
    const conversations = await sql`
      INSERT INTO conversations(job_id, customer_id, trader_id)
      VALUES (${proposal.jobId}, ${proposal.customerId}, ${proposal.traderId})
      ON CONFLICT (job_id, customer_id, trader_id) DO UPDATE SET updated_at=now()
      RETURNING id
    ` as unknown as { id:string }[];
    await addJobEvent(proposal.jobId, userId, 'quick_proposal_shortlisted', 'Tradesperson shortlisted', `${proposal.businessName} was shortlisted from an early proposal.`, { proposalId: proposal.id });
    await createNotification(proposal.traderId, { type:'quick_proposal_shortlisted', title:'You were shortlisted', body:`The homeowner shortlisted your proposal for ${proposal.title}. You can now discuss the details, arrange a visit or prepare the full quote.`, href: conversations[0]?.id ? `/trader/messages/${conversations[0].id}` : '/trader/job-board', email:true });
    return Response.json({ ok:true, status:'shortlisted', conversationId: conversations[0]?.id ?? null });
  } catch (error) { return jsonError(error); }
}
