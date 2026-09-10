import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { QuoteDocument, type QuoteDocumentData, type QuoteDocumentItem } from '@/components/QuoteDocument';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
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
};

export default function PublicQuoteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<PublicQuote>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [renderedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const row = await apiFetch<PublicQuote>(`/api/public/quotes/${encodeURIComponent(token)}`);
      setQuote(row);
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
        method: 'POST', body: JSON.stringify({ action }),
      });
      setQuote(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!quote) return <Screen title="Quote unavailable"><EmptyState title="This quote is not available" body={error || 'Ask the tradesperson to send you a fresh quote link.'} action={<Button mode="outlined" onPress={() => router.replace('/')}>Go to BuildPair</Button>} /></Screen>;

  const expired = Boolean(quote.validUntil && new Date(quote.validUntil).getTime() < renderedAt);
  const finished = quote.status === 'accepted' || quote.status === 'declined';
  const webOrigin = Platform.OS === 'web'
    ? ((globalThis as unknown as { location?: { origin?: string } }).location?.origin ?? '')
    : '';
  const apiOrigin = webOrigin || process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://www.buildpair.co.uk';
  const printUrl = `${apiOrigin}/api/public/quotes/${encodeURIComponent(token)}/print?download=1`;

  return <Screen title={`Quote from ${quote.businessName}`} subtitle={`${quote.quoteNumber} · ${quote.jobTitle}`}>
    <View style={styles.statusRow}>
      <Chip icon={quote.status === 'accepted' ? 'check-circle-outline' : quote.status === 'declined' ? 'close-circle-outline' : 'eye-outline'}>
        {quote.status === 'accepted' ? 'Accepted' : quote.status === 'declined' ? 'Declined' : 'Ready to review'}
      </Chip>
      {expired ? <Chip icon="clock-alert-outline">Expired</Chip> : null}
    </View>

    <QuoteDocument quote={quote} />

    <AppCard>
      {quote.status === 'accepted' ? <>
        <Text variant="titleLarge" style={styles.title}>Quote accepted</Text>
        <Text>The tradesperson can now continue the job from this agreed quote. Keep this link for your records.</Text>
        {quote.paymentMethod === 'buildpair' ? <Text style={styles.muted}>This quote proposes BuildPair payments. Payment setup is handled separately after acceptance and only becomes available when the tradesperson has completed payout setup.</Text> : null}
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
});
