import { useAuth } from '@clerk/expo';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { FormSelect } from '@/components/FormSelect';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics, radii } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuthAvailable } from '@/lib/auth-availability';
import { firstParam } from '@/lib/search-params';

const REASON_LABELS = [
  'Fraud or suspected scam',
  'Abuse or harassment',
  'Unsafe behaviour or content',
  'Poor workmanship',
  'Misleading profile or credentials',
  'Non-payment',
  'Payment dispute',
  'No-show / repeated failure to attend',
  'Spam',
  'Other',
] as const;

type ReasonLabel = (typeof REASON_LABELS)[number];

const REASON_VALUES: Record<ReasonLabel, string> = {
  'Fraud or suspected scam': 'fraud',
  'Abuse or harassment': 'abuse_or_harassment',
  'Unsafe behaviour or content': 'unsafe_content',
  'Poor workmanship': 'poor_workmanship',
  'Misleading profile or credentials': 'misleading_profile',
  'Non-payment': 'non_payment',
  'Payment dispute': 'payment_dispute',
  'No-show / repeated failure to attend': 'no_show',
  'Spam': 'spam',
  'Other': 'other',
};


function ReportForm() {
  const { getToken, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ subjectUserId?: string | string[]; subjectLabel?: string | string[]; subjectType?: string | string[] }>();
  const suppliedUserId = firstParam(params.subjectUserId);
  const suppliedLabel = firstParam(params.subjectLabel);
  const suppliedType = firstParam(params.subjectType);
  const [reference, setReference] = useState(suppliedUserId ?? '');
  const [reason, setReason] = useState<ReasonLabel>();
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const targetDescription = useMemo(() => suppliedLabel
    ? `${suppliedType === 'customer' ? 'Homeowner' : suppliedType === 'trader' ? 'Tradesperson' : 'BuildPair user'}: ${suppliedLabel}`
    : 'BuildPair user', [suppliedLabel, suppliedType]);

  async function submit() {
    if (!isSignedIn || !reference.trim() || !reason || details.trim().length < 10) return;
    try {
      setBusy(true);
      setError('');
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          subjectReference: reference.trim(),
          reason: REASON_VALUES[reason],
          details: details.trim(),
        }),
      }, getToken);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isSignedIn) return <View style={styles.formCard}>
    <Text variant="headlineSmall" style={styles.title}>Sign in for an account-linked report</Text>
    <Text style={styles.body}>Signing in lets BuildPair connect your report to relevant marketplace records. You do not need an account to report illegal or harmful content: use the public safety reporting option below.</Text>
    <Link href="/auth/account" asChild><Button mode="contained">Sign in to BuildPair</Button></Link>
  </View>;

  if (sent) return <View style={styles.successCard}>
    <Chip icon="check-circle" style={styles.successChip}>Report received</Chip>
    <Text variant="headlineSmall" style={styles.title}>Your report is in the moderation queue.</Text>
    <Text style={styles.body}>BuildPair will review the report and relevant platform information. A report is not an automatic finding against another user. Depending on the evidence, it may be dismissed or lead to proportionate action such as a warning, messaging restriction or account suspension.</Text>
    <View style={styles.actions}><Link href="/(public)/trust-safety" asChild><Button mode="outlined">Trust & Safety</Button></Link><Link href="/" asChild><Button mode="contained">Back to BuildPair</Button></Link></View>
  </View>;

  return <View style={styles.formCard}>
    <View style={styles.formHeader}>
      <View style={styles.flex}>
        <Text variant="headlineSmall" style={styles.title}>Report {targetDescription}</Text>
        <Text style={styles.body}>Use this form for conduct, safety, payment, profile or workmanship concerns involving a BuildPair user. Include enough factual detail for the issue to be reviewed properly.</Text>
      </View>
      <Chip icon="shield-alert-outline">Moderation review</Chip>
    </View>

    <TextInput
      mode="outlined"
      label="BuildPair profile link, account email or account ID"
      value={reference}
      onChangeText={setReference}
      autoCapitalize="none"
      placeholder="Paste the profile link or enter the account email"
      disabled={Boolean(suppliedUserId)}
      accessibilityLabel="BuildPair profile link, account email or account ID"
    />
    {suppliedUserId ? <HelperText type="info">The account was filled in from the BuildPair page you came from.</HelperText> : <HelperText type="info">Paste a BuildPair tradesperson profile URL, or enter the account email or ID if you know it.</HelperText>}

    <FormSelect label="What is the main issue?" value={reason} options={REASON_LABELS} onChange={setReason} />
    <TextInput
      mode="outlined"
      label="What happened?"
      value={details}
      onChangeText={setDetails}
      multiline
      numberOfLines={7}
      maxLength={2000}
      placeholder="Describe what happened, when it happened and any useful job or message context."
      accessibilityLabel="What happened?"
    />
    <HelperText type="info">{details.length}/2000 characters · minimum 10</HelperText>

    <View style={styles.notice}>
      <Text variant="titleSmall" style={styles.title}>For immediate danger or crime</Text>
      <Text style={styles.body}>BuildPair moderation is not an emergency service. Contact the police or emergency services where appropriate. For consumer-rights or rogue-trader concerns, the Advice Hub also links to official services.</Text>
    </View>

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" icon="send" loading={busy} disabled={busy || !reference.trim() || !reason || details.trim().length < 10} onPress={() => void submit()}>Send report for review</Button>
  </View>;
}

