import { useAuth } from '@clerk/expo';
import { usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Portal, Surface, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

type AnalyticsChoice = 'basic' | 'detailed' | 'off';
type StoredChoice = { choice: AnalyticsChoice; updatedAt: string };

type AnalyticsPayload = {
  action: 'event';
  mode: 'aggregate' | 'detailed';
  eventType: 'page_view' | 'click' | 'scroll' | 'page_time' | 'form_interaction' | 'form_submit';
  path: string;
  target?: string;
  targetPath?: string;
  value?: number;
  device: Record<string, string | boolean>;
  acquisition: Record<string, string>;
  sessionId?: string;
  visitorId?: string;
  consentedAt?: string;
  details?: Record<string, string | number | boolean | null>;
};

const CHOICE_KEY = 'buildpair_analytics_choice_v1';
const VISITOR_KEY = 'buildpair_analytics_visitor_v1';
const SESSION_KEY = 'buildpair_analytics_session_v1';
const SIGNUP_INTENT_KEY = 'buildpair_analytics_signup_intent_v1';
const VISITOR_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function storageAvailable() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function readChoice(): AnalyticsChoice | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(CHOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChoice;
    return parsed.choice === 'basic' || parsed.choice === 'detailed' || parsed.choice === 'off' ? parsed.choice : null;
  } catch { return null; }
}

function writeChoice(choice: AnalyticsChoice) {
  if (!storageAvailable()) return;
  try { window.localStorage.setItem(CHOICE_KEY, JSON.stringify({ choice, updatedAt: new Date().toISOString() } satisfies StoredChoice)); } catch { /* preference storage is best effort */ }
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function detailedIdentity() {
  if (!storageAvailable()) return null;
  const now = Date.now();
  let visitorId = '';
  let consentedAt = new Date().toISOString();
  try {
    const raw = window.localStorage.getItem(VISITOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; createdAt?: string; consentedAt?: string };
      const created = new Date(parsed.createdAt ?? 0).getTime();
      if (parsed.id && Number.isFinite(created) && now - created < VISITOR_TTL_MS) {
        visitorId = parsed.id;
        consentedAt = parsed.consentedAt || consentedAt;
      }
    }
    if (!visitorId) {
      visitorId = randomId();
      window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ id: visitorId, createdAt: new Date().toISOString(), consentedAt }));
    }
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = randomId();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return { visitorId, sessionId, consentedAt };
  } catch { return null; }
}

function existingDetailedIdentity() {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(VISITOR_KEY);
    const sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw || !sessionId) return null;
    const parsed = JSON.parse(raw) as { id?: string; consentedAt?: string };
    if (!parsed.id) return null;
    return { visitorId: parsed.id, sessionId, consentedAt: parsed.consentedAt || new Date().toISOString() };
  } catch { return null; }
}

function clearDetailedIdentity() {
  if (!storageAvailable()) return;
  try {
    window.localStorage.removeItem(VISITOR_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  } catch { /* best effort */ }
}

function broadBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/SamsungBrowser/i.test(userAgent)) return 'Samsung Internet';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent) && !/Chrome|Chromium|Android/i.test(userAgent)) return 'Safari';
  return 'Other';
}

