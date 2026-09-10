import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { BuildPairLogo } from '@/components/BuildPairLogo';
import { colors, spacing } from '@/constants/theme';

export function PublicHeader() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable style={styles.brandButton} accessibilityLabel="BuildPair home">
            <BuildPairLogo compact />
          </Pressable>
        </Link>
        <Link href="/auth/account" asChild>
          <Button compact mode="text" textColor={colors.primaryDark} contentStyle={styles.accountButtonContent}>
            Account
          </Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flexShrink: 0,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
  },
  brandButton: {
    minHeight: 52,
    justifyContent: 'center',
  },
  accountButtonContent: {
    minHeight: 42,
    paddingHorizontal: 6,
  },
});
