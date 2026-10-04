import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
  estimateMin: number;
  estimateMax: number;
  availableFrom: string | null;
  note: string;
  portfolioUrls: string[];
  siteVisitRequired: boolean;
  status: string;
};

export default function NewProposalScreen() {
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [existing, setExisting] = useState<Proposal>();
  const [estimateMin, setEstimateMin] = useState('');
  const [estimateMax, setEstimateMax] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [note, setNote] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [siteVisitRequired, setSiteVisitRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const token = () => tokenRef.current();
      const [ownProfile, proposals] = await Promise.all([
        apiFetch<TraderProfile>('/api/me/profile', {}, token),
        apiFetch<Proposal[]>(`/api/job-proposals?jobId=${encodeURIComponent(jobId)}`, {}, token),
      ]);
      setProfile(ownProfile);
      const proposal = proposals[0];
      setExisting(proposal);
      if (proposal) {
        setEstimateMin((proposal.estimateMin / 100).toFixed(2));
        setEstimateMax((proposal.estimateMax / 100).toFixed(2));
        setAvailableFrom(proposal.availableFrom ? proposal.availableFrom.slice(0, 10) : '');
        setNote(proposal.note);
        setSelectedPhotos(proposal.portfolioUrls ?? []);
        setSiteVisitRequired(proposal.siteVisitRequired);
      }
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  function togglePhoto(url: string) {
    setSelectedPhotos((current) => current.includes(url)
      ? current.filter((item) => item !== url)
      : current.length >= 3 ? current : [...current, url]);
  }

  async function save() {
    try {
      setBusy(true); setError('');
      await apiFetch('/api/job-proposals', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          estimateMin: poundsToPence(estimateMin),
          estimateMax: poundsToPence(estimateMax),
          availableFrom: availableFrom.trim() || null,
          note: note.trim(),
          portfolioUrls: selectedPhotos,
          siteVisitRequired,
        }),
      }, () => tokenRef.current());
      router.replace('/trader/job-board');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  if (loading) return <LoadingScreen label="Preparing proposal…" />;
  const photos = profile?.photos ?? [];
  const minPence = poundsToPence(estimateMin);
  const maxPence = poundsToPence(estimateMax);
  const valid = note.trim().length >= 20 && minPence >= 0 && maxPence >= minPence && maxPence > 0;

  return <Screen title={existing ? 'Update quick proposal' : 'Quick proposal'} subtitle={title || 'Give the homeowner useful early information before the full quote.'}>
    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Early price and availability</Text>
      <Text style={styles.muted}>This is not the final BuildPair quote. It helps the homeowner shortlist the right trades before detailed quoting or a site visit.</Text>
      <View style={styles.row}>
        <TextInput mode="outlined" label="Estimate from (£)" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" style={styles.field} />
        <TextInput mode="outlined" label="Estimate to (£)" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" style={styles.field} />
      </View>
      <TextInput mode="outlined" label="Earliest availability (YYYY-MM-DD, optional)" value={availableFrom} onChangeText={setAvailableFrom} keyboardType="numbers-and-punctuation" />
      <TextInput mode="outlined" label="Short note" value={note} onChangeText={setNote} multiline numberOfLines={4} maxLength={1200} placeholder="Explain what the estimate is based on, anything you need to confirm, and why you are a good fit for this job." />
      <View style={styles.switchRow}><View style={styles.flex}><Text variant="titleSmall" style={styles.title}>Site visit needed before final quote</Text><Text style={styles.muted}>Turn this on if you need to inspect the job before confirming the final price.</Text></View><Switch value={siteVisitRequired} onValueChange={setSiteVisitRequired} /></View>
    </AppCard>

    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="titleMedium" style={styles.title}>Relevant work</Text><Text style={styles.muted}>Choose up to three existing profile photos that are useful for this homeowner.</Text></View><Chip>{selectedPhotos.length}/3</Chip></View>
      {!photos.length ? <Text style={styles.muted}>Add work photos to your profile first if you want to include examples here.</Text> : <View style={styles.photoGrid}>{photos.slice(0, 12).map((url) => {
        const selected = selectedPhotos.includes(url);
        return <Pressable key={url} onPress={() => togglePhoto(url)} style={[styles.photoWrap, selected && styles.photoSelected]}>
          <Image source={{ uri: url }} style={styles.photo} />
          {selected ? <Chip compact icon="check" style={styles.photoChip}>Selected</Chip> : null}
        </Pressable>;
      })}</View>}
    </AppCard>

    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    <View style={styles.actions}>
      <Button mode="contained" icon="send-outline" loading={busy} disabled={busy || !valid} onPress={() => void save()}>{existing ? 'Update proposal' : 'Send proposal'}</Button>
      <Button mode="outlined" disabled={busy} onPress={() => router.back()}>Cancel</Button>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'flex-start' },
  field: { flexGrow: 1, flexBasis: 180, minWidth: 0 },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, gap: 4 },
  switchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoWrap: { width: 128, maxWidth: '47%', borderWidth: 2, borderColor: 'transparent', borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoSelected: { borderColor: colors.primary },
  photo: { width: '100%', height: 108, backgroundColor: colors.border },
  photoChip: { position: 'absolute', left: 6, bottom: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
