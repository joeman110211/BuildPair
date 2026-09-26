import { randomUUID } from 'node:crypto';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl } from '@/lib/stripe';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';

async function requireCalendarPlan(userId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt"
    FROM trader_profiles WHERE user_id = ${userId} LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const plan = rows[0];
  if (!plan || !tierAtLeast(plan.subscriptionTier, 'basic') || !hasPlanSetupAccess(plan, 'basic')) {
    throw new HttpError(402, 'Calendar subscription is included with BuildPair Plus and Pro.');
  }
  return plan;
}

function tokenValue() {
  return `${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
}

async function currentOrCreate(userId: string) {
  const sql = getSql();
  const existing = await sql`SELECT token FROM trader_calendar_tokens WHERE user_id = ${userId} LIMIT 1` as unknown as { token: string }[];
  if (existing[0]?.token) return existing[0].token;
  const token = tokenValue();
  const rows = await sql`
    INSERT INTO trader_calendar_tokens(user_id, token)
    VALUES (${userId}, ${token})
    ON CONFLICT (user_id) DO UPDATE SET token = trader_calendar_tokens.token
    RETURNING token
  ` as unknown as { token: string }[];
  return rows[0]!.token;
}

function response(token: string) {
  const httpsUrl = `${appUrl()}/api/calendar-feed/${encodeURIComponent(token)}`;
  return { url: httpsUrl, webcalUrl: httpsUrl.replace(/^https:/, 'webcal:') };
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireCalendarPlan(trader.id);
    return Response.json(response(await currentOrCreate(trader.id)));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireCalendarPlan(trader.id);
    const action = (await request.json().catch(() => ({}))) as { action?: string };
    if (action.action !== 'regenerate') throw new HttpError(400, 'Unsupported calendar subscription action');
    const token = tokenValue();
    const rows = await getSql()`
      INSERT INTO trader_calendar_tokens(user_id, token, regenerated_at)
      VALUES (${trader.id}, ${token}, now())
      ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token, regenerated_at = now()
      RETURNING token
    ` as unknown as { token: string }[];
    return Response.json(response(rows[0]!.token));
  } catch (error) { return jsonError(error); }
}
