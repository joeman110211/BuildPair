import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { PricingCards } from '@/components/PricingCards';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';
import { REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

export default function PricingPage() {
  const primaryHref = REGISTRATION_OPEN ? '/auth/account' : waitlistHref('trader', 'pricing-hero');
  const primaryLabel = REGISTRATION_OPEN ? 'Create trade account' : 'Create launch-ready trade profile';

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Text style={styles.eyebrow}>Tradesperson membership</Text>
        <Text variant="displaySmall" style={styles.title}>Simple monthly plans, built around how much of the marketplace you actually use.</Text>
        <Text variant="bodyLarge" style={styles.intro}>BuildPair keeps the free Starter plan useful while reserving marketplace selling tools, searchable visibility and higher offer capacity for Plus and Pro members.</Text>
        <View style={styles.heroActions}>
          <Link href={primaryHref} asChild><Button mode="contained" buttonColor="#FFFFFF" textColor={colors.primary}>{primaryLabel}</Button></Link>
          <Link href="/(public)/for-tradespeople" asChild><Button mode="outlined" textColor="#FFFFFF" style={styles.outline}>See trade features</Button></Link>
        </View>
      </View>
    </View>

    <View style={styles.content}>
      <PricingCards />

      <View style={styles.explainerGrid}>
        <View style={[styles.explainer, { backgroundColor: colors.primarySoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>What counts as an offer?</Text>
          <Text style={styles.explainerText}>The monthly allowance applies when a tradesperson submits an offer to an open marketplace job. Simply viewing a job does not use an allowance, and the same trader/job combination cannot consume it twice.</Text>
        </View>
        <View style={[styles.explainer, { backgroundColor: colors.accentSoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>Direct requests are separate</Text>
          <Text style={styles.explainerText}>When a homeowner chooses a searchable Plus or Pro profile and requests a quote directly, that opportunity does not consume the tradesperson’s open-marketplace offer allowance.</Text>
        </View>
        <View style={[styles.explainer, { backgroundColor: colors.navySoft }]}>
          <Text variant="titleLarge" style={styles.explainerTitle}>Categories stay meaningful</Text>
          <Text style={styles.explainerText}>Plan limits apply to broad main trade categories. Services within an already-selected category can be updated separately, while main-category changes use a 14-day cooldown to discourage constant category switching purely to chase individual jobs.</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.noticeTitle}>BuildPair job payment fee</Text>
        <Text style={styles.noticeText}>For jobs using BuildPay, the fee responsibility and exact amount are shown before the payment arrangement is confirmed. Customer-paid BuildPay fees are added to the amount collected. Where a tradesperson chooses to absorb the fee, the relevant deduction is shown in the payout record. BuildPair keeps the contract amount and payment-fee breakdown visible so both sides can see what was agreed.</Text>
        <Link href="/(public)/payments" asChild><Button mode="text">Read how BuildPair payments work</Button></Link>
      </View>

      <View style={styles.notice}>
        <Text variant="titleMedium" style={styles.noticeTitle}>Membership billing</Text>
        <Text style={styles.noticeText}>Starter is £0 per month. The current monthly membership prices are £19.99 for BuildPair Plus and £29.99 for BuildPair Pro. Subscription purchases, renewals, plan changes and cancellations are handled through the BuildPair billing flow and Stripe. The applicable amount is shown before a paid subscription is confirmed.</Text>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 66 },
  heroInner: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 15 },
  eyebrow: { color: '#FFE2CF', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.3 },
  title: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1.2, maxWidth: 900 },
  intro: { color: '#FFF2E9', maxWidth: 800, lineHeight: 27 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 5 },
  outline: { borderColor: 'rgba(255,255,255,0.7)' },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 42, gap: 28 },
  explainerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  explainer: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0, maxWidth: '100%', borderRadius: 26, padding: 22, gap: 9 },
  explainerTitle: { color: colors.charcoal, fontWeight: '900' },
  explainerText: { color: colors.charcoalSoft, lineHeight: 23 },
  notice: { borderRadius: 24, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 8 },
  noticeTitle: { color: colors.charcoal, fontWeight: '900' },
  noticeText: { color: colors.muted, lineHeight: 23 },
});
