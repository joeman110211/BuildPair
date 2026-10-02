import { Link } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PrelaunchBanner } from '@/components/PrelaunchBanner';
import { PublicSeo } from '@/components/PublicSeo';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics } from '@/constants/theme';
import { REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

export default function PricingPage() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const primaryHref = REGISTRATION_OPEN ? '/auth/account' : waitlistHref('trader', 'pricing-hero');
  const primaryLabel = REGISTRATION_OPEN ? 'Create trade account' : 'Create profile';

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <PublicSeo title="Trade membership pricing" description="Compare Starter, Core, Plus and Pro memberships, marketplace allowances and business tools. No pay-per-lead charges." />
    <PrelaunchBanner />
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.heroInner}>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>Tradesperson pricing</Text>
        <Text variant="displaySmall" style={[styles.title, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>Simple plans. Clear value. No pay-per-lead charges.</Text>
        <Text variant="bodyLarge" style={styles.intro}>Starter gets you established. Core helps you win work. Plus helps you run more jobs. Pro helps you run the business.</Text>
        <View style={styles.heroActions}>
          <Link href={primaryHref} asChild><Button mode="contained" buttonColor="#FFFFFF" textColor={colors.primary}>{primaryLabel}</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.outline}>See trade features</Button></Link>
        </View>
      </View>
    </View>

    <View style={[styles.content, metrics.phone && styles.contentMobile]}>
      <PricingCards />

      <View style={styles.explainerGrid}>
        <View style={[styles.explainer, { backgroundColor: colors.primarySoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>What counts as an offer?</Text>
          <Text style={styles.explainerText}>An open-marketplace opportunity is counted when a tradesperson first engages with a job by opening the job conversation or sending an offer. Simply viewing a job does not use an allowance, and the same trader/job combination cannot consume it twice.</Text>
        </View>
        <View style={[styles.explainer, { backgroundColor: colors.accentSoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>Direct requests scale with the plan</Text>
          <Text style={styles.explainerText}>Core includes five marketplace opportunities in total, so direct homeowner requests use that same allowance. On Plus and Pro, direct homeowner requests do not consume the open-marketplace offer allowance.</Text>
        </View>
        <View style={[styles.explainer, { backgroundColor: colors.navySoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>Categories stay meaningful</Text>
          <Text style={styles.explainerText}>Plan limits apply to broad main trade categories. Each selected main category must have at least one genuine service/subcategory chosen, and the tradesperson can select up to every relevant service inside that category without using another plan slot. Main-category changes use a 14-day cooldown to discourage constant switching purely to chase individual jobs.</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.noticeTitle}>More than leads</Text>
        <Text style={styles.noticeText}>BuildPair plans add practical tools as your business grows, including quoting, invoicing, customer management, calendars, analytics and project tools.</Text>
        <Link href="/(public)/updates" asChild><Button mode="text">See product updates</Button></Link>
      </View>

      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.noticeTitle}>BuildPair job payment fee</Text>
        <Text style={styles.noticeText}>BuildPay is optional. The party requesting it carries the disclosed cost, while direct payment remains available when both sides agree.</Text>
        <Link href="/(public)/payments" asChild><Button mode="text">Learn about payments</Button></Link>
      </View>

      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.noticeTitle}>Plan billing</Text>
        <Text style={styles.noticeText}>Starter is £0 per month. BuildPair Core is £9.99, BuildPair Plus is £19.99 and BuildPair Pro is £29.99 per month. Subscription purchases, renewals, plan changes and cancellations are handled through the BuildPair billing flow and Stripe. The applicable amount is shown before a paid subscription is confirmed.</Text>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.navy, paddingHorizontal: 20, paddingVertical: 66 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 42 },
  heroInner: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 15 },
  eyebrow: { color: '#FFE2CF', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1.2, maxWidth: 900 },
  intro: { color: '#FFF2E9', maxWidth: 800, lineHeight: 27 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 5 },
  outline: { borderColor: 'rgba(255,255,255,0.7)' },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 42, gap: 28 },
  contentMobile: { paddingHorizontal: 16, paddingVertical: 30, gap: 22 },
  explainerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  explainer: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%', borderRadius: 26, padding: 22, gap: 9 },
  explainerTitle: { color: colors.charcoal, fontWeight: '900' },
  explainerText: { color: colors.charcoalSoft, lineHeight: 23 },
  notice: { borderRadius: 24, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 8 },
  noticeTitle: { color: colors.charcoal, fontWeight: '900' },
  noticeText: { color: colors.muted, lineHeight: 23 },
});
