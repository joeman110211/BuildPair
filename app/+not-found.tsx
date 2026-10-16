import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicHeader } from '@/components/PublicHeader';
import { Screen } from '@/components/Screen';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';

export default function NotFound() {
  return <View style={styles.page}>
    <PublicHeader />
    <Screen title="Page not found" subtitle="That page may have moved or the address may be incorrect.">
      <View style={styles.panel}>
        <Text style={styles.body}>You can still explore local tradespeople or return to the BuildPair homepage.</Text>
        <View style={styles.actions}>
          <Link href="/" asChild>
            <Button mode="contained" contentStyle={styles.buttonContent}>Back to homepage</Button>
          </Link>
          <Link href="/(public)/directory" asChild>
            <Button mode="outlined" contentStyle={styles.buttonContent}>Find a trade</Button>
          </Link>
        </View>
      </View>
    </Screen>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  panel: {
    alignSelf: 'center', width: '100%', maxWidth: 620, padding: spacing.xxl,
    backgroundColor: colors.surfaceRaised, borderWidth: 1,
    borderColor: colors.border, borderRadius: radii.xl, gap: spacing.lg,
  },
  body: { color: colors.charcoalSoft, lineHeight: 23, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  buttonContent: { minHeight: controlHeights.standard },
});
