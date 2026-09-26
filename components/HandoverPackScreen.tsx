import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Share, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Pack = {
  generatedAt: string;
  job: {
    id:string; title:string; status:string; scheduledStartAt:string|null; createdAt:string; businessName:string;
    quotedTotal:number; scope:string|null; exclusions:string|null; paymentTerms:string; warrantyMonths:number|null; proposedStartAt:string|null;
  };
  variations: { id:string; title:string; description:string; amountDelta:number; durationDeltaDays:number; respondedAt:string|null }[];
  workspace: { id:string; entryType:string; title:string; body:string; amount:number|null; status:string; mediaUrl:string|null; dueAt:string|null; completedAt:string|null; createdAt:string }[];
  milestones: { id:string; title:string; amount:number; kind:string; status:string; completedAt:string|null; paidAt:string|null; sortOrder:number }[];
};

export function HandoverPackScreen({ jobId, role }: { jobId: string; role: 'trader'|'customer' }) {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [pack, setPack] = useState<Pack>();
  const [error, setError] = useState('');
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try { setPack(await apiFetch<Pack>(`/api/jobs/${jobId}/handover`, {}, () => tokenRef.current())); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [jobId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (!pack && !error) return <LoadingScreen label="Building project pack…" />;
  if (!pack) return <Screen title="Project pack"><EmptyState title="Pack unavailable" body={error} /></Screen>;

  const warranty = pack.workspace.filter((x) => x.entryType === 'warranty' || x.entryType === 'aftercare');
  const handover = pack.workspace.filter((x) => ['handover','document'].includes(x.entryType));
  const progress = pack.workspace.filter((x) => ['progress','snag','note'].includes(x.entryType));
  const paid = pack.milestones.filter((x) => x.status === 'paid').reduce((sum, x) => sum + x.amount, 0);
  const adjustedTotal = pack.job.quotedTotal + pack.variations.reduce((sum, x) => sum + x.amountDelta, 0);

  async function exportPack() {
    if (Platform.OS === 'web') {
      const w = globalThis as unknown as { print?: () => void };
      w.print?.();
      return;
    }
    const lines = [
      `${pack.job.title} · ${pack.job.businessName}`,
      `Agreed price: ${formatMoney(pack.job.quotedTotal)}`,
      pack.variations.length ? `Accepted variations: ${formatMoney(pack.variations.reduce((s,v)=>s+v.amountDelta,0))}` : '',
      `Current agreed total: ${formatMoney(adjustedTotal)}`,
      `Payments recorded: ${formatMoney(paid)}`,
      warranty.length ? `Warranty / aftercare items: ${warranty.map(x=>x.title).join(', ')}` : '',
      handover.length ? `Handover records: ${handover.map(x=>x.title).join(', ')}` : '',
    ].filter(Boolean).join('\n');
    await Share.share({ title: `${pack.job.title} project pack`, message: lines });
  }

  return <Screen title="Project handover pack" subtitle="One clean record of the agreed job, changes, payments, evidence, handover and aftercare." backHref={(role === 'trader' ? `/trader/jobs/${jobId}` : `/customer/jobs/${jobId}`) as Href}>
    <View style={styles.actions}><Button mode="contained" icon="file-document-outline" onPress={() => void exportPack()}>{Platform.OS === 'web' ? 'Print / save PDF' : 'Share pack summary'}</Button><Button mode="outlined" icon="refresh" onPress={() => void load()}>Refresh</Button></View>

    <AppCard>
      <View style={styles.row}><View style={styles.flex}><Text variant="headlineSmall" style={styles.title}>{pack.job.title}</Text><Text style={styles.muted}>{pack.job.businessName}</Text></View><Chip>{pack.job.status}</Chip></View>
      {pack.job.scope ? <><Text variant="titleMedium" style={styles.title}>Agreed scope</Text><Text>{pack.job.scope}</Text></> : null}
      {pack.job.exclusions ? <><Text variant="titleMedium" style={styles.title}>Not included</Text><Text style={styles.muted}>{pack.job.exclusions}</Text></> : null}
      <Divider />
      <View style={styles.row}><Text>Original quote</Text><Text style={styles.money}>{formatMoney(pack.job.quotedTotal)}</Text></View>
      {pack.variations.length ? <View style={styles.row}><Text>Accepted changes</Text><Text style={styles.money}>{formatMoney(pack.variations.reduce((s,v)=>s+v.amountDelta,0))}</Text></View> : null}
      <View style={styles.row}><Text variant="titleMedium" style={styles.title}>Current agreed total</Text><Text variant="titleLarge" style={styles.money}>{formatMoney(adjustedTotal)}</Text></View>
    </AppCard>

    {pack.variations.length ? <Section title="Accepted variations" items={pack.variations.map((x) => ({ key:x.id, title:x.title, body:x.description, meta:`${x.amountDelta >= 0 ? '+' : ''}${formatMoney(x.amountDelta)} · ${x.durationDeltaDays >= 0 ? '+' : ''}${x.durationDeltaDays} day(s)` }))} /> : null}
    <Section title="Payment record" items={pack.milestones.map((x) => ({ key:x.id, title:x.title, body:`${formatMoney(x.amount)} · ${x.kind}`, meta:x.status }))} />
    {handover.length ? <Section title="Documents & handover" items={handover.map((x) => ({ key:x.id, title:x.title, body:x.body, meta:x.completedAt ? `Completed ${new Date(x.completedAt).toLocaleDateString('en-GB')}` : x.status, link:x.mediaUrl }))} /> : null}
    {warranty.length ? <Section title="Warranty & aftercare" items={warranty.map((x) => ({ key:x.id, title:x.title, body:x.body, meta:x.dueAt ? `Due ${new Date(x.dueAt).toLocaleDateString('en-GB')}` : x.status, link:x.mediaUrl }))} /> : null}
    {progress.length ? <Section title="Project notes & evidence" items={progress.map((x) => ({ key:x.id, title:x.title, body:x.body, meta:x.status, link:x.mediaUrl }))} /> : null}

    <Text style={styles.footer}>Generated {new Date(pack.generatedAt).toLocaleString('en-GB')} from the current BuildPair project record.</Text>
  </Screen>;
}

function Section({ title, items }: { title: string; items: { key:string; title:string; body?:string; meta?:string; link?:string|null }[] }) {
  return <AppCard><Text variant="titleLarge" style={styles.title}>{title}</Text>{items.length ? items.map((item) => <View key={item.key} style={styles.item}><Text variant="titleSmall" style={styles.title}>{item.title}</Text>{item.body ? <Text style={styles.muted}>{item.body}</Text> : null}{item.meta ? <Text variant="bodySmall" style={styles.meta}>{item.meta}</Text> : null}{item.link ? <Button compact mode="text" icon="open-in-new" onPress={() => void Linking.openURL(item.link!)}>Open evidence</Button> : null}</View>) : <Text style={styles.muted}>Nothing recorded yet.</Text>}</AppCard>;
}

const styles = StyleSheet.create({
  actions:{ flexDirection:'row', flexWrap:'wrap', gap:spacing.sm },
  row:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', gap:spacing.sm, flexWrap:'wrap' },
  flex:{ flex:1, minWidth:220, gap:3 },
  title:{ color:colors.charcoal, fontWeight:'900' },
  muted:{ color:colors.muted, lineHeight:21 },
  money:{ color:colors.primary, fontWeight:'900' },
  item:{ gap:4, paddingVertical:spacing.sm, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:colors.border },
  meta:{ color:colors.primary, fontWeight:'700' },
  footer:{ color:colors.muted, textAlign:'center', paddingBottom:spacing.lg },
});
