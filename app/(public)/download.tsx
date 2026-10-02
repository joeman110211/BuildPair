import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PublicSeo } from '@/components/PublicSeo';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics } from '@/constants/theme';

export default function DownloadPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <PublicSeo title="Use BuildPair on your phone or computer" description="Use BuildPair in your browser on mobile, tablet or desktop. Check availability of the Android and iOS apps." />
    <PrelaunchBanner />
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.heroInner}>
        <Button icon="arrow-left" mode="text" textColor="#FFFFFF" compact style={styles.back} onPress={goBack}>Back</Button>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>Download BuildPair</Text>
        <Text variant="displaySmall" style={[styles.title, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>BuildPair, wherever you work.</Text>
        <Text variant="bodyLarge" style={styles.intro}>Use BuildPair in your browser on your phone, tablet or computer. Store availability is shown below.</Text>
      </View>
    </View>
    <View style={styles.content}>
      <View style={styles.card}>
        <View style={styles.icon}><Icon source="google-play" size={34} color={colors.primary} /></View>
        <Text variant="headlineSmall" style={styles.cardTitle}>Android</Text>
        <Text style={styles.body}>The Android app will be distributed through Google Play once the release build and store listing are approved.</Text>
        <Button mode="contained" disabled>Google Play · Coming soon</Button>
      </View>
      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><Icon source="apple" size={34} color={colors.accent} /></View>
        <Text variant="headlineSmall" style={styles.cardTitle}>iPhone & iPad</Text>
        <Text style={styles.body}>The iOS app will be linked here when the App Store release is available.</Text>
        <Button mode="contained" buttonColor={colors.accent} disabled>App Store · Coming soon</Button>
      </View>
      <View style={styles.webCard}>
        <Text variant="headlineSmall" style={styles.cardTitle}>Use BuildPair on the web</Text>
        <Text style={styles.body}>Open BuildPair in your browser. You can add it to your home screen on supported devices for quicker access.</Text>
        <Button mode="outlined" onPress={() => router.replace('/')}>Open BuildPair</Button>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingVertical: 56 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 40 },
  heroInner: { width: '100%', maxWidth: 1000, alignSelf: 'center', gap: 12 },
  back: { alignSelf: 'flex-start', marginLeft: -8 },
  eyebrow: { color: colors.secondary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontWeight: '900' },
  intro: { color: '#DDE1E3', lineHeight: 27 },
  content: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 12 },
  webCard: { width: '100%', maxWidth: '100%', backgroundColor: colors.primarySoft, borderRadius: 28, padding: 24, gap: 12 },
  icon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
});
