import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type HomeRecordItem = {
  id: string;
  jobId: string;
  entryType: 'handover' | 'warranty' | 'aftercare' | 'document' | 'snag';
  title: string;
  body: string;
  status: string;
  mediaUrl: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type HomeProject = {
  jobId: string;
  title: string;
  category: string;
  propertyType: string;
  postcode: string | null;
  status: 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  accessNotes: string | null;
  traderId: string | null;
  traderProfileId: string | null;
  businessName: string | null;
  tradeCategory: string | null;
  records: HomeRecordItem[];
};

type HomeRecordResponse = { projects: HomeProject[] };
type PropertyGroup = { key: string; label: string; projects: HomeProject[] };

function propertyKey(project: HomeProject) {
  if (project.addressLine1 && project.townCity) return `${project.addressLine1.trim().toLowerCase()}|${project.townCity.trim().toLowerCase()}|${project.postcode ?? ''}`;
  if (project.postcode) return `postcode:${project.postcode.replace(/\s/g, '').toUpperCase()}`;
  return `job:${project.jobId}`;
}

function propertyLabel(project: HomeProject) {
  const exact = [project.addressLine1, project.addressLine2, project.townCity, project.postcode].filter(Boolean).join(', ');
  if (exact) return exact;
  return project.postcode ? `Property near ${project.postcode}` : 'Property details not saved';
}

function recordLabel(type: HomeRecordItem['entryType']) {
  if (type === 'aftercare') return 'Aftercare';
  if (type === 'warranty') return 'Warranty';
  if (type === 'handover') return 'Handover';
  if (type === 'snag') return 'Snagging';
  return 'Document';
}

export default function HomeRecordScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiFetch<HomeRecordResponse>('/api/home-record', {}, getToken);
      setProjects(result.projects);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const properties = useMemo<PropertyGroup[]>(() => {
    const grouped = new Map<string, PropertyGroup>();
    for (const project of projects) {
      const key = propertyKey(project);
      const current = grouped.get(key);
      if (current) current.projects.push(project);
      else grouped.set(key, { key, label: propertyLabel(project), projects: [project] });
    }
    return [...grouped.values()];
  }, [projects]);

  if (loading) return <LoadingScreen label="Building your home record…" />;

  const completed = projects.filter((project) => project.status === 'completed').length;
  const upcomingCare = projects.flatMap((project) => project.records
    .filter((record) => ['warranty', 'aftercare'].includes(record.entryType) && record.dueAt)
    .map((record) => ({ project, record })))
    .filter(({ record }) => !['done', 'approved', 'archived'].includes(record.status))
    .sort((a, b) => new Date(a.record.dueAt!).getTime() - new Date(b.record.dueAt!).getTime());
  const openFollowUps = projects.flatMap((project) => project.records).filter((record) => ['warranty', 'aftercare', 'snag'].includes(record.entryType) && !['done', 'approved'].includes(record.status)).length;

  return <Screen title="Home Record · Property Passport" subtitle="Save the property once, then keep projects, handover details, warranties, maintenance dates and repeat work attached to the home instead of scattered across old emails and camera rolls.">
    <View style={styles.stats}>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{properties.length}</Text><Text style={styles.statLabel}>Propert{properties.length === 1 ? 'y' : 'ies'}</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{completed}</Text><Text style={styles.statLabel}>Completed projects</Text></AppCard>
      <AppCard style={styles.stat}><Text variant="headlineMedium" style={styles.statNumber}>{openFollowUps}</Text><Text style={styles.statLabel}>Follow-ups to keep</Text></AppCard>
    </View>

    <View style={styles.actions}>
      <Button mode="contained" icon="home-edit-outline" onPress={() => router.push('/customer/properties')}>Manage saved properties</Button>
      <Button mode="outlined" icon="bell-alert-outline" onPress={() => router.push('/customer/attention')}>Needs attention</Button>
    </View>

    {upcomingCare.length ? <AppCard style={styles.careCard}>
      <Text style={styles.eyebrow}>UPCOMING HOME CARE</Text>
      <Text variant="titleLarge" style={styles.title}>Warranty & maintenance dates worth remembering</Text>
      <Text style={styles.muted}>BuildPair keeps future aftercare with the project that created it, so a useful reminder does not become another random calendar note.</Text>
      {upcomingCare.slice(0, 5).map(({ project, record }) => <View key={record.id} style={styles.recordRow}>
        <Chip compact icon="calendar-clock">{record.entryType === 'warranty' ? 'Warranty' : 'Aftercare'}</Chip>
        <View style={styles.flex}><Text style={styles.recordTitle}>{record.title}</Text><Text style={styles.muted}>{project.title} · due {new Date(record.dueAt!).toLocaleDateString('en-GB')}</Text></View>
        <Button compact mode="text" onPress={() => router.push(`/customer/jobs/${project.jobId}` as Href)}>Open</Button>
      </View>)}
    </AppCard> : null}

    {error ? <EmptyState title="Home Record needs attention" body={error} action={<Button onPress={() => void load()}>Try again</Button>} /> : null}
    {!error && !projects.length ? <EmptyState title="Your Home Record starts with your first awarded job" body="Once a job is awarded, BuildPair keeps the project record, shared handover notes, warranty details and aftercare together." action={<Button mode="contained" onPress={() => router.push('/customer/new-job')}>Post a job</Button>} /> : null}

    {properties.map((property) => <View key={property.key} style={styles.property}>
      <View style={styles.propertyHeader}>
        <View style={styles.flex}><Text style={styles.eyebrow}>PROPERTY</Text><Text variant="titleLarge" style={styles.title}>{property.label}</Text></View>
        <Chip icon="home-outline">{property.projects.length} project{property.projects.length === 1 ? '' : 's'}</Chip>
      </View>

      {property.projects.map((project) => {
        const followUps = project.records.filter((record) => ['warranty', 'aftercare', 'snag'].includes(record.entryType));
        return <AppCard key={project.jobId} style={project.status === 'in_progress' ? styles.activeCard : undefined}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleMedium" style={styles.title}>{project.title}</Text>
              <Text style={styles.muted}>{project.category} · {project.propertyType}{project.businessName ? ` · ${project.businessName}` : ''}</Text>
            </View>
            <Chip icon={project.status === 'completed' ? 'check-circle-outline' : 'progress-clock'}>{project.status === 'completed' ? 'Completed' : 'In progress'}</Chip>
          </View>

          {project.records.length ? <View style={styles.recordList}>
            {project.records.slice(0, 6).map((record) => <View key={record.id} style={styles.recordRow}>
              <Chip compact>{recordLabel(record.entryType)}</Chip>
              <View style={styles.flex}>
                <Text style={styles.recordTitle}>{record.title}</Text>
                {record.dueAt ? <Text style={styles.muted}>Due {new Date(record.dueAt).toLocaleDateString('en-GB')}</Text> : null}
              </View>
              <Text style={styles.recordStatus}>{record.status}</Text>
            </View>)}
            {project.records.length > 6 ? <Text style={styles.muted}>+ {project.records.length - 6} more records in the project</Text> : null}
          </View> : <Text style={styles.muted}>{project.status === 'completed' ? 'The project record is saved. Shared warranty, handover and aftercare items will appear here when recorded.' : 'Project records will build here as the job progresses.'}</Text>}

          {followUps.length ? <Text style={styles.followUp}>{followUps.length} warranty, aftercare or snagging item{followUps.length === 1 ? '' : 's'} kept with this project.</Text> : null}

          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => router.push(`/customer/jobs/${project.jobId}` as Href)}>{project.status === 'completed' ? 'View project record' : 'Continue project'}</Button>
            {project.status === 'completed' && project.traderId && project.businessName ? <Button mode="contained" icon="account-arrow-right" onPress={() => router.push({ pathname: '/customer/new-job', params: { traderId: project.traderId!, traderName: project.businessName!, tradeCategory: project.tradeCategory || project.category, repeatJobId: project.jobId } } as Href)}>Hire same trade again</Button> : null}
            {project.status === 'completed' ? <Button mode="text" icon="content-copy" onPress={() => router.push({ pathname: '/customer/new-job', params: { repeatJobId: project.jobId, tradeCategory: project.category } } as Href)}>Post similar job</Button> : null}
          </View>
        </AppCard>;
      })}
    </View>)}

    {projects.length ? <AppCard style={styles.privacyCard}>
      <Text variant="titleMedium" style={styles.title}>Your property history stays private</Text>
      <Text style={styles.muted}>The Home Record is for your account. Exact addresses are not published in the marketplace. Project participants only see the private job information they already have permission to access.</Text>
    </AppCard> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 160, minWidth: 145, alignItems: 'center' },
  statNumber: { color: colors.primary, fontWeight: '900' },
  statLabel: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
  property: { gap: spacing.sm },
  propertyHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  flex: { flex: 1, minWidth: 210, gap: 3 },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  activeCard: { borderColor: colors.primary, borderWidth: 2 },
  recordList: { gap: 8, paddingTop: 4 },
  recordRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  recordTitle: { color: colors.text, fontWeight: '700' },
  recordStatus: { color: colors.muted, fontSize: 12, textTransform: 'capitalize' },
  followUp: { color: colors.primaryDark, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  privacyCard: { backgroundColor: colors.surfaceSoft },
  careCard: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
});
