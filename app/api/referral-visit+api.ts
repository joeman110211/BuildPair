import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

const schema = z.object({
  referralCode: z.string().trim().min(4).max(40),
  visitorKey: z.string().trim().min(8).max(120),
});

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'referral-visit', 60, 86400);
    const input = schema.parse(await request.json());
    await ensureLaunchWaitlistTable();
    const rows = await getSql()`
      SELECT id
      FROM launch_waitlist
      WHERE referral_code = ${input.referralCode}
        AND status <> 'removed'
      LIMIT 1
    ` as unknown as { id: string }[];
    const referrer = rows[0];
    if (!referrer) return Response.json({ ok: true });

    await getSql()`
      INSERT INTO trader_referral_visits(referrer_waitlist_id, visitor_key)
      VALUES (${referrer.id}, ${input.visitorKey})
      ON CONFLICT (referrer_waitlist_id, visitor_key)
      DO UPDATE SET last_seen_at = now(), visit_count = trader_referral_visits.visit_count + 1
    `;
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
