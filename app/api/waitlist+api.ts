import { z } from 'zod';
import { normalizeUkMobile } from '@/lib/phone';
import { assertRateLimit } from '@/lib/rate-limit';
import { jsonError, HttpError } from '@/lib/server';
import { smsConfigured } from '@/lib/sms';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

const waitlistSchema = z.object({
  name: z.string().trim().max(120).optional().default(''),
  email: z.string().trim().max(254).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  postcode: z.string().trim().max(10).optional().default(''),
  audience: z.enum(['homeowner', 'trader']),
  trade: z.string().trim().max(100).optional().default(''),
  testerInterest: z.boolean().optional().default(false),
  smsOptIn: z.boolean().optional().default(false),
  marketingOptIn: z.boolean().optional().default(false),
  preferredContact: z.enum(['email', 'sms', 'both']).optional(),
  source: z.string().trim().max(80).optional().default('website'),
});

function normalizePostcode(input: string) {
  const compact = input.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) throw new HttpError(400, 'Enter a valid UK postcode');
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function normalizeEmail(input: string) {
  const email = input.trim().toLowerCase();
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address');
  return email;
}

export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'launch-waitlist', 12, 60 * 60);
    const input = waitlistSchema.parse(await request.json());

    const email = normalizeEmail(input.email);
    let phone = '';
    if (input.phone) {
      try { phone = normalizeUkMobile(input.phone); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Enter a valid UK mobile number'); }
    }

    if (!email && !phone) throw new HttpError(400, 'Enter an email address or UK mobile number');

    const requestedPreference = input.preferredContact;
    const effectivePreference = requestedPreference ?? (email ? 'email' : 'sms');
    if (effectivePreference === 'email' && !email) throw new HttpError(400, 'Email is required when Email is your contact choice');
    if (effectivePreference === 'sms' && !phone) throw new HttpError(400, 'Mobile is required when Text is your contact choice');
    if (effectivePreference === 'both' && (!email || !phone)) throw new HttpError(400, 'Enter both an email address and mobile number when Both is selected');
    if (requestedPreference && (requestedPreference === 'sms' || requestedPreference === 'both') && !smsConfigured()) {
      throw new HttpError(503, 'Text notifications are being connected. Choose Email for now.');
    }

    const postcode = input.postcode ? normalizePostcode(input.postcode) : '';
    const serviceSmsConsent = effectivePreference === 'sms' || effectivePreference === 'both';
    await ensureLaunchWaitlistTable();
    const sql = getSql();

    const candidates = await sql`
      SELECT id, email, phone
      FROM launch_waitlist
      WHERE
        (${email || null}::text IS NOT NULL AND lower(coalesce(email, '')) = lower(${email || null}::text))
        OR (${phone || null}::text IS NOT NULL AND phone = ${phone || null}::text)
      ORDER BY created_at
      LIMIT 3
    ` as unknown as { id: string; email: string | null; phone: string | null }[];

    const distinctIds = [...new Set(candidates.map((row) => row.id))];
    if (distinctIds.length > 1) {
      throw new HttpError(409, 'That email and mobile are already linked to different launch-list entries. Contact info@buildpair.co.uk so we can merge them safely.');
    }

    const existingId = distinctIds[0] ?? null;
    let id: string | undefined;

    if (existingId) {
      const rows = await sql`
        UPDATE launch_waitlist
        SET
          name = CASE WHEN ${input.name} <> '' THEN ${input.name} ELSE name END,
          email = CASE WHEN ${email} <> '' THEN ${email} ELSE email END,
          phone = CASE WHEN ${phone} <> '' THEN ${phone} ELSE phone END,
          postcode = CASE WHEN ${postcode} <> '' THEN ${postcode} ELSE postcode END,
          audience = ${input.audience},
          trade = CASE WHEN ${input.audience === 'trader' && Boolean(input.trade)} THEN ${input.trade || null} ELSE trade END,
          tester_interest = tester_interest OR ${input.testerInterest},
          sms_opt_in = CASE
            WHEN ${requestedPreference ?? null}::text IS NOT NULL THEN ${serviceSmsConsent}
            ELSE sms_opt_in OR ${input.smsOptIn}
          END,
          marketing_opt_in = marketing_opt_in OR ${input.marketingOptIn},
          preferred_contact = CASE
            WHEN ${requestedPreference ?? null}::text IS NOT NULL THEN ${effectivePreference}
            ELSE preferred_contact
          END,
          source = ${input.source || 'website'},
          status = CASE WHEN status = 'removed' THEN 'waiting' ELSE status END,
          updated_at = now()
        WHERE id = ${existingId}::uuid
        RETURNING id
      ` as unknown as { id: string }[];
      id = rows[0]?.id;
    } else {
      const rows = await sql`
        INSERT INTO launch_waitlist (
          name, email, phone, postcode, audience, trade, tester_interest,
          sms_opt_in, marketing_opt_in, preferred_contact, source
        )
        VALUES (
          ${input.name}, ${email || null}, ${phone || null}, ${postcode}, ${input.audience},
          ${input.audience === 'trader' && input.trade ? input.trade : null}, ${input.testerInterest},
          ${serviceSmsConsent || input.smsOptIn}, ${input.marketingOptIn}, ${effectivePreference}, ${input.source || 'website'}
        )
        RETURNING id
      ` as unknown as { id: string }[];
      id = rows[0]?.id;
    }

    return Response.json({
      ok: true,
      id,
      alreadyJoined: Boolean(existingId),
      preferredContact: effectivePreference,
    });
  } catch (error) {
    return jsonError(error);
  }
}
