import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { QuoteDocument, type QuoteDocumentData, type QuoteDocumentItem } from '@/components/QuoteDocument';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { MARKETPLACE_OPEN } from '@/lib/launch';
import { apiFetch, errorMessage } from '@/lib/api';
import type { PaymentStagePlan } from '@/types';

type PublicQuote = QuoteDocumentData & {
  id: string;
  quoteNumber: string;
  businessName: string;
  traderEmail: string | null;
  traderPhone: string | null;
  status: 'sent' | 'viewed' | 'accepted' | 'declined';
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  items: QuoteDocumentItem[];
  paymentSchedule: PaymentStagePlan[];
  managedJobId: string | null;
  managedProjectEligible: boolean;
  revisionNumber: number;
  options: {
    id: string;
    kind: 'optional' | 'alternative';
    groupKey: string | null;
    label: string;
    description: string;
    priceAdjustment: number;
    selected: boolean;
  }[];
};

export default function PublicQuoteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<PublicQuote>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [renderedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const row = await apiFetch<PublicQuote>(`/api/public/quotes/${encodeURIComponent(token)}`);
      setQuote(row);
      setSelectedOptionIds(row.options.filter((option) => option.selected).map((option) => option.id));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function respond(action: 'accept' | 'decline') {
    if (!token) return;
    try {
      setBusy(true); setError('');
      const updated = await apiFetch<PublicQuote>(`/api/public/quotes/${encodeURIComponent(token)}`, {
        method: 'POST', body: JSON.stringify({ action, selectedOptionIds: action === 'accept' ? selectedOptionIds : [] }),
      });
      setQuote(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleOption(optionId: string) {
    if (!quote || finished) return;
    const option = quote.options.find((row) => row.id === optionId);
    if (!option) return;
    setSelectedOptionIds((current) => {
      if (current.includes(optionId)) return current.filter((id) => id !== optionId);
      if (option.kind !== 'alternative') return [...current, optionId];
      const group = (option.groupKey || 'Alternative').trim().toLowerCase();
      const otherGroupIds = quote.options
        .filter((row) => row.kind === 'alternative' && (row.groupKey || 'Alternative').trim().toLowerCase() === group)
        .map((row) => row.id);
      return [...current.filter((id) => !otherGroupIds.includes(id)), optionId];
    });
  }

  if (loading) return <LoadingScreen />;
  if (!quote) return <Screen title="Quote unavailable"><EmptyState title="This quote is not available" body={error || 'Ask the tradesperson to send you a fresh quote link.'} action={<Button mode="outlined" onPress={() => router.replace('/')}>Go to BuildPair</Button>} /></Screen>;

  const expired = Boolean(quote.validUntil && new Date(quote.validUntil).getTime() < renderedAt);
  const finished = quote.status === 'accepted' || quote.status === 'declined';
  const selectedOptions = quote.options.filter((option) => selectedOptionIds.includes(option.id));
  const selectedOptionsSubtotal = selectedOptions.reduce((sum, option) => sum + option.priceAdjustment, 0);
  const selectedOptionsVat = Math.round(selectedOptionsSubtotal * quote.vatRate / 100);
  const pendingTotal = quote.totalAmount + selectedOptionsSubtotal + selectedOptionsVat;
  const webOrigin = Platform.OS === 'web'
    ? ((globalThis as unknown as { location?: { origin?: string } }).location?.origin ?? '')
    : '';
  const apiOrigin = webOrigin || process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://www.buildpair.co.uk';
  const printUrl = `${apiOrigin}/api/public/quotes/${encodeURIComponent(token)}/print?download=1`;

  const claimReturnTo = `/customer/claim-quote?token=${encodeURIComponent(token)}`;
  const claimHref = `/auth/sign-in?mode=customer&returnTo=${encodeURIComponent(claimReturnTo)}` as const;

  return <Screen title={`Quote from ${quote.businessName}`} subtitle={`${quote.quoteNumber} · Revision ${quote.revisionNumber || 1} · ${quote.jobTitle}`}>
    <View style={styles.statusRow}>
      <Chip icon={quote.status === 'accepted' ? 'check-circle-outline' : quote.status === 'declined' ? 'close-circle-outline' : 'eye-outline'}>
        {quote.status === 'accepted' ? 'Accepted' : quote.status === 'declined' ? 'Declined' : 'Ready to review'}
      </Chip>
      {expired ? <Chip icon="clock-alert-outline">Expired</Chip> : null}
    </View>

    <QuoteDocument quote={quote} />

    {quote.options.length ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>{finished ? 'Quote choices' : 'Choose any extras or alternatives'}</Text>
      <Text style={styles.muted}>{finished ? 'The choices below are part of the recorded quote decision.' : 'Optional extras are added to the quoted price. Alternatives are grouped so you can choose at most one from each group.'}</Text>
      <View style={styles.optionList}>
        {quote.options.map((option) => {
          const selected = selectedOptionIds.includes(option.id);
          return <View key={option.id} style={[styles.optionCard, selected ? styles.optionSelected : undefined]}>
            <View style={styles.optionHeading}>
              <View style={styles.optionText}>
                <View style={styles.statusRow}><Chip compact>{option.kind === 'alternative' ? (option.groupKey || 'Alternative') : 'Optional extra'}</Chip>{selected ? <Chip compact icon="check">Selected</Chip> : null}</View>
                <Text variant="titleMedium" style={styles.title}>{option.label}</Text>
                {option.description ? <Text style={styles.muted}>{option.description}</Text> : null}
              </View>
              <Text variant="titleMedium" style={styles.optionPrice}>+{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(option.priceAdjustment / 100)}</Text>
            </View>
            {!finished ? <Button mode={selected ? 'contained' : 'outlined'} icon={selected ? 'check' : 'plus'} disabled={busy} onPress={() => toggleOption(option.id)}>{selected ? 'Selected' : 'Choose'}</Button> : null}
          </View>;
        })}
      </View>
      {!finished && selectedOptions.length ? <View style={styles.choiceTotal}><Text>Selected extras{quote.vatRate ? ' + VAT' : ''}</Text><Text variant="titleMedium" style={styles.title}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((selectedOptionsSubtotal + selectedOptionsVat) / 100)}</Text><Text variant="titleLarge" style={styles.optionPrice}>New total {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pendingTotal / 100)}</Text></View> : null}
    </AppCard> : null}

    <AppCard>
      {quote.status === 'accepted' ? <>
        <Text variant="titleLarge" style={styles.title}>Quote accepted</Text>
        <Text>The tradesperson can now continue the job from this agreed quote. Keep this link for your records.</Text>
        {quote.paymentMethod === 'buildpair' ? <Text style={styles.muted}>This quote proposes staged BuildPay. Once this accepted quote is added to a homeowner BuildPair account, its agreed stages become the managed project payment schedule.</Text> : <Text style={styles.muted}>This quote records direct payment terms. You can still bring the project into BuildPair for the timeline, variations, snagging, documents, completion and review.</Text>}
        {quote.managedJobId ? <Chip icon="briefcase-check-outline">Managed BuildPair project created</Chip> : quote.managedProjectEligible ? (MARKETPLACE_OPEN ? <Link href={claimHref} asChild><Button mode="contained" icon="briefcase-plus-outline">Add this accepted job to BuildPair</Button></Link> : <Text style={styles.muted}>Full homeowner project management opens on 15 October 2026. Keep this secure quote link and claim the accepted project at launch.</Text>) : <Text style={styles.muted}>This quote remains your accepted record, but it was created using a plan that did not include conversion into a managed BuildPair project.</Text>}
      </> : quote.status === 'declined' ? <>
        <Text variant="titleLarge" style={styles.title}>Quote declined</Text>
        <Text>The tradesperson will see that you declined this quote.</Text>
      </> : <>
        <Text variant="titleLarge" style={styles.title}>Your decision</Text>
        <Text>Check the work, price and payment stages above before accepting. Accepting records your agreement to this version of the quote.</Text>
        <View style={styles.actions}>
          <Button mode="contained" icon="check" loading={busy} disabled={busy || expired} onPress={() => void respond('accept')}>Accept quote</Button>
          <Button mode="outlined" textColor={colors.danger} disabled={busy || expired} onPress={() => void respond('decline')}>Decline</Button>
        </View>
      </>}
      {expired && !finished ? <HelperText type="error">This quote has expired. Ask the tradesperson for an updated quote before accepting it.</HelperText> : null}
      <View style={styles.actions}>
        <Button mode="outlined" icon="file-pdf-box" onPress={() => void Linking.openURL(printUrl)}>Download / print PDF</Button>
      </View>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  optionList: { gap: spacing.sm },
  optionCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  optionText: { flex: 1, minWidth: 220, gap: 5 },
  optionPrice: { color: colors.primary, fontWeight: '900' },
  choiceTotal: { alignItems: 'flex-end', gap: 4, paddingTop: spacing.sm },
});
