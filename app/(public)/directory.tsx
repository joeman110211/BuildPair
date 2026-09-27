import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Menu, Portal, Text, TextInput } from 'react-native-paper';
import { FormSelect } from '@/components/FormSelect';
import { EmptyState, Screen } from '@/components/Screen';
import { TraderCard } from '@/components/TraderCard';
import { TRADE_CATEGORIES } from '@/constants/options';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { searchTraders, searchTradersWithFallback } from '@/lib/trade-search';
import { recentlyViewedTraderIds } from '@/lib/trader-browse-history';
import type { TraderProfile } from '@/types';

const SORT_LABELS = {
  best: 'Best match',
  rating: 'Highest rated',
  responsive: 'Most responsive',
} as const;

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
  const { width } = useWindowDimensions();
  const compactCompareDock = width < 640;
  const initialQuery = firstParam(params.q) || '';
  const initialTrade = firstParam(params.trade);
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [trade, setTrade] = useState<string | undefined>(initialTrade);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storedIntent, setStoredIntent] = useState<StoredIntent | null>(null);
  const [aiCheckingQuery, setAiCheckingQuery] = useState('');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'best' | 'rating' | 'responsive'>('best');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setTraders(await apiFetch('/api/traders'));
      setRecentIds(recentlyViewedTraderIds());
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

  const displayFiltered = useMemo(() => {
    const available = availabilityOnly ? filtered.filter((trader) => Boolean(trader.availabilitySummary)) : filtered;
    return [...available].sort((a, b) => {
      if (sortMode === 'rating') return Number(b.averageRating || 0) - Number(a.averageRating || 0) || Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
      if (sortMode === 'responsive') {
        const aHours = a.averageResponseHours && a.averageResponseHours > 0 ? a.averageResponseHours : Number.POSITIVE_INFINITY;
        const bHours = b.averageResponseHours && b.averageResponseHours > 0 ? b.averageResponseHours : Number.POSITIVE_INFINITY;
        return aHours - bHours || Number(b.responseRate || 0) - Number(a.responseRate || 0);
      }
      return Number(b.rankingScore || 0) - Number(a.rankingScore || 0);
    });
  }, [availabilityOnly, filtered, sortMode]);
  const compareTraders = useMemo(() => compareIds.map((id) => traders.find((trader) => trader.id === id)).filter((trader): trader is TraderProfile => Boolean(trader)), [compareIds, traders]);
  const recentTraders = useMemo(() => recentIds.map((id) => traders.find((trader) => trader.id === id)).filter((trader): trader is TraderProfile => Boolean(trader)).slice(0, 4), [recentIds, traders]);

  function toggleCompare(trader: TraderProfile) {
    setCompareIds((current) => {
      if (current.includes(trader.id)) return current.filter((id) => id !== trader.id);
      if (current.length >= 3) return current;
      return [...current, trader.id];
    });
  }

  function scrollToComparison() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.getElementById('trade-comparison-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  return <Screen title="Find the right trade" subtitle="Describe the job or problem in your own words. If you already know the trade you need, you can narrow the search below.">
    <View style={styles.searchPanel}>
      <View style={styles.search}>
        <TextInput
          mode="outlined"
          label="What do you need help with?"
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          placeholder="For example: leaking tap, bathroom tiling, broken boiler"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.select}>
        <FormSelect
          label="Trade category (optional)"
          value={trade}
          options={TRADE_CATEGORIES}
          onChange={setTrade}
          placeholder="Choose a trade if you know it"
        />
      </View>
      {trade || query ? <View style={styles.searchActions}><Button compact mode="text" onPress={() => { setQuery(''); setTrade(undefined); }}>Clear search</Button></View> : null}
    </View>

    <View style={styles.resultsHeader}>
      <View style={styles.resultsCopy}>
        <Text variant="titleLarge" style={styles.title}>{loading ? 'Finding local trades' : `${displayFiltered.length} trade${displayFiltered.length === 1 ? '' : 's'} found`}</Text>
        {loading ? <Text style={styles.muted}>Checking active BuildPair trade profiles. This page will always resolve to live results, a clear empty state or an error with a retry option.</Text> : null}
        {!loading && query && !fallbackActive ? <Text style={styles.muted}>Showing the closest matches for “{query}”.</Text> : null}
        {!loading && fallbackActive ? <Text style={styles.muted}>No exact wording match, so BuildPair is showing the closest relevant trades.</Text> : null}
        {!loading && aiChecking ? <Text style={styles.muted}>Working out the most likely trade for your problem…</Text> : null}
        {!loading && !aiChecking && activeIntent?.matched && activeIntent.primaryTrade && exactFiltered.length > 0
          ? <Text style={styles.intentText}>Likely trade: {activeIntent.primaryTrade}.</Text>
          : null}
        {!loading && trade ? <Text style={styles.muted}>Trade filter: {trade}</Text> : null}
      </View>
    </View>

    {!loading && !error && (filtered.length > 0 || availabilityOnly) ? <View style={styles.refineBar}>
      <Text style={styles.refineLabel}>Refine results</Text>
      <View style={styles.refineActions}>
        <Menu
          visible={sortMenuOpen}
          onDismiss={() => setSortMenuOpen(false)}
          anchor={<Button compact mode="text" onPress={() => setSortMenuOpen(true)}>Sort: {SORT_LABELS[sortMode]}</Button>}
        >
          <Menu.Item title="Best match" onPress={() => { setSortMode('best'); setSortMenuOpen(false); }} />
          <Menu.Item title="Highest rated" onPress={() => { setSortMode('rating'); setSortMenuOpen(false); }} />
          <Menu.Item title="Most responsive" onPress={() => { setSortMode('responsive'); setSortMenuOpen(false); }} />
        </Menu>
        <Button compact mode={availabilityOnly ? 'contained-tonal' : 'text'} onPress={() => setAvailabilityOnly((value) => !value)}>
          {availabilityOnly ? '✓ Available soon' : 'Available soon'}
        </Button>
      </View>
    </View> : null}

    {loading ? <View style={styles.loadingState} accessibilityLiveRegion="polite"><Text style={styles.loadingTitle}>Checking the directory…</Text><Text style={styles.muted}>Active local trade profiles will appear here as soon as the directory check completes.</Text></View> : null}
    {!loading && error ? <EmptyState title="Directory unavailable" body={error} action={<Button onPress={() => load()}>Try again</Button>} /> : null}
    {!loading && !error && !displayFiltered.length
      ? <EmptyState
          title="No trades match this search"
          body={availabilityOnly ? 'No matching trades currently show upcoming availability. You can show all matching trades instead.' : 'Try describing the job a little differently or remove the trade category filter.'}
          action={availabilityOnly ? <Button mode="outlined" onPress={() => setAvailabilityOnly(false)}>Show all matching trades</Button> : undefined}
        />
      : null}

    {compareTraders.length >= 2 ? <View nativeID="trade-comparison-panel" style={styles.comparePanel}>
      <View style={styles.compareHeader}><View style={styles.compareCopy}><Text variant="titleLarge" style={styles.title}>Compare tradespeople</Text><Text style={styles.muted}>Compare up to three profiles side by side. Membership is shown as a product level, not a trust score.</Text></View><Button mode="text" onPress={() => setCompareIds([])}>Clear comparison</Button></View>
      <View style={styles.compareGrid}>{compareTraders.map((trader) => <View key={trader.id} style={styles.compareCard}>
        <Text variant="titleMedium" style={styles.compareTitle}>{trader.businessName}</Text>
        <Text style={styles.compareLine}>{trader.tradeCategory}{trader.locationLabel ? ` · ${trader.locationLabel}` : ''}</Text>
        <Text style={styles.compareLine}>{trader.reviewCount ? `${Number(trader.averageRating || 0).toFixed(1)} ★ · ${trader.reviewCount} reviews` : 'New to BuildPair'}</Text>
        <Text style={styles.compareLine}>{trader.verifiedCredentialCount ?? 0} verified credential{(trader.verifiedCredentialCount ?? 0) === 1 ? '' : 's'}</Text>
        <Text style={styles.compareLine}>{trader.availabilitySummary || 'Availability on request'}</Text>
        <Button compact onPress={() => toggleCompare(trader)}>Remove</Button>
      </View>)}</View>
    </View> : null}

    {!loading && !error && displayFiltered.length
      ? <View style={styles.grid}>{displayFiltered.map((trader) => {
        const compareSelected = compareIds.includes(trader.id);
        return <TraderCard
          key={trader.id}
          trader={trader}
          compareSelected={compareSelected}
          compareDisabled={!compareSelected && compareIds.length >= 3}
          onToggleCompare={toggleCompare}
        />;
      })}</View>
      : null}

    {!loading && recentTraders.length ? <View style={styles.recentBlock}>
      <Text variant="titleLarge" style={styles.title}>Recently viewed</Text>
      <Text style={styles.muted}>Profiles you opened recently on this device.</Text>
      <View style={styles.recentGrid}>{recentTraders.map((trader) => <TraderCard key={`recent-${trader.id}`} trader={trader} />)}</View>
    </View> : null}

    <Text variant="bodySmall" style={styles.disclaimer}>BuildPair distinguishes verified reviews from information supplied by tradespeople. Check qualifications, registrations and insurance that matter for your particular job before appointing anyone.</Text>
    {compareTraders.length ? <View style={styles.compareDockSpacer} /> : null}

    {compareTraders.length ? <Portal>
      <View pointerEvents="box-none" style={[styles.compareDockShell, compactCompareDock && styles.compareDockShellCompact]}>
        <View style={[styles.compareDock, compactCompareDock && styles.compareDockCompact]}>
          <View style={[styles.compareDockCopy, compactCompareDock && styles.compareDockCopyCompact]}>
            <Text style={styles.compareDockCount}>{compareTraders.length} trade{compareTraders.length === 1 ? '' : 's'} selected</Text>
            <Text style={styles.compareDockHint}>{compareTraders.length < 2 ? 'Select another trade to compare.' : compareTraders.length === 3 ? 'Maximum 3 selected. Ready to compare.' : 'Ready to compare side by side.'}</Text>
          </View>
          <View style={[styles.compareDockActions, compactCompareDock && styles.compareDockActionsCompact]}>
            <Button compact mode="text" onPress={() => setCompareIds([])}>Clear</Button>
            <Button mode="contained" icon="compare-horizontal" disabled={compareTraders.length < 2} onPress={scrollToComparison}>Compare now</Button>
          </View>
        </View>
      </View>
    </Portal> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  searchPanel: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  search: { flex: 2, minWidth: 250 },
  searchInput: { backgroundColor: colors.surfaceRaised },
  searchOutline: { borderRadius: 16 },
  select: { flex: 1, minWidth: 220 },
  searchActions: { minHeight: 54, justifyContent: 'center' },
  refineBar: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingHorizontal: 4 },
  refineLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  refineActions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  resultsCopy: { alignItems: 'center', gap: 3, maxWidth: 760 },
  title: { fontWeight: '900', color: colors.charcoal, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  intentText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },
  loadingState: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
  loadingTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  comparePanel: { gap: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
  compareHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  compareCopy: { flex: 1, minWidth: 220, gap: 3 },
  compareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  compareCard: { flex: 1, minWidth: 220, gap: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: 14 },
  compareTitle: { color: colors.charcoal, fontWeight: '900' },
  compareLine: { color: colors.muted, lineHeight: 20 },
  compareDockSpacer: { height: 124 },
  compareDockShell: { position: 'absolute', left: 0, right: 0, bottom: 14, zIndex: 40, alignItems: 'center', paddingHorizontal: 12 },
  compareDockShellCompact: { bottom: 86 },
  compareDock: { width: '100%', maxWidth: 760, minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E8C9AD', backgroundColor: '#FFF9F3', shadowColor: '#000000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  compareDockCompact: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 17 },
  compareDockCopy: { flex: 1, minWidth: 220, gap: 2 },
  compareDockCopyCompact: { minWidth: 0 },
  compareDockCount: { color: colors.charcoal, fontWeight: '900', fontSize: 15 },
  compareDockHint: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  compareDockActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareDockActionsCompact: { width: '100%', justifyContent: 'flex-end' },
  recentBlock: { gap: 10, marginTop: 8 },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  disclaimer: { textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 19 },
});
