import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ActivityCounts = {
  unreadMessages: number;
  unreadNotifications: number;
};

const EMPTY_COUNTS: ActivityCounts = { unreadMessages: 0, unreadNotifications: 0 };

export function useActivityCounts(refreshMs = 8000) {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  const [counts, setCounts] = useState<ActivityCounts>(EMPTY_COUNTS);

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    try {
      const next = await apiFetch<ActivityCounts>('/api/activity-counts', {}, () => getTokenRef.current());
      setCounts(next);
    } catch {
      // Navigation badges are supplemental. A temporary count failure should not block the app.
    }
  }, [isSignedIn]);

  useEffect(() => {
    void load();
    if (!isSignedIn) return;
    const timer = setInterval(() => void load(), refreshMs);
    return () => clearInterval(timer);
  }, [isSignedIn, load, refreshMs]);

  return { ...counts, refreshActivityCounts: load };
}
