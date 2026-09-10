import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const CHECK_COOLDOWN_MS = 2 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 1200;

export function OtaUpdateManager() {
  const checking = useRef(false);
  const lastCheckAt = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function checkForUpdate(force = false) {
      const now = Date.now();
      if (__DEV__ || !Updates.isEnabled || checking.current) return;
      if (!force && now - lastCheckAt.current < CHECK_COOLDOWN_MS) return;

      checking.current = true;
      lastCheckAt.current = now;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (!mounted || !update.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (mounted) await Updates.reloadAsync();
      } catch (error) {
        console.warn('BuildPair OTA update check failed', error);
      } finally {
        checking.current = false;
      }
    }

    const initialCheck = setTimeout(() => void checkForUpdate(true), INITIAL_CHECK_DELAY_MS);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate(false);
    });

    return () => {
      mounted = false;
      clearTimeout(initialCheck);
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
