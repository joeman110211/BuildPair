import { normalizeUkMobile } from '@/lib/phone';

export type SmsProvider = 'twilio' | 'disabled';

export type SmsSendResult = {
  sent: boolean;
  provider: SmsProvider;
  messageId?: string;
};

function twilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? '';
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ?? '';
  return { accountSid, authToken, messagingServiceSid };
}

export function smsConfigured() {
  const provider = (process.env.SMS_PROVIDER || 'twilio').trim().toLowerCase();
  if (provider !== 'twilio') return false;
  const config = twilioConfig();
  return Boolean(config.accountSid && config.authToken && config.messagingServiceSid);
}

export function smsProvider(): SmsProvider {
  return smsConfigured() ? 'twilio' : 'disabled';
}

export async function sendTransactionalSms(input: { to: string; body: string }): Promise<SmsSendResult> {
  if (!smsConfigured()) return { sent: false, provider: 'disabled' };

  const { accountSid, authToken, messagingServiceSid } = twilioConfig();
  const to = normalizeUkMobile(input.to);
  const body = input.body.trim();
  if (!body) throw new Error('SMS body is required');
  if (body.length > 1200) throw new Error('SMS body is too long');

  const form = new URLSearchParams({
    To: to,
    Body: body,
    MessagingServiceSid: messagingServiceSid,
  });

  const authorization = Buffer.from(`${accountSid}:${authToken}`, 'utf8').toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = await response.json().catch(() => ({})) as { sid?: string; message?: string; code?: number };
  if (!response.ok || !payload.sid) {
    const providerMessage = typeof payload.message === 'string' ? payload.message : `HTTP ${response.status}`;
    throw new Error(`SMS delivery request failed: ${providerMessage}`);
  }

  return { sent: true, provider: 'twilio', messageId: payload.sid };
}
