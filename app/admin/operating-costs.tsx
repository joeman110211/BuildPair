import { useAuth } from '@clerk/expo';
import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

const PROVIDERS = [
  { id: 'render', name: 'Render', role: 'Live web hosting and backend', url: 'https://dashboard.render.com/billing' },
  { id: 'neon', name: 'Neon', role: 'Production PostgreSQL database', url: 'https://console.neon.tech/' },
  { id: 'clerk', name: 'Clerk', role: 'Customer and trade sign-in', url: 'https://dashboard.clerk.com/' },
  { id: 'gemini', name: 'Google Cloud / Gemini', role: 'BuildPair AI and Project+ features', url: 'https://console.cloud.google.com/billing' },
  { id: 'resend', name: 'Resend', role: 'Transactional email delivery', url: 'https://resend.com/overview' },
  { id: 'cloudinary', name: 'Cloudinary', role: 'Photos and media storage', url: 'https://console.cloudinary.com/' },
  { id: 'stripe', name: 'Stripe', role: 'Membership and payment processing', url: 'https://dashboard.stripe.com/' },
  { id: 'github', name: 'GitHub', role: 'Source code and automated builds', url: 'https://github.com/settings/billing' },
  { id: 'godaddy', name: 'GoDaddy', role: 'buildpair.co.uk domain', url: 'https://account.godaddy.com/products' },
  { id: 'datadog', name: 'Datadog', role: 'Optional service monitoring', url: 'https://app.datadoghq.eu/' },
] as const;

type Entry = {
  provider: string;
  amountMinor: string | null;
  monthlyBudgetMinor: string | null;
  currency: 'GBP' | 'USD';
  billingPeriod: 'monthly' | 'annual' | 'usage' | 'one-off';
  invoiceDate: string | null;
  note: string;
  updatedAt: string;
};

type Data = {
  entries: Entry[];
  usage: {
    aiCallsMonth: number;
    aiCalls24h: number;
    emailsMonth: number;
    cloudinary: { state: string; detail?: string; plan?: string; creditsUsed?: number | null; creditsLimit?: number | null };
  };
  generatedAt: string;
};

type Draft = {
  amount: string;
  budget: string;
  currency: 'GBP' | 'USD';
  billingPeriod: Entry['billingPeriod'];
  invoiceDate: string;
  note: string;
};

const numberFormat = new Intl.NumberFormat('en-GB');
function amount(value: string | null, currency: 'GBP' | 'USD') {
  if (value == null) return 'Not recorded';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value) / 100);
}
function decimal(value: string | null) {
  return value == null ? '' : (Number(value) / 100).toFixed(2);
}
function makeDraft(entry?: Entry): Draft {
  return {
    amount: decimal(entry?.amountMinor ?? null),
    budget: decimal(entry?.monthlyBudgetMinor ?? null),
    currency: entry?.currency ?? 'GBP',
    billingPeriod: entry?.billingPeriod ?? 'monthly',
    invoiceDate: entry?.invoiceDate?.slice(0, 10) ?? '',
    note: entry?.note ?? '',
  };
}
function pennies(value: string) {
  if (!value.trim()) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a valid amount, such as 12.50.');
  const result = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(result) || result > 100000000000) throw new Error('That amount is too large.');
  return result;
}

