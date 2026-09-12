import { Alert, Linking, Platform, Share, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

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

  return <View style={styles.wrapper}>
    <Text variant="labelLarge" style={styles.label}>Share this BuildPair profile</Text>
    <View style={styles.actions}>
      <IconButton
        icon="whatsapp"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Share on WhatsApp"
        onPress={() => void open(`https://wa.me/?text=${encodeURIComponent(text)}`)}
      />
      <IconButton
        icon="facebook"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Share on Facebook"
        onPress={() => void open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}
      />
      <IconButton
        icon="facebook-messenger"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Share with Messenger"
        onPress={() => void shareMessenger()}
      />
      <IconButton
        icon="email-outline"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Share by email"
        onPress={() => void open(`mailto:?subject=${encodeURIComponent(`${businessName} on BuildPair`)}&body=${encodeURIComponent(text)}`)}
      />
      <IconButton
        icon="message-text-outline"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Share by SMS"
        onPress={() => void open(`sms:?body=${encodeURIComponent(text)}`)}
      />
      <IconButton
        icon="link-variant"
        mode="outlined"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="Copy or share profile link"
        onPress={() => void copyLink()}
      />
      <IconButton
        icon="share-variant"
        mode="contained"
        size={24}
        style={styles.iconButton}
        accessibilityLabel="More sharing options"
        onPress={() => void shareMore()}
      />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { color: colors.charcoal, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  iconButton: { margin: 0 },
});
