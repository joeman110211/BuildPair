import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';

export type MediaKind = 'job' | 'trader';
type TokenGetter = () => Promise<string | null>;

const MAX_BATCH_UPLOADS = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  assetFolder: string;
};

type CloudinaryResponse = {
  secure_url?: string;
  error?: { message?: string };
};

export type UploadBatchResult = {
  urls: string[];
  failed: number;
};

async function signedUpload(kind: MediaKind, getToken: TokenGetter) {
  return apiFetch<UploadSignature>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  }, getToken);
}

async function uploadAsset(asset: ImagePicker.ImagePickerAsset, signed: UploadSignature, index: number) {
  const form = new FormData();
  if (Platform.OS === 'web' && asset.file) {
    form.append('file', asset.file);
  } else {
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `buildpair-${Date.now()}-${index}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  form.append('api_key', signed.apiKey);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  form.append('asset_folder', signed.assetFolder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await response.json() as CloudinaryResponse;
  if (!response.ok || !body.secure_url) throw new Error(body.error?.message ?? 'Image upload failed');
  return body.secure_url;
}

export async function pickAndUploadImages(
  kind: MediaKind,
  getToken: TokenGetter,
  selectionLimit = MAX_BATCH_UPLOADS,
): Promise<UploadBatchResult> {
  const limit = Math.min(Math.max(Math.floor(selectionLimit), 1), MAX_BATCH_UPLOADS);
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

  const signed = await signedUpload(kind, getToken);
  const urls: string[] = [];
  let firstError: unknown = null;

  for (const [index, asset] of validAssets.entries()) {
    try {
      urls.push(await uploadAsset(asset, signed, index));
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
