import { useAuth } from '@clerk/expo';
import { UserProfile } from '@clerk/expo/web';
import { Redirect, Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/auth/account" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <Button icon="arrow-left" onPress={() => router.back()}>Back to BuildPair</Button>
          <Text variant="titleLarge" style={styles.title}>Account & security</Text>
        </View>
        <View style={styles.profile}>
          <UserProfile appearance={{ elements: { footer: { display: 'none' } } }} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: colors.background },
  content: { minHeight: '100%', padding: 20, paddingBottom: 56, gap: 16, alignItems: 'center' },
  profile: { width: '100%', maxWidth: 980, alignItems: 'center' },
  topbar: { width: '100%', maxWidth: 980, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.charcoal, fontWeight: '900' },
});
