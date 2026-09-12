import { createEarlyAccessToken, ensureEarlyAccessInviteTable, hashEarlyAccessToken } from '@/lib/early-access-store';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { sendTransactionalSms, smsConfigured } from '@/lib/sms';
import { getSql } from '@/lib/sql';

type ContactPreference = 'email' | 'sms' | 'both';

type ActionBody = {
  action?: 'grant' | 'resend' | 'revoke';
  waitlistId?: string;
  inviteId?: string;
  email?: string;
  audience?: 'homeowner' | 'trader';
};

type InviteTarget = {
  waitlistId: string | null;
  email: string | null;
  phone: string | null;
  audience: 'homeowner' | 'trader';
  name: string;
  preferredContact: ContactPreference;
};

function inviteUrl(token: string) {
  const appUrl = (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
  return `${appUrl}/auth/early-access?invite=${encodeURIComponent(token)}`;
}

async function sendInviteEmail(target: InviteTarget, token: string) {
  if (!target.email) throw new Error('This invite has no email address');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const url = inviteUrl(token);
  const from = process.env.INVOICE_FROM_EMAIL || 'BuildPair <info@buildpair.co.uk>';
  const greeting = target.name.trim() ? `Hi ${target.name.trim().split(/\s+/)[0]},` : 'Hi,';
  const roleCopy = target.audience === 'trader'
    ? 'set up your tradesperson profile and start trying BuildPair before the public launch'
    : 'set up your homeowner account and start trying BuildPair before the public launch';
  const subject = 'Your BuildPair early access is ready';
  const text = `${greeting}\n\nWe’ve granted you early access to BuildPair, so you can ${roleCopy}.\n\nCreate your account here:\n${url}\n\nYour invite is intended for you only.\n\nWhile you’re testing BuildPair, we’d really appreciate any feedback about anything that feels unclear, awkward or could be improved. Just reply directly to this email and it will come back to us at info@buildpair.co.uk.\n\nThanks for helping us shape BuildPair before launch.\n\nBuildPair\nhttps://www.buildpair.co.uk`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f6;font-family:Arial,Helvetica,sans-serif;color:#102a43"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px"><tr><td style="padding:32px"><p style="font-size:16px;line-height:24px;color:#102a43;margin:0 0 18px">${greeting}</p><h1 style="font-size:28px;line-height:34px;color:#102a43;margin:0 0 18px">Your BuildPair early access is ready</h1><p style="font-size:16px;line-height:24px;color:#425466;margin:0 0 24px">We’ve granted you early access so you can ${roleCopy}.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#D35400" style="background-color:#D35400;border-radius:12px"><a href="${url}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:16px;line-height:20px;font-weight:700">Create my BuildPair account</a></td></tr></table><p style="font-size:14px;line-height:21px;color:#667085;margin:24px 0 0">Your invite is intended for you only.</p><p style="font-size:16px;line-height:24px;color:#425466;margin:24px 0 0">While you’re testing BuildPair, we’d really appreciate any feedback about anything that feels unclear, awkward or could be improved. Reply directly to this email and it will come back to us at <strong>info@buildpair.co.uk</strong>.</p><p style="font-size:16px;line-height:24px;color:#425466;margin:24px 0 0">Thanks for helping us shape BuildPair before launch.</p><p style="font-size:14px;line-height:21px;color:#667085;margin:24px 0 0">BuildPair · buildpair.co.uk</p></td></tr></table></td></tr></table></body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'User-Agent': 'BuildPair/1.0' },
    body: JSON.stringify({ from, to: [target.email], reply_to: 'info@buildpair.co.uk', subject, text, html }),
  });
  if (!response.ok) throw new Error(`Early access email failed (${response.status})`);
}

