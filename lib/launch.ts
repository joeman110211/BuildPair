import type { Href } from 'expo-router';
import type { UserRole } from '@/types';
export { LAUNCH_DATE_ISO, LAUNCH_DATE_LABEL, REGISTRATION_OPEN, PUBLIC_CONTACT_EMAIL } from '@/lib/launch-config';

export function waitlistHref(mode?: UserRole | null, source = 'website'): Href {
  const params = new URLSearchParams();
  if (mode === 'customer') params.set('audience', 'homeowner');
  if (source) params.set('source', source);
  const query = params.toString();
  const path = mode === 'trader' ? '/(public)/founding-trades' : '/(public)/waitlist';
  return (`${path}${query ? `?${query}` : ''}`) as Href;
}
