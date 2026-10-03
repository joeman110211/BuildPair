import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Audience = 'homeowner' | 'tradesperson' | 'public';
type Filter = 'all' | 'homeowners' | 'tradespeople' | 'anonymous' | 'errors' | 'unanswered';

type ConversationTurn = {
  id: number;
  asked: string;
  answer: string;
  status: string;
  providerCalled: boolean;
  latencyMs: number | null;
  createdAt: string;
  unanswered: boolean;
};

type Conversation = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  audience: Audience;
  pathname: string;
  pageLabel: string;
  firstAt: string;
  lastAt: string;
  anonymous: boolean;
  hasError: boolean;
  unanswered: boolean;
  turns: ConversationTurn[];
};

type ConversationResponse = {
  conversations: Conversation[];
  usage24h: { requests24h: number; errors24h: number; unanswered24h: number };
  globalDailyLimit: number;
  generatedAt: string;
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'homeowners', label: 'Homeowners' },
  { key: 'tradespeople', label: 'Tradespeople' },
  { key: 'anonymous', label: 'Anonymous' },
  { key: 'errors', label: 'Errors' },
  { key: 'unanswered', label: 'Unanswered' },
];

function fmt(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function audienceLabel(value: Audience) {
  if (value === 'homeowner') return 'Homeowner';
  if (value === 'tradesperson') return 'Tradesperson';
  return 'Public visitor';
}

function identityLabel(item: Conversation) {
  if (item.userEmail) return item.userEmail;
  if (!item.anonymous && item.userId) return item.userId;
  return `Anonymous ${audienceLabel(item.audience).toLowerCase()}`;
}

function matchesFilter(item: Conversation, filter: Filter) {
  if (filter === 'homeowners') return item.audience === 'homeowner';
  if (filter === 'tradespeople') return item.audience === 'tradesperson';
  if (filter === 'anonymous') return item.anonymous;
  if (filter === 'errors') return item.hasError;
  if (filter === 'unanswered') return item.unanswered;
  return true;
}

export default function AiConversationsAdmin() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [data, setData] = useState<ConversationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<ConversationResponse>('/api/admin/ai-conversations', {}, () => getTokenRef.current());
      setData(response);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const conversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.conversations ?? []).filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!query) return true;
      const haystack = [
        item.userEmail,
        item.userId,
        item.pageLabel,
        item.pathname,
        audienceLabel(item.audience),
        ...item.turns.flatMap((turn) => [turn.asked, turn.answer]),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [data, filter, search]);

  return <Screen
    title="AI Conversations"
    subtitle="See what visitors ask BuildPair AI, what it answered, and where people are getting stuck."
  >
    <AppCard style={styles.summaryCard}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>BuildPair AI conversation intelligence</Text>
          <Text style={styles.muted}>This view is for product learning, not raw debugging. It groups BuildPair AI questions into readable conversations and keeps the current page and visitor type attached.</Text>
        </View>
        <Button mode="outlined" loading={loading} onPress={() => void load()}>Refresh</Button>
      </View>

      {data ? <View style={styles.statsRow}>
        <Chip>{data.usage24h.requests24h} questions / 24h</Chip>
        <Chip>{data.usage24h.errors24h} errors / 24h</Chip>
        <Chip>{data.usage24h.unanswered24h} unanswered / 24h</Chip>
        <Chip>{data.conversations.length} conversations loaded</Chip>
      </View> : null}
      {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    </AppCard>

    <AppCard style={styles.filterCard}>
      <Text variant="titleMedium" style={styles.title}>Filter conversations</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((item) => <Chip
          key={item.key}
          selected={filter === item.key}
          onPress={() => setFilter(item.key)}
        >{item.label}</Chip>)}
      </View>
      <TextInput
        mode="outlined"
        value={search}
        onChangeText={setSearch}
        placeholder="Search questions, answers, pages or user email…"
        outlineStyle={styles.inputOutline}
      />
      <Text style={styles.mutedSmall}>{conversations.length} matching conversation{conversations.length === 1 ? '' : 's'}. “Unanswered” includes fallback, blocked, failed or empty AI replies.</Text>
    </AppCard>

    {!loading && !conversations.length ? <AppCard>
      <Text variant="titleMedium" style={styles.title}>No matching AI conversations</Text>
      <Text style={styles.muted}>There is nothing under this filter yet. New BuildPair AI questions will appear here automatically.</Text>
    </AppCard> : null}

    {conversations.map((conversation) => <AppCard key={conversation.id} style={styles.conversationCard}>
      <View style={styles.conversationHeader}>
        <View style={styles.flex}>
          <Text variant="titleMedium" style={styles.title}>{identityLabel(conversation)} · {conversation.pageLabel} · {fmt(conversation.lastAt)}</Text>
          <Text style={styles.mutedSmall}>{conversation.pathname} · {conversation.turns.length} question{conversation.turns.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={styles.chipRow}>
          <Chip>{audienceLabel(conversation.audience)}</Chip>
          {conversation.anonymous ? <Chip>Anonymous</Chip> : <Chip>Signed in</Chip>}
          {conversation.hasError ? <Chip>Has error</Chip> : null}
          {conversation.unanswered ? <Chip>Needs attention</Chip> : null}
        </View>
      </View>

      <View style={styles.turnList}>
        {conversation.turns.map((turn) => <View key={turn.id} style={styles.turnCard}>
          <View style={styles.turnMeta}>
            <Text style={styles.time}>{fmt(turn.createdAt)}</Text>
            <View style={styles.chipRow}>
              <Chip compact>{turn.status}</Chip>
              {turn.latencyMs != null ? <Chip compact>{turn.latencyMs} ms</Chip> : null}
            </View>
          </View>
          <View style={styles.messageBlock}>
            <Text style={styles.label}>ASKED</Text>
            <Text selectable style={styles.message}>{turn.asked}</Text>
          </View>
          <View style={[styles.messageBlock, styles.answerBlock]}>
            <Text style={styles.label}>BUILDPAIR AI</Text>
            <Text selectable style={styles.message}>{turn.answer || 'No useful answer was recorded.'}</Text>
          </View>
        </View>)}
      </View>
    </AppCard>)}
  </Screen>;
}

const styles = StyleSheet.create({
  summaryCard: { gap: 12 },
  filterCard: { gap: 10 },
  conversationCard: { gap: 12 },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  conversationHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  mutedSmall: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inputOutline: { borderRadius: 14 },
  turnList: { gap: 10 },
  turnCard: { gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  turnMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { color: colors.muted, fontSize: 11 },
  messageBlock: { gap: 4, padding: 11, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  answerBlock: { backgroundColor: '#FFF8F2' },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  message: { color: colors.charcoal, lineHeight: 20 },
});
