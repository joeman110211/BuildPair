import { useAuth } from '@clerk/expo';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { FormSelect } from '@/components/FormSelect';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { useAuthAvailable } from '@/lib/auth-availability';

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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ReportForm() {
  const { getToken, isSignedIn } = useAuth();
  const params = useLocalSearchParams<{ subjectUserId?: string | string[]; subjectLabel?: string | string[]; subjectType?: string | string[] }>();
  const suppliedUserId = first(params.subjectUserId);
  const suppliedLabel = first(params.subjectLabel);
  const suppliedType = first(params.subjectType);
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
    <Text variant="headlineSmall" style={styles.title}>Sign in to submit a marketplace report</Text>
    <Text style={styles.body}>Reports are tied to a BuildPair account so the moderation queue has a real reporter, can investigate relevant platform context and can reduce anonymous abuse of the reporting system.</Text>
    <Link href="/auth/account" asChild><Button mode="contained">Sign in to BuildPair</Button></Link>
  </View>;

  if (sent) return <View style={styles.successCard}>
    <Chip icon="check-circle" style={styles.successChip}>Report received</Chip>
    <Text variant="headlineSmall" style={styles.title}>It is in the moderation queue.</Text>
    <Text style={styles.body}>BuildPair will review the report and available platform context. A report does not automatically mean the other account has done something wrong. Depending on the evidence, the report can be dismissed, the user can be warned, messaging can be restricted or closed, or the account can be suspended.</Text>
    <View style={styles.actions}><Link href="/(public)/trust-safety" asChild><Button mode="outlined">Trust & Safety</Button></Link><Link href="/" asChild><Button mode="contained">Back to BuildPair</Button></Link></View>
  </View>;

  return <View style={styles.formCard}>
    <View style={styles.formHeader}>
      <View style={styles.flex}>
        <Text variant="headlineSmall" style={styles.title}>Report {targetDescription}</Text>
        <Text style={styles.body}>Use this for conduct, safety, payment, profile or workmanship concerns involving a BuildPair user. Give enough factual detail for the report to be reviewed properly.</Text>
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
    {suppliedUserId ? <HelperText type="info">The account was filled in from the BuildPair page you came from.</HelperText> : <HelperText type="info">You can paste a BuildPair tradesperson profile URL. If you know the account email or ID, that works too.</HelperText>}

    <FormSelect label="What is the main issue?" value={reason} options={REASON_LABELS} onChange={setReason} />
    <TextInput
      mode="outlined"
      label="What happened?"
      value={details}
      onChangeText={setDetails}
      multiline
      numberOfLines={7}
      maxLength={2000}
      placeholder="Stick to what happened, when it happened and any useful job/message context."
      accessibilityLabel="What happened?"
    />
    <HelperText type="info">{details.length}/2000 characters · minimum 10</HelperText>

    <View style={styles.notice}>
      <Text variant="titleSmall" style={styles.title}>For immediate danger or crime</Text>
      <Text style={styles.body}>BuildPair moderation is not an emergency service. Contact the police or emergency services where appropriate. For consumer-rights or rogue-trader issues, the BuildPair Advice Hub links to official consumer services as well.</Text>
    </View>

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" icon="send" loading={busy} disabled={busy || !reference.trim() || !reason || details.trim().length < 10} onPress={() => void submit()}>Send report for review</Button>
  </View>;
}

export default function ReportPage() {
  const authAvailable = useAuthAvailable();
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}>
      <View style={styles.heroInner}>
        <Text style={styles.eyebrow}>Marketplace reporting</Text>
        <Text variant="displaySmall" style={styles.heroTitle}>Homeowners can report trades. Trades can report homeowners.</Text>
        <Text variant="bodyLarge" style={styles.heroBody}>One standard applies both ways. BuildPair reviews reports rather than automatically siding with whichever person clicked the button first.</Text>
      </View>
    </View>
    <View style={styles.content}>
      {authAvailable ? <ReportForm /> : <View style={styles.formCard}>
        <Text variant="headlineSmall" style={styles.title}>Sign in to submit a marketplace report</Text>
        <Text style={styles.body}>Reports are tied to a BuildPair account so the moderation queue has a real reporter and can reduce anonymous abuse of the system.</Text>
        <Link href="/auth/account" asChild><Button mode="contained">Sign in to BuildPair</Button></Link>
      </View>}
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
  hero: { backgroundColor: colors.charcoal, paddingHorizontal: 20, paddingVertical: 54 },
  heroInner: { width: '100%', maxWidth: 900, alignSelf: 'center', gap: 10 },
  eyebrow: { color: colors.secondary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1 },
  heroBody: { color: '#DDE1E3', lineHeight: 27, maxWidth: 820 },
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, gap: 16 },
  formCard: { backgroundColor: colors.surfaceRaised, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 12 },
  successCard: { backgroundColor: colors.sageSoft, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#B7D4C0', gap: 12 },
  successChip: { alignSelf: 'flex-start' },
  formHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 250, gap: 5 },
  title: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  notice: { backgroundColor: colors.goldSoft, borderRadius: 18, padding: 14, gap: 4, borderWidth: 1, borderColor: '#E5C98F' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
