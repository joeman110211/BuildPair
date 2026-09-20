import { useAuth } from '@clerk/expo';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type EventType = 'page_view' | 'click' | 'scroll' | 'page_time' | 'form_interaction' | 'form_submit' | 'heartbeat';
type EventDetails = Record<string, string | number | boolean | null>;
type TrackingMode = 'off' | 'aggregate' | 'anonymous';

type StoredVisitor = {
  id: string;
  createdAt: string;
};

const LEGACY_CHOICE_KEY = 'buildpair_analytics_choice_v1';
const VISITOR_KEY = 'buildpair_analytics_visitor_v1';
const SESSION_KEY = 'buildpair_analytics_session_v1';
const SIGNUP_INTENT_KEY = 'buildpair_analytics_signup_intent_v1';
export const INTERNAL_ANALYTICS_EXCLUSION_KEY = 'buildpair_internal_analytics_excluded_v1';
const VISITOR_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const HEARTBEAT_MS = 45_000;

function onWeb() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function legacyChoice(): 'basic' | 'detailed' | 'off' | null {
  if (!onWeb()) return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_CHOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: string };
    return parsed.choice === 'basic' || parsed.choice === 'detailed' || parsed.choice === 'off' ? parsed.choice : null;
  } catch { return null; }
}

function trackingMode(): TrackingMode {
  if (!onWeb()) return 'off';
  try {
    if (window.localStorage.getItem(INTERNAL_ANALYTICS_EXCLUSION_KEY) === '1') return 'off';
  } catch { /* storage may be unavailable */ }

  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };
  if (nav.globalPrivacyControl === true || nav.doNotTrack === '1') return 'off';

  // Preserve choices made under the old analytics panel. New visitors use the
  // privacy-conscious anonymous session analytics by default, without a popup.
  const previousChoice = legacyChoice();
  if (previousChoice === 'off') return 'off';
  if (previousChoice === 'basic') return 'aggregate';
  return 'anonymous';
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function anonymousIdentity() {
  if (!onWeb()) return null;
  try {
    const now = Date.now();
    let visitor: StoredVisitor | null = null;
    const raw = window.localStorage.getItem(VISITOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredVisitor> & { consentedAt?: string };
      const createdAt = parsed.createdAt || parsed.consentedAt || '';
      const createdMs = new Date(createdAt).getTime();
      if (parsed.id && Number.isFinite(createdMs) && now - createdMs < VISITOR_TTL_MS) {
        visitor = { id: parsed.id, createdAt };
      }
    }

    if (!visitor) {
      visitor = { id: randomId(), createdAt: new Date().toISOString() };
      window.localStorage.setItem(VISITOR_KEY, JSON.stringify(visitor));
    }

    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = randomId();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    return { visitorId: visitor.id, sessionId, firstSeenAt: visitor.createdAt };
  } catch { return null; }
}

function existingIdentity() {
  if (!onWeb()) return null;
  try {
    const raw = window.localStorage.getItem(VISITOR_KEY);
    const sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw || !sessionId) return null;
    const parsed = JSON.parse(raw) as Partial<StoredVisitor> & { consentedAt?: string };
    const firstSeenAt = parsed.createdAt || parsed.consentedAt || '';
    return parsed.id && firstSeenAt ? { visitorId: parsed.id, sessionId, firstSeenAt } : null;
  } catch { return null; }
}

function browserName(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/SamsungBrowser/i.test(userAgent)) return 'Samsung Internet';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent) && !/Chrome|Chromium|Android/i.test(userAgent)) return 'Safari';
  return 'Other';
}

function osName(userAgent: string) {
  if (/CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS/iPadOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function bucket(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return String(Math.max(100, Math.round(value / 100) * 100));
}

function deviceInfo() {
  if (!onWeb()) return {};
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } };
  const width = window.innerWidth || 0;
  let timezone = '';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* optional */ }
  return {
    deviceType: width <= 760 ? 'mobile' : width <= 1100 ? 'tablet' : 'desktop',
    browser: browserName(navigator.userAgent || ''),
    os: osName(navigator.userAgent || ''),
    platform: String(navigator.platform || '').slice(0, 80),
    language: String(navigator.language || '').slice(0, 40),
    timezone: timezone.slice(0, 100),
    viewport: `${bucket(window.innerWidth)}x${bucket(window.innerHeight)}`,
    screen: `${bucket(window.screen?.width || 0)}x${bucket(window.screen?.height || 0)}`,
    connection: [nav.connection?.effectiveType, nav.connection?.saveData ? 'data-saver' : ''].filter(Boolean).join(' / ').slice(0, 40),
    touch: (navigator.maxTouchPoints || 0) > 0,
  };
}

