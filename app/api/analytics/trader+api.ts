import { getSql } from '@/lib/sql';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { hasPlanSetupAccess, traderAnalyticsLevel } from '@/lib/subscription';

type AnalyticsRow = {
  profileViews30d: number;
  profileViewsPrevious30d: number;
  savedByHomeowners: number;
  directLeads: number;
  quotesSent: number;
  quotesWon: number;
  averageQuote: number;
  wonJobValue: number;
  completedJobs: number;
  averageRating: number;
  reviewCount: number;
  averageQuoteResponseHours: number;
  activeSavedSearches: number;
  verifiedCredentials: number;
};

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const sql = getSql();
    const plans = await sql`
      SELECT subscription_tier AS "subscriptionTier",
             is_subscription_active AS "isSubscriptionActive",
             trial_ends_at AS "trialEndsAt"
      FROM trader_profiles
      WHERE user_id = ${trader.id}
      LIMIT 1
    ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
    const plan = plans[0];
    if (!plan) throw new HttpError(409, 'Complete your trader profile first');
    const analyticsLevel = traderAnalyticsLevel(plan);
    const minimum = plan.subscriptionTier === 'featured' ? 'featured' : plan.subscriptionTier === 'basic' ? 'basic' : 'core';
    if (analyticsLevel === 'none' || !hasPlanSetupAccess(plan, minimum)) {
      throw new HttpError(402, 'BuildPair Core, Plus or Pro is required for business analytics');
    }

    const rows = await sql`
      SELECT
        coalesce((SELECT sum(view_count) FROM trader_profile_view_daily WHERE trader_id = ${trader.id} AND view_day >= current_date - 29), 0)::int AS "profileViews30d",
        coalesce((SELECT sum(view_count) FROM trader_profile_view_daily WHERE trader_id = ${trader.id} AND view_day BETWEEN current_date - 59 AND current_date - 30), 0)::int AS "profileViewsPrevious30d",
        (SELECT count(*) FROM saved_traders WHERE trader_id = ${trader.id})::int AS "savedByHomeowners",
        (SELECT count(*) FROM jobs WHERE target_trader_id = ${trader.id})::int AS "directLeads",
        (SELECT count(*) FROM quotes WHERE trader_id = ${trader.id})::int AS "quotesSent",
        (SELECT count(*) FROM quotes WHERE trader_id = ${trader.id} AND status = 'accepted')::int AS "quotesWon",
        coalesce((SELECT avg(total_amount) FROM quotes WHERE trader_id = ${trader.id}), 0)::int AS "averageQuote",
        coalesce((SELECT sum(q.total_amount) FROM quotes q JOIN jobs j ON j.accepted_quote_id = q.id WHERE q.trader_id = ${trader.id}), 0)::bigint AS "wonJobValue",
        (SELECT count(*) FROM jobs j JOIN quotes q ON j.accepted_quote_id = q.id WHERE q.trader_id = ${trader.id} AND j.status = 'completed')::int AS "completedJobs",
        coalesce((SELECT avg(rating) FROM reviews WHERE trader_id = ${trader.id} AND verified_completion = true), 0)::float AS "averageRating",
        (SELECT count(*) FROM reviews WHERE trader_id = ${trader.id} AND verified_completion = true)::int AS "reviewCount",
        coalesce((SELECT avg(extract(epoch from (q.created_at - j.created_at)) / 3600.0) FROM quotes q JOIN jobs j ON j.id = q.job_id WHERE q.trader_id = ${trader.id}), 0)::float AS "averageQuoteResponseHours",
        (SELECT count(*) FROM saved_job_searches WHERE trader_id = ${trader.id} AND enabled = true)::int AS "activeSavedSearches",
        (SELECT count(*) FROM trader_credentials WHERE trader_id = ${trader.id} AND status = 'verified' AND (expires_at IS NULL OR expires_at > now()))::int AS "verifiedCredentials"
    ` as unknown as AnalyticsRow[];
    const metrics: AnalyticsRow = rows[0] ?? {
      profileViews30d: 0,
      profileViewsPrevious30d: 0,
      savedByHomeowners: 0,
      directLeads: 0,
      quotesSent: 0,
      quotesWon: 0,
      averageQuote: 0,
      wonJobValue: 0,
      completedJobs: 0,
      averageRating: 0,
      reviewCount: 0,
      averageQuoteResponseHours: 0,
      activeSavedSearches: 0,
      verifiedCredentials: 0,
    };
    const sent = Number(metrics.quotesSent ?? 0);
    const won = Number(metrics.quotesWon ?? 0);
    const all = { ...metrics, quoteWinRate: sent ? Math.round((won / sent) * 1000) / 10 : 0 };
    if (analyticsLevel === 'basic') {
      return Response.json({
        analyticsLevel,
        profileViews30d: all.profileViews30d,
        directLeads: all.directLeads,
        quotesSent: all.quotesSent,
        quotesWon: all.quotesWon,
      });
    }
    if (analyticsLevel === 'standard') {
      return Response.json({
        analyticsLevel,
        profileViews30d: all.profileViews30d,
        profileViewsPrevious30d: all.profileViewsPrevious30d,
        savedByHomeowners: all.savedByHomeowners,
        directLeads: all.directLeads,
        quotesSent: all.quotesSent,
        quotesWon: all.quotesWon,
        averageQuote: all.averageQuote,
        wonJobValue: all.wonJobValue,
        completedJobs: all.completedJobs,
        quoteWinRate: all.quoteWinRate,
        activeSavedSearches: all.activeSavedSearches,
      });
    }
    return Response.json({ analyticsLevel, ...all });
  } catch (error) { return jsonError(error); }
}
