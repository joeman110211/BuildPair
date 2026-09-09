import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

type Profile = {
  id: string; userId: string; email: string | null; businessName: string; tradeCategory: string; tradeCategories: string[];
  subSkills: string[]; bio: string; radiusMiles: number; postcode: string | null; locationLabel: string | null; qualifications: string[];
  externalLinks: Record<string, string>; photos: string[]; selfCertified: boolean; subscriptionTier: string; subscriptionActive: boolean;
  stripeChargesEnabled: boolean; createdAt: string; updatedAt: string; template: string | null; colourTheme: string | null;
  coverPhotoUrl: string | null; profileImageUrl: string | null; logoUrl: string | null; yearsExperience: number | null;
  yearEstablished: number | null; serviceAreas: string[] | null; beforeAfterProjects: unknown; lastSeenAt: string | null;
  lastPath: string | null; onlineNow: boolean; reviewsCount: number; averageRating: string | number; profileViews: number; quotesCount: number; storiesCount: number;
};

function fmt(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function media(profile: Profile) {
  return [profile.coverPhotoUrl, profile.profileImageUrl, profile.logoUrl, ...(profile.photos ?? [])].filter((value): value is string => Boolean(value));
}

export default function AdminProfilesScreen() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const [rows, setRows] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  if (loading) return <LoadingScreen label="Loading trade profiles…" />;

  return <Screen title="Trade profiles" subtitle="Inspect every tradesperson profile, uploaded images, public information, membership state and marketplace usage.">
    <AppCard>
      <TextInput mode="outlined" label="Search business, email, trade or bio" value={search} onChangeText={setSearch} left={<TextInput.Icon icon="magnify" />} />
      <Text style={styles.muted}>{rows.length} profiles · {totalPhotos} profile images</Text>
      <Button icon="refresh" onPress={() => void load()}>Refresh</Button>
    </AppCard>
    {error ? <HelperText type="error" visible>{error}</HelperText> : null}

    {rows.map((profile) => {
      const images = media(profile);
      return <AppCard key={profile.id}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="titleLarge" style={styles.title}>{profile.businessName}</Text>
            <Text>{profile.email ?? profile.userId}</Text>
            <Text style={styles.muted}>{profile.tradeCategories?.length ? profile.tradeCategories.join(', ') : profile.tradeCategory}</Text>
            <Text style={styles.muted}>{profile.locationLabel ?? profile.postcode ?? 'Location not recorded'} · {profile.radiusMiles} mile radius</Text>
          </View>
          <View style={styles.chips}>
            {profile.onlineNow ? <Chip icon="access-point">Online</Chip> : null}
            <Chip>{profile.subscriptionTier}</Chip>
            {profile.subscriptionActive ? <Chip>Subscription active</Chip> : null}
            {profile.stripeChargesEnabled ? <Chip>Stripe enabled</Chip> : null}
          </View>
        </View>

        <Text>{profile.bio || 'No bio entered.'}</Text>
        <View style={styles.chips}><Chip>{profile.reviewsCount} reviews</Chip><Chip>{profile.averageRating || 0}★ average</Chip><Chip>{profile.profileViews} profile views</Chip><Chip>{profile.quotesCount} quotes</Chip><Chip>{profile.storiesCount} stories</Chip></View>
        {profile.qualifications?.length ? <Text style={styles.muted}>Qualifications: {profile.qualifications.join(', ')}</Text> : null}
        {profile.serviceAreas?.length ? <Text style={styles.muted}>Service areas: {profile.serviceAreas.join(', ')}</Text> : null}
        {profile.yearsExperience ? <Text style={styles.muted}>Experience: {profile.yearsExperience} years{profile.yearEstablished ? ` · established ${profile.yearEstablished}` : ''}</Text> : null}
        <Text style={styles.muted}>Last seen {fmt(profile.lastSeenAt)}{profile.lastPath ? ` · ${profile.lastPath}` : ''}</Text>

        {images.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>{images.map((url) => <Image key={url} source={{ uri: url }} style={styles.photo} />)}</ScrollView> : <Text style={styles.muted}>No profile media uploaded.</Text>}
        <Text selectable style={styles.id}>{profile.userId}</Text>
      </AppCard>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  flex: { flex: 1, minWidth: 240, gap: 3 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photos: { gap: 8, paddingVertical: 4 },
  photo: { width: 170, height: 120, borderRadius: 12, backgroundColor: colors.border },
  id: { color: colors.muted, fontFamily: 'monospace', fontSize: 11 },
});