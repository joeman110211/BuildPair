import type { Href } from 'expo-router';
import type { UserRole } from '@/types';
import { REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

export function parseAccountMode(value: string | string[] | undefined): UserRole | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'customer' || candidate === 'trader' ? candidate : null;
}

export function safeInternalReturnTo(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return null;
  if (/^[\s\S]*[\r\n]/.test(candidate)) return null;
  return candidate;
}

function withReturnTo(path: string, returnTo?: string | null): Href {
  const safeReturnTo = safeInternalReturnTo(returnTo);
  if (!safeReturnTo) return path as Href;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(safeReturnTo)}` as Href;
}

export function modeSetupHref(mode: UserRole | null, returnTo?: string | null): Href {
  const path = mode ? `/auth/choose-role?mode=${mode}` : '/auth/choose-role';
  return withReturnTo(path, returnTo);
}

export function signInHref(mode: UserRole, returnTo?: string | null): Href {
  return withReturnTo(`/auth/sign-in?mode=${mode}`, returnTo);
}

export function signUpHref(mode: UserRole, returnTo?: string | null): Href {
  if (!REGISTRATION_OPEN) return waitlistHref(mode, 'signup-click');
  return withReturnTo(`/auth/sign-up?mode=${mode}`, returnTo);
}

export function forgotPasswordHref(mode: UserRole | null): Href {
  return mode ? (`/auth/forgot-password?mode=${mode}` as Href) : '/auth/forgot-password';
}

export function dashboardHref(mode: UserRole): Href {
  return mode === 'trader' ? '/trader/dashboard' : '/customer/dashboard';
}