async function sendInviteSms(target: InviteTarget, token: string) {
  if (!target.phone) throw new Error('This invite has no mobile number');
  const firstName = target.name.trim().split(/\s+/)[0];
  const hello = firstName ? `Hi ${firstName}. ` : '';
  const text = `BuildPair: ${hello}Your early access is ready. Set up your account: ${inviteUrl(token)} Feedback: info@buildpair.co.uk. To stop texts, email us.`;
  const result = await sendTransactionalSms({ to: target.phone, body: text });
  if (!result.sent) throw new Error('SMS is not configured');
}

function deliveryChannels(target: InviteTarget) {
  const wantsEmail = target.preferredContact === 'email' || target.preferredContact === 'both';
  const wantsSms = target.preferredContact === 'sms' || target.preferredContact === 'both';
  if (wantsEmail && !target.email) throw new HttpError(400, 'This person chose email contact but has no email address');
  if (wantsSms && !target.phone) throw new HttpError(400, 'This person chose text contact but has no mobile number');
  if (target.preferredContact === 'sms' && !smsConfigured()) throw new HttpError(503, 'SMS is not connected yet. Add the Twilio settings before inviting phone-only people.');
  return { wantsEmail, wantsSms };
}

async function listInvites() {
  const sql = getSql();
  return sql`
    SELECT
      i.id,
      i.waitlist_id AS "waitlistId",
      i.email,
      i.phone,
      i.audience,
      i.delivery_channel AS "deliveryChannel",
      i.granted_at AS "grantedAt",
      i.email_sent_at AS "emailSentAt",
      i.sms_sent_at AS "smsSentAt",
      i.used_at AS "usedAt",
      i.revoked_at AS "revokedAt",
      w.name AS "waitlistName",
      w.trade,
      EXISTS (
        SELECT 1 FROM users u
        WHERE i.email IS NOT NULL
          AND lower(coalesce(u.email, '')) = lower(i.email)
          AND coalesce(u.is_deleted, false) = false
      ) AS "accountCreated"
    FROM early_access_invites i
    LEFT JOIN launch_waitlist w ON w.id = i.waitlist_id
    ORDER BY i.granted_at DESC
    LIMIT 1000
  `;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    await ensureEarlyAccessInviteTable();
    const invites = await listInvites();
    return Response.json({ invites, smsEnabled: smsConfigured() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    await ensureEarlyAccessInviteTable();
    const body = await request.json() as ActionBody;
    const action = body.action;
    if (!action) throw new HttpError(400, 'Early access action is required');
    const sql = getSql();

    if (action === 'revoke') {
      if (!body.inviteId) throw new HttpError(400, 'Invite ID is required');
      const rows = await sql`
        UPDATE early_access_invites
        SET revoked_at = now(), updated_at = now()
        WHERE id = ${body.inviteId}::uuid AND revoked_at IS NULL
        RETURNING waitlist_id AS "waitlistId"
      ` as unknown as { waitlistId: string | null }[];
      if (!rows.length) throw new HttpError(404, 'Active invite not found');
      if (rows[0]?.waitlistId) {
        await sql`UPDATE launch_waitlist SET status = CASE WHEN status = 'invited' THEN 'waiting' ELSE status END, updated_at = now() WHERE id = ${rows[0].waitlistId}::uuid`;
      }
      return Response.json({ ok: true, invites: await listInvites(), smsEnabled: smsConfigured() });
    }

    let target: InviteTarget;
    if (action === 'resend') {
      if (!body.inviteId) throw new HttpError(400, 'Invite ID is required');
      const rows = await sql`
        SELECT
          i.waitlist_id AS "waitlistId", i.email, i.phone, i.audience,
          i.delivery_channel AS "preferredContact", coalesce(w.name, '') AS name
        FROM early_access_invites i
        LEFT JOIN launch_waitlist w ON w.id = i.waitlist_id
        WHERE i.id = ${body.inviteId}::uuid AND i.revoked_at IS NULL AND i.used_at IS NULL
        LIMIT 1
      ` as unknown as InviteTarget[];
      if (!rows[0]) throw new HttpError(404, 'Active unused invite not found');
      target = rows[0];
    } else if (body.waitlistId) {
      const rows = await sql`
        SELECT
          id AS "waitlistId", email, phone, audience, name,
          preferred_contact AS "preferredContact"
        FROM launch_waitlist
        WHERE id = ${body.waitlistId}::uuid AND status <> 'removed'
        LIMIT 1
      ` as unknown as InviteTarget[];
      if (!rows[0]) throw new HttpError(404, 'Waitlist entry not found');
      target = rows[0];
    } else {
      const email = body.email?.trim().toLowerCase() ?? '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'A valid email address is required');
      target = { waitlistId: null, email, phone: null, audience: body.audience === 'homeowner' ? 'homeowner' : 'trader', name: '', preferredContact: 'email' };
    }

    const { wantsEmail, wantsSms } = deliveryChannels(target);
    const token = createEarlyAccessToken();
    const tokenHash = hashEarlyAccessToken(token);

    const existing = await sql`
      SELECT id
      FROM early_access_invites
      WHERE
        (${target.waitlistId}::uuid IS NOT NULL AND waitlist_id = ${target.waitlistId}::uuid)
        OR (${target.email}::text IS NOT NULL AND lower(coalesce(email, '')) = lower(${target.email}::text))
        OR (${target.phone}::text IS NOT NULL AND phone = ${target.phone}::text)
      ORDER BY granted_at DESC
      LIMIT 1
    ` as unknown as { id: string }[];

    let inviteId: string;
    if (existing[0]?.id) {
      inviteId = existing[0].id;
      await sql`
        UPDATE early_access_invites
        SET
          waitlist_id = ${target.waitlistId}::uuid,
          email = ${target.email},
          phone = ${target.phone},
          audience = ${target.audience},
          delivery_channel = ${target.preferredContact},
          token_hash = ${tokenHash},
          granted_by = ${admin.user.id},
          granted_at = now(),
          email_sent_at = NULL,
          sms_sent_at = NULL,
          used_at = NULL,
          revoked_at = NULL,
          updated_at = now()
        WHERE id = ${inviteId}::uuid
      `;
    } else {
      const rows = await sql`
        INSERT INTO early_access_invites (
          waitlist_id, email, phone, audience, delivery_channel, token_hash,
          granted_by, granted_at, email_sent_at, sms_sent_at, used_at, revoked_at, updated_at
        )
        VALUES (
          ${target.waitlistId}::uuid, ${target.email}, ${target.phone}, ${target.audience}, ${target.preferredContact}, ${tokenHash},
          ${admin.user.id}, now(), NULL, NULL, NULL, NULL, now()
        )
        RETURNING id
      ` as unknown as { id: string }[];
      if (!rows[0]?.id) throw new HttpError(500, 'Could not create early-access invite');
      inviteId = rows[0].id;
    }

    if (target.waitlistId) {
      await sql`UPDATE launch_waitlist SET status = CASE WHEN status = 'waiting' THEN 'invited' ELSE status END, updated_at = now() WHERE id = ${target.waitlistId}::uuid`;
    }

    let emailSent = false;
    let smsSent = false;
    if (wantsEmail) {
      try {
        await sendInviteEmail(target, token);
        emailSent = true;
        await sql`UPDATE early_access_invites SET email_sent_at = now(), updated_at = now() WHERE id = ${inviteId}::uuid`;
      } catch (error) {
        console.error('[early-access-email]', error instanceof Error ? error.message : String(error));
      }
    }
    if (wantsSms && smsConfigured()) {
      try {
        await sendInviteSms(target, token);
        smsSent = true;
        await sql`UPDATE early_access_invites SET sms_sent_at = now(), updated_at = now() WHERE id = ${inviteId}::uuid`;
      } catch (error) {
        console.error('[early-access-sms]', error instanceof Error ? error.message : String(error));
      }
    }

    return Response.json({ ok: true, emailSent, smsSent, invites: await listInvites(), smsEnabled: smsConfigured() });
  } catch (error) {
    return jsonError(error);
  }
}
