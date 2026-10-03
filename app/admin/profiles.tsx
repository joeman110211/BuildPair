import { useAuth } from '@clerk/expo';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Divider, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Profile = {
  id: string;
  userId: string;
  email: string | null;
  businessName: string;
  tradeCategory: string;
  tradeCategories: string[];
  subSkills: string[];
  serviceSelections: Record<string, string[]> | null;
  bio: string;
  radiusMiles: number;
  postcode: string | null;
  locationLabel: string | null;
  qualifications: string[];
  externalLinks: Record<string, string>;
  photos: string[];
  selfCertified: boolean;
  subscriptionTier: string;
  subscriptionActive: boolean;
  stripeChargesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  template: string | null;
  colourTheme: string | null;
  coverPhotoUrl: string | null;
  profileImageUrl: string | null;
  logoUrl: string | null;
  yearsExperience: number | null;
  yearEstablished: number | null;
  serviceAreas: string[] | null;
  beforeAfterProjects: unknown;
  lastSeenAt: string | null;
  lastPath: string | null;
  onlineNow: boolean;
  projectReviewsCount: number;
  externalReviewsCount: number;
  reviewsCount: number;
  averageRating: string | number;
  profileViews: number;
  profileViews30d: number;
  quotesCount: number;
  acceptedJobsCount: number;
  completedJobsCount: number;
  storiesCount: number;
  verifiedCredentialsCount: number;
};

