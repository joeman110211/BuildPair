import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
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

function stateLabel(check: Check) {
  if (!check.required && check.state === 'unconfigured') return 'Not enabled';
  if (check.state === 'ok') return 'Healthy';
  if (check.state === 'degraded') return check.required ? 'Needs attention' : 'Optional integration issue';
  return 'Setup required';
}

function headline(status: SystemHealth['status']) {
  if (status === 'ok') return 'Live services responding';
  if (status === 'attention') return 'An active service needs configuration';
  return 'One or more configured services are degraded';
}

function summaryText(status: SystemHealth['status']) {
  if (status === 'ok') return 'Required services for currently enabled features are configured and responding.';
  if (status === 'attention') return 'One or more currently enabled features need configuration. Planned integrations are tracked separately.';
  return 'At least one required dependency failed its live check and needs investigation.';
}

export default function AdminSystemHealth() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await apiFetch<SystemHealth>('/api/admin/system-health', {}, () => getTokenRef.current()));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  if (loading && !data && !error) return <LoadingScreen label="Testing BuildPair services…" />;

  return <Screen title="System Health" subtitle="Operational checks for the launched marketplace, with optional integrations tracked separately. A healthy status reflects live checks, not assumptions.">
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
            <Chip>{data.summary.requiredMissing} required setup</Chip>
            <Chip>{data.summary.unconfigured - data.summary.requiredMissing} optional pending</Chip>
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
            <Chip>{stateLabel(check)}</Chip>
          </View>
          <Text style={styles.muted}>{check.detail}</Text>
          {check.state === 'unconfigured' ? <View style={styles.envBox}>
            <Text variant="labelLarge" style={styles.envTitle}>Configuration: Render → buildpair → Environment</Text>
            {check.envVars.map((name) => <Text key={name} selectable style={styles.envName}>{name}</Text>)}
          </View> : null}
          <Text variant="bodySmall" style={check.state === 'ok' ? styles.latency : styles.muted}>
            {check.latencyMs == null ? (check.state === 'ok' ? 'Verified through the current authenticated request' : 'No live probe can run until configured') : `${check.latencyMs} ms`}
          </Text>
        </AppCard>)}
      </View>

      <AppCard>
        <Text variant="titleMedium" style={styles.title}>Operational health rule</Text>
        <Text style={styles.muted}>Database and Clerk support the live marketplace, with Gemini, Cloudinary and Resend providing active capabilities. BuildPay and paid memberships are not open yet, so Stripe setup is visible as optional until those features are enabled. Missing configuration for active capabilities must still be investigated.</Text>
      </AppCard>
    </> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { minWidth: 0, flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 320 },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  summaryOk: { borderColor: '#9FCBB6' },
  summaryAttention: { borderColor: '#E8B36B' },
  summaryBad: { borderColor: '#D98C8C' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  title: { color: colors.charcoal, fontWeight: '900' },
  capability: { color: colors.primary, fontWeight: '800', marginTop: 2 },
  muted: { color: colors.muted, lineHeight: 21 },
  latency: { color: '#287A52', fontWeight: '800' },
  envBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, gap: 4, backgroundColor: colors.surfaceSoft },
  envTitle: { color: colors.charcoal, fontWeight: '800' },
  envName: { color: colors.primary, fontFamily: 'monospace', fontWeight: '700' },
});
