import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { MARKETPLACE_LIVE } from '@/lib/launch';
import type { GooglePlaceCandidate, GoogleReviewSnapshot } from '@/lib/google-reviews';

type Connection = {
  placeId: string;
  verificationStatus: 'verified' | 'pending_review' | 'rejected';
  matchScore: number;
  matchReasons: string[];
  connectedAt: string;
};

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  connection?: Connection | null;
  google: GoogleReviewSnapshot | null;
};

export default function GoogleReviewsPage() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusResponse>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GooglePlaceCandidate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setStatus(await apiFetch<StatusResponse>('/api/google-reviews/connection', {}, () => getTokenRef.current()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function search() {
    if (query.trim().length < 3) return;
    try {
      setBusy(true);
      setError('');
      const response = await apiFetch<{ places: GooglePlaceCandidate[] }>('/api/google-reviews/search', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim() }),
      }, () => getTokenRef.current());
      setResults(response.places);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function connect(place: GooglePlaceCandidate) {
    try {
      setBusy(true);
      setError('');
      const response = await apiFetch<StatusResponse>('/api/google-reviews/connection', {
        method: 'POST',
        body: JSON.stringify({ placeId: place.id }),
      }, () => getTokenRef.current());
      setStatus(response);
      setResults([]);
      setQuery('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    try {
      setBusy(true);
      setError('');
      await apiFetch('/api/google-reviews/connection', { method: 'DELETE' }, () => getTokenRef.current());
      setStatus((current) => current ? { ...current, connected: false, connection: null, google: null } : current);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen />;

  const verification = status?.connection?.verificationStatus;
  const verified = verification === 'verified';
  const pending = verification === 'pending_review';
  const rejected = verification === 'rejected';

  return <Screen
    title="Google reviews"
    subtitle="Link your existing Google business reputation to BuildPair. BuildPair checks the listing against your saved business details before anything is shown publicly."
  >
    {params.onboarding === '1' ? <AppCard style={styles.welcomeCard}>
      <Text style={styles.eyebrow}>{MARKETPLACE_LIVE ? 'PROFILE PUBLISHED' : 'PROFILE SAVED FOR LAUNCH'}</Text>
      <Text variant="titleLarge" style={styles.title}>Bring your existing reputation with you</Text>
      <Text style={styles.muted}>This step is optional. Connect the correct Google business listing now, or skip it and come back later. During pre-launch it remains part of your private profile preparation and is not shown publicly.</Text>
      <Button mode="outlined" onPress={() => router.replace('/trader/dashboard')}>Skip for now</Button>
    </AppCard> : null}

    <AppCard style={styles.infoCard}>
      <Text variant="titleMedium" style={styles.title}>Google stays separate from BuildPair reviews</Text>
      <Text style={styles.muted}>BuildPair job reviews remain reviews from work completed through BuildPair. Google Maps ratings and review excerpts are displayed separately and clearly attributed to Google Maps.</Text>
    </AppCard>

    {!status?.configured ? <AppCard style={styles.warningCard}>
      <Text variant="titleMedium" style={styles.title}>Google connection is not live yet</Text>
      <Text style={styles.muted}>The feature is installed safely, but BuildPair still needs its Google Places API key enabled before searches can run. Your profile, jobs, quotes and payments are unaffected.</Text>
    </AppCard> : null}

    {status?.connected && status.google ? <AppCard style={verified ? styles.verifiedCard : pending ? styles.pendingCard : styles.rejectedCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>CONNECTED GOOGLE LISTING</Text>
          <Text variant="titleLarge" style={styles.title}>{status.google.displayName}</Text>
          <View style={styles.chips}>
            <Chip compact>{status.google.rating?.toFixed(1) ?? '–'} ★</Chip>
            <Chip compact>{status.google.userRatingCount ?? 0} Google review{status.google.userRatingCount === 1 ? '' : 's'}</Chip>
            {verified ? <Chip compact icon="check-circle">Verified match</Chip> : pending ? <Chip compact icon="clock-outline">Admin review</Chip> : <Chip compact icon="alert-circle-outline">Not approved</Chip>}
          </View>
        </View>
        <Button mode="outlined" disabled={busy} onPress={() => void disconnect()}>Disconnect</Button>
      </View>
      {verified ? <Text style={styles.good}>This listing passed BuildPair matching checks and can appear publicly.</Text> : null}
      {pending ? <Text style={styles.warning}>The listing is connected but will not appear publicly until BuildPair reviews the match.</Text> : null}
      {rejected ? <Text style={styles.warning}>This listing was not approved. Disconnect it and choose the correct Google business listing.</Text> : null}
      {status.connection?.matchReasons?.length ? <View style={styles.reasonList}>{status.connection.matchReasons.map((reason) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}</View> : null}
      {status.google.googleMapsUri ? <Button mode="text" onPress={() => Linking.openURL(status.google!.googleMapsUri!)}>View business on Google Maps →</Button> : null}
    </AppCard> : null}

    {!verified ? <AppCard style={styles.searchCard}>
      <Text variant="titleLarge" style={styles.title}>Find your business on Google</Text>
      <Text style={styles.muted}>Search using the business name shown on your BuildPair profile plus your town or postcode. Choose the exact listing, not a similarly named company.</Text>
      <TextInput mode="outlined" label="Business name + town or postcode" value={query} onChangeText={setQuery} disabled={!status?.configured || busy} onSubmitEditing={() => void search()} />
      <Button mode="contained" loading={busy} disabled={!status?.configured || busy || query.trim().length < 3} onPress={() => void search()}>Search Google</Button>
    </AppCard> : null}

    {results.map((place) => <AppCard key={place.id} style={styles.resultCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{place.displayName}</Text>
          <Text style={styles.muted}>{place.formattedAddress}</Text>
          <Text style={styles.rating}>{place.rating?.toFixed(1) ?? '–'} ★ · {place.userRatingCount ?? 0} Google reviews</Text>
        </View>
        <Button mode="contained" disabled={busy} onPress={() => void connect(place)}>This is my business</Button>
      </View>
      {place.googleMapsUri ? <Button mode="text" onPress={() => Linking.openURL(place.googleMapsUri!)}>Check on Google Maps →</Button> : null}
      <Text style={styles.googleAttribution}>Google Maps</Text>
    </AppCard>)}

    {verified && status?.google?.reviews?.length ? <AppCard style={styles.previewCard}>
      <Text style={styles.eyebrow}>PUBLIC PROFILE PREVIEW</Text>
      <Text variant="titleLarge" style={styles.title}>Google reviews</Text>
      <Text style={styles.note}>Google supplies a limited selection of review excerpts. Reviews shown here are ordered by Google by relevance. BuildPair does not turn them into BuildPair job reviews.</Text>
      {status.google.reviews.slice(0, 3).map((review, index) => <View key={`${review.author.displayName}-${review.publishTime ?? index}`} style={styles.reviewRow}>
        {review.author.photoUri ? <Image source={{ uri: review.author.photoUri }} style={styles.avatar} accessibilityLabel={`${review.author.displayName} Google reviewer`} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>G</Text></View>}
        <View style={styles.flex}>
          <Button compact mode="text" onPress={review.author.uri ? () => Linking.openURL(review.author.uri!) : undefined}>{review.author.displayName}</Button>
          <Text style={styles.rating}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{review.relativePublishTimeDescription ? ` · ${review.relativePublishTimeDescription}` : ''}</Text>
          {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
          {review.googleMapsUri ? <Button compact mode="text" onPress={() => Linking.openURL(review.googleMapsUri!)}>View original review on Google Maps</Button> : null}
        </View>
      </View>)}
      <Text style={styles.googleAttribution}>Google Maps</Text>
    </AppCard> : null}

    {params.onboarding === '1' && verified ? <Button mode="contained" onPress={() => router.replace('/trader/dashboard')}>Continue to dashboard</Button> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  welcomeCard: { gap: 10, backgroundColor: colors.primarySoft },
  infoCard: { gap: 8 },
  warningCard: { gap: 8, backgroundColor: colors.goldSoft },
  verifiedCard: { gap: 12, backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' },
  pendingCard: { gap: 12, backgroundColor: colors.goldSoft, borderColor: '#ECDDBF' },
  rejectedCard: { gap: 12, backgroundColor: '#FFF0EE', borderColor: '#F0C3BD' },
  searchCard: { gap: 12 },
  resultCard: { gap: 9 },
  previewCard: { gap: 12 },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 220 },
  title: { color: colors.charcoal, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  muted: { color: colors.muted, lineHeight: 22 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  good: { color: '#17653A', fontWeight: '700', lineHeight: 20 },
  warning: { color: '#805400', fontWeight: '700', lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  rating: { color: '#A86C00', fontWeight: '800', marginTop: 5 },
  reasonList: { gap: 3 },
  reason: { color: colors.charcoalSoft, fontSize: 12, lineHeight: 18 },
  reviewRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5F6368', fontWeight: '900' },
  reviewText: { color: colors.charcoalSoft, lineHeight: 21, marginTop: 5 },
  googleAttribution: { color: '#5F6368', fontWeight: '500', textAlign: 'right' },
  error: { color: colors.danger, fontWeight: '700' },
});
