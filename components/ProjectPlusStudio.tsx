import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';
import { PAID_PLANS_OPEN } from '@/lib/launch-config';

type Plan = {
  conceptSummary?: string;
  layoutIdeas?: string[];
  materialIdeas?: string[];
  decisionsToMake?: string[];
  questionsForTradesperson?: string[];
  budgetBuckets?: { name: string; note: string }[];
  practicalChecklist?: string[];
  safetyNote?: string;
};
type Design = { id: string; roomType: string; title: string; prompt: string; imageUrl: string | null; plan: Plan | null; createdAt: string };
type Status = {
  active: boolean;
  source: 'pro' | 'subscription' | 'launch' | 'none';
  imageLimit: number;
  plannerLimit: number;
  imagesUsed: number;
  plannerUsed: number;
  designs: Design[];
};

function BulletList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <View style={styles.list}><Text variant="titleMedium" style={styles.title}>{title}</Text>{items.map((item, index) => <Text key={index} style={styles.muted}>• {item}</Text>)}</View>;
}

export function ProjectPlusStudio({ audience }: { audience: 'customer' | 'trader' }) {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [status, setStatus] = useState<Status>();
  const [roomType, setRoomType] = useState('Bathroom');
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState('');
  const [budget, setBudget] = useState('');
  const [plan, setPlan] = useState<Plan>();
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState<'plan' | 'image' | 'checkout' | ''>('');
  const [error, setError] = useState('');
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<Status>('/api/project-plus/status', {}, () => tokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function startProjectPlus() {
    try {
      setBusy('checkout'); setError('');
      const result = await apiFetch<{ url: string }>('/api/stripe/project-plus/start', { method: 'POST', body: JSON.stringify({ audience }) }, () => tokenRef.current());
      if (!result.url) throw new Error('BuildPair did not return a Project+ checkout link.');
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(result.url);
      else await Linking.openURL(result.url);
    } catch (e) { setError(errorMessage(e)); setBusy(''); }
  }

  async function manageProjectPlusBilling() {
    try {
      setBusy('checkout'); setError('');
      const result = await apiFetch<{ url: string }>('/api/stripe/project-plus/portal', {
        method: 'POST', body: JSON.stringify({ audience }),
      }, () => tokenRef.current());
      if (!result.url) throw new Error('BuildPair did not return a billing portal link.');
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(result.url);
    } catch (e) { setError(errorMessage(e)); setBusy(''); }
  }

  async function generatePlan() {
    try {
      setBusy('plan'); setError('');
      const result = await apiFetch<{ plan: Plan }>('/api/project-plus/plan', {
        method: 'POST',
        body: JSON.stringify({ roomType, brief, style: style || undefined, budget: budget || undefined }),
      }, () => tokenRef.current());
      setPlan(result.plan);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  }

  async function generateImage() {
    try {
      setBusy('image'); setError('');
      const result = await apiFetch<{ imageUrl: string }>('/api/project-plus/image', {
        method: 'POST',
        body: JSON.stringify({ roomType, brief, style: style || undefined }),
      }, () => tokenRef.current());
      setImageUrl(result.imageUrl);
      await load();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(''); }
  }

  if (!status) return <LoadingScreen label="Loading BuildPair Project+…" />;
  if (!status.active) return <View style={styles.wrap}>
    <AppCard style={styles.hero}>
      <Chip icon="creation-outline">BuildPair Project+</Chip>
      <Text variant="headlineMedium" style={styles.title}>Plan the room before you start spending money.</Text>
      <Text style={styles.muted}>Project+ adds AI room concepts, renovation briefs, material ideas, decisions to make, questions for tradespeople and practical project checklists. It does not replace measurements, professional design, engineering or building-control advice.</Text>
      {audience === 'customer' ? <>
        <Text variant="headlineSmall" style={styles.price}>£4.99/month</Text>
        <Text style={styles.muted}>Includes 10 AI room concepts and up to 50 planning sessions per month. Normal BuildPair homeowner marketplace and project tools remain free.</Text>
        {PAID_PLANS_OPEN && Platform.OS === 'web' ? <Button mode="contained" icon="credit-card-outline" loading={busy === 'checkout'} disabled={Boolean(busy)} onPress={() => void startProjectPlus()}>Get Project+</Button> : <Text style={styles.muted}>Eligible homeowners can use their introductory Project+ allowance without making a payment.</Text>}
      </> : <>
        <Text variant="headlineSmall" style={styles.price}>£4.99/month</Text>
        <Text style={styles.muted}>Add Project+ to a Starter, Core or Plus trade account for customer planning sessions and room concepts. It remains included at no extra cost with BuildPair Pro.</Text>
        <View style={styles.actions}>
          {PAID_PLANS_OPEN && Platform.OS === 'web' ? <Button mode="contained" icon="credit-card-outline" loading={busy === 'checkout'} disabled={Boolean(busy)} onPress={() => void startProjectPlus()}>Add Project+</Button> : null}
          <Button mode="outlined" onPress={() => void Linking.openURL(Platform.OS === 'web' ? '/trader/subscription' : 'https://www.buildpair.co.uk/trader/subscription')}>Compare plans</Button>
        </View>
      </>}
    </AppCard>
    <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
  </View>;

  const recentImages = status.designs.filter((item) => item.imageUrl);
  return <View style={styles.wrap}>
    <AppCard style={styles.hero}>
      <View style={styles.topRow}><View style={styles.flex}><Chip icon="creation-outline">{status.source === 'pro' ? 'Included with BuildPair Pro' : status.source === 'launch' ? 'Complimentary launch access' : 'Project+ active'}</Chip><Text variant="headlineSmall" style={styles.title}>Project+ planning studio</Text><Text style={styles.muted}>{audience === 'trader' ? 'Use this alongside a customer to explore a brief before turning it into a BuildPair quote.' : 'Explore the room, build a clearer brief and take better questions into the quoting stage.'}</Text></View><View style={styles.usage}><Text style={styles.usageStrong}>{status.imagesUsed}/{status.imageLimit}</Text><Text style={styles.muted}>room concepts this month</Text><Text style={styles.usageStrong}>{status.plannerUsed}/{status.plannerLimit}</Text><Text style={styles.muted}>planning sessions</Text></View></View>
    </AppCard>

    {status.source === 'subscription' && Platform.OS === 'web' ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Your Project+ membership</Text>
      <Text style={styles.muted}>Manage your payment method, invoices or cancellation securely in Stripe.</Text>
      <Button mode="outlined" icon="credit-card-outline" loading={busy === 'checkout'} disabled={Boolean(busy)} onPress={() => void manageProjectPlusBilling()}>Manage Project+ billing</Button>
    </AppCard> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Describe the project</Text>
      <View style={styles.chips}>{['Bathroom','Kitchen','Bedroom','Living room','Home office','Garden room'].map((room) => <Chip key={room} selected={roomType === room} onPress={() => setRoomType(room)}>{room}</Chip>)}</View>
      <TextInput mode="outlined" label="What do you want to change?" value={brief} onChangeText={setBrief} multiline numberOfLines={5} placeholder="e.g. Small bathroom, keep the bath but add more storage, warmer lighting and a cleaner modern finish…" />
      <View style={styles.topRow}><TextInput style={styles.field} mode="outlined" label="Style (optional)" value={style} onChangeText={setStyle} placeholder="Warm modern, traditional, industrial…" /><TextInput style={styles.field} mode="outlined" label="Budget preference (optional)" value={budget} onChangeText={setBudget} placeholder="e.g. Keep under £12k" /></View>
      <View style={styles.actions}><Button mode="contained" icon="clipboard-text-outline" loading={busy === 'plan'} disabled={Boolean(busy) || brief.trim().length < 10} onPress={() => void generatePlan()}>Build project plan</Button><Button mode="outlined" icon="image-outline" loading={busy === 'image'} disabled={Boolean(busy) || brief.trim().length < 10 || status.imagesUsed >= status.imageLimit} onPress={() => void generateImage()}>Generate room concept</Button></View>
      <Text style={styles.muted}>AI concepts are inspiration, not measured construction drawings. Final dimensions, products, technical details and feasibility must be checked on site.</Text>
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
    </AppCard>

    {imageUrl ? <AppCard><Text variant="titleLarge" style={styles.title}>Latest concept</Text><Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /><Text style={styles.muted}>Concept image only. Use it to discuss layout, finishes and direction, not as a technical drawing.</Text></AppCard> : null}

    {plan ? <AppCard>
      <Text variant="titleLarge" style={styles.title}>Project plan</Text>
      {plan.conceptSummary ? <Text style={styles.body}>{plan.conceptSummary}</Text> : null}
      <BulletList title="Layout ideas" items={plan.layoutIdeas} />
      <BulletList title="Material ideas" items={plan.materialIdeas} />
      <BulletList title="Decisions to make" items={plan.decisionsToMake} />
      <BulletList title="Questions for the tradesperson" items={plan.questionsForTradesperson} />
      <BulletList title="Practical checklist" items={plan.practicalChecklist} />
      {plan.budgetBuckets?.length ? <View style={styles.list}><Text variant="titleMedium" style={styles.title}>Budget buckets</Text>{plan.budgetBuckets.map((item, index) => <Text key={index} style={styles.muted}>• <Text style={styles.strong}>{item.name}:</Text> {item.note}</Text>)}</View> : null}
      {plan.safetyNote ? <Text style={styles.notice}>{plan.safetyNote}</Text> : null}
    </AppCard> : null}

    {recentImages.length ? <View style={styles.wrap}><Text variant="titleLarge" style={styles.title}>Recent concepts</Text><View style={styles.gallery}>{recentImages.map((item) => <AppCard key={item.id} style={styles.galleryCard}><Image source={{ uri: item.imageUrl! }} style={styles.thumb} /><Text variant="titleSmall" style={styles.title}>{item.title}</Text><Text numberOfLines={2} style={styles.muted}>{item.prompt}</Text></AppCard>)}</View></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  hero: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  title: { color: colors.charcoal, fontWeight: '900' },
  price: { color: colors.primary, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  muted: { color: colors.muted, lineHeight: 21 },
  strong: { fontWeight: '900', color: colors.charcoal },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%', gap: 7 },
  field: { flex: 1, minWidth: 0, flexBasis: 220, flexShrink: 1, maxWidth: '100%' },
  usage: { minWidth: 150, gap: 1 },
  usageStrong: { color: colors.primary, fontWeight: '900', fontSize: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  image: { width: '100%', height: 420, maxHeight: 520, borderRadius: 18, backgroundColor: colors.border },
  list: { gap: 5 },
  notice: { backgroundColor: colors.goldSoft, color: colors.charcoalSoft, padding: 12, borderRadius: 12, lineHeight: 21 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryCard: { flexGrow: 1, flexBasis: 260, minWidth: 0, flexShrink: 1, maxWidth: 380 },
  thumb: { width: '100%', height: 190, borderRadius: 14, backgroundColor: colors.border },
});
