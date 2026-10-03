import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { pickAndUploadImages, type MediaKind } from '@/lib/media';

export function PhotoUploader({
  kind,
  photos,
  onChange,
  max,
  title = 'Photos',
  emptyText = 'Add clear photos from your phone or computer.',
  buttonLabel,
}: {
  kind: MediaKind;
  photos: string[];
  onChange: (photos: string[]) => void;
  max: number;
  title?: string;
  emptyText?: string;
  buttonLabel?: string;
}) {
  const { getToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const displayButtonLabel = buttonLabel ?? (max > 1 ? 'Add photos' : 'Add photo');

  async function addPhoto() {
    if (busy || photos.length >= max) return;
    try {
      setBusy(true);
      setError('');
      const remaining = max - photos.length;
      const { urls, failed, failureMessage } = await pickAndUploadImages(kind, getToken, Math.min(10, remaining));
      if (urls.length) onChange([...photos, ...urls].slice(0, max));
      if (failed) setError(failureMessage || `${failed} selected photo${failed === 1 ? '' : 's'} could not be uploaded.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return <View style={styles.wrap}>
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text variant="titleMedium" style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{photos.length}/{max}</Text>
      </View>
      <Button mode="outlined" icon="image-plus" contentStyle={styles.addButton} loading={busy} disabled={busy || photos.length >= max} onPress={addPhoto}>{displayButtonLabel}</Button>
    </View>
    {max > 1 ? <Text variant="bodySmall" style={styles.muted}>Select up to 10 at once and keep adding batches until you reach {max}.</Text> : null}
    <Text variant="bodySmall" style={styles.safety}>BuildPair checks uploads for unsafe content and visible phone numbers, email addresses, exact addresses and sensitive documents before they are stored.</Text>
    {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
      {photos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.photoWrap}>
        <Image source={{ uri }} style={styles.photo} />
        <Button mode="text" compact onPress={() => onChange(photos.filter((_, i) => i !== index))}>Remove</Button>
      </View>)}
    </ScrollView> : <View style={styles.empty}><Text style={styles.muted}>{emptyText}</Text></View>}
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.charcoal, fontWeight: '800' },
  addButton: { minHeight: controlHeights.standard },
  gallery: { gap: spacing.md, paddingBottom: spacing.xxs },
  photoWrap: { width: 150, gap: spacing.xxs, alignItems: 'center' },
  photo: { width: 150, height: 110, borderRadius: radii.md, backgroundColor: colors.surfaceStrong },
  empty: { minHeight: 72, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surfaceSoft, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.muted, lineHeight: 20 },
  safety: { color: colors.muted, lineHeight: 19 },
});
