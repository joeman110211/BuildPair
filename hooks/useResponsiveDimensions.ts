import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions as useNativeWindowDimensions } from 'react-native';

const serverDimensions = { width: 0, height: 0, scale: 1, fontScale: 1 };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Match the exported HTML on first render, then adapt to the actual screen. */
export function useWindowDimensions() {
  const dimensions = useNativeWindowDimensions();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return Platform.OS === 'web' && !hydrated ? serverDimensions : dimensions;
}
