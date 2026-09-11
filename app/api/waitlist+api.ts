import { z } from 'zod';
import { normalizeUkMobile } from '@/lib/phone';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError, HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  postcode: z.string().trim().min(5).max(10),
  audience: z.enum(['homeowner', 'trader']),
  trade: z.string().trim().max(100).optional().default(''),
  testerInterest: z.boolean().optional().default(false),
  smsOptIn: z.boolean().optional().default(false),
  marketingOptIn: z.boolean().optional().default(false),
  source: z.string().trim().max(80).optional().default('website'),
});

function normalizePostcode(input: string) {
  const compact = input.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) throw new HttpError(400, 'Enter a valid UK postcode');
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'launch-waitlist', 12, 60 * 60);
    const input = waitlistSchema.parse(await request.json());
    if (input.audience === 'trader' && input.trade.length < 2) throw new HttpError(400, 'Tell us your main trade');

    let phone: string;
    try { phone = normalizeUkMobile(input.phone); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Enter a valid UK mobile number'); }

    const email = input.email.toLowerCase();
    const postcode = normalizePostcode(input.postcode);
    await ensureLaunchWaitlistTable();
    const sql = getSql();
    const existing = await sql`SELECT id FROM launch_waitlist WHERE email = ${email} LIMIT 1` as unknown as { id: string }[];

    const rows = await sql`
      INSERT INTO launch_waitlist (name, email, phone, postcode, audience, trade, tester_interest, sms_opt_in, marketing_opt_in, source)
      VALUES (${input.name}, ${email}, ${phone}, ${postcode}, ${input.audience}, ${input.audience === 'trader' ? input.trade : null}, ${input.testerInterest}, ${input.smsOptIn}, ${input.marketingOptIn}, ${input.source || 'website'})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        postcode = EXCLUDED.postcode,
        audience = EXCLUDED.audience,
        trade = EXCLUDED.trade,
        tester_interest = EXCLUDED.tester_interest,
        sms_opt_in = EXCLUDED.sms_opt_in,
        marketing_opt_in = EXCLUDED.marketing_opt_in,
        source = EXCLUDED.source,
        status = CASE WHEN launch_waitlist.status = 'removed' THEN 'waiting' ELSE launch_waitlist.status END,
        updated_at = now()
      RETURNING id, created_at AS "createdAt"
    ` as unknown as { id: string; createdAt: string }[];

    return Response.json({ ok: true, id: rows[0]?.id, alreadyJoined: existing.length > 0 });
  } catch (error) {
    return jsonError(error);
  }
}
