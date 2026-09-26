import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { PaymentStagePlan, Quote } from '@/types';

type BusinessQuote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobTitle: string;
  tradeCategory: string | null;
  totalAmount: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'withdrawn';
  shareToken: string;
  shareUrl: string;
  revisionNumber: number;
  managedJobId: string | null;
  paymentSchedule: PaymentStagePlan[];
  validUntil: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function statusLabel(status: BusinessQuote['status']) {
  if (status === 'viewed') return 'Viewed';
  if (status === 'accepted') return 'Accepted';
  if (status === 'declined') return 'Declined';
  if (status === 'sent') return 'Sent';
  if (status === 'withdrawn') return 'Withdrawn';
  return 'Draft';
}

function printUrl(quote: BusinessQuote) {
  try {
    const url = new URL(quote.shareUrl);
    return `${url.origin}/api/public/quotes/${encodeURIComponent(quote.shareToken)}/print?download=1`;
  } catch {
    return `/api/public/quotes/${encodeURIComponent(quote.shareToken)}/print?download=1`;
  }
}

export default function TraderQuotesScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [businessQuotes, setBusinessQuotes] = useState<BusinessQuote[]>([]);
  const [jobQuotes, setJobQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState<string>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [outside, marketplace] = await Promise.all([
        apiFetch<BusinessQuote[]>('/api/business-quotes', {}, getToken),
        apiFetch<Quote[]>('/api/quotes', {}, getToken),
      ]);
      setBusinessQuotes(outside);
      setJobQuotes(marketplace);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function reviseQuote(quote: BusinessQuote) {
    try {
      setError('');
      const result = await apiFetch<{ id: string }>('/api/business-quotes/revise', { method: 'POST', body: JSON.stringify({ quoteId: quote.id }) }, getToken);
      router.push(`/trader/quotes/new?quoteId=${encodeURIComponent(result.id)}` as Href);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remindQuote(quote: BusinessQuote) {
    try {
      setReminding(quote.id); setError('');
      await apiFetch('/api/business-reminders', { method: 'POST', body: JSON.stringify({ kind: 'quote', id: quote.id }) }, getToken);
    } catch (e) { setError(errorMessage(e)); }
    finally { setReminding(undefined); }
  }

  async function shareQuote(quote: BusinessQuote) {
    const text = `Quote ${quote.quoteNumber} for ${quote.jobTitle}: ${quote.shareUrl}`;
    if (Platform.OS === 'web') {
      const nav = (globalThis as unknown as { navigator?: { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> } }).navigator;
      if (nav?.share) {
        await nav.share({ title: `Quote ${quote.quoteNumber}`, text: `Quote for ${quote.jobTitle}`, url: quote.shareUrl });
        return;
      }
      await Linking.openURL(`mailto:?subject=${encodeURIComponent(`Quote ${quote.quoteNumber}`)}&body=${encodeURIComponent(text)}`);
      return;
    }
    await Share.share({ title: `Quote ${quote.quoteNumber}`, message: text });
  }

  if (loading) return <LoadingScreen />;

  return <Screen title="Quotes" subtitle="Create, send and track quotes for BuildPair jobs or work you found anywhere else.">
    <View style={styles.topActions}>
      <Button mode="contained" icon="plus" onPress={() => router.push('/trader/quotes/new')}>Create a quote</Button>
      <Button mode="outlined" icon="refresh" onPress={() => void load()}>Refresh</Button>
    </View>

    {error ? <EmptyState title="Quotes need attention" body={error} action={<Button mode="outlined" onPress={() => void load()}>Try again</Button>} /> : null}

    <View style={styles.heading}><Text variant="titleLarge" style={styles.title}>Your own customers</Text><Chip>{businessQuotes.length}</Chip></View>
    <Text style={styles.muted}>Use BuildPair as your normal quoting tool even when the customer did not come through BuildPair.</Text>
    {!businessQuotes.length ? <EmptyState title="No standalone quotes yet" body="Create a quote for any customer, preview it, send a secure link and let them accept it online." action={<Button mode="contained" onPress={() => router.push('/trader/quotes/new')}>Create first quote</Button>} /> : businessQuotes.map((quote) => <AppCard key={quote.id}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{quote.jobTitle}</Text>
          <Text style={styles.muted}>{quote.quoteNumber} · Revision {quote.revisionNumber || 1} · {quote.customerName}{quote.tradeCategory ? ` · ${quote.tradeCategory}` : ''}</Text>
        </View>
        <View style={styles.amountBlock}><Text variant="titleLarge" style={styles.amount}>{formatMoney(quote.totalAmount)}</Text><Chip compact>{statusLabel(quote.status)}</Chip></View>
      </View>
      <View style={styles.actions}>
        {quote.status === 'draft' ? <Button mode="contained" icon="pencil-outline" onPress={() => router.push(`/trader/quotes/new?quoteId=${encodeURIComponent(quote.id)}` as Href)}>Continue draft</Button> : <>
          <Button mode="contained" icon="share-variant-outline" onPress={() => void shareQuote(quote)}>Share</Button>
          <Button mode="outlined" icon="open-in-new" onPress={() => void Linking.openURL(quote.shareUrl)}>Open customer view</Button>
          <Button mode="outlined" icon="file-pdf-box" onPress={() => void Linking.openURL(printUrl(quote))}>PDF / print</Button>
          {quote.customerEmail ? <Button mode="text" icon="email-outline" onPress={() => void Linking.openURL(`mailto:${encodeURIComponent(quote.customerEmail!)}?subject=${encodeURIComponent(`Quote ${quote.quoteNumber}`)}&body=${encodeURIComponent(`Hi ${quote.customerName},\n\nHere is your quote for ${quote.jobTitle}:\n${quote.shareUrl}`)}`)}>Email</Button> : null}
          {quote.customerEmail && ['sent','viewed'].includes(quote.status) && quote.sentAt && Date.now() - new Date(quote.sentAt).getTime() >= 48 * 60 * 60 * 1000 ? <Button mode="outlined" icon="bell-outline" loading={reminding === quote.id} disabled={Boolean(reminding)} onPress={() => void remindQuote(quote)}>Friendly reminder</Button> : null}
          {quote.status !== 'accepted' ? <Button mode="outlined" icon="file-replace-outline" onPress={() => void reviseQuote(quote)}>Create revision</Button> : null}
          {quote.managedJobId ? <Button mode="outlined" icon="briefcase-outline" onPress={() => router.push(`/trader/jobs/${quote.managedJobId}` as Href)}>Open managed project</Button> : null}
          {quote.customerPhone ? <Button mode="text" icon="message-text-outline" onPress={() => void Linking.openURL(`sms:${quote.customerPhone}?body=${encodeURIComponent(`Your quote for ${quote.jobTitle}: ${quote.shareUrl}`)}`)}>SMS</Button> : null}
        </>}
      </View>
    </AppCard>)}

    <View style={styles.heading}><Text variant="titleLarge" style={styles.title}>BuildPair job quotes</Text><Chip>{jobQuotes.length}</Chip></View>
    <Text style={styles.muted}>Quotes sent against homeowner jobs already inside BuildPair stay linked to that job and its messages.</Text>
    {!jobQuotes.length ? <EmptyState title="No BuildPair job quotes yet" body="When you quote a BuildPair opportunity it will appear here as well." /> : jobQuotes.slice(0, 10).map((quote) => <AppCard key={quote.id}>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>BuildPair job quote</Text><Text style={styles.muted}>{quote.status} · {quote.paymentSchedule?.length ?? 0} payment stage{quote.paymentSchedule?.length === 1 ? '' : 's'}</Text></View><Text variant="titleLarge" style={styles.amount}>{formatMoney(quote.totalAmount)}</Text></View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 220, gap: 3 },
  amountBlock: { alignItems: 'flex-end', gap: 5 },
  amount: { color: colors.primary, fontWeight: '900' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
});
