import { smsConfigured, smsProvider } from '@/lib/sms';

export async function GET() {
  return Response.json({
    emailEnabled: true,
    smsEnabled: smsConfigured(),
    smsProvider: smsProvider(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
