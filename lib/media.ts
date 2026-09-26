import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';

export type MediaKind = 'job' | 'trader';
type TokenGetter = () => Promise<string | null>;

const MAX_BATCH_UPLOADS = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type UploadBatchResult = {
  urls: string[];
  failed: number;
};

function isBrowser() {
  return Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');
}

async function appendBrowserAsset(form: FormData, asset: ImagePicker.ImagePickerAsset, index: number) {
  if (asset.file) {
    form.append('file', asset.file);
    return;
  }

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('BuildPair could not read the selected image. Please choose it again.');
  const blob = await response.blob();
  const fileName = asset.fileName ?? `buildpair-${Date.now()}-${index}.jpg`;
  form.append('file', blob, fileName);
}

async function uploadAsset(asset: ImagePicker.ImagePickerAsset, kind: MediaKind, getToken: TokenGetter, index: number) {
  const form = new FormData();
  if (isBrowser()) {
    await appendBrowserAsset(form, asset, index);
  } else {
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `buildpair-${Date.now()}-${index}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  form.append('kind', kind);

  const uploaded = await apiFetch<{ url: string }>('/api/uploads/image', {
    method: 'POST',
    body: form,
  }, getToken, 45_000);
  return uploaded.url;
}

async function ensurePhotoPermission() {
  if (isBrowser()) return;
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted || current.accessPrivileges === 'limited') return;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted && requested.accessPrivileges !== 'limited') {
    throw new Error('Photo access is required to upload images. Allow photo access for BuildPair in your phone settings, then try again.');
  }
}

export async function pickAndUploadImages(
  kind: MediaKind,
  getToken: TokenGetter,
  selectionLimit = MAX_BATCH_UPLOADS,
): Promise<UploadBatchResult> {
  const limit = Math.min(Math.max(Math.floor(selectionLimit), 1), MAX_BATCH_UPLOADS);
  await ensurePhotoPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.85,
  });
  if (result.canceled || !result.assets.length) return { urls: [], failed: 0 };

  const selected = result.assets.slice(0, limit);
  const validAssets = selected.filter((asset) => !asset.fileSize || asset.fileSize <= MAX_IMAGE_BYTES);
  let failed = selected.length - validAssets.length;
  if (!validAssets.length) throw new Error('Choose images smaller than 10 MB each');

  const urls: string[] = [];
  let firstError: unknown = null;

  for (const [index, asset] of validAssets.entries()) {
    try {
      urls.push(await uploadAsset(asset, kind, getToken, index));
    } catch (error) {
      failed += 1;
      firstError ??= error;
    }
  }

  if (!urls.length && firstError) throw firstError;
  return { urls, failed };
}

export async function pickAndUploadImage(kind: MediaKind, getToken: TokenGetter) {
  const { urls } = await pickAndUploadImages(kind, getToken, 1);
  return urls[0] ?? null;
}
