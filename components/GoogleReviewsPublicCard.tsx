import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import type { GoogleReviewSnapshot } from '@/lib/google-reviews';

type PublicGoogleResponse = {
  connected: boolean;
  configured: boolean;
  google: GoogleReviewSnapshot | null;
};

export function GoogleReviewsPublicCard({ profileId, visible }: { profileId: string; visible: boolean }) {
  const [data, setData] = useState<PublicGoogleResponse | null>(null);

  const load = useCallback(async () => {
    if (!visible || !profileId) return;
    try {
      setData(await apiFetch<PublicGoogleResponse>(`/api/traders/${profileId}/google-reviews`));
    } catch {
      setData(null);
    }
  }, [profileId, visible]);

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (!visible || !data?.connected || !data.configured || !data.google) return null;
  const google = data.google;

  return <AppCard style={styles.card}>
    <View style={styles.header}>
      <View style={styles.flex}>
        <Text style={styles.eyebrow}>EXTERNAL REPUTATION</Text>
        <Text variant="titleLarge" style={styles.title}>Google reviews</Text>
        <Text style={styles.explainer}>Separate from verified BuildPair job reviews. Google supplies this rating and the review excerpts shown below.</Text>
      </View>
      <View style={styles.chips}>
        <Chip compact>{google.rating?.toFixed(1) ?? '–'} ★</Chip>
        <Chip compact>{google.userRatingCount ?? 0} Google review{google.userRatingCount === 1 ? '' : 's'}</Chip>
      </View>
    </View>

    {google.reviews.slice(0, 3).map((review, index) => <View key={`${review.author.displayName}-${review.publishTime ?? index}`} style={styles.reviewRow}>
      {review.author.photoUri ? <Image source={{ uri: review.author.photoUri }} style={styles.avatar} accessibilityLabel={`${review.author.displayName} Google reviewer`} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>G</Text></View>}
      <View style={styles.flex}>
        {review.author.uri ? <Button compact mode="text" onPress={() => Linking.openURL(review.author.uri!)}>{review.author.displayName}</Button> : <Text style={styles.author}>{review.author.displayName}</Text>}
        <Text style={styles.rating}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{review.relativePublishTimeDescription ? ` · ${review.relativePublishTimeDescription}` : ''}</Text>
        {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
        {review.googleMapsUri ? <Button compact mode="text" onPress={() => Linking.openURL(review.googleMapsUri!)}>View original review on Google Maps</Button> : null}
      </View>
    </View>)}

    <Text style={styles.ordering}>Reviews displayed here are selected and ordered by Google by relevance.</Text>
    <View style={styles.footer}>
      <Text style={styles.attribution}>Google Maps</Text>
      {google.googleMapsUri ? <Button compact mode="text" onPress={() => Linking.openURL(google.googleMapsUri!)}>View all on Google Maps →</Button> : null}
    </View>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { gap: 13, borderColor: '#DADCE0', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  flex: { flex: 1, minWidth: 220 },
  eyebrow: { color: '#5F6368', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  explainer: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#5F6368', fontWeight: '900' },
  author: { color: colors.charcoal, fontWeight: '800' },
  rating: { color: '#A86C00', fontWeight: '800', marginTop: 3 },
  reviewText: { color: colors.charcoalSoft, lineHeight: 21, marginTop: 5 },
  ordering: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  attribution: { color: '#5F6368', fontWeight: '500' },
});
