import { useAuth } from '@clerk/expo';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { apiFetch } from '@/lib/api';

export function PresenceHeartbeat() {
  const { isSignedIn, getToken } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      if (Platform.OS !== 'web' && AppState.currentState !== 'active') return;
      try {
        await apiFetch('/api/presence', {
          method: 'POST',
          body: JSON.stringify({ path: pathname || '/', platform: Platform.OS }),
        }, getToken);
      } catch {
        // Presence is operational telemetry only and must never block the app.
      }
    };

    void ping();
    const timer = setInterval(() => { void ping(); }, 45_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [getToken, isSignedIn, pathname]);

  useEffect(() => {
    if (!isSignedIn) return;
    const path = pathname || '/';
    void apiFetch('/api/product-events', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'page_view', path }),
    }, getToken).catch(() => {
      // Product analytics must never interrupt a customer or tradesperson journey.
    });
  }, [getToken, isSignedIn, pathname]);

  return null;
}
