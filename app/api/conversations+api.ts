import { z } from 'zod';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { traderMonthlyQuoteLimit } from '@/lib/subscription';

const createConversationSchema = z.object({
  jobId: z.string().uuid(),
  traderId: z.string().min(1).optional(),
});

type ConversationRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  otherUserId: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

type JobRow = {
  id: string;
  customerId: string;
  targetTraderId: string | null;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  responseLimit: number;
};
type CreatedConversation = { id: string; jobId: string; customerId: string; traderId: string; lastMessageAt: string };
type TraderPlanRow = {
  subscriptionTier: 'free' | 'core' | 'basic' | 'featured';
  isSubscriptionActive: boolean;
  tradeCategories: string[];
  tradeCategory: string;
  latitude: number | null;
  longitude: number | null;
  radiusMiles: number;
};

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    if (!activeMode) throw new HttpError(403, 'Choose an account mode first');
    const sql = getSql();
    const rows = activeMode === 'customer'
      ? await sql`
          SELECT c.id,
                 c.job_id AS "jobId",
                 j.title AS "jobTitle",
                 c.customer_id AS "customerId",
                 c.trader_id AS "traderId",
                 c.trader_id AS "otherUserId",
                 (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage",
                 c.last_message_at AS "lastMessageAt",
                 (SELECT count(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ${userId} AND m.read_at IS NULL) AS "unreadCount"
          FROM conversations c
          JOIN jobs j ON j.id = c.job_id
          WHERE c.customer_id = ${userId}
          ORDER BY c.last_message_at DESC
          LIMIT 100
        ` as unknown as ConversationRow[]
      : await sql`
          SELECT c.id,
                 c.job_id AS "jobId",
                 j.title AS "jobTitle",
                 c.customer_id AS "customerId",
                 c.trader_id AS "traderId",
                 c.customer_id AS "otherUserId",
                 (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS "lastMessage",
                 c.last_message_at AS "lastMessageAt",
                 (SELECT count(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ${userId} AND m.read_at IS NULL) AS "unreadCount"
          FROM conversations c
          JOIN jobs j ON j.id = c.job_id
          WHERE c.trader_id = ${userId}
          ORDER BY c.last_message_at DESC
          LIMIT 100
        ` as unknown as ConversationRow[];
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const activeMode = modes.activeMode ?? user.role;
    if (!activeMode) throw new HttpError(403, 'Choose an account mode first');
    const payload = createConversationSchema.parse(await request.json());
    const sql = getSql();
    const jobRows = await sql`
      SELECT id, customer_id AS "customerId", target_trader_id AS "targetTraderId",
             category, status, latitude, longitude, response_limit AS "responseLimit"
      FROM jobs WHERE id = ${payload.jobId} LIMIT 1
    ` as unknown as JobRow[];
    const job = jobRows[0];
    if (!job) throw new HttpError(404, 'Job not found');

    const traderId = activeMode === 'trader' ? userId : payload.traderId;
    if (!traderId) throw new HttpError(400, 'Trader is required');
    if (activeMode === 'customer' && job.customerId !== userId) throw new HttpError(403, 'You cannot message from this job');
    if (activeMode === 'trader' && traderId !== userId) throw new HttpError(403, 'Invalid trader');

    if (activeMode === 'trader' && job.targetTraderId !== traderId) {
      if (job.targetTraderId) throw new HttpError(403, 'This direct job request belongs to another tradesperson');
      if (!['open', 'quoted'].includes(job.status)) throw new HttpError(409, 'This job is no longer open for new offers');

      const planRows = await sql`
        SELECT tp.subscription_tier AS "subscriptionTier",
               tp.is_subscription_active AS "isSubscriptionActive",
               tp.trade_categories AS "tradeCategories",
               tp.trade_category AS "tradeCategory",
               tp.latitude, tp.longitude, tp.radius_miles AS "radiusMiles"
        FROM trader_profiles tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.user_id = ${traderId}
          AND coalesce(u.is_suspended, false) = false
          AND coalesce(u.is_deleted, false) = false
        LIMIT 1
      ` as unknown as TraderPlanRow[];
      const profile = planRows[0];
      if (!profile || profile.subscriptionTier === 'free' || !profile.isSubscriptionActive) {
        throw new HttpError(402, 'BuildPair Core, Plus or Pro is required to engage with marketplace jobs');
      }

      const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
      if (!categories.includes(job.category)) throw new HttpError(403, 'This job does not match one of your selected trade categories');
      if (profile.latitude == null || profile.longitude == null || job.latitude == null || job.longitude == null) {
        throw new HttpError(403, 'A valid service location is required to offer on this job');
      }

      const distanceRows = await sql`
        SELECT (3959 * acos(least(1, greatest(-1,
          cos(radians(${profile.latitude})) * cos(radians(${job.latitude})) *
          cos(radians(${job.longitude}) - radians(${profile.longitude})) +
          sin(radians(${profile.latitude})) * sin(radians(${job.latitude}))
        ))))::float AS miles
      ` as unknown as { miles: number }[];
      if ((distanceRows[0]?.miles ?? Infinity) > profile.radiusMiles) throw new HttpError(403, 'This job is outside your service radius');

      const existing = await sql`SELECT id FROM trader_job_offers WHERE job_id = ${job.id} AND trader_id = ${traderId} LIMIT 1`;
      if (!existing.length) {
        const responseRows = await sql`
          SELECT count(DISTINCT trader_id)::int AS count
          FROM trader_job_offers
          WHERE job_id = ${job.id}
        ` as unknown as { count: number }[];
        if ((responseRows[0]?.count ?? 0) >= job.responseLimit) {
          throw new HttpError(409, 'This job has reached its current response limit. The homeowner can open more places if they want more responses.');
        }
        const limit = traderMonthlyQuoteLimit(profile);
        const usage = await sql`
          SELECT count(*)::int AS count
          FROM trader_job_offers
          WHERE trader_id = ${traderId}
            AND created_at >= date_trunc('month', now())
            AND created_at < date_trunc('month', now()) + interval '1 month'
        ` as unknown as { count: number }[];
        if ((usage[0]?.count ?? 0) >= limit) throw new HttpError(402, `You have used all ${limit} marketplace offers for this month. Your allowance resets next month.`);
        await sql`
          INSERT INTO trader_job_offers(job_id, trader_id)
          VALUES (${job.id}, ${traderId})
          ON CONFLICT (job_id, trader_id) DO NOTHING
        `;
      }
    } else if (activeMode === 'customer' && job.targetTraderId !== traderId) {
      const eligible = await sql`
        SELECT 1 FROM trader_job_offers WHERE job_id = ${job.id} AND trader_id = ${traderId}
        UNION ALL
        SELECT 1 FROM quotes WHERE job_id = ${job.id} AND trader_id = ${traderId}
        LIMIT 1
      `;
      if (!eligible.length) throw new HttpError(403, 'This tradesperson has not offered on the job');
    }

    const rows = await sql`
      INSERT INTO conversations(job_id, customer_id, trader_id)
      VALUES (${payload.jobId}, ${job.customerId}, ${traderId})
      ON CONFLICT (job_id, customer_id, trader_id)
      DO UPDATE SET updated_at = now()
      RETURNING id, job_id AS "jobId", customer_id AS "customerId", trader_id AS "traderId", last_message_at AS "lastMessageAt"
    ` as unknown as CreatedConversation[];
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}
