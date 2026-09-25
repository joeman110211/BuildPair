import { getSql } from '@/lib/sql';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, 'trader');
    await ensureLaunchWaitlistTable();
    const sql = getSql();

    const emailRows = await sql`
      SELECT email
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    ` as unknown as { email: string | null }[];
    const email = emailRows[0]?.email?.trim().toLowerCase();
    if (!email) throw new HttpError(409, 'Add an email address to your BuildPair account before creating a referral link.');

    await sql`
      INSERT INTO launch_waitlist (
        name, email, phone, postcode, audience, trade, tester_interest,
        sms_opt_in, marketing_opt_in, preferred_contact, source,
        referral_code, status, registered_user_id, registered_at
      )
      VALUES (
        '', ${email}, NULL, '', 'trader', NULL, true,
        false, false, 'email', 'one-good-trade',
        'BP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        'registered', ${user.id}, now()
      )
      ON CONFLICT (email) DO UPDATE SET
        audience = 'trader',
        status = 'registered',
        registered_user_id = ${user.id},
        registered_at = coalesce(launch_waitlist.registered_at, now()),
        updated_at = now()
    `;

    const rows = await sql`
      SELECT
        referral_code AS "referralCode",
        (
          SELECT count(*)::int
          FROM launch_waitlist referred
          WHERE referred.referred_by_id = launch_waitlist.id
            AND referred.status <> 'removed'
        ) AS "referralCount"
      FROM launch_waitlist
      WHERE registered_user_id = ${user.id}
         OR lower(coalesce(email, '')) = lower(${email})
      ORDER BY CASE WHEN registered_user_id = ${user.id} THEN 0 ELSE 1 END, created_at
      LIMIT 1
    ` as unknown as { referralCode: string | null; referralCount: number }[];

    const referralCode = rows[0]?.referralCode;
    if (!referralCode) throw new HttpError(503, 'BuildPair could not create your referral link right now.');

    return Response.json({
      referralCode,
      referralCount: rows[0]?.referralCount ?? 0,
      referralUrl: `https://www.buildpair.co.uk/auth/founding-trade-signup?source=one-good-trade&ref=${encodeURIComponent(referralCode)}`,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
