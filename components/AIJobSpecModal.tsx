import { useAuth } from '@clerk/expo';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Modal, Portal, ProgressBar, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const prompts = [
  'What are the approximate dimensions or size of the area?',
  'What is there now, and what condition is it in?',
  'Will you supply the main materials, or should the trade include them?',
  'Are there access issues, parking limits, deadlines or other important details?',
];

export function AIJobSpecModal({ visible, category, propertyType, onDismiss, onGenerated }: { visible: boolean; category: string; propertyType: string; onDismiss: () => void; onGenerated: (text: string) => void }) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const question = prompts[step];
  const progress = useMemo(() => (step + 1) / prompts.length, [step]);

  async function generate() {
    try {
      setBusy(true); setError('');
      const result = await apiFetch<{ spec: string }>('/api/ai/job-spec', { method: 'POST', body: JSON.stringify({ category, propertyType, answers: prompts.map((q, i) => ({ question: q, answer: answers[i] })) }) }, getToken);
      onGenerated(result.spec); setStep(0); setAnswers(['', '', '', '']); onDismiss();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  return <Portal><Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
    <Text variant="titleLarge" style={styles.title}>AI job-spec assistant</Text><ProgressBar progress={progress} color={colors.primary} />
    <Text variant="labelLarge">Question {step + 1} of {prompts.length}</Text><Text variant="bodyLarge">{question}</Text>
    <TextInput mode="outlined" multiline numberOfLines={4} value={answers[step]} onChangeText={(value) => setAnswers((current) => current.map((item, i) => i === step ? value : item))} placeholder="A short, plain-English answer is fine" />
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <View style={styles.actions}>{step > 0 ? <Button onPress={() => setStep((x) => x - 1)}>Back</Button> : <Button onPress={onDismiss}>Cancel</Button>}{step < prompts.length - 1 ? <Button mode="contained" disabled={!answers[step]?.trim()} onPress={() => setStep((x) => x + 1)}>Next</Button> : <Button mode="contained" loading={busy} disabled={busy || !answers[step]?.trim()} onPress={generate}>Write my job spec</Button>}</View>
    <Text variant="bodySmall" style={styles.note}>AI can make mistakes. Check measurements, materials and access details before posting.</Text>
  </Modal></Portal>;
}

const styles = StyleSheet.create({ modal: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, width: '92%', maxWidth: 620, alignSelf: 'center', gap: 14 }, title: { fontWeight: '800' }, actions: { flexDirection: 'row', justifyContent: 'space-between' }, note: { color: colors.muted } });
