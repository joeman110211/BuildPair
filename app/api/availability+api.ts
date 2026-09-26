import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

const createSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(['available','busy','unavailable']).default('available'),
  note: z.string().trim().max(300).optional(),
});
const deleteSchema = z.object({ id: z.string().uuid() });
const MAX_AVAILABILITY_SLOTS = 180;
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 400 * 24 * 60 * 60 * 1000;


async function requireProAvailability(traderId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier",
           is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles
    WHERE user_id = ${traderId}
    LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const profile = rows[0];
  if (!profile || profile.subscriptionTier !== 'featured' || !hasPlanSetupAccess(profile, 'featured')) {
    throw new HttpError(402, 'The availability calendar is included with BuildPair Pro.');
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedTraderId = url.searchParams.get('traderId');

    if (requestedTraderId) {
      // Public availability is a sales signal, not a window into a trader's
      // private diary. Never expose busy/unavailable entries or their notes.
      const rows = await getSql()`
        SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", status, note
        FROM trader_availability
        WHERE trader_id = ${requestedTraderId}
          AND status = 'available'
          AND ends_at >= now()
        ORDER BY starts_at ASC
        LIMIT 60
      `;
      return Response.json(rows);
    }

    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const rows = await getSql()`
      SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", status, note
      FROM trader_availability
      WHERE trader_id = ${userId}
        AND ends_at >= now() - interval '1 day'
      ORDER BY starts_at ASC
      LIMIT ${MAX_AVAILABILITY_SLOTS}
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireProAvailability(trader.id);
    await assertRateLimit(request, 'availability-create', 40, 3600, trader.id);
    const input = createSchema.parse(await request.json());
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const now = Date.now();
    if (endsAt <= startsAt) throw new HttpError(400, 'Availability end must be after the start');
    if (endsAt.getTime() <= now) throw new HttpError(400, 'Availability must end in the future');
    if (startsAt.getTime() > now + MAX_FUTURE_MS) throw new HttpError(400, 'Availability can be published up to 400 days ahead');
    if (endsAt.getTime() - startsAt.getTime() > MAX_WINDOW_MS) throw new HttpError(400, 'A single availability window cannot be longer than 31 days');
    const countRows = await getSql()`
      SELECT count(*)::int AS count
      FROM trader_availability
      WHERE trader_id = ${trader.id} AND ends_at >= now()
    ` as unknown as { count: number }[];
    if ((countRows[0]?.count ?? 0) >= MAX_AVAILABILITY_SLOTS) throw new HttpError(409, `You can keep up to ${MAX_AVAILABILITY_SLOTS} upcoming availability slots`);
    const rows = await getSql()`
      INSERT INTO trader_availability(trader_id, starts_at, ends_at, status, note)
      VALUES (${trader.id}, ${input.startsAt}::timestamptz, ${input.endsAt}::timestamptz, ${input.status}, ${input.note ?? null})
      RETURNING id, starts_at AS "startsAt", ends_at AS "endsAt", status, note
    `;
    return Response.json(rows[0], { status: 201 });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await requireProAvailability(trader.id);
    const { id } = deleteSchema.parse(await request.json());
    const rows = await getSql()`DELETE FROM trader_availability WHERE id = ${id} AND trader_id = ${trader.id} RETURNING id`;
    if (!rows.length) throw new HttpError(404, 'Availability entry not found');
    return Response.json({ deleted: true });
  } catch (error) { return jsonError(error); }
}
