import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Portal, Surface, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'buildpair_pwa_install_dismissed_at';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

function installedAlready() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function recentlyDismissed() {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return Number.isFinite(value) && value > 0 && Date.now() - value < DISMISS_MS;
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!/Android/i.test(navigator.userAgent) || installedAlready() || recentlyDismissed()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* best effort */ }
    setInstallEvent(null);
  };

  const install = async () => {
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'dismissed') {
        try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* best effort */ }
      }
    } finally {
      setInstallEvent(null);
    }
  };

  return <Portal>
    <Surface style={styles.panel} elevation={4} testID="pwa-install-prompt">
      <View style={styles.copy}>
        <Text variant="titleMedium" style={styles.title}>Install BuildPair</Text>
        <Text style={styles.body}>Add BuildPair to your Android home screen for a faster, app-style experience.</Text>
      </View>
      <View style={styles.actions}>
        <Button mode="contained" icon="download" onPress={() => void install()}>Install</Button>
        <IconButton icon="close" accessibilityLabel="Not now" onPress={dismiss} />
      </View>
    </Surface>
  </Portal>;
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxWidth: 620,
    alignSelf: 'center',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
