import type { Href } from 'expo-router';
import type { UserRole } from '@/types';
export { LAUNCH_DATE_ISO, LAUNCH_DATE_LABEL, REGISTRATION_OPEN, TRADER_PRELAUNCH_REGISTRATION_OPEN, HOMEOWNER_REGISTRATION_OPEN, MARKETPLACE_OPEN, BUILDPAY_OPEN, PAID_PLANS_OPEN, PAID_PROJECT_PLUS_OPEN, FOUNDING_PRO_START_ISO, FOUNDING_PRO_END_ISO, FOUNDING_PRO_MONTHS, PUBLIC_CONTACT_EMAIL } from '@/lib/launch-config';

export function waitlistHref(mode?: UserRole | null, source = 'website'): Href {
  const params = new URLSearchParams();
  if (mode === 'customer') params.set('audience', 'homeowner');
  if (source) params.set('source', source);
  const query = params.toString();
  const path = mode === 'trader' ? '/auth/founding-trade-signup' : '/(public)/waitlist';
  return (`${path}${query ? `?${query}` : ''}`) as Href;
}
