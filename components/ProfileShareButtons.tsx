import { Alert, Image, Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

const MDI_BASE = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg';

const SHARE_ICONS = {
  whatsapp: `${MDI_BASE}/whatsapp.svg`,
  facebook: `${MDI_BASE}/facebook.svg`,
  messenger: `${MDI_BASE}/facebook-messenger.svg`,
  email: `${MDI_BASE}/email-outline.svg`,
  sms: `${MDI_BASE}/message-text-outline.svg`,
  link: `${MDI_BASE}/link-variant.svg`,
  share: `${MDI_BASE}/share-variant.svg`,
} as const;

function WebShareIconButton({
  source,
  label,
  onPress,
  filled = false,
}: {
  source: string;
  label: string;
  onPress: () => void;
  filled?: boolean;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.webIconButton, filled && styles.webIconButtonFilled, pressed && styles.webIconButtonPressed]}
  >
    <Image source={{ uri: source }} style={[styles.webIcon, filled && styles.webIconFilled]} resizeMode="contain" />
  </Pressable>;
}

export function ProfileShareButtons({ profileId, businessName }: { profileId: string; businessName: string }) {
  const url = `https://www.buildpair.co.uk/traders/${encodeURIComponent(profileId)}`;
  const text = `Find ${businessName} on BuildPair: ${url}`;

  async function open(target: string) {
    try {
      await Linking.openURL(target);
    } catch {
      Alert.alert('Could not open sharing app', 'Use the share button instead.');
    }
  }

  async function shareMore() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${businessName} on BuildPair`, text, url });
        return;
      }
      await Share.share({ title: `${businessName} on BuildPair`, message: text, url });
    } catch {
      // User cancelled the system share sheet.
    }
  }

  async function shareMessenger() {
    if (Platform.OS !== 'web') {
      const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(url)}`;
      try {
        if (await Linking.canOpenURL(messengerUrl)) {
          await Linking.openURL(messengerUrl);
          return;
        }
      } catch {
        // Fall through to the system share sheet.
      }
    }
    await shareMore();
  }

  async function copyLink() {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        Alert.alert('Link copied', 'The BuildPair profile link is ready to paste.');
        return;
      }
      await Share.share({ title: `${businessName} on BuildPair`, message: text, url });
    } catch {
      Alert.alert('Could not share link', url);
    }
  }

  const actions = [
    { key: 'whatsapp', source: SHARE_ICONS.whatsapp, label: 'Share on WhatsApp', onPress: () => void open(`https://wa.me/?text=${encodeURIComponent(text)}`) },
    { key: 'facebook', source: SHARE_ICONS.facebook, label: 'Share on Facebook', onPress: () => void open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`) },
    { key: 'messenger', source: SHARE_ICONS.messenger, label: 'Share with Messenger', onPress: () => void shareMessenger() },
    { key: 'email', source: SHARE_ICONS.email, label: 'Share by email', onPress: () => void open(`mailto:?subject=${encodeURIComponent(`${businessName} on BuildPair`)}&body=${encodeURIComponent(text)}`) },
    { key: 'sms', source: SHARE_ICONS.sms, label: 'Share by SMS', onPress: () => void open(`sms:?body=${encodeURIComponent(text)}`) },
    { key: 'link', source: SHARE_ICONS.link, label: 'Copy profile link', onPress: () => void copyLink() },
    { key: 'share', source: SHARE_ICONS.share, label: 'More sharing options', onPress: () => void shareMore(), filled: true },
  ] as const;

  return <View style={styles.wrapper}>
    <Text variant="labelLarge" style={styles.label}>Share this BuildPair profile</Text>
    <View style={styles.actions}>
      {Platform.OS === 'web'
        ? actions.map((action) => <WebShareIconButton key={action.key} source={action.source} label={action.label} onPress={action.onPress} filled={action.filled} />)
        : <>
          <IconButton icon="whatsapp" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Share on WhatsApp" onPress={() => void open(`https://wa.me/?text=${encodeURIComponent(text)}`)} />
          <IconButton icon="facebook" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Share on Facebook" onPress={() => void open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)} />
          <IconButton icon="facebook-messenger" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Share with Messenger" onPress={() => void shareMessenger()} />
          <IconButton icon="email-outline" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Share by email" onPress={() => void open(`mailto:?subject=${encodeURIComponent(`${businessName} on BuildPair`)}&body=${encodeURIComponent(text)}`)} />
          <IconButton icon="message-text-outline" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Share by SMS" onPress={() => void open(`sms:?body=${encodeURIComponent(text)}`)} />
          <IconButton icon="link-variant" mode="outlined" size={24} style={styles.iconButton} accessibilityLabel="Copy profile link" onPress={() => void copyLink()} />
          <IconButton icon="share-variant" mode="contained" size={24} style={styles.iconButton} accessibilityLabel="More sharing options" onPress={() => void shareMore()} />
        </>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { color: colors.charcoal, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  iconButton: { margin: 0 },
  webIconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webIconButtonFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  webIconButtonPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  webIcon: { width: 23, height: 23, opacity: 0.88 },
  webIconFilled: { tintColor: '#FFFFFF', opacity: 1 },
});
