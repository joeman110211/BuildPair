import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type PlaceCandidate = {
  id: string;
  displayName: string;
  formattedAddress: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
};

type ReviewSnapshot = {
  id: string;
  displayName: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  reviews: {
    rating: number;
    text: string;
    relativePublishTimeDescription: string | null;
    googleMapsUri: string | null;
    author: { displayName: string; uri: string | null; photoUri: string | null };
  }[];
};

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  connection?: { placeId: string; connectedAt: string } | null;
  google: ReviewSnapshot | null;
};

export default function GoogleReviewsPage() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusResponse>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setStatus(await apiFetch<StatusResponse>('/api/google-reviews/connection', {}, () => getTokenRef.current()));
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function search() {
    if (query.trim().length < 3) return;
    try {
      setBusy(true);
      setError('');
      const response = await apiFetch<{ places: PlaceCandidate[] }>('/api/google-reviews/search', {
        method: 'POST', body: JSON.stringify({ query: query.trim() }),
      }, () => getTokenRef.current());
      setResults(response.places);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function connect(place: PlaceCandidate) {
    try {
      setBusy(true);
      setError('');
      const response = await apiFetch<StatusResponse>('/api/google-reviews/connection', {
        method: 'POST', body: JSON.stringify({ placeId: place.id }),
      }, () => getTokenRef.current());
      setStatus(response);
      setResults([]);
      setQuery('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    try {
      setBusy(true);
      setError('');
      await apiFetch('/api/google-reviews/connection', { method: 'DELETE' }, () => getTokenRef.current());
      setStatus((current) => current ? { ...current, connected: false, connection: null, google: null } : current);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingScreen />;

  return <Screen title="Google reviews" subtitle="Connect the correct Google business listing so homeowners can see your existing Google reputation alongside your BuildPair profile.">
    <AppCard style={styles.infoCard}>
      <Text variant="titleMedium" style={styles.title}>Separate reputation, clearly labelled</Text>
      <Text style={styles.muted}>Google ratings and reviews stay labelled as Google Maps content. They are not converted into BuildPair job reviews, and connecting Google never changes your membership, jobs, quotes or payments.</Text>
    </AppCard>

    {status?.connected && status.google ? <AppCard style={styles.connectedCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>CONNECTED GOOGLE LISTING</Text>
          <Text variant="titleLarge" style={styles.title}>{status.google.displayName}</Text>
          <View style={styles.chips}>
            <Chip compact>{status.google.rating?.toFixed(1) ?? '–'} ★</Chip>
            <Chip compact>{status.google.userRatingCount ?? 0} Google review{status.google.userRatingCount === 1 ? '' : 's'}</Chip>
          </View>
        </View>
        <Button mode="outlined" disabled={busy} onPress={() => void disconnect()}>Disconnect</Button>
      </View>
      {status.google.googleMapsUri ? <Button mode="text" onPress={() => Linking.openURL(status.google!.googleMapsUri!)}>View on Google Maps →</Button> : null}
      <Text style={styles.note}>Google Maps content is shown with its original source and author attribution. Reviews displayed by Google are ordered by relevance.</Text>
    </AppCard> : null}

    {!status?.connected ? <AppCard style={styles.searchCard}>
      <Text variant="titleLarge" style={styles.title}>Find your business on Google</Text>
      <Text style={styles.muted}>Search using your business name plus town or postcode, then choose the exact listing. This step is optional and can be done at any time after your BuildPair profile is created.</Text>
      {!status?.configured ? <Text style={styles.warning}>Google review search is built but the BuildPair Google Maps API key still needs to be enabled before live searches can run.</Text> : null}
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
        <Button mode="contained" disabled={busy} onPress={() => void connect(place)}>Connect this listing</Button>
      </View>
      {place.googleMapsUri ? <Button mode="text" onPress={() => Linking.openURL(place.googleMapsUri!)}>Check on Google Maps →</Button> : null}
    </AppCard>)}

    {status?.connected && status.google?.reviews?.length ? <AppCard style={styles.previewCard}>
      <Text style={styles.eyebrow}>PUBLIC PROFILE PREVIEW</Text>
      <Text variant="titleLarge" style={styles.title}>Google Maps reviews</Text>
      <Text style={styles.note}>Google returns a limited set of review excerpts through Places API. The full rating and total review count still come from the selected Google listing.</Text>
      {status.google.reviews.slice(0, 3).map((review, index) => <View key={`${review.author.displayName}-${index}`} style={styles.reviewRow}>
        {review.author.photoUri ? <Image source={{ uri: review.author.photoUri }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>G</Text></View>}
        <View style={styles.flex}>
          <Text style={styles.reviewAuthor}>{review.author.displayName}</Text>
          <Text style={styles.rating}>{'★'.repeat(review.rating)}{review.relativePublishTimeDescription ? ` · ${review.relativePublishTimeDescription}` : ''}</Text>
          {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
          {review.googleMapsUri ? <Button compact mode="text" onPress={() => Linking.openURL(review.googleMapsUri!)}>View original on Google Maps</Button> : null}
        </View>
      </View>)}
      <Text style={styles.googleAttribution}>Google Maps</Text>
    </AppCard> : null}

    {error ? <Text style={styles.error}>{error}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  infoCard: { gap: 8 },
  connectedCard: { gap: 12 },
  searchCard: { gap: 12 },
  resultCard: { gap: 9 },
  previewCard: { gap: 12 },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 220 },
  title: { color: colors.charcoal, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  muted: { color: colors.muted, lineHeight: 22 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  warning: { color: '#8A5A00', backgroundColor: '#FFF6DC', borderRadius: 12, padding: 11, fontWeight: '700', lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  rating: { color: '#A86C00', fontWeight: '800', marginTop: 5 },
  reviewRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5F6368', fontWeight: '900' },
  reviewAuthor: { color: colors.charcoal, fontWeight: '900' },
  reviewText: { color: colors.charcoalSoft, lineHeight: 21, marginTop: 5 },
  googleAttribution: { color: '#5F6368', fontWeight: '700', textAlign: 'right' },
  error: { color: colors.danger, fontWeight: '700' },
});
