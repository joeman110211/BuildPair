import { useAuth } from '@clerk/expo';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, HelperText, SegmentedButtons, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

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
  durationSeconds: number;
  eventCount: number;
  visitCount: number;
};
type VisitorData = {
  storageReady: boolean;
  days?: number;
  summary: Record<string, unknown>;
  topPages: CountRow[];
  topClicks: CountRow[];
  acquisition: CountRow[];
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

function duration(seconds: unknown) {
  const total = Math.max(0, Math.round(number(seconds)));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${total % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function when(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function text(value: unknown, fallback = 'Unknown') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <AppCard style={styles.metric}><Text variant="headlineSmall" style={styles.metricValue}>{value}</Text><Text variant="titleSmall" style={styles.title}>{label}</Text><Text style={styles.muted}>{hint}</Text></AppCard>;
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

  useEffect(() => {
    let active = true;
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
  const converted = number(summary.convertedSessions);
  const detailed = number(summary.detailedSessions);
  const conversionRate = detailed ? (converted / detailed) * 100 : 0;

  return <Screen title="Visitor Analytics" subtitle="Understand anonymous traffic, clicks, devices, acquisition, locations and consented journeys without turning BuildPair into a surveillance circus.">
    <AppCard>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Anonymous traffic & conversion</Text>
          <Text style={styles.muted}>Basic analytics is aggregated. Individual journey history appears only for visitors who explicitly allow detailed analytics. Raw IP addresses, passwords, form contents and precise GPS location are not recorded.</Text>
        </View>
        <Button mode="outlined" icon="refresh" loading={loading} onPress={refresh}>Refresh</Button>
      </View>
      <SegmentedButtons value={days} onValueChange={(value) => { setLoading(true); setDays(value); }} buttons={[
        { value: '1', label: '24h' },
        { value: '7', label: '7 days' },
        { value: '30', label: '30 days' },
        { value: '90', label: '90 days' },
      ]} />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      {data && !data.storageReady ? <HelperText type="info" visible>Visitor analytics code is deployed, but the anonymous analytics database tables are still awaiting production activation.</HelperText> : null}
    </AppCard>

    <View style={styles.metrics}>
      <Metric label="Page views" value={compact(summary.pageViews)} hint="All basic analytics page views except people who opted out." />
      <Metric label="Meaningful clicks" value={compact(summary.clicks)} hint="Links, buttons and submit controls. Not random screen taps." />
      <Metric label="Signup page views" value={compact(summary.signupPageViews)} hint="Visits to BuildPair signup routes." />
      <Metric label="Signup CTA clicks" value={compact(summary.signupClicks)} hint="Clicks whose destination or label points at signup." />
      <Metric label="Accounts created" value={compact(summary.signups)} hint="Actual BuildPair accounts created during this period." />
      <Metric label="Avg page attention" value={duration(avgPageSeconds)} hint="Average measured time on a page before navigation or exit." />
      <Metric label="Detailed sessions" value={compact(summary.detailedSessions)} hint="Anonymous sessions where the visitor explicitly allowed detailed journey analytics." />
      <Metric label="Detailed conversion" value={`${conversionRate.toFixed(1)}%`} hint={`${compact(summary.convertedSessions)} converted · ${compact(summary.likelyNonConversions)} likely left without converting.`} />
    </View>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>What the numbers actually mean</Text>
      <Text style={styles.muted}>A page view tells you what was looked at. A click tells you what a visitor deliberately tried to do. Form interaction counts which fields people reached, but never stores what they typed. “Likely drop-off” means a consented detailed session went quiet for at least 30 minutes without converting. It is evidence of friction, not supernatural proof of why somebody left.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Pages people look at</Text>
      <Text style={styles.muted}>Use views to find popular pages and attention time to spot pages that are either genuinely engaging or confusing enough to trap a human being for five minutes.</Text>
      <RankedRows rows={data?.topPages ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.path, '/')}</Text><Text style={styles.muted}>{compact(row.views)} views · avg {duration(row.avgSeconds)}</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>What people click</Text>
      <Text style={styles.muted}>This is particularly useful for comparing CTAs. A button everyone sees but nobody clicks is decorative furniture wearing a uniform.</Text>
      <RankedRows rows={data?.topClicks ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.target)}</Text><Text style={styles.muted}>{compact(row.clicks)} clicks{row.targetPath ? ` · ${text(row.targetPath)}` : ''}</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Signup & form friction</Text>
      <Text style={styles.muted}>Shows which named fields visitors reach. Values are deliberately excluded, so you can see “email field reached, next step never reached” without reading somebody’s bloody email address.</Text>
      <RankedRows rows={data?.forms ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.field)}</Text><Text style={styles.muted}>{text(row.path, '/')} · {compact(row.interactions)} interactions</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>How visitors found BuildPair</Text>
      <RankedRows rows={data?.acquisition ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.referrerHost, 'Direct / unknown')}</Text><Text style={styles.muted}>{compact(row.views)} views{row.utmSource ? ` · source ${text(row.utmSource)}` : ''}{row.utmCampaign ? ` · campaign ${text(row.utmCampaign)}` : ''}</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Devices & systems</Text>
      <Text style={styles.muted}>Broad device, browser and operating-system categories help expose layout or compatibility problems without fingerprinting people.</Text>
      <RankedRows rows={data?.devices ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{text(row.deviceType)} · {text(row.browser)} · {text(row.os)}</Text><Text style={styles.muted}>{compact(row.views)} page views</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Location signals</Text>
      <Text style={styles.muted}>Uses coarse country/region/city headers when the hosting/CDN layer supplies them, plus browser timezone. No raw IP is retained and BuildPair does not silently ask for precise GPS.</Text>
      <RankedRows rows={data?.locations ?? []} render={(row, index) => <View style={styles.row}><Text style={styles.rank}>{index + 1}</Text><View style={styles.flex}><Text style={styles.rowTitle}>{[row.city, row.region, row.country].map((value) => text(value, '')).filter(Boolean).join(', ') || text(row.timezone)}</Text><Text style={styles.muted}>{compact(row.views)} page views{row.timezone ? ` · ${text(row.timezone)}` : ''}</Text></View></View>} />
    </AppCard>

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Consented detailed journeys</Text>
      <Text style={styles.muted}>Only visitors who chose “Allow detailed” appear here. Open a visit to see the page-by-page sequence, clicks, scroll milestones and form-field reach. Repeat visits are recognised for up to 90 days without device fingerprinting.</Text>
      {(data?.recentSessions ?? []).length ? <View style={styles.list}>{(data?.recentSessions ?? []).slice(0, 50).map((session, index) => <View key={session.id}>
        <View style={styles.sessionRow}>
          <View style={styles.flex}>
            <View style={styles.chips}><Chip compact icon={session.converted ? 'check-circle' : session.likelyDropoff ? 'exit-run' : 'clock-outline'}>{session.converted ? 'Converted' : session.likelyDropoff ? 'Likely drop-off' : 'Active/recent'}</Chip>{session.visitCount > 1 ? <Chip compact>{session.visitCount} visits</Chip> : null}</View>
            <Text style={styles.rowTitle}>{session.landingPath || '/'} → {session.lastPath || '/'}</Text>
            <Text style={styles.muted}>{when(session.startedAt)} · {duration(session.durationSeconds)} · {session.eventCount} events · {text(session.device?.deviceType)} / {text(session.device?.browser)}</Text>
          </View>
          <Button compact mode="outlined" onPress={() => openSession(session)}>Open journey</Button>
        </View>
        {index < (data?.recentSessions ?? []).length - 1 ? <Divider /> : null}
      </View>)}</View> : <Text style={styles.muted}>No visitors have opted into detailed journey analytics in this period yet.</Text>}
    </AppCard>

    {selectedSession ? <AppCard>
      <View style={styles.headerRow}><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Journey detail</Text><Text style={styles.muted}>{selectedSession.landingPath || '/'} · started {when(selectedSession.startedAt)} · {selectedSession.converted ? 'converted' : 'did not convert during this visit'}</Text></View><Button onPress={() => { setSelectedSession(null); setEvents([]); }}>Close</Button></View>
      <View style={styles.metaGrid}>
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
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  flex: { flex: 1, minWidth: 180 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flex: 1, minWidth: 210, maxWidth: 360 },
  metricValue: { color: colors.primary, fontWeight: '900' },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rank: { width: 26, textAlign: 'center', color: colors.primary, fontWeight: '900' },
  rowTitle: { color: colors.text, fontWeight: '800' },
  sessionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  metaGrid: { gap: 4, paddingVertical: 4 },
  eventRow: { flexDirection: 'row', gap: 10, paddingVertical: 7 },
  eventTime: { width: 72, color: colors.primary, fontWeight: '800' },
});
