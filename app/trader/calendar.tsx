import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';

type EventRow = { id: string; type: 'job' | 'site_visit' | 'availability'; title: string; startsAt: string; endsAt: string | null; status: string; href: string };
type CalendarResult = { horizonDays: number; tier: 'basic' | 'featured'; events: EventRow[] };
type CalendarFeed = { enabled: boolean; feedUrl: string; webcalUrl: string; googleUrl: string };

export default function TraderCalendarScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CalendarResult>();
  const [feed, setFeed] = useState<CalendarFeed>();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const calendar = await apiFetch<CalendarResult>('/api/trader-calendar', {}, getToken);
      setData(calendar);
      setLocked(false);
      setError('');
      setFeed(await apiFetch<CalendarFeed>('/api/trader-calendar/feed', {}, getToken).catch(() => undefined));
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setLocked(true);
      else setError(errorMessage(e));
    }
  }, [getToken]);

  async function resetFeed() {
    try {
      setError('');
      setFeed(await apiFetch<CalendarFeed>('/api/trader-calendar/feed', { method: 'POST', body: JSON.stringify({ action: 'reset' }) }, getToken));
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (!data && !locked && !error) return <LoadingScreen label="Loading calendar…" />;
  if (locked) return <Screen title="Working calendar" subtitle="The combined job calendar is included with BuildPair Plus and Pro."><AppCard><Text variant="headlineSmall" style={styles.title}>Keep jobs, visits and availability together.</Text><Text style={styles.muted}>Core can publish a simple next-available window. Plus adds a 12-week working calendar; Pro extends it to roughly six months.</Text><Button mode="contained" onPress={() => router.push('/trader/subscription')}>Compare plans</Button></AppCard></Screen>;
  if (!data) return <Screen title="Working calendar"><EmptyState title="Calendar unavailable" body={error} /></Screen>;
  return <Screen title="Working calendar" subtitle={data.tier === 'featured' ? 'Pro · roughly six months of jobs, visits and availability.' : 'Plus · roughly 12 weeks of jobs, visits and availability.'}>
    <View style={styles.actions}><Button mode="outlined" icon="calendar-plus" onPress={() => router.push('/trader/trust')}>Update availability</Button><Button mode="outlined" icon="refresh" onPress={() => void load()}>Refresh</Button></View>

    {feed ? <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Sync BuildPair to your normal diary</Text><Text style={styles.muted}>Subscribe once and BuildPair jobs, site visits and published availability can appear in Google Calendar, Outlook, Apple Calendar and other calendar apps. The feed deliberately contains job titles and times, not customer addresses.</Text></View><Chip icon="sync">Live feed</Chip></View>
      <View style={styles.actions}>
        <Button mode="contained" icon="google" onPress={() => void Linking.openURL(feed.googleUrl)}>Add to Google Calendar</Button>
        <Button mode="outlined" icon="calendar-import" onPress={() => void Linking.openURL(feed.webcalUrl)}>Outlook / Apple / calendar app</Button>
        <Button mode="text" icon="key-change" onPress={() => void resetFeed()}>Reset private link</Button>
      </View>
      <Text variant="bodySmall" style={styles.muted}>Treat the subscription link like a private calendar link. Resetting it immediately invalidates the old address.</Text>
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
