import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  referralCode: z.string().trim().min(3).max(40),
  visitorKey: z.string().trim().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'referral-visit', 60, 3600);
    const input = schema.parse(await request.json());
    await getSql()`
      INSERT INTO trader_referral_visits(referral_code, visitor_key)
      VALUES (${input.referralCode}, ${input.visitorKey})
      ON CONFLICT (referral_code, visitor_key) DO NOTHING
    `;
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
