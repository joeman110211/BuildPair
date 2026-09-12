import type { Href } from 'expo-router';
import type { UserRole } from '@/types';
export { LAUNCH_DATE_ISO, LAUNCH_DATE_LABEL, REGISTRATION_OPEN, PUBLIC_CONTACT_EMAIL } from '@/lib/launch-config';

export function waitlistHref(mode?: UserRole | null, source = 'website'): Href {
  const params = new URLSearchParams();
  if (mode) params.set('audience', mode === 'trader' ? 'trader' : 'homeowner');
  if (source) params.set('source', source);
  const query = params.toString();
  return (`/(public)/waitlist${query ? `?${query}` : ''}`) as Href;
}
