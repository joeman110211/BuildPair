import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';
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
      const { urls, failed } = await pickAndUploadImages(kind, getToken, Math.min(10, remaining));
      if (urls.length) onChange([...photos, ...urls].slice(0, max));
      if (failed) setError(`${failed} selected photo${failed === 1 ? '' : 's'} could not be uploaded.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return <View style={styles.wrap}>
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text variant="titleMedium">{title}</Text>
        <Text style={styles.muted}>{photos.length}/{max}</Text>
      </View>
      <Button mode="outlined" icon="image-plus" loading={busy} disabled={busy || photos.length >= max} onPress={addPhoto}>{displayButtonLabel}</Button>
    </View>
    {max > 1 ? <Text variant="bodySmall" style={styles.muted}>Select up to 10 photos at once. You can keep adding batches until you reach {max}.</Text> : null}
    {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
      {photos.map((uri, index) => <View key={`${uri}-${index}`} style={styles.photoWrap}>
        <Image source={{ uri }} style={styles.photo} />
        <Button compact onPress={() => onChange(photos.filter((_, i) => i !== index))}>Remove</Button>
      </View>)}
    </ScrollView> : <Text style={styles.muted}>{emptyText}</Text>}
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gallery: { gap: 10, paddingBottom: 4 },
  photoWrap: { width: 150, gap: 2 },
  photo: { width: 150, height: 110, borderRadius: 10, backgroundColor: colors.border },
  muted: { color: colors.muted },
});
