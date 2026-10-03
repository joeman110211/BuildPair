import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Match = { primaryTrade: string; alternatives: string[]; reason: string; questions: string[]; source: 'ai' | 'rules' };

export function TradeMatchAssistant({ onChoose }: { onChoose: (trade: string) => void }) {
  const [problem, setProblem] = useState('');
  const [match, setMatch] = useState<Match>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function analyse() {
    try {
      setBusy(true); setError('');
      setMatch(await apiFetch<Match>('/api/ai/trade-match', { method: 'POST', body: JSON.stringify({ problem }) }));
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return <AppCard style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Text style={styles.iconText}>✨</Text></View><View style={styles.flex}><Text variant="titleLarge" style={styles.title}>Not sure which trade you need?</Text><Text style={styles.muted}>Describe the problem normally. BuildPair will suggest the most likely trade and useful alternatives.</Text></View></View>
    <TextInput mode="outlined" multiline numberOfLines={4} value={problem} onChangeText={setProblem} placeholder="e.g. Water appears through the kitchen ceiling whenever the upstairs shower is used" />
    <Button mode="contained" icon="auto-fix" loading={busy} disabled={busy || problem.trim().length < 8} onPress={() => void analyse()}>Work out the right trade</Button>
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    {match ? <View style={styles.result}>
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Best starting point</Text><Chip icon={match.source === 'ai' ? 'creation' : 'source-branch'}>{match.source === 'ai' ? 'AI matched' : 'Smart match'}</Chip></View>
      <Button mode="contained-tonal" icon="check" onPress={() => onChoose(match.primaryTrade)}>{match.primaryTrade}</Button>
      <Text style={styles.muted}>{match.reason}</Text>
      {match.alternatives.length ? <><Text variant="labelLarge">Also worth considering</Text><View style={styles.chips}>{match.alternatives.map((trade) => <Chip key={trade} onPress={() => onChoose(trade)}>{trade}</Chip>)}</View></> : null}
      {match.questions.length ? <><Text variant="labelLarge">Useful details to add to your job</Text>{match.questions.map((question) => <Text key={question} style={styles.question}>• {question}</Text>)}</> : null}
    </View> : null}
    <Text variant="bodySmall" style={styles.muted}>This helps route the job. It is not a technical diagnosis, and regulated or safety-critical work still needs the appropriate qualified professional.</Text>
  </AppCard>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.accentSoft },
  heading: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22 },
  flex: { flex: 1, gap: 4 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  result: { backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 14, gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  question: { color: colors.text, lineHeight: 20 },
});