function PublicSafetyReportCard() {
  const emailSafety = () => void Linking.openURL('mailto:info@buildpair.co.uk?subject=BuildPair%20safety%20report');

  return <View style={styles.formCard}>
    <View style={styles.formHeader}>
      <View style={styles.flex}>
        <Text variant="headlineSmall" style={styles.title}>Report illegal or harmful content without an account</Text>
        <Text style={styles.body}>Anyone can report content or behaviour they believe is illegal, unsafe or harmful. Include the BuildPair page, profile, job or other reference if you have it, what you saw, when you saw it and why you are concerned.</Text>
      </View>
      <Chip icon="shield-alert-outline">No sign-in required</Chip>
    </View>
    <View style={styles.notice}>
      <Text variant="titleSmall" style={styles.title}>Child sexual abuse material</Text>
      <Text style={styles.body}>Do not download, copy or email suspected child sexual abuse images or videos to BuildPair. Send only the information needed to identify where the material appears. If a child or anyone else is in immediate danger, call 999.</Text>
    </View>
    <Button mode="contained" icon="email-alert-outline" onPress={emailSafety}>Email a safety report</Button>
    <Text style={styles.body}>If you are complaining about how BuildPair handled a previous safety report or moderation decision, include the report reference or account email so the decision can be reviewed.</Text>
  </View>;
}

export default function ReportPage() {
  const authAvailable = useAuthAvailable();
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.heroInner}>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>Marketplace reporting</Text>
        <Text variant="displaySmall" style={[styles.heroTitle, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>Report a marketplace concern.</Text>
        <Text variant="bodyLarge" style={styles.heroBody}>The same reporting standard applies to homeowners and tradespeople. BuildPair reviews relevant information before deciding whether action is appropriate.</Text>
      </View>
    </View>
    <View style={styles.content}>
      {authAvailable ? <ReportForm /> : null}
      <PublicSafetyReportCard />
      <View style={styles.actions}>
        <Link href="/(public)/advice" asChild><Button mode="outlined">Advice Hub</Button></Link>
        <Link href="/(public)/marketplace-standards" asChild><Button mode="outlined">Marketplace Standards</Button></Link>
        <Link href="/(public)/trust-safety" asChild><Button mode="outlined">Trust & Safety</Button></Link>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.background, paddingHorizontal: 20, paddingVertical: 54 },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 40 },
  heroInner: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 10, alignItems: 'center' },
  eyebrow: { color: colors.primaryDark, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  heroTitle: { color: colors.charcoal, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  heroBody: { color: colors.muted, lineHeight: 27, maxWidth: 820, textAlign: 'center' },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, gap: 16 },
  formCard: { backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 12 },
  successCard: { backgroundColor: colors.sageSoft, borderRadius: radii.xl, padding: 24, borderWidth: 1, borderColor: '#B7D4C0', gap: 12 },
  successChip: { alignSelf: 'flex-start' },
  formHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0, flexBasis: 250, flexShrink: 1, maxWidth: '100%', gap: 5 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  notice: { backgroundColor: colors.goldSoft, borderRadius: 18, padding: 14, gap: 4, borderWidth: 1, borderColor: '#E5C98F' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});