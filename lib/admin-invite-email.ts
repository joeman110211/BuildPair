function appUrl() {
  return (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

export async function sendAdminInviteEmail(args: { email: string; token: string; expiresAt: Date }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const from = process.env.INVOICE_FROM_EMAIL?.trim() || 'BuildPair <info@buildpair.co.uk>';
  const inviteUrl = `${appUrl()}/auth/admin-invite?token=${encodeURIComponent(args.token)}`;
  const expiry = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' }).format(args.expiresAt);
  const subject = 'You have been invited to join BuildPair Admin';
  const text = `You have been invited to join the BuildPair administrator console.\n\nCreate your administrator password and accept the invitation here:\n${inviteUrl}\n\nThis invitation is for ${args.email} and expires ${expiry}. It does not create a homeowner or tradesperson marketplace account.\n\nIf you were not expecting this invitation, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f6;font-family:Arial,Helvetica,sans-serif;color:#20252B"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:18px"><tr><td style="padding:32px"><div style="font-size:14px;font-weight:800;color:#D35400;margin-bottom:12px">BuildPair Admin</div><h1 style="font-size:28px;line-height:34px;margin:0 0 16px">You have been invited to join as an administrator</h1><p style="font-size:16px;line-height:24px;color:#4b5563">An authorised BuildPair owner has invited <strong>${escapeHtml(args.email)}</strong> to access the administrator console.</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td bgcolor="#D35400" style="border-radius:11px"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-weight:700">Create administrator account</a></td></tr></table><p style="font-size:14px;line-height:22px;color:#667085">You will choose your own password, verify this email address, and then sign in directly to the BuildPair admin panel. This does not create a homeowner or tradesperson marketplace account.</p><p style="font-size:13px;line-height:20px;color:#7b8794">This invitation expires ${escapeHtml(expiry)}. If you were not expecting it, ignore this email.</p></td></tr></table></td></tr></table></body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [args.email],
      reply_to: 'info@buildpair.co.uk',
      subject,
      text,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message || `Admin invitation email failed (${response.status})`);
  return inviteUrl;
}