export default function OperatingCosts() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(makeDraft());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { tokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch<Data>('/api/admin/operating-costs', {}, () => tokenRef.current()));
      setError('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const startEdit = (id: string, entry?: Entry) => {
    setEditing(id);
    setDraft(makeDraft(entry));
    setNotice('');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch('/api/admin/operating-costs', {
        method: 'POST',
        body: JSON.stringify({
          provider: editing,
          amountMinor: pennies(draft.amount),
          monthlyBudgetMinor: pennies(draft.budget),
          currency: draft.currency,
          billingPeriod: draft.billingPeriod,
          invoiceDate: draft.invoiceDate.trim() || null,
          note: draft.note.trim(),
        }),
      }, () => tokenRef.current());
      setEditing(null);
      setNotice('Invoice and budget record saved.');
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data && !error) return <LoadingScreen label="Loading BuildPair operating costs…" />;
  const rows = data?.entries ?? [];
  const recorded = rows.filter((entry) => entry.amountMinor != null).length;
  const budgeted = rows.filter((entry) => entry.monthlyBudgetMinor != null).length;
  const media = data?.usage.cloudinary;

  return <Screen title="Operating costs" subtitle="Protect BuildPair from surprise bills. Provider usage is shown when verifiable; invoices and budgets are recorded by the owner.">
    <View style={styles.toolbar}>
      <Button mode="contained" loading={loading} disabled={loading} onPress={() => void load()}>Refresh usage</Button>
      {data ? <Chip>Checked {new Date(data.generatedAt).toLocaleString('en-GB')}</Chip> : null}
    </View>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}
    {notice ? <Text style={styles.good}>{notice}</Text> : null}

    <AppCard>
      <Text variant="titleLarge" style={styles.title}>Monthly cost overview</Text>
      <Text style={styles.muted}>A missing invoice is unknown, not £0. Live billing statements must be checked with each provider. Budgets here are tracking targets, not automatic payment limits.</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text variant="headlineSmall" style={styles.value}>{recorded}/{PROVIDERS.length}</Text>
          <Text style={styles.muted}>Services with recorded invoices</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="headlineSmall" style={styles.value}>{budgeted}/{PROVIDERS.length}</Text>
          <Text style={styles.muted}>Services with budgets set</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="headlineSmall" style={styles.value}>{data?.usage.aiCalls24h ?? '—'}</Text>
          <Text style={styles.muted}>AI provider calls in 24 hours</Text>
        </View>
      </View>
    </AppCard>

    <Text variant="titleLarge" style={styles.section}>Live usage signals</Text>
    <View style={styles.grid}>
      <AppCard style={styles.card}>
        <Text variant="titleMedium" style={styles.title}>Gemini calls</Text>
        <Text variant="headlineSmall" style={styles.value}>{numberFormat.format(data?.usage.aiCallsMonth ?? 0)}</Text>
        <Text style={styles.muted}>Recorded provider calls this calendar month. These are requests, not token charges or an invoice.</Text>
      </AppCard>
      <AppCard style={styles.card}>
        <Text variant="titleMedium" style={styles.title}>BuildPair emails</Text>
        <Text variant="headlineSmall" style={styles.value}>{numberFormat.format(data?.usage.emailsMonth ?? 0)}</Text>
        <Text style={styles.muted}>Sent events recorded inside BuildPair this month, not Resend’s entire account allowance.</Text>
      </AppCard>
      <AppCard style={styles.card}>
        <Text variant="titleMedium" style={styles.title}>Cloudinary credits</Text>
        <Text variant="headlineSmall" style={styles.value}>{media?.state === 'live' && media.creditsUsed != null ? `${media.creditsUsed.toFixed(2)} / ${media.creditsLimit ?? '?'}` : 'Unavailable'}</Text>
        <Text style={styles.muted}>{media?.state === 'live' ? `${media.plan ?? 'Cloudinary'} plan · live usage, not cash billed` : media?.detail ?? 'Could not check media usage.'}</Text>
      </AppCard>
    </View>

    <Text variant="titleLarge" style={styles.section}>Services, invoices & budgets</Text>
    <Text style={styles.muted}>Add the latest invoice and a monthly spending target for each provider. Keep currencies separate; annual renewals are not counted as monthly charges.</Text>
    <View style={styles.grid}>
      {PROVIDERS.map((provider) => {
        const row = rows.find((item) => item.provider === provider.id);
        const active = editing === provider.id;
        return <AppCard key={provider.id} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={styles.title}>{provider.name}</Text>
              <Text style={styles.muted}>{provider.role}</Text>
            </View>
            <Chip>{row?.amountMinor != null ? 'Recorded' : 'Not recorded'}</Chip>
          </View>
          <Text style={styles.label}>Last entered invoice</Text>
          <Text variant="titleLarge" style={styles.value}>{amount(row?.amountMinor ?? null, row?.currency ?? 'GBP')}</Text>
          {row?.amountMinor != null ? <Text style={styles.muted}>{row.billingPeriod} · {row.invoiceDate ?? 'Date not recorded'}</Text> : null}
          <Text style={styles.label}>Monthly budget</Text>
          <Text style={styles.muted}>{amount(row?.monthlyBudgetMinor ?? null, row?.currency ?? 'GBP')}</Text>
          {row?.note ? <Text style={styles.muted}>{row.note}</Text> : null}
          {active ? <View style={styles.form}>
            <TextInput label="Latest invoice (pounds / dollars)" mode="outlined" keyboardType="decimal-pad" value={draft.amount} onChangeText={(amount) => setDraft((state) => ({ ...state, amount }))} style={styles.input} />
            <TextInput label="Monthly budget (same currency)" mode="outlined" keyboardType="decimal-pad" value={draft.budget} onChangeText={(budget) => setDraft((state) => ({ ...state, budget }))} style={styles.input} />
            <Text style={styles.label}>Currency</Text>
            <View style={styles.buttons}>
              {(['GBP', 'USD'] as const).map((currency) => <Button key={currency} compact mode={draft.currency === currency ? 'contained' : 'outlined'} onPress={() => setDraft((state) => ({ ...state, currency }))}>{currency}</Button>)}
            </View>
            <Text style={styles.label}>Billing interval</Text>
            <View style={styles.buttons}>
              {(['monthly', 'annual', 'usage', 'one-off'] as const).map((billingPeriod) => <Button key={billingPeriod} compact mode={draft.billingPeriod === billingPeriod ? 'contained' : 'outlined'} onPress={() => setDraft((state) => ({ ...state, billingPeriod }))}>{billingPeriod}</Button>)}
            </View>
            <TextInput label="Invoice date (YYYY-MM-DD)" mode="outlined" value={draft.invoiceDate} onChangeText={(invoiceDate) => setDraft((state) => ({ ...state, invoiceDate }))} style={styles.input} />
            <TextInput label="Notes (optional)" mode="outlined" multiline value={draft.note} onChangeText={(note) => setDraft((state) => ({ ...state, note }))} style={styles.input} />
            <View style={styles.buttons}>
              <Button mode="contained" loading={saving} disabled={saving} onPress={() => void save()}>Save record</Button>
              <Button mode="text" disabled={saving} onPress={() => setEditing(null)}>Cancel</Button>
            </View>
          </View> : <View style={styles.buttons}>
            <Button mode="outlined" onPress={() => startEdit(provider.id, row)}>Edit costs</Button>
            <Link href={provider.url as never} asChild><Button mode="text">Provider billing ↗</Button></Link>
          </View>}
        </AppCard>;
      })}
    </View>

    <AppCard>
      <Text variant="titleMedium" style={styles.title}>How accurate is this page?</Text>
      <Text style={styles.muted}>Cloudinary credits and internal request/event counts are live when available. Invoices and budgets are owner-entered; we do not have authenticated access to every provider’s billing API from the running website. The costs page is private to administrators, and only the BuildPair owner can edit invoices or budgets.</Text>
      <Link href="/admin/system" asChild><Button mode="text">Check system health ↗</Button></Link>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  section: { color: colors.charcoal, fontWeight: '800', marginTop: 10 },
  title: { color: colors.charcoal, fontWeight: '800' },
  value: { color: colors.charcoal, fontWeight: '800' },
  muted: { color: colors.muted, lineHeight: 21 },
  good: { color: '#287A52', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flex: 1, minWidth: 0, flexBasis: 330, maxWidth: '100%', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1, minWidth: 0, flexBasis: 180 },
  label: { color: colors.muted, fontWeight: '700', marginTop: 5 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  form: { gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  input: { width: '100%', backgroundColor: colors.surfaceRaised },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  stat: { flex: 1, flexBasis: 155, minWidth: 0, gap: 2 },
});