function acquisitionInfo() {
  if (!onWeb()) return {};
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
    sourceParam: (params.get('source') || '').slice(0, 150),
    referralCode: (params.get('ref') || '').slice(0, 40),
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
  if (!onWeb()) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && body.length < 60_000) {
      const sent = navigator.sendBeacon('/api/visitor-analytics', new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }
  } catch { /* fall through */ }
  void fetch('/api/visitor-analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}

export function VisitorAnalytics() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  const pageStartedAt = useRef(0);
  const conversionSent = useRef(false);

  const sendEvent = useCallback((eventType: EventType, path: string, target?: string, targetPath?: string, value?: number, details?: EventDetails) => {
    if (!onWeb() || isSignedIn) return;
    const mode = trackingMode();
    if (mode === 'off') return;
    const identity = mode === 'anonymous' ? anonymousIdentity() : null;
    post({
      action: 'event',
      mode: identity ? 'anonymous' : 'aggregate',
      eventType,
      path,
      target,
      targetPath,
      value,
      device: deviceInfo(),
      acquisition: acquisitionInfo(),
      ...(identity ?? {}),
      details,
    });
  }, [isSignedIn]);

  useEffect(() => {
    if (!onWeb() || isSignedIn || trackingMode() === 'off') return;
    const now = Date.now();
    if (previousPath.current && previousPath.current !== pathname && pageStartedAt.current > 0) {
      sendEvent('page_time', previousPath.current, undefined, undefined, Math.max(0, Math.min(86400, (now - pageStartedAt.current) / 1000)));
    }
    previousPath.current = pathname;
    pageStartedAt.current = now;
    if (pathname.includes('sign-up')) {
      try { window.sessionStorage.setItem(SIGNUP_INTENT_KEY, '1'); } catch { /* best effort */ }
    }
    sendEvent('page_view', pathname);
  }, [isSignedIn, pathname, sendEvent]);

  useEffect(() => {
    if (!onWeb() || isSignedIn || trackingMode() === 'off') return;
    const heartbeat = () => {
      if (document.visibilityState === 'visible') sendEvent('heartbeat', pathname);
    };
    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    const onVisibility = () => { if (document.visibilityState === 'visible') heartbeat(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isSignedIn, pathname, sendEvent]);

  useEffect(() => {
    if (!onWeb() || isSignedIn || trackingMode() === 'off') return;
    const onClick = (event: MouseEvent) => {
      const node = event.target instanceof Element ? event.target : null;
      const element = node?.closest('a,button,[role="button"],input[type="submit"],input[type="button"]') as HTMLElement | null;
      if (!element) return;
      const target = cleanLabel(element.getAttribute('aria-label') || element.textContent || element.getAttribute('value') || element.tagName.toLowerCase());
      let targetPath = '';
      const href = element.getAttribute('href');
      if (href) {
        try {
          const url = new URL(href, window.location.origin);
          targetPath = url.origin === window.location.origin ? `${url.pathname}${url.search}`.slice(0, 500) : url.host.slice(0, 200);
        } catch { /* ignore */ }
      }
      sendEvent('click', pathname, target, targetPath);
    };
    const onFocus = (event: FocusEvent) => {
      const element = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement ? event.target : null;
      if (!element || (element instanceof HTMLInputElement && ['password', 'hidden'].includes(element.type))) return;
      const field = cleanLabel(element.getAttribute('aria-label') || element.getAttribute('name') || element.getAttribute('autocomplete') || element.getAttribute('type') || element.tagName.toLowerCase());
      sendEvent('form_interaction', pathname, field, undefined, undefined, { interaction: 'focus' });
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      sendEvent('form_submit', pathname, cleanLabel(form?.getAttribute('aria-label') || form?.getAttribute('name') || form?.id || 'form'));
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [isSignedIn, pathname, sendEvent]);

  useEffect(() => {
    if (!onWeb() || isSignedIn || trackingMode() === 'off') return;
    const reached = new Set<number>();
    const onScroll = () => {
      const denominator = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percent = Math.max(0, Math.min(100, Math.round((window.scrollY / denominator) * 100)));
      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          sendEvent('scroll', pathname, `${milestone}%`, undefined, milestone);
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isSignedIn, pathname, sendEvent]);

  useEffect(() => {
    if (!onWeb() || isSignedIn || trackingMode() === 'off') return;
    const onPageHide = () => {
      if (!previousPath.current || pageStartedAt.current <= 0) return;
      const seconds = Math.max(0, Math.min(86400, (Date.now() - pageStartedAt.current) / 1000));
      sendEvent('page_time', previousPath.current, undefined, undefined, seconds);
      pageStartedAt.current = Date.now();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [isSignedIn, sendEvent]);

  useEffect(() => {
    if (!onWeb() || !isSignedIn || conversionSent.current) return;
    const identity = existingIdentity();
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

  return null;
}
