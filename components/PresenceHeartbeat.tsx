import { useAuth } from '@clerk/expo';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { apiFetch } from '@/lib/api';

export function PresenceHeartbeat() {
  const { isSignedIn, getToken } = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      if (Platform.OS !== 'web' && AppState.currentState !== 'active') return;
      try {
        await apiFetch('/api/presence', {
          method: 'POST',
          body: JSON.stringify({ path: pathnameRef.current || '/', platform: Platform.OS }),
        }, getToken);
      } catch {
        // Presence is operational telemetry only and must never block the app.
      }
    };

    void ping();
    const timer = setInterval(() => { void ping(); }, 120_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [getToken, isSignedIn]);

  return null;
}
