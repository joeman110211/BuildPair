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
import { searchTraders, searchTradersWithFallback } from '@/lib/trade-search';
import type { TraderProfile } from '@/types';

const EXAMPLE_SEARCHES = ['tiler', 'bathroom', 'camera', 'security', 'water leak', 'wood', 'boiler', 'roof leak', 'kitchen', 'driveway'];
const SEARCH_CAPABILITIES = ['Understands intent', 'Handles typos', 'Related services', 'AI-assisted fallback'] as const;

type TradeSearchIntent = {
  matched?: boolean;
  primaryTrade?: string | null;
  alternatives?: string[];
  reason?: string;
  source?: 'ai' | 'rules';
};

type StoredIntent = {
  query: string;
  intent: TradeSearchIntent;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const [storedIntent, setStoredIntent] = useState<StoredIntent | null>(null);
  const [aiCheckingQuery, setAiCheckingQuery] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      setTraders(await apiFetch('/api/traders'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  const trimmedQuery = query.trim();
  const selectedTradeMatches = useMemo(
    () => trade ? searchTraders(traders, '', [trade]) : traders,
    [traders, trade],
  );
  const searchPool = selectedTradeMatches.length ? selectedTradeMatches : traders;
  const localFiltered = useMemo(
    () => searchTraders(searchPool, query, trade ? [trade] : []),
    [searchPool, query, trade],
  );
  const activeIntent = !trade && localFiltered.length === 0 && storedIntent?.query === trimmedQuery
    ? storedIntent.intent
    : null;
  const inferredCategories = useMemo(() => {
    if (!activeIntent?.matched || !activeIntent.primaryTrade) return [];
    return [activeIntent.primaryTrade, ...(activeIntent.alternatives ?? [])];
  }, [activeIntent]);
  const searchCategories = useMemo(
    () => trade ? [trade] : inferredCategories,
    [trade, inferredCategories],
  );
  const exactFiltered = useMemo(
    () => searchTraders(searchPool, query, searchCategories),
    [searchPool, query, searchCategories],
  );
  const filtered = useMemo(
    () => searchTradersWithFallback(searchPool.length ? searchPool : traders, query, searchCategories),
    [searchPool, traders, query, searchCategories],
  );
  const fallbackActive = Boolean((trimmedQuery || trade) && exactFiltered.length === 0 && filtered.length > 0);
  const aiChecking = !trade && localFiltered.length === 0 && aiCheckingQuery === trimmedQuery;

  useEffect(() => {
    if (trade || trimmedQuery.length < 2 || localFiltered.length > 0) return undefined;

    let cancelled = false;
    const requestedQuery = trimmedQuery;
    const timer = setTimeout(async () => {
      try {
        setAiCheckingQuery(requestedQuery);
        const intent = await apiFetch<TradeSearchIntent>('/api/ai/trade-match', {
          method: 'POST',
          body: JSON.stringify({ problem: requestedQuery, mode: 'search' }),
        });
        if (!cancelled) setStoredIntent({ query: requestedQuery, intent });
      } catch {
        if (!cancelled) setStoredIntent({ query: requestedQuery, intent: { matched: false } });
      } finally {
        if (!cancelled) {
          setAiCheckingQuery((current) => current === requestedQuery ? '' : current);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trade, trimmedQuery, localFiltered.length]);

  if (loading) return <LoadingScreen label="Finding local trades…" />;

  return <Screen title="Find the right trade" subtitle="Search by trade, job, material, brand, symptom or problem. BuildPair understands related work, common wording and likely intent, so you do not need to know the exact trade name first.">
    <View style={styles.searchPanel}>
      <View style={styles.search}>
        <TextInput
          mode="outlined"
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          placeholder="Try ‘camera’, ‘water leak’, ‘wood’, ‘boiler’ or describe the problem"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.select}>
        <FormSelect
          label="Trade category"
          value={trade}
          options={TRADE_CATEGORIES}
          onChange={setTrade}
          placeholder="All trades"
        />
      </View>
      {trade || query ? <Button mode="text" onPress={() => { setQuery(''); setTrade(undefined); }}>Clear</Button> : null}
    </View>

    <View style={styles.examples}>
      <Text variant="bodySmall" style={styles.muted}>Popular searches</Text>
      <View style={styles.exampleChips}>
        {EXAMPLE_SEARCHES.map((example) => <Chip key={example} onPress={() => setQuery(example)}>{example}</Chip>)}
      </View>
    </View>

    <View style={styles.capabilities}>
      <Text variant="bodySmall" style={styles.capabilityLabel}>BuildPair search</Text>
      <View style={styles.capabilityPills}>
        {SEARCH_CAPABILITIES.map((capability) => <View key={capability} style={styles.capabilityPill}><Text style={styles.capabilityText}>✓ {capability}</Text></View>)}
      </View>
    </View>

    <View style={styles.resultsHeader}>
      <View style={styles.resultsCopy}>
        <Text variant="titleLarge" style={styles.title}>{filtered.length} trade{filtered.length === 1 ? '' : 's'} found</Text>
        {query && !fallbackActive ? <Text style={styles.muted}>Best matches for “{query}” are shown first.</Text> : null}
        {fallbackActive ? <Text style={styles.muted}>No exact wording match, so BuildPair is showing the closest available trades instead of leaving you at a dead end.</Text> : null}
        {aiChecking ? <Text style={styles.muted}>Checking the likely trade behind your search…</Text> : null}
        {!aiChecking && activeIntent?.matched && activeIntent.primaryTrade && exactFiltered.length > 0
          ? <Text style={styles.intentText}>BuildPair matched this to {activeIntent.primaryTrade}{activeIntent.source === 'ai' ? ' using AI intent matching' : ''}.</Text>
          : null}
      </View>
      {trade ? <Chip>{trade}</Chip> : null}
    </View>

    {error ? <EmptyState title="Directory unavailable" body={error} action={<Button onPress={() => load()}>Try again</Button>} /> : null}
    {!error && !filtered.length
      ? <EmptyState title="Trades are being added" body="There are no active paid trade profiles available to show yet." />
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
  capabilities: { gap: 7, alignItems: 'center' },
  capabilityLabel: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
  capabilityPills: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },
  capabilityPill: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 6 },
  capabilityText: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '700' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  resultsCopy: { alignItems: 'center', gap: 3 },
  title: { fontWeight: '900', color: colors.charcoal, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  intentText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  disclaimer: { textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 19 },
});
