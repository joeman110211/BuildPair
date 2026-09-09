import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { FormSelect } from '@/components/FormSelect';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { TraderCard } from '@/components/TraderCard';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { clientPreviewDataEnabled } from '@/lib/client-preview';
import { demoTraders } from '@/lib/demo-data';
import { searchTraders } from '@/lib/trade-search';
import type { TraderProfile } from '@/types';

const EXAMPLE_SEARCHES = ['tiler', 'bathroom', 'water leak', 'wood', 'boiler', 'roof leak', 'kitchen', 'driveway'];

type TradeSearchIntent = {
  matched?: boolean;
  primaryTrade?: string | null;
  alternatives?: string[];
  reason?: string;
  source?: 'ai' | 'rules';
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function previewTraders(selected?: string) {
  return demoTraders.filter((trader) => !selected || trader.tradeCategory === selected);
}

export default function DirectoryScreen() {
  const params = useLocalSearchParams<{ q?: string | string[]; trade?: string | string[] }>();
  const initialQuery = firstParam(params.q) || '';
  const initialTrade = firstParam(params.trade);
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [trade, setTrade] = useState<string | undefined>(initialTrade);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiIntent, setAiIntent] = useState<TradeSearchIntent | null>(null);
  const [aiChecking, setAiChecking] = useState(false);

  async function load(selected?: string) {
    try {
      setLoading(true);
      setError('');
      setTraders(await apiFetch(`/api/traders${selected ? `?trade=${encodeURIComponent(selected)}` : ''}`));
    } catch (e) {
      if (clientPreviewDataEnabled()) {
        setTraders(previewTraders(selected));
        setError('');
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(initialTrade), 0);
    return () => clearTimeout(timer);
  }, [initialTrade]);

  const localFiltered = useMemo(() => searchTraders(traders, query), [traders, query]);
  const inferredCategories = useMemo(() => {
    if (!aiIntent?.matched || !aiIntent.primaryTrade) return [];
    return [aiIntent.primaryTrade, ...(aiIntent.alternatives ?? [])];
  }, [aiIntent]);
  const filtered = useMemo(() => searchTraders(traders, query, inferredCategories), [traders, query, inferredCategories]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trade || trimmed.length < 2 || localFiltered.length > 0) {
      setAiIntent(null);
      setAiChecking(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setAiChecking(true);
        const intent = await apiFetch<TradeSearchIntent>('/api/ai/trade-match', {
          method: 'POST',
          body: JSON.stringify({ problem: trimmed, mode: 'search' }),
        });
        if (!cancelled) setAiIntent(intent);
      } catch {
        if (!cancelled) setAiIntent(null);
      } finally {
        if (!cancelled) setAiChecking(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, trade, localFiltered.length]);

  if (loading) return <LoadingScreen label="Finding local trades…" />;

  return <Screen title="Find the right trade" subtitle="Search by trade, job, material or problem. BuildPair understands related work, common wording and likely intent, so you do not need to know the exact trade name first.">
    <View style={styles.searchPanel}>
      <View style={styles.search}>
        <TextInput
          mode="outlined"
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          placeholder="Try ‘water’, ‘wood’, ‘boiler’, ‘roof leak’ or describe the problem"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.select}>
        <FormSelect
          label="Trade category"
          value={trade}
          options={TRADE_CATEGORIES}
          onChange={(value) => { setTrade(value); setAiIntent(null); void load(value); }}
          placeholder="All trades"
        />
      </View>
      {trade || query ? <Button mode="text" onPress={() => { setQuery(''); setTrade(undefined); setAiIntent(null); void load(); }}>Clear</Button> : null}
    </View>

    <View style={styles.examples}>
      <Text variant="bodySmall" style={styles.muted}>Popular searches</Text>
      <View style={styles.exampleChips}>
        {EXAMPLE_SEARCHES.map((example) => <Chip key={example} onPress={() => setQuery(example)}>{example}</Chip>)}
      </View>
    </View>

    <View style={styles.filterChips}>
      <Chip>Smart intent matching</Chip>
      <Chip>Typo tolerant</Chip>
      <Chip>AI fallback</Chip>
      <Chip>Customer reviews</Chip>
      <Chip>Work galleries</Chip>
    </View>

    <View style={styles.resultsHeader}>
      <View style={styles.resultsCopy}>
        <Text variant="titleLarge" style={styles.title}>{filtered.length} trade{filtered.length === 1 ? '' : 's'} found</Text>
        {query ? <Text style={styles.muted}>Best matches for “{query}” are shown first.</Text> : null}
        {aiChecking ? <Text style={styles.muted}>Checking the likely trade behind your search…</Text> : null}
        {!aiChecking && aiIntent?.matched && aiIntent.primaryTrade && filtered.length > 0
          ? <Text style={styles.intentText}>BuildPair matched this to {aiIntent.primaryTrade}{aiIntent.source === 'ai' ? ' using AI intent matching' : ''}.</Text>
          : null}
      </View>
      {trade ? <Chip>{trade}</Chip> : null}
    </View>

    {error ? <EmptyState title="Directory unavailable" body={error} action={<Button onPress={() => load(trade)}>Try again</Button>} /> : null}
    {!error && !filtered.length && !aiChecking
      ? <EmptyState title="No close matches yet" body="Try describing the job another way or clear the trade filter. BuildPair checks related services and can use AI to infer the likely trade when ordinary matching draws a blank." />
      : <View style={styles.grid}>{filtered.map((trader) => <TraderCard key={trader.id} trader={trader} />)}</View>}

    <Text variant="bodySmall" style={styles.disclaimer}>BuildPair distinguishes verified reviews from information supplied by tradespeople. Check qualifications, registrations and insurance that matter for your particular job before appointing anyone.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  searchPanel: { backgroundColor: '#FFFCF8', borderWidth: 1, borderTopWidth: 3, borderColor: '#E9D4C2', borderTopColor: colors.primary, borderRadius: 26, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  search: { flex: 2, minWidth: 250 },
  searchInput: { backgroundColor: colors.surfaceRaised },
  searchOutline: { borderRadius: 18 },
  select: { flex: 1, minWidth: 220 },
  examples: { gap: 8, alignItems: 'center' },
  exampleChips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },
  filterChips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  resultsCopy: { alignItems: 'center', gap: 3 },
  title: { fontWeight: '900', color: colors.charcoal, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  intentText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  disclaimer: { textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 19 },
});
