import { useAuth } from '@clerk/expo';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, SegmentedButtons, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const INTERNAL_EXCLUSION_KEY = 'buildpair_internal_analytics_excluded_v1';

type CountRow = Record<string, unknown>;
type Session = {
  id: string;
  visitorId: string;
  startedAt: string;
  lastSeenAt: string;
  landingPath: string | null;
  lastPath: string | null;
  referrerHost: string | null;
  acquisition: Record<string, unknown>;
  device: Record<string, unknown>;
  geo: Record<string, unknown>;
  converted: boolean;
  convertedAt: string | null;
  likelyDropoff: boolean;
  activeNow: boolean;
  isReturning: boolean;
  durationSeconds: number;
  eventCount: number;
  pageViews: number;
  visitCount: number;
  channel: string;
};
type VisitorData = {
  storageReady: boolean;
  days?: number;
  summary: Record<string, unknown>;
  topPages: CountRow[];
  topLandingPages: CountRow[];
  topClicks: CountRow[];
  acquisition: CountRow[];
  sourceChannels: CountRow[];
  devices: CountRow[];
  locations: CountRow[];
  forms: CountRow[];
  recentSessions: Session[];
};
type SessionEvent = { id: number; eventType: string; path: string | null; target: string | null; value: number | null; details: Record<string, unknown>; createdAt: string };

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value: unknown) {
  return new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(number(value));
}

function decimal(value: unknown, digits = 1) {
  return number(value).toFixed(digits);
}

