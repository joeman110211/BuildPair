import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Check = {
  name: string;
  state: 'ok' | 'degraded' | 'unconfigured';
  latencyMs: number | null;
  detail: string;
};
type SystemHealth = {
  status: 'ok' | 'degraded';
  checks: Check[];
  summary: { ok: number; degraded: number; unconfigured: number };
  releaseSha: string | null;
  generatedAt: string;
};

function stateLabel(state: Check['state']) {
  if (state === 'ok') return 'Healthy';
  if (state === 'degraded') return 'Needs attention';
  return 'Not configured';
}

export default function AdminSystemHealth() {
  const { getToken } = useAuth();
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await apiFetch<SystemHealth>('/api/admin/system-health', {}, getToken));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (loading && !data && !error) return <LoadingScreen label="Testing BuildPair services…" />;

  return <Screen title="System Health" subtitle="Live read-only checks against the services BuildPair actually depends on. Green means a real probe succeeded, not merely that somebody remembered to set an environment variable.">
    <View style={styles.actions}>
      <Button mode="contained" icon="refresh" loading={loading} disabled={loading} onPress={() => void load()}>Run checks again</Button>
      {data?.releaseSha ? <Chip icon="source-commit">Release {data.releaseSha.slice(0, 12)}</Chip> : null}
    </View>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {data ? <>
      <AppCard style={data.status === 'ok' ? styles.summaryOk : styles.summaryBad}>
        <View style={styles.summaryRow}>
          <View style={styles.flex}>
            <Text variant="headlineSmall" style={styles.title}>{data.status === 'ok' ? 'Core services responding' : 'One or more services are degraded'}</Text>
            <Text style={styles.muted}>Checked {new Date(data.generatedAt).toLocaleString('en-GB')}</Text>
          </View>
          <View style={styles.chips}><Chip>{data.summary.ok} healthy</Chip><Chip>{data.summary.degraded} degraded</Chip><Chip>{data.summary.unconfigured} optional/unconfigured</Chip></View>
        </View>
      </AppCard>
      <View style={styles.grid}>
        {data.checks.map((check) => <AppCard key={check.name} style={styles.card}>
          <View style={styles.checkHeader}>
            <Text variant="titleLarge" style={styles.title}>{check.name}</Text>
            <Chip icon={check.state === 'ok' ? 'check-circle-outline' : check.state === 'degraded' ? 'alert-circle-outline' : 'minus-circle-outline'}>{stateLabel(check.state)}</Chip>
          </View>
          <Text style={styles.muted}>{check.detail}</Text>
          <Text variant="bodySmall" style={styles.latency}>{check.latencyMs == null ? 'No live probe run' : `${check.latencyMs} ms`}</Text>
        </AppCard>)}
      </View>
      <AppCard>
        <Text variant="titleMedium" style={styles.title}>What this page does not pretend</Text>
        <Text style={styles.muted}>A successful dependency probe proves the service answered this request. It does not replace the full BuildPair browser gauntlet, payment-webhook monitoring, backups, restore drills or end-to-end email delivery checks.</Text>
      </AppCard>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minWidth: 260, flexGrow: 1, flexBasis: 320 },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  summaryOk: { borderColor: '#9FCBB6' },
  summaryBad: { borderColor: '#E8B36B' },
  flex: { flex: 1, minWidth: 220 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  latency: { color: colors.primary, fontWeight: '800' },
});
