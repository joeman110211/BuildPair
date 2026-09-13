import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webPrefix = 'buildpair:draft:';
const nativePrefix = 'buildpair.draft.';

function nativeKey(key: string) {
  return `${nativePrefix}${key}`.replace(/[^A-Za-z0-9._-]/g, '_');
}

export async function saveDraft<T>(key: string, value: T) {
  const serialized = JSON.stringify(value);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(`${webPrefix}${key}`, serialized);
    return;
  }
  await SecureStore.setItemAsync(nativeKey(key), serialized);
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  try {
    const serialized = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.localStorage.getItem(`${webPrefix}${key}`) : null)
      : await SecureStore.getItemAsync(nativeKey(key));
    return serialized ? JSON.parse(serialized) as T : null;
  } catch {
    return null;
  }
}

export async function clearDraft(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(`${webPrefix}${key}`);
    return;
  }
  await SecureStore.deleteItemAsync(nativeKey(key));
}
