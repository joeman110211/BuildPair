import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';

type EventRow = { id: string; type: 'job' | 'site_visit' | 'availability'; title: string; startsAt: string; endsAt: string | null; status: string; href: string };
type CalendarResult = { horizonDays: number; tier: 'basic' | 'featured'; events: EventRow[] };
type CalendarSubscription = { url: string; webcalUrl: string };

export default function TraderCalendarScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CalendarResult>();
  const [subscription, setSubscription] = useState<CalendarSubscription>();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const [calendar, feed] = await Promise.all([apiFetch<CalendarResult>('/api/trader-calendar', {}, getToken), apiFetch<CalendarSubscription>('/api/trader-calendar/subscription', {}, getToken)]); setData(calendar); setSubscription(feed); setLocked(false); setError(''); }
    catch (e) { if (e instanceof ApiError && e.status === 402) setLocked(true); else setError(errorMessage(e)); }
  }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!data && !locked && !error) return <LoadingScreen label="Loading calendar…" />;
  if (locked) return <Screen title="Working calendar" subtitle="The combined job calendar is included with BuildPair Plus and Pro."><AppCard><Text variant="headlineSmall" style={styles.title}>Keep jobs, visits and availability together.</Text><Text style={styles.muted}>Core can publish a simple next-available window. Plus adds a 12-week working calendar; Pro extends it to roughly six months.</Text><Button mode="contained" onPress={() => router.push('/trader/subscription')}>Compare plans</Button></AppCard></Screen>;
  if (!data) return <Screen title="Working calendar"><EmptyState title="Calendar unavailable" body={error} /></Screen>;
  async function shareFeed() {
    if (!subscription) return;
    if (Platform.OS === 'web') {
      const nav = (globalThis as unknown as { navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } } }).navigator;
      if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(subscription.url); return; }
    }
    await Share.share({ title: 'BuildPair calendar subscription', message: subscription.url });
  }
  return <Screen title="Working calendar" subtitle={data.tier === 'featured' ? 'Pro · roughly six months of jobs, visits and availability.' : 'Plus · roughly 12 weeks of jobs, visits and availability.'}>
    <View style={styles.actions}><Button mode="outlined" icon="calendar-plus" onPress={() => router.push('/trader/trust')}>Update availability</Button><Button mode="outlined" icon="refresh" onPress={() => void load()}>Refresh</Button></View>
    {subscription ? <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Use this diary everywhere</Text><Text style={styles.muted}>Subscribe once and BuildPair jobs, site visits and published availability appear in Google Calendar, Outlook, Apple Calendar and most phone calendars. The link is private, so do not post it publicly.</Text></View><Chip icon="calendar-sync-outline">Live feed</Chip></View>
      <View style={styles.actions}><Button mode="contained" icon="calendar-import" onPress={() => void Linking.openURL(subscription.webcalUrl)}>Subscribe in calendar</Button><Button mode="outlined" icon="content-copy" onPress={() => void shareFeed()}>{Platform.OS === 'web' ? 'Copy feed link' : 'Share feed link'}</Button></View>
      <Text variant="bodySmall" style={styles.muted}>Google Calendar: Other calendars → From URL. Outlook: Add calendar → Subscribe from web. Updates are read-only from BuildPair, so your private diary never gets uploaded here.</Text>
    </AppCard> : null}
    {!data.events.length ? <EmptyState title="Nothing scheduled yet" body="Confirmed job starts, proposed/confirmed site visits and the availability you publish will appear here." /> : data.events.map((event) => <AppCard key={event.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{event.title}</Text><Text style={styles.muted}>{new Date(event.startsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{event.endsAt ? ` → ${new Date(event.endsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</Text></View><Chip>{event.type.replace('_',' ')}</Chip></View>
      <Button compact mode="text" onPress={() => router.push(event.href as Href)}>Open</Button>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 220, gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
