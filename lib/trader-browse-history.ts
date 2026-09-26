import { Platform } from 'react-native';

const RECENT_KEY = 'buildpair:recent-traders:v1';
const SAVED_LAUNCH_KEY = 'buildpair:saved-launch-traders:v1';
const MAX_RECENT = 8;

function browserStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function readIds(key: string) {
  const storage = browserStorage();
  if (!storage) return [] as string[];
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  const storage = browserStorage();
  if (!storage) return;
  try { storage.setItem(key, JSON.stringify(ids)); } catch { /* Browsing history is non-critical. */ }
}

export function recordRecentlyViewedTrader(id: string) {
  const next = [id, ...readIds(RECENT_KEY).filter((value) => value !== id)].slice(0, MAX_RECENT);
  writeIds(RECENT_KEY, next);
  return next;
}

export function recentlyViewedTraderIds() {
  return readIds(RECENT_KEY);
}

export function savedLaunchTraderIds() {
  return readIds(SAVED_LAUNCH_KEY);
}

export function isTraderSavedForLaunch(id: string) {
  return readIds(SAVED_LAUNCH_KEY).includes(id);
}

export function toggleTraderSavedForLaunch(id: string) {
  const current = readIds(SAVED_LAUNCH_KEY);
  const saved = !current.includes(id);
  const next = saved ? [id, ...current].slice(0, 30) : current.filter((value) => value !== id);
  writeIds(SAVED_LAUNCH_KEY, next);
  return saved;
}
