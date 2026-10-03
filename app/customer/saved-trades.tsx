import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type SavedTrader = {
  traderId: string;
  profileId: string;
  businessName: string;
  tradeCategory: string;
  locationLabel?: string | null;
  radiusMiles: number;
  profileImageUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  verifiedCredentialCount: number;
  savedAt: string;
};

export default function SavedTradesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [items, setItems] = useState<SavedTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setItems(await apiFetch<SavedTrader[]>('/api/saved-traders', {}, () => getTokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function remove(item: SavedTrader) {
    try {
      await apiFetch('/api/saved-traders', { method: 'POST', body: JSON.stringify({ traderId: item.traderId, saved: false }) }, () => getTokenRef.current());
      setItems((current) => current.filter((value) => value.traderId !== item.traderId));
    } catch (e) { setError(errorMessage(e)); }
  }

  if (loading) return <LoadingScreen label="Loading your shortlist…" />;
  return <Screen title="Saved Trades" subtitle="Keep promising tradespeople together and compare trust, reviews, location and service range before choosing who to contact.">
    {error ? <EmptyState title="Shortlist unavailable" body={error} action={<Button onPress={() => void load()}>Try again</Button>} /> : null}
    {!error && !items.length ? <EmptyState title="Your shortlist is empty" body="Save tradespeople from their public profile and they will appear here for easy comparison." action={<Button mode="contained" onPress={() => router.push('/(public)/directory')}>Find trades</Button>} /> : null}
    {items.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compareRow}>
      {items.map((item) => <AppCard key={item.traderId} style={styles.compareCard}>
        {item.profileImageUrl ? <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{item.businessName.slice(0, 1).toUpperCase()}</Text></View>}
        <Text variant="titleLarge" style={styles.title}>{item.businessName}</Text>
        <Text style={styles.muted}>{item.tradeCategory}{item.locationLabel ? ` · ${item.locationLabel}` : ''}</Text>
        <View style={styles.chips}><Chip compact icon="star">{item.averageRating.toFixed(1)} · {item.reviewCount}</Chip><Chip compact icon="shield-check-outline">{item.verifiedCredentialCount} verified</Chip><Chip compact icon="map-marker-radius">{item.radiusMiles} mi</Chip></View>
        <View style={styles.actions}><Button mode="contained" onPress={() => router.push(`/(public)/traders/${item.profileId}` as Href)}>View profile</Button><Button mode="outlined" onPress={() => router.push({ pathname: '/customer/new-job', params: { traderId: item.traderId, traderName: item.businessName, tradeCategory: item.tradeCategory } })}>Request quote</Button></View>
        <Button compact textColor={colors.danger} onPress={() => void remove(item)}>Remove</Button>
      </AppCard>)}
    </ScrollView> : null}
    {items.length > 1 ? <Text style={styles.hint}>← Swipe sideways to compare your shortlist →</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  compareRow: { gap: 12, paddingBottom: 10 },
  compareCard: { width: 310, minHeight: 360 },
  avatar: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.border },
  avatarFallback: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { gap: 8, marginTop: 'auto' },
  hint: { textAlign: 'center', color: colors.muted },
});
