import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import type { GooglePlaceIdentity } from '@/lib/google-reviews';

type Row = {
  traderId: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  locationLabel: string | null;
  placeId: string;
  verificationStatus: 'verified' | 'pending_review' | 'rejected';
  matchScore: number;
  matchReasons: string[];
  connectedAt: string;
  reviewedAt: string | null;
  google: GooglePlaceIdentity | null;
};

type Response = { configured: boolean; rows: Row[] };

export default function AdminGoogleReviewsScreen() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [data, setData] = useState<Response>();
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'verified' | 'rejected'>('pending_review');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = filter === 'all' ? '' : `?status=${encodeURIComponent(filter)}`;
      setData(await apiFetch<Response>(`/api/admin/google-reviews${query}`, {}, () => tokenRef.current()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function review(traderId: string, action: 'approve' | 'reject') {
    try {
      setBusyId(traderId);
      setError('');
      await apiFetch('/api/admin/google-reviews', {
        method: 'POST',
        body: JSON.stringify({ traderId, action }),
      }, () => tokenRef.current());
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId('');
    }
  }

  if (loading && !data) return <LoadingScreen label="Loading Google review checks…" />;

  return <Screen title="Google review checks" subtitle="Review Google listings that did not meet BuildPair's conservative automatic matching rules. Nothing pending here appears publicly until approved.">
    <AppCard style={styles.filters}>
      <View style={styles.chips}>
        {(['pending_review', 'verified', 'rejected', 'all'] as const).map((value) => <Chip key={value} selected={filter === value} onPress={() => setFilter(value)}>{value === 'pending_review' ? 'Needs review' : value === 'verified' ? 'Verified' : value === 'rejected' ? 'Rejected' : 'All'}</Chip>)}
      </View>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>

    {!data?.configured ? <HelperText type="info">Google Places is not configured yet. Existing verification records can still be reviewed, but live Google listing details are unavailable until the API key is enabled.</HelperText> : null}
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {!data?.rows.length ? <EmptyState title="Nothing waiting here" body={filter === 'pending_review' ? 'There are no Google listing connections awaiting manual review.' : 'No Google review connections match this filter.'} /> : data.rows.map((row) => <AppCard key={row.traderId} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>BUILDPAIR PROFILE</Text>
          <Text variant="titleLarge" style={styles.title}>{row.businessName}</Text>
          <Text style={styles.muted}>{[row.locationLabel, row.postcode].filter(Boolean).join(' · ') || 'No saved location'}{row.phone ? ` · ${row.phone}` : ''}</Text>
          <Text style={styles.muted}>{row.email ?? 'No account email'}</Text>
        </View>
        <View style={styles.chips}>
          <Chip>{row.matchScore} match score</Chip>
          <Chip icon={row.verificationStatus === 'verified' ? 'check-circle' : row.verificationStatus === 'rejected' ? 'close-circle' : 'clock-outline'}>{row.verificationStatus === 'pending_review' ? 'Needs review' : row.verificationStatus}</Chip>
        </View>
      </View>

      <View style={styles.compare}>
        <View style={styles.compareColumn}>
          <Text style={styles.eyebrow}>GOOGLE LISTING</Text>
          <Text variant="titleMedium" style={styles.title}>{row.google?.displayName ?? 'Google details unavailable'}</Text>
          <Text style={styles.muted}>{row.google?.formattedAddress ?? row.placeId}</Text>
          {row.google?.nationalPhoneNumber ? <Text style={styles.muted}>{row.google.nationalPhoneNumber}</Text> : null}
          {row.google?.websiteUri ? <Button compact mode="text" onPress={() => Linking.openURL(row.google!.websiteUri!)}>Open website</Button> : null}
          {row.google?.googleMapsUri ? <Button compact mode="text" onPress={() => Linking.openURL(row.google!.googleMapsUri!)}>Open Google Maps</Button> : null}
        </View>
        <View style={styles.compareColumn}>
          <Text style={styles.eyebrow}>AUTOMATIC CHECKS</Text>
          {row.matchReasons.map((reason) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}
        </View>
      </View>

      {row.verificationStatus === 'pending_review' ? <View style={styles.actions}>
        <Button mode="contained" icon="check" loading={busyId === row.traderId} disabled={Boolean(busyId)} onPress={() => void review(row.traderId, 'approve')}>Approve match</Button>
        <Button mode="outlined" icon="close" disabled={Boolean(busyId)} onPress={() => void review(row.traderId, 'reject')}>Reject</Button>
      </View> : null}
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { gap: 14 },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, minWidth: 240 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  compare: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  compareColumn: { flexGrow: 1, flexBasis: 300, minWidth: 250, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceSoft, gap: 4 },
  reason: { color: colors.charcoalSoft, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
});
