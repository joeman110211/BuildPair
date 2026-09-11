import type { Href } from 'expo-router';
import type { UserRole } from '@/types';

export const LAUNCH_DATE_ISO = '2026-10-01T00:00:00+01:00';
export const LAUNCH_DATE_LABEL = '1 October 2026';
export const REGISTRATION_OPEN = false;
export const PUBLIC_CONTACT_EMAIL = 'info@buildpair.co.uk';

export function waitlistHref(mode?: UserRole | null, source = 'website'): Href {
  const params = new URLSearchParams();
  if (mode) params.set('audience', mode === 'trader' ? 'trader' : 'homeowner');
  if (source) params.set('source', source);
  const query = params.toString();
  return (`/(public)/waitlist${query ? `?${query}` : ''}`) as Href;
}