function fmt(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function media(profile: Profile) {
  return [profile.coverPhotoUrl, profile.profileImageUrl, profile.logoUrl, ...(profile.photos ?? [])]
    .filter((value): value is string => Boolean(value));
}

function categoryList(profile: Profile) {
  return profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
}

function serviceCount(profile: Profile) {
  const selections = profile.serviceSelections ?? {};
  const selected = Object.values(selections).reduce((sum, services) => sum + (services?.length ?? 0), 0);
  return selected || profile.subSkills?.length || 0;
}

function profileCompleteness(profile: Profile) {
  const checks = [
    Boolean(profile.bio?.trim()),
    Boolean(profile.locationLabel || profile.postcode),
    categoryList(profile).length > 0,
    Boolean(profile.coverPhotoUrl),
    Boolean(profile.profileImageUrl || profile.logoUrl),
    (profile.photos?.length ?? 0) >= 3,
    Boolean(profile.serviceAreas?.length),
    Boolean(profile.yearsExperience),
    Boolean(profile.verifiedCredentialsCount || profile.qualifications?.length),
    Object.values(profile.externalLinks ?? {}).some(Boolean),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function AdminProfilesScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ q: search.trim(), limit: '300' });
      setRows(await apiFetch<Profile[]>(`/api/admin/profiles?${params.toString()}`, {}, () => getTokenRef.current()));
      setError('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);

  const totalPhotos = useMemo(() => rows.reduce((sum, row) => sum + media(row).length, 0), [rows]);
  const activeProfiles = useMemo(() => rows.filter((row) => row.subscriptionActive).length, [rows]);
  if (loading) return <LoadingScreen label="Loading trade profiles…" />;

  return <Screen title="Trade profiles" subtitle="Open the exact public profile, inspect its layout and media, and monitor profile quality, activity, reviews and marketplace performance.">
    <AppCard style={styles.searchCard}>
      <TextInput mode="outlined" label="Search business, email, trade or bio" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <View style={styles.chips}>
        <Chip>{rows.length} profiles</Chip>
        <Chip>{activeProfiles} active</Chip>
        <Chip>{totalPhotos} profile images</Chip>
      </View>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {rows.map((profile) => {
      const images = media(profile);
      const categories = categoryList(profile);
      const expanded = expandedProfileId === profile.id;
      const beforeAfterCount = Array.isArray(profile.beforeAfterProjects) ? profile.beforeAfterProjects.length : 0;
      const links = Object.entries(profile.externalLinks ?? {}).filter(([, value]) => Boolean(value));
      const completeness = profileCompleteness(profile);

      return <AppCard key={profile.id} style={styles.profileCard}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="titleLarge" style={styles.title}>{profile.businessName}</Text>
            <Text>{profile.email ?? profile.userId}</Text>
            <Text style={styles.muted}>{categories.slice(0, 4).join(', ')}{categories.length > 4 ? ` +${categories.length - 4} more` : ''}</Text>
            <Text style={styles.muted}>{profile.locationLabel ?? profile.postcode ?? 'Location not recorded'} · {profile.radiusMiles} mile radius</Text>
          </View>
          <View style={styles.chips}>
            {profile.onlineNow ? <Chip icon="access-point">Online</Chip> : null}
            <Chip>{profile.subscriptionTier}</Chip>
            {profile.subscriptionActive ? <Chip icon="check-circle">Active</Chip> : <Chip icon="alert-circle-outline">Inactive</Chip>}
            {profile.stripeChargesEnabled ? <Chip icon="credit-card-check-outline">Stripe</Chip> : null}
            <Chip icon="account-check-outline">{completeness}% complete</Chip>
          </View>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{profile.profileViews30d}</Text><Text style={styles.metricLabel}>views · 30d</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{profile.profileViews}</Text><Text style={styles.metricLabel}>views · total</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{profile.quotesCount}</Text><Text style={styles.metricLabel}>quotes</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{profile.acceptedJobsCount}</Text><Text style={styles.metricLabel}>accepted jobs</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{profile.completedJobsCount}</Text><Text style={styles.metricLabel}>completed jobs</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{Number(profile.averageRating || 0).toFixed(1)}★</Text><Text style={styles.metricLabel}>{profile.reviewsCount} reviews</Text></View>
        </View>

        <View style={styles.actions}>
          <Button mode="contained-tonal" icon="account-eye-outline" onPress={() => router.push(`/traders/${profile.id}` as Href)}>Open public profile</Button>
          <Button mode="outlined" icon={expanded ? 'chevron-up' : 'chevron-down'} onPress={() => setExpandedProfileId(expanded ? null : profile.id)}>{expanded ? 'Hide inspection' : 'Inspect profile'}</Button>
        </View>

        <Text style={styles.muted}>Last seen {fmt(profile.lastSeenAt)}{profile.lastPath ? ` · ${profile.lastPath}` : ''}</Text>

        {expanded ? <View style={styles.inspection}>
          <Divider />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Public write-up</Text>
              <Chip>{profile.bio?.trim().length ?? 0} characters</Chip>
            </View>
            <Text style={styles.bio}>{profile.bio || 'No bio entered.'}</Text>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Layout & profile setup</Text>
            <View style={styles.chips}>
              <Chip icon="view-dashboard-outline">Template: {profile.template ?? 'classic'}</Chip>
              <Chip icon="palette-outline">Theme: {profile.colourTheme ?? 'default'}</Chip>
              <Chip>{categories.length} categories</Chip>
              <Chip>{serviceCount(profile)} services</Chip>
              <Chip>{profile.photos?.length ?? 0} gallery photos</Chip>
              <Chip>{beforeAfterCount} before/after projects</Chip>
            </View>
            <View style={styles.categoryWrap}>{categories.map((category) => <Chip key={category} compact>{category}</Chip>)}</View>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Profile media</Text>
            {profile.coverPhotoUrl ? <View style={styles.coverBlock}><Text style={styles.mediaLabel}>Cover photo</Text><Image source={{ uri: profile.coverPhotoUrl }} style={styles.coverPhoto} /></View> : <Text style={styles.warning}>No cover photo uploaded.</Text>}
            <View style={styles.identityMedia}>
              {profile.profileImageUrl ? <View style={styles.mediaBox}><Text style={styles.mediaLabel}>Profile photo</Text><Image source={{ uri: profile.profileImageUrl }} style={styles.squarePhoto} /></View> : null}
              {profile.logoUrl ? <View style={styles.mediaBox}><Text style={styles.mediaLabel}>Logo</Text><Image source={{ uri: profile.logoUrl }} style={styles.squarePhoto} /></View> : null}
            </View>
            {profile.photos?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{profile.photos.map((url, index) => <View key={`${url}-${index}`} style={styles.galleryItem}><Text style={styles.mediaLabel}>Gallery {index + 1}</Text><Image source={{ uri: url }} style={styles.photo} /></View>)}</ScrollView> : <Text style={styles.warning}>No gallery photos uploaded.</Text>}
            {!images.length ? <Text style={styles.warning}>No profile media uploaded at all.</Text> : null}
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Reviews & trust</Text>
            <View style={styles.chips}>
              <Chip>{profile.reviewsCount} total verified reviews</Chip>
              <Chip>{profile.projectReviewsCount} BuildPair job reviews</Chip>
              <Chip>{profile.externalReviewsCount} verified external reviews</Chip>
              <Chip>{profile.verifiedCredentialsCount} verified credentials</Chip>
              <Chip>{profile.qualifications?.length ?? 0} declared qualifications</Chip>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Business details</Text>
            <Text style={styles.muted}>Experience: {profile.yearsExperience ?? 0} years{profile.yearEstablished ? ` · established ${profile.yearEstablished}` : ''}</Text>
            <Text style={styles.muted}>Service areas: {profile.serviceAreas?.length ? profile.serviceAreas.join(', ') : 'None entered'}</Text>
            <Text style={styles.muted}>Stories: {profile.storiesCount} · Created {fmt(profile.createdAt)} · Last updated {fmt(profile.updatedAt)}</Text>
            {links.length ? <View style={styles.linkList}>{links.map(([name, url]) => <Text key={name} selectable style={styles.linkLine}>{name}: {url}</Text>)}</View> : <Text style={styles.muted}>No external links entered.</Text>}
          </View>

          <View style={styles.adminFoot}>
            <Text selectable style={styles.id}>Profile ID: {profile.id}</Text>
            <Text selectable style={styles.id}>User ID: {profile.userId}</Text>
          </View>
        </View> : null}
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  searchCard: { gap: 10 },
  profileCard: { gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  flex: { flex: 1, minWidth: 0, flexBasis: 240, flexShrink: 1, maxWidth: '100%', gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  warning: { color: colors.muted, fontStyle: 'italic' },
  bio: { color: colors.charcoalSoft, lineHeight: 23 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { minWidth: 108, flexGrow: 1, padding: 10, borderRadius: 12, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.charcoal, fontSize: 18, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  inspection: { gap: 16 },
  section: { gap: 9 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { color: colors.charcoal, fontWeight: '900' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  coverBlock: { gap: 5 },
  coverPhoto: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.border, resizeMode: 'cover' },
  identityMedia: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mediaBox: { gap: 5 },
  mediaLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  squarePhoto: { width: 120, height: 120, borderRadius: 14, backgroundColor: colors.border, resizeMode: 'cover' },
  photos: { gap: 10, paddingVertical: 4 },
  galleryItem: { gap: 5 },
  photo: { width: 180, height: 128, borderRadius: 12, backgroundColor: colors.border, resizeMode: 'cover' },
  linkList: { gap: 4 },
  linkLine: { color: colors.charcoalSoft, fontSize: 12 },
  adminFoot: { gap: 3, paddingTop: 4 },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});