function broadOs(userAgent: string) {
  if (/CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS/iPadOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function dimensionBucket(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${Math.max(100, Math.round(value / 100) * 100)}`;
}

function deviceInfo() {
  if (!storageAvailable()) return {};
  const width = window.innerWidth || 0;
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } };
  const deviceType = width <= 760 ? 'mobile' : width <= 1100 ? 'tablet' : 'desktop';
  let timezone = '';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* optional */ }
  const connection = [nav.connection?.effectiveType, nav.connection?.saveData ? 'data-saver' : ''].filter(Boolean).join(' / ');
  return {
    deviceType,
    browser: broadBrowser(navigator.userAgent || ''),
    os: broadOs(navigator.userAgent || ''),
    platform: String(navigator.platform || '').slice(0, 80),
    language: String(navigator.language || '').slice(0, 40),
    timezone: timezone.slice(0, 100),
    viewport: `${dimensionBucket(window.innerWidth)}x${dimensionBucket(window.innerHeight)}`,
    screen: `${dimensionBucket(window.screen?.width || 0)}x${dimensionBucket(window.screen?.height || 0)}`,
    connection: connection.slice(0, 40),
    touch: (navigator.maxTouchPoints || 0) > 0,
  };
}

function acquisitionInfo() {
  if (!storageAvailable()) return {};
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).host : ''; } catch { /* malformed referrer */ }
  return {
    referrerHost: referrerHost.slice(0, 200),
    utmSource: (params.get('utm_source') || '').slice(0, 150),
    utmMedium: (params.get('utm_medium') || '').slice(0, 150),
    utmCampaign: (params.get('utm_campaign') || '').slice(0, 200),
    utmContent: (params.get('utm_content') || '').slice(0, 200),
    utmTerm: (params.get('utm_term') || '').slice(0, 200),
  };
}

function cleanLabel(value: string) {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\d{7,}\b/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function post(payload: object) {
  if (!storageAvailable()) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && body.length < 60_000) {
      const sent = navigator.sendBeacon('/api/visitor-analytics', new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }
  } catch { /* fall through to fetch */ }
  void fetch('/api/visitor-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}

export function VisitorAnalytics() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const [choice, setChoice] = useState<AnalyticsChoice | null>(() => readChoice());
  const [showChoices, setShowChoices] = useState(() => readChoice() === null);
  const previousPath = useRef<string | null>(null);
  const pageStartedAt = useRef(Date.now());
  const conversionSent = useRef(false);
  const effectiveChoice: AnalyticsChoice = choice ?? 'basic';
  const acquisition = useMemo(() => acquisitionInfo(), [pathname]);

  const sendEventRef = useRef<(eventType: AnalyticsPayload['eventType'], path: string, target?: string, targetPath?: string, value?: number, details?: AnalyticsPayload['details']) => void>(() => undefined);
  sendEventRef.current = (eventType, path, target, targetPath, value, details) => {
    if (Platform.OS !== 'web' || isSignedIn || effectiveChoice === 'off') return;
    const identity = effectiveChoice === 'detailed' ? detailedIdentity() : null;
    post({
      action: 'event',
      mode: identity ? 'detailed' : 'aggregate',
      eventType,
      path,
      target,
      targetPath,
      value,
      device: deviceInfo(),
      acquisition,
      ...(identity ?? {}),
      details,
    } satisfies AnalyticsPayload);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || isSignedIn || effectiveChoice === 'off') return;
    const now = Date.now();
    if (previousPath.current && previousPath.current !== pathname) {
      const seconds = Math.max(0, Math.min(86400, (now - pageStartedAt.current) / 1000));
      sendEventRef.current('page_time', previousPath.current, undefined, undefined, seconds);
    }
    previousPath.current = pathname;
    pageStartedAt.current = now;
    if (pathname.includes('sign-up')) {
      try { window.sessionStorage.setItem(SIGNUP_INTENT_KEY, '1'); } catch { /* best effort */ }
    }
    sendEventRef.current('page_view', pathname);
  }, [effectiveChoice, isSignedIn, pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web' || isSignedIn || effectiveChoice === 'off') return;

    const onClick = (event: MouseEvent) => {
      const node = event.target instanceof Element ? event.target : null;
      const element = node?.closest('a,button,[role="button"],input[type="submit"],input[type="button"]') as HTMLElement | null;
      if (!element || element.closest('[data-testid^="analytics-choice"]')) return;
      const label = cleanLabel(element.getAttribute('aria-label') || element.textContent || element.getAttribute('value') || element.tagName.toLowerCase());
      let targetPath = '';
      const href = element.getAttribute('href');
      if (href) {
        try {
          const url = new URL(href, window.location.origin);
          targetPath = url.origin === window.location.origin ? `${url.pathname}${url.search}`.slice(0, 500) : url.host.slice(0, 200);
        } catch { targetPath = ''; }
      }
      sendEventRef.current('click', pathname, label, targetPath);
    };

    const onFocus = (event: FocusEvent) => {
      const element = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement ? event.target : null;
      if (!element || element instanceof HTMLInputElement && ['password', 'hidden'].includes(element.type)) return;
      const field = cleanLabel(element.getAttribute('aria-label') || element.getAttribute('name') || element.getAttribute('autocomplete') || element.getAttribute('type') || element.tagName.toLowerCase());
      sendEventRef.current('form_interaction', pathname, field, undefined, undefined, { interaction: 'focus' });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      const label = cleanLabel(form?.getAttribute('aria-label') || form?.getAttribute('name') || form?.id || 'form');
      sendEventRef.current('form_submit', pathname, label);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [effectiveChoice, isSignedIn, pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web' || isSignedIn || effectiveChoice === 'off') return;
    const reached = new Set<number>();
    const onScroll = () => {
      const body = document.documentElement;
      const denominator = Math.max(1, body.scrollHeight - window.innerHeight);
      const percent = Math.max(0, Math.min(100, Math.round((window.scrollY / denominator) * 100)));
      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          sendEventRef.current('scroll', pathname, `${milestone}%`, undefined, milestone);
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [effectiveChoice, isSignedIn, pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPageHide = () => {
      if (isSignedIn || effectiveChoice === 'off' || !previousPath.current) return;
      const seconds = Math.max(0, Math.min(86400, (Date.now() - pageStartedAt.current) / 1000));
      sendEventRef.current('page_time', previousPath.current, undefined, undefined, seconds);
      pageStartedAt.current = Date.now();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [effectiveChoice, isSignedIn]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isSignedIn || conversionSent.current) return;
    const identity = existingDetailedIdentity();
    if (!identity) return;
    conversionSent.current = true;
    let conversionType: 'signup' | 'signin' = 'signin';
    try { if (window.sessionStorage.getItem(SIGNUP_INTENT_KEY) === '1') conversionType = 'signup'; } catch { /* best effort */ }
    post({ action: 'convert', sessionId: identity.sessionId, conversionType });
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SIGNUP_INTENT_KEY);
    } catch { /* best effort */ }
  }, [isSignedIn]);

  if (Platform.OS !== 'web' || isSignedIn) return null;

  const choose = (next: AnalyticsChoice) => {
    const existing = existingDetailedIdentity();
    writeChoice(next);
    setChoice(next);
    setShowChoices(false);
    if (next !== 'detailed') {
      if (existing?.visitorId) post({ action: 'withdraw', visitorId: existing.visitorId });
      clearDetailedIdentity();
    } else {
      detailedIdentity();
    }
  };

  return (
    <Portal>
      {showChoices ? (
        <Surface style={styles.panel} elevation={4} testID="analytics-choice-panel">
          <Text variant="titleMedium" style={styles.title}>BuildPair analytics choices</Text>
          <Text style={styles.copy}>
            Basic analytics counts pages, clicks, scroll depth, devices, referrers and coarse location signals in aggregate so BuildPair can improve the site. Detailed analytics is optional and records an anonymous visit journey so we can see where people get stuck. We do not record passwords, form contents, raw IP addresses or precise GPS location.
          </Text>
          <View style={styles.actions}>
            <Button testID="analytics-choice-detailed" mode="contained" onPress={() => choose('detailed')}>Allow detailed</Button>
            <Button testID="analytics-choice-basic" mode="outlined" onPress={() => choose('basic')}>Basic only</Button>
            <Button testID="analytics-choice-off" mode="text" onPress={() => choose('off')}>No analytics</Button>
          </View>
        </Surface>
      ) : (
        <Button testID="analytics-choice-open" compact mode="text" style={styles.choiceButton} onPress={() => setShowChoices(true)}>Analytics choices</Button>
      )}
    </Portal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    alignSelf: 'center',
    width: 'auto',
    maxWidth: 760,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontWeight: '900', color: colors.text },
  copy: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  choiceButton: { position: 'absolute', right: 8, bottom: 4, backgroundColor: 'rgba(255,255,255,0.92)' },
});
