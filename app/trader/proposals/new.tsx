import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { poundsToPence } from '@/lib/money';
import type { TraderProfile } from '@/types';

type Proposal = {
  id: string;
  priceMin: number | null;
  priceMax: number | null;
  earliestStartAt: string | null;
  message: string;
  portfolioPhotos: string[];
  requiresSiteVisit: boolean;
};

export default function NewProposalScreen() {
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [existing, setExisting] = useState<Proposal | null>();
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [earliestStart, setEarliestStart] = useState('');
  const [message, setMessage] = useState('');
  const [requiresVisit, setRequiresVisit] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [ownProfile, proposal] = await Promise.all([
          apiFetch<TraderProfile>('/api/me/profile', {}, getToken),
          jobId ? apiFetch<Proposal | null>(`/api/job-proposals?jobId=${encodeURIComponent(jobId)}`, {}, getToken) : Promise.resolve(null),
        ]);
        if (!active) return;
        setProfile(ownProfile);
        setExisting(proposal);
        if (proposal) {
          setPriceMin(proposal.priceMin == null ? '' : (proposal.priceMin / 100).toFixed(0));
          setPriceMax(proposal.priceMax == null ? '' : (proposal.priceMax / 100).toFixed(0));
          setEarliestStart(proposal.earliestStartAt ? proposal.earliestStartAt.slice(0, 10) : '');
          setMessage(proposal.message);
          setRequiresVisit(proposal.requiresSiteVisit);
          setSelectedPhotos(proposal.portfolioPhotos ?? []);
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [getToken, jobId]);

  const photos = useMemo(() => (profile?.photos ?? []).slice(0, 12), [profile?.photos]);
  const canSend = Boolean(jobId && message.trim().length >= 10 && (!priceMin || !priceMax || Number(priceMax) >= Number(priceMin)));

  function togglePhoto(url: string) {
    setSelectedPhotos((current) => current.includes(url)
      ? current.filter((item) => item !== url)
      : current.length >= 3 ? current : [...current, url]);
  }

  async function submit() {
    if (!canSend) return;
    try {
      setBusy(true); setError('');
      const startIso = earliestStart ? new Date(`${earliestStart}T09:00:00`).toISOString() : null;
      await apiFetch('/api/job-proposals', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          priceMin: priceMin ? poundsToPence(priceMin) : null,
          priceMax: priceMax ? poundsToPence(priceMax) : null,
          earliestStartAt: startIso,
          message: message.trim(),
          portfolioPhotos: selectedPhotos,
          requiresSiteVisit: requiresVisit,
        }),
      }, getToken);
      router.replace({ pathname: '/trader/job-board', params: { jobId } } as Href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingScreen label="Preparing proposal…" />;

  return <Screen title={existing ? 'Update quick proposal' : 'Quick proposal'} subtitle={title || 'Give the homeowner useful information before a full quote.'}>
    <AppCard>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="titleLarge" style={styles.title}>Price and availability snapshot</Text>
          <Text style={styles.muted}>This is an early proposal, not a substitute for the full BuildPair quote. Use a sensible range when the final price depends on inspection.</Text>
        </View>
        <Chip icon="handshake-outline">Before full quote</Chip>
      </View>
      <View style={styles.priceRow}>
        <TextInput mode="outlined" label="Estimate from (£)" value={priceMin} onChangeText={setPriceMin} keyboardType="decimal-pad" style={styles.priceField} />
        <TextInput mode="outlined" label="Estimate to (£)" value={priceMax} onChangeText={setPriceMax} keyboardType="decimal-pad" style={styles.priceField} />
      </View>
      <TextInput mode="outlined" label="Earliest start (YYYY-MM-DD)" value={earliestStart} onChangeText={setEarliestStart} autoCapitalize="none" />
      <TextInput mode="outlined" label="Short proposal" value={message} onChangeText={setMessage} multiline numberOfLines={5} maxLength={1200} />
      <View style={styles.switchRow}><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>Site visit required before final quote</Text><Text style={styles.muted}>Turn this on if you need to inspect the job before confirming the price.</Text></View><Switch value={requiresVisit} onValueChange={setRequiresVisit} /></View>
    </AppCard>

    {photos.length ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Relevant work photos</Text>
      <Text style={styles.muted}>Choose up to three existing profile photos that help the homeowner judge similar work.</Text>
      <View style={styles.photoGrid}>{photos.map((url) => {
        const selected = selectedPhotos.includes(url);
        return <Button key={url} mode={selected ? 'contained-tonal' : 'outlined'} onPress={() => togglePhoto(url)} style={styles.photoButton} contentStyle={styles.photoButtonContent}>
          <View style={styles.photoWrap}><Image source={{ uri: url }} style={styles.photo} /><Text variant="bodySmall" style={styles.photoText}>{selected ? 'Selected' : 'Use photo'}</Text></View>
        </Button>;
      })}</View>
    </AppCard> : null}

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <Button mode="contained" icon="send-outline" loading={busy} disabled={busy || !canSend} onPress={() => void submit()}>{existing ? 'Update proposal' : 'Send quick proposal'}</Button>
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: spacing.xxs },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceField: { flexGrow: 1, flexBasis: 180, minWidth: 0 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoButton: { flexBasis: 150, flexGrow: 1, maxWidth: 220 },
  photoButtonContent: { minHeight: 140, padding: spacing.xs },
  photoWrap: { width: '100%', gap: spacing.xs, alignItems: 'center' },
  photo: { width: '100%', height: 100, borderRadius: 10, backgroundColor: colors.border },
  photoText: { color: colors.charcoal, fontWeight: '800' },
});
