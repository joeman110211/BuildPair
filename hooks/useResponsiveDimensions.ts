import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions as useNativeWindowDimensions } from 'react-native';

const serverDimensions = { width: 0, height: 0, scale: 1, fontScale: 1 };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Render browser-only content after hydration without setting state in an effect. */
export function useClientReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

/** Match the exported HTML on first render, then adapt to the actual screen. */
export function useWindowDimensions() {
  const dimensions = useNativeWindowDimensions();
  const hydrated = useClientReady();
  return Platform.OS === 'web' && !hydrated ? serverDimensions : dimensions;
}
