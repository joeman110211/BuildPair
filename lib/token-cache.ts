import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function hasBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const tokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === 'web' || hasBrowserStorage()) return hasBrowserStorage() ? window.localStorage.getItem(key) : null;
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === 'web' || hasBrowserStorage()) {
      if (hasBrowserStorage()) window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};
