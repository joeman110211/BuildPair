import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Action = { id:string; priority:number; kind:string; title:string; body:string; href:string };
type ResponseShape = { mode:'customer'|'trader'|null; title:string; actions:Action[] };

export function AttentionCentre({ role }: { role: 'customer' | 'trader' }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const result = await apiFetch<ResponseShape>('/api/attention', {}, getToken);
      setActions(result.mode === role ? result.actions : []);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [getToken, role]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (loading) return <LoadingScreen label="Checking what needs attention…" />;
  return <Screen title="Needs attention" subtitle="One action list for the things that actually need a decision, follow-up or next step. Notifications can chatter; this list should not.">
    {error ? <EmptyState title="Attention list unavailable" body={error} action={<Button onPress={() => void load()}>Try again</Button>} /> : null}
    {!error && !actions.length ? <EmptyState title="Nothing needs your action right now" body={role === 'customer' ? 'Quotes, project decisions, payment stages and upcoming home-care items will appear here when you need to do something.' : 'Project issues, funded stages, quote follow-ups and invoices will appear here when they genuinely need attention.'} /> : null}
    {actions.map((action) => <AppCard key={action.id} style={action.priority <= 3 ? styles.urgent : undefined}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>{action.title}</Text><Text style={styles.muted}>{action.body}</Text></View><Chip>{label(action.kind)}</Chip></View>
      <Button mode={action.priority <= 10 ? 'contained' : 'outlined'} icon="arrow-right" onPress={() => router.push(action.href as Href)}>Open next step</Button>
    </AppCard>)}
  </Screen>;
}

function label(kind:string) {
  if (kind === 'payment') return 'Payment';
  if (kind === 'issue') return 'Issue';
  if (kind === 'quote') return 'Quote';
  if (kind === 'invoice') return 'Invoice';
  if (kind === 'aftercare') return 'Home care';
  if (kind === 'setup') return 'Setup';
  return 'Action';
}

const styles = StyleSheet.create({
  urgent: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  row: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, justifyContent:'space-between', alignItems:'center' },
  flex: { flex:1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap:4 },
  title: { color:colors.charcoal, fontWeight:'900' },
  muted: { color:colors.muted, lineHeight:21 },
});
