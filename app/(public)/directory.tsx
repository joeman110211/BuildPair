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

const EXAMPLE_SEARCHES = ['tiler', 'bathroom', 'boiler', 'roof leak', 'kitchen', 'driveway'];

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

  const filtered = useMemo(() => searchTraders(traders, query), [traders, query]);

  if (loading) return <LoadingScreen label="Finding local trades…" />;

  return <Screen title="Find the right trade" subtitle="Search by trade, job or problem. BuildPair understands related work, so you do not need to know the exact trade name first.">
    <View style={styles.searchPanel}>
      <View style={styles.search}>
        <TextInput
          mode="outlined"
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          placeholder="Try ‘bathroom’, ‘tiler’, ‘boiler’ or ‘roof leak’"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.select}>
        <FormSelect
          label="Trade category"
          value={trade}
          options={TRADE_CATEGORIES}
          onChange={(value) => { setTrade(value); void load(value); }}
          placeholder="All trades"
        />
      </View>
      {trade || query ? <Button mode="text" onPress={() => { setQuery(''); setTrade(undefined); void load(); }}>Clear</Button> : null}
    </View>

    <View style={styles.examples}>
      <Text variant="bodySmall" style={styles.muted}>Popular searches</Text>
      <View style={styles.exampleChips}>
        {EXAMPLE_SEARCHES.map((example) => <Chip key={example} onPress={() => setQuery(example)}>{example}</Chip>)}
      </View>
    </View>

    <View style={styles.filterChips}>
      <Chip>Related trade matching</Chip>
      <Chip>Customer reviews</Chip>
      <Chip>Work galleries</Chip>
    </View>

    <View style={styles.resultsHeader}>
      <View style={styles.resultsCopy}>
        <Text variant="titleLarge" style={styles.title}>{filtered.length} trade{filtered.length === 1 ? '' : 's'} found</Text>
        {query ? <Text style={styles.muted}>Best matches for “{query}” are shown first.</Text> : null}
      </View>
      {trade ? <Chip>{trade}</Chip> : null}
    </View>

    {error ? <EmptyState title="Directory unavailable" body={error} action={<Button onPress={() => load(trade)}>Try again</Button>} /> : null}
    {!error && !filtered.length
      ? <EmptyState title="No close matches yet" body="Try describing the job another way or clear the trade filter. BuildPair will match related services where it can." />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  disclaimer: { textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 19 },
});
