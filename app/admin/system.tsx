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
  required: boolean;
  capability: string;
  envVars: string[];
};

type SystemHealth = {
  status: 'ok' | 'attention' | 'degraded';
  checks: Check[];
  summary: { ok: number; degraded: number; unconfigured: number; requiredMissing: number };
  releaseSha: string | null;
  generatedAt: string;
};

function stateLabel(state: Check['state']) {
  if (state === 'ok') return 'Healthy';
  if (state === 'degraded') return 'Needs attention';
  return 'Setup required';
}

function headline(status: SystemHealth['status']) {
  if (status === 'ok') return 'Launch services responding';
  if (status === 'attention') return 'Configuration still required';
  return 'One or more configured services are degraded';
}

function summaryText(status: SystemHealth['status']) {
  if (status === 'ok') return 'All required BuildPair dependencies are configured and responding.';
  if (status === 'attention') return 'The app can run, but one or more product capabilities are still disabled because their Render environment variables are missing.';
  return 'At least one configured dependency failed its live check and needs investigation.';
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

  return <Screen title="System Health" subtitle="Live checks plus the exact configuration BuildPair still needs before launch. Healthy means the service was genuinely verified, not that somebody crossed their fingers near a dashboard.">
    <View style={styles.actions}>
      <Button mode="contained" loading={loading} disabled={loading} onPress={() => void load()}>Run checks again</Button>
      {data?.releaseSha ? <Chip>Release {data.releaseSha.slice(0, 12)}</Chip> : null}
    </View>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {data ? <>
      <AppCard style={data.status === 'ok' ? styles.summaryOk : data.status === 'attention' ? styles.summaryAttention : styles.summaryBad}>
        <View style={styles.summaryRow}>
          <View style={styles.flex}>
            <Text variant="headlineSmall" style={styles.title}>{headline(data.status)}</Text>
            <Text style={styles.muted}>{summaryText(data.status)}</Text>
            <Text variant="bodySmall" style={styles.muted}>Checked {new Date(data.generatedAt).toLocaleString('en-GB')}</Text>
          </View>
          <View style={styles.chips}>
            <Chip>{data.summary.ok} healthy</Chip>
            <Chip>{data.summary.requiredMissing} setup required</Chip>
            <Chip>{data.summary.degraded} degraded</Chip>
          </View>
        </View>
      </AppCard>

      <View style={styles.grid}>
        {data.checks.map((check) => <AppCard key={check.name} style={styles.card}>
          <View style={styles.checkHeader}>
            <View style={styles.flex}>
              <Text variant="titleLarge" style={styles.title}>{check.name}</Text>
              <Text variant="labelMedium" style={styles.capability}>{check.capability}</Text>
            </View>
            <Chip>{stateLabel(check.state)}</Chip>
          </View>
          <Text style={styles.muted}>{check.detail}</Text>
          {check.state === 'unconfigured' ? <View style={styles.envBox}>
            <Text variant="labelLarge" style={styles.envTitle}>Add to Render → buildpair → Environment</Text>
            {check.envVars.map((name) => <Text key={name} selectable style={styles.envName}>{name}</Text>)}
          </View> : null}
          <Text variant="bodySmall" style={check.state === 'ok' ? styles.latency : styles.muted}>
            {check.latencyMs == null ? (check.state === 'ok' ? 'Verified through the current authenticated request' : 'No live probe can run until configured') : `${check.latencyMs} ms`}
          </Text>
        </AppCard>)}
      </View>

      <AppCard>
        <Text variant="titleMedium" style={styles.title}>Launch-readiness rule</Text>
        <Text style={styles.muted}>Database and Clerk keep the core account system alive. Gemini powers the AI assistants, Cloudinary powers user media, Resend handles transactional email, and Stripe powers paid memberships and payments. A missing integration is therefore shown as setup required rather than quietly pretending it is optional.</Text>
      </AppCard>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minWidth: 260, flexGrow: 1, flexBasis: 320 },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  summaryOk: { borderColor: '#9FCBB6' },
  summaryAttention: { borderColor: '#E8B36B' },
  summaryBad: { borderColor: '#D98C8C' },
  flex: { flex: 1, minWidth: 220 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  title: { color: colors.charcoal, fontWeight: '900' },
  capability: { color: colors.primary, fontWeight: '800', marginTop: 2 },
  muted: { color: colors.muted, lineHeight: 21 },
  latency: { color: '#287A52', fontWeight: '800' },
  envBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, gap: 4, backgroundColor: colors.surfaceSoft },
  envTitle: { color: colors.charcoal, fontWeight: '800' },
  envName: { color: colors.primary, fontFamily: 'monospace', fontWeight: '700' },
});