function duration(seconds: unknown) {
  const total = Math.max(0, Math.round(number(seconds)));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${total % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function when(value?: string | null) {
  if (!value) return 'Not started yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function text(value: unknown, fallback = 'Unknown') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value;
}

function Metric({ label, value, hint, live }: { label: string; value: string; hint: string; live?: boolean }) {
  return <AppCard style={[styles.metric, live && styles.liveMetric]}>
    <View style={styles.metricTop}>{live ? <View style={styles.liveDot} /> : null}<Text variant="headlineSmall" style={styles.metricValue}>{value}</Text></View>
    <Text variant="titleSmall" style={styles.title}>{label}</Text>
    <Text style={styles.muted}>{hint}</Text>
  </AppCard>;
}

function RankedRows({ rows, render }: { rows: CountRow[]; render: (row: CountRow, index: number) => React.ReactNode }) {
  if (!rows.length) return <Text style={styles.muted}>No data for this period yet.</Text>;
  return <View style={styles.list}>{rows.map((row, index) => <View key={`${index}-${JSON.stringify(row).slice(0, 80)}`}>{render(row, index)}{index < rows.length - 1 ? <Divider /> : null}</View>)}</View>;
}

export default function VisitorAnalyticsAdmin() {
  const { getToken } = useAuth();
  const [days, setDays] = useState('7');
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [browserExcluded, setBrowserExcluded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try { setBrowserExcluded(window.localStorage.getItem(INTERNAL_EXCLUSION_KEY) === '1'); } catch { /* browser storage unavailable */ }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiFetch<VisitorData>(`/api/admin/visitors?days=${days}`, {}, getToken)
      .then((result) => { if (active) { setData(result); setError(''); setLoading(false); } })
      .catch((cause) => { if (active) { setError(errorMessage(cause)); setLoading(false); } });
    return () => { active = false; };
  }, [days, getToken]);

  const refresh = () => {
    setLoading(true);
    setError('');
    void apiFetch<VisitorData>(`/api/admin/visitors?days=${days}`, {}, getToken)
      .then((result) => { setData(result); setLoading(false); })
      .catch((cause) => { setError(errorMessage(cause)); setLoading(false); });
  };

  const toggleBrowserExclusion = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const next = !browserExcluded;
    try {
      if (next) window.localStorage.setItem(INTERNAL_EXCLUSION_KEY, '1');
      else window.localStorage.removeItem(INTERNAL_EXCLUSION_KEY);
      setBrowserExcluded(next);
    } catch { setError('This browser would not save the analytics exclusion setting.'); }
  };

  const openSession = (session: Session) => {
    setSelectedSession(session);
    setEvents([]);
    setEventsLoading(true);
    void apiFetch<{ events: SessionEvent[] }>(`/api/admin/visitors?sessionId=${session.id}`, {}, getToken)
      .then((result) => { setEvents(result.events ?? []); setEventsLoading(false); })
      .catch((cause) => { setError(errorMessage(cause)); setEventsLoading(false); });
  };

  const summary = data?.summary ?? {};
  const avgPageSeconds = useMemo(() => {
    const samples = number(summary.pageTimeSamples);
    return samples ? number(summary.totalPageSeconds) / samples : 0;
  }, [summary]);
  const sessions = number(summary.sessions);
  const conversionRate = sessions ? (number(summary.convertedSessions) / sessions) * 100 : 0;
  const engagedRate = sessions ? (number(summary.engagedSessions) / sessions) * 100 : 0;
  const legacyViews = number(summary.legacyAggregatePageViews);

  return <Screen title="Visitor Intelligence" subtitle="Live traffic, new versus returning visitors, acquisition, journeys and conversion signals in one place.">
    <AppCard style={styles.heroCard}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Traffic command centre</Text>
          <Text style={styles.muted}>Anonymous browser and visit IDs separate people from page refreshes. Signed-in accounts are tracked separately in Live users. Raw IP addresses, form contents, passwords and precise GPS location are not stored here.</Text>
        </View>
        <View style={styles.toolbarButtons}>
          {Platform.OS === 'web' ? <Button mode={browserExcluded ? 'contained-tonal' : 'outlined'} icon={browserExcluded ? 'eye-off-outline' : 'eye-outline'} onPress={toggleBrowserExclusion}>{browserExcluded ? 'This browser excluded' : 'Exclude this browser'}</Button> : null}
          <Button mode="outlined" icon="refresh" loading={loading} onPress={refresh}>Refresh</Button>
        </View>
      </View>
      <SegmentedButtons value={days} onValueChange={(value) => setDays(value)} buttons={[
        { value: '1', label: '24h' },
        { value: '7', label: '7 days' },
        { value: '30', label: '30 days' },
        { value: '90', label: '90 days' },
      ]} />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      {data && !data.storageReady ? <HelperText type="info" visible>Visitor analytics storage is not available in production yet.</HelperText> : null}
      {legacyViews > 0 ? <View style={styles.legacyNote}>
        <Text variant="labelLarge" style={styles.title}>Historical page-view note</Text>
        <Text style={styles.muted}>{compact(legacyViews)} older page views were collected before anonymous visitor IDs were enabled. Those views are preserved, but they cannot honestly be split into unique, new or returning people after the fact. Unique tracking starts {when(summary.uniqueTrackingSince as string | null)}.</Text>
      </View> : null}
    </AppCard>

    <View style={styles.metrics}>
      <Metric live label="On site now" value={compact(summary.activeNow)} hint="Anonymous visitors active in roughly the last 2 minutes." />
      <Metric label="Unique visitors" value={compact(summary.uniqueVisitors)} hint="Distinct anonymous browsers in this period." />
      <Metric label="New visitors" value={compact(summary.newVisitors)} hint="First seen during the selected period." />
      <Metric label="Returning visitors" value={compact(summary.returningVisitors)} hint="Seen before the selected period and came back." />
      <Metric label="Visits" value={compact(summary.sessions)} hint={`${compact(summary.returningSessions)} repeat visit${number(summary.returningSessions) === 1 ? '' : 's'} in this period.`} />
      <Metric label="Page views" value={compact(summary.pageViews)} hint="Page loads and route changes, including preserved historical totals." />
      <Metric label="Pages / visit" value={decimal(summary.pagesPerSession)} hint="Based on visits recorded after unique tracking began." />
      <Metric label="Signup / sign-in conversion" value={`${conversionRate.toFixed(1)}%`} hint={`${compact(summary.convertedSessions)} anonymous visit${number(summary.convertedSessions) === 1 ? '' : 's'} converted.`} />
    </View>

    <AppCard>
      <View style={styles.quickFacts}>
        <View style={styles.fact}><Text style={styles.factValue}>{duration(summary.avgSessionSeconds)}</Text><Text style={styles.muted}>avg visit</Text></View>
        <View style={styles.fact}><Text style={styles.factValue}>{duration(avgPageSeconds)}</Text><Text style={styles.muted}>avg page attention</Text></View>
        <View style={styles.fact}><Text style={styles.factValue}>{engagedRate.toFixed(0)}%</Text><Text style={styles.muted}>engaged visits</Text></View>
        <View style={styles.fact}><Text style={styles.factValue}>{compact(summary.clicks)}</Text><Text style={styles.muted}>meaningful clicks</Text></View>
        <View style={styles.fact}><Text style={styles.factValue}>{compact(summary.signups)}</Text><Text style={styles.muted}>accounts created</Text></View>
      </View>
    </AppCard>

    <View style={styles.twoColumn}>
      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Where visitors came from</Text>
        <Text style={styles.muted}>UTM campaign data wins when present; otherwise BuildPair uses the referring site. Use UTM links in TikTok, Facebook, email and paid campaigns so the source is unambiguous.</Text>
        <RankedRows rows={data?.sourceChannels ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.channel, 'Direct / unknown')}</Text><Text style={styles.muted}>{compact(row.visitors)} visitors · {compact(row.sessions)} visits · {compact(row.conversions)} conversions</Text></View></View>} />
      </AppCard>

      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Landing pages</Text>
        <Text style={styles.muted}>The first page of each tracked visit. This is the useful answer to “what did my TikTok/Facebook/Google traffic actually land on?”</Text>
        <RankedRows rows={data?.topLandingPages ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.path, '/')}</Text><Text style={styles.muted}>{compact(row.visitors)} visitors · {compact(row.sessions)} visits · {compact(row.conversions)} conversions</Text></View></View>} />
      </AppCard>
    </View>

    <AppCard>
      <View style={styles.headerRow}>
        <View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Recent anonymous visits</Text><Text style={styles.muted}>New/returning status, acquisition, pages and activity. “Anonymous” means this does not tell you the person’s real-world identity unless they later sign in.</Text></View>
        <Chip icon="clock-outline">Live refresh on demand</Chip>
      </View>
      {(data?.recentSessions ?? []).length ? <View style={styles.list}>{(data?.recentSessions ?? []).slice(0, 50).map((session, index) => <View key={session.id}>
        <View style={styles.sessionRow}>
          <View style={styles.flex}>
            <View style={styles.chips}>
              {session.activeNow ? <Chip compact icon="circle" textStyle={styles.liveChipText}>Live now</Chip> : null}
              <Chip compact icon={session.isReturning ? 'backup-restore' : 'account-plus-outline'}>{session.isReturning ? 'Returning' : 'New'}</Chip>
              <Chip compact>{session.channel || 'Direct / unknown'}</Chip>
              {session.converted ? <Chip compact icon="check-circle">Converted</Chip> : session.likelyDropoff ? <Chip compact icon="exit-run">Likely left</Chip> : null}
            </View>
            <Text style={styles.rowTitle}>{session.landingPath || '/'} → {session.lastPath || '/'}</Text>
            <Text style={styles.muted}>{when(session.startedAt)} · {duration(session.durationSeconds)} · {session.pageViews} page{session.pageViews === 1 ? '' : 's'} · visit #{session.visitCount} · {text(session.device?.deviceType)} / {text(session.device?.browser)}</Text>
          </View>
          <Button compact mode="outlined" onPress={() => openSession(session)}>Open journey</Button>
        </View>
        {index < (data?.recentSessions ?? []).length - 1 ? <Divider /> : null}
      </View>)}</View> : <Text style={styles.muted}>No anonymous visits have been recorded with the new visitor tracking yet.</Text>}
    </AppCard>

    {selectedSession ? <AppCard style={styles.journeyCard}>
      <View style={styles.headerRow}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Journey detail</Text><Text style={styles.muted}>{selectedSession.channel} · {selectedSession.landingPath || '/'} · started {when(selectedSession.startedAt)}</Text></View><Button onPress={() => { setSelectedSession(null); setEvents([]); }}>Close</Button></View>
      <View style={styles.metaGrid}>
        <Text style={styles.muted}>Status: {selectedSession.activeNow ? 'live now' : selectedSession.converted ? 'converted' : selectedSession.likelyDropoff ? 'likely ended' : 'recent'}</Text>
        <Text style={styles.muted}>Device: {text(selectedSession.device?.deviceType)} · {text(selectedSession.device?.browser)} · {text(selectedSession.device?.os)}</Text>
        <Text style={styles.muted}>Viewport: {text(selectedSession.device?.viewport)} · screen {text(selectedSession.device?.screen)}</Text>
        <Text style={styles.muted}>Language/timezone: {text(selectedSession.device?.language)} · {text(selectedSession.device?.timezone)}</Text>
        <Text style={styles.muted}>Referrer: {text(selectedSession.referrerHost, 'Direct / unknown')}</Text>
      </View>
      {eventsLoading ? <HelperText type="info" visible>Loading journey…</HelperText> : <View style={styles.list}>{events.map((event, index) => <View key={event.id}>
        <View style={styles.eventRow}><Text style={styles.eventTime}>{new Date(event.createdAt).toLocaleTimeString('en-GB')}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{event.eventType.replaceAll('_', ' ')}</Text><Text style={styles.muted}>{event.path || '/'}{event.target ? ` · ${event.target}` : ''}{event.value != null ? ` · ${event.eventType === 'page_time' ? duration(event.value) : event.value}` : ''}</Text></View></View>
        {index < events.length - 1 ? <Divider /> : null}
      </View>)}</View>}
    </AppCard> : null}

    <View style={styles.twoColumn}>
      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Most viewed pages</Text>
        <RankedRows rows={data?.topPages ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.path, '/')}</Text><Text style={styles.muted}>{compact(row.views)} views · avg {duration(row.avgSeconds)}</Text></View></View>} />
      </AppCard>
      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Most-used buttons & links</Text>
        <RankedRows rows={data?.topClicks ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.target)}</Text><Text style={styles.muted}>{compact(row.clicks)} clicks{row.targetPath ? ` · ${text(row.targetPath)}` : ''}</Text></View></View>} />
      </AppCard>
    </View>

    <View style={styles.twoColumn}>
      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Devices</Text>
        <RankedRows rows={data?.devices ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.deviceType)} · {text(row.browser)} · {text(row.os)}</Text><Text style={styles.muted}>{compact(row.visitors)} visitors · {compact(row.sessions)} visits</Text></View></View>} />
      </AppCard>
      <AppCard style={styles.columnCard}>
        <Text variant="titleLarge" style={styles.title}>Approximate locations</Text>
        <Text style={styles.muted}>Only coarse hosting/network signals and timezone. No precise GPS or raw IP address is retained.</Text>
        <RankedRows rows={data?.locations ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{[row.city, row.region, row.country].map((value) => text(value, '')).filter(Boolean).join(', ') || text(row.timezone)}</Text><Text style={styles.muted}>{compact(row.visitors)} visitors · {compact(row.sessions)} visits{row.timezone ? ` · ${text(row.timezone)}` : ''}</Text></View></View>} />
      </AppCard>
    </View>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Form friction</Text>
      <Text style={styles.muted}>Shows which named fields visitors reached. The values they typed are deliberately not stored.</Text>
      <RankedRows rows={data?.forms ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.field)}</Text><Text style={styles.muted}>{text(row.path, '/')} · {compact(row.interactions)} interactions</Text></View></View>} />
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  heroCard: { borderTopWidth: 4, borderTopColor: colors.primary },
  title: { color: colors.text, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' },
  toolbarButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  flex: { flex: 1, minWidth: 180 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: 190, minWidth: 175, maxWidth: 330 },
  liveMetric: { borderColor: '#7BC7A3' },
  metricTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#2C9B65' },
  metricValue: { color: colors.primary, fontWeight: '900' },
  legacyNote: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 4 },
  quickFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fact: { flexGrow: 1, minWidth: 130, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceSoft },
  factValue: { color: colors.charcoal, fontWeight: '900', fontSize: 18 },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  columnCard: { flex: 1, minWidth: 300 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rank: { width: 26, textAlign: 'center', color: colors.primary, fontWeight: '900' },
  rowTitle: { color: colors.text, fontWeight: '800' },
  sessionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  liveChipText: { fontWeight: '900' },
  journeyCard: { borderColor: colors.primary },
  metaGrid: { gap: 4, paddingVertical: 4 },
  eventRow: { flexDirection: 'row', gap: 10, paddingVertical: 7 },
  eventTime: { width: 72, color: colors.primary, fontWeight: '800' },
});
