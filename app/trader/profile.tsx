import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { DeleteAccountCard } from '@/components/DeleteAccountCard';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { apiFetch, ApiError, errorMessage } from '@/lib/api';
import type { TraderProfile } from '@/types';

export default function TraderProfileHub() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const router = useRouter();
  const [profile, setProfile] = useState<TraderProfile>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try { setLoading(true); setError(''); setProfile(await apiFetch<TraderProfile>('/api/me/profile', {}, () => getTokenRef.current())); }
    catch (e) { if (!(e instanceof ApiError && e.status === 404)) setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <Screen title="Build your tradesperson profile" subtitle="Give homeowners enough useful information to understand your business and the work you offer."><EmptyState title="Your profile is waiting" body="Add your trade categories, service area, business details and examples of your work before publishing." action={<Link href="/trader/onboarding" asChild><Button mode="contained">Build my profile</Button></Link>} /></Screen>;

  const planLabel = profile.subscriptionTier === 'featured' ? 'BuildPair Pro' : profile.subscriptionTier === 'basic' ? 'BuildPair Plus' : 'Starter';
  const ratingLabel = profile.reviewCount ? `${profile.averageRating.toFixed(1)} ★ · ${profile.reviewCount} review${profile.reviewCount === 1 ? '' : 's'}` : 'New profile · no reviews yet';

  return <Screen title="Business profile" subtitle="Manage the public identity, trust information and business tools connected to your BuildPair trade account.">
    <AppCard style={styles.profileCard}>
      {profile.coverPhotoUrl ? <Image source={{ uri: profile.coverPhotoUrl }} style={styles.cover} accessibilityLabel={`${profile.businessName} cover`} /> : <View style={styles.coverFallback}><Text style={styles.coverFallbackText}>Add a strong cover photo of completed work</Text></View>}
      <View style={styles.identity}>
        {profile.profileImageUrl ? <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} accessibilityLabel={`${profile.businessName} profile`} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{profile.businessName.slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.flex}>
          <View style={styles.identityTop}><Text style={styles.eyebrow}>PUBLIC BUSINESS PROFILE</Text><View style={styles.planPill}><Text style={styles.planText}>{planLabel}</Text></View></View>
          <Text variant="headlineSmall" style={styles.title}>{profile.businessName}</Text>
          <Text style={styles.muted}>{profile.tradeCategory}{profile.locationLabel ? ` · ${profile.locationLabel}` : ''}</Text>
          <View style={styles.chips}><Chip compact>{ratingLabel}</Chip><Chip compact>{profile.radiusMiles} mile radius</Chip></View>
        </View>
      </View>
    </AppCard>

    <View style={styles.primaryActions}>
      <Link href="/trader/onboarding" asChild><Button mode="contained">Edit profile</Button></Link>
      <Button mode="outlined" onPress={() => router.push(`/(public)/traders/${profile.id}` as Href)}>View public profile</Button>
      <Link href="/trader/subscription" asChild><Button mode="outlined">Membership & payouts</Button></Link>
    </View>

    <View style={styles.toolGrid}>
      <AppCard style={[styles.toolCard, styles.toolTrust]}>
        <Text style={styles.eyebrow}>TRUST & AVAILABILITY</Text>
        <Text variant="titleLarge" style={styles.title}>Credentials and working availability</Text>
        <Text style={styles.muted}>Submit supporting evidence, review verification status and show when you may be available for work.</Text>
        <Link href="/trader/trust" asChild><Button mode="text">Open trust tools →</Button></Link>
      </AppCard>
      <AppCard style={[styles.toolCard, styles.toolPortfolio]}>
        <Text style={styles.eyebrow}>PORTFOLIO</Text>
        <Text variant="titleLarge" style={styles.title}>Project stories</Text>
        <Text style={styles.muted}>Turn completed work into useful case studies with area, duration, photos and a proper project narrative.</Text>
        <Link href="/trader/stories" asChild><Button mode="text">Manage project stories →</Button></Link>
      </AppCard>
      <AppCard style={[styles.toolCard, styles.toolAnalytics]}>
        <Text style={styles.eyebrow}>BUSINESS INSIGHT</Text>
        <Text variant="titleLarge" style={styles.title}>Analytics</Text>
        <Text style={styles.muted}>Review profile views, leads, quote activity, wins, value and response performance where your plan includes analytics.</Text>
        <Link href="/trader/analytics" asChild><Button mode="text">View analytics →</Button></Link>
      </AppCard>
      <AppCard style={[styles.toolCard, styles.toolAlerts]}>
        <Text style={styles.eyebrow}>JOB DISCOVERY</Text>
        <Text variant="titleLarge" style={styles.title}>Saved searches and alerts</Text>
        <Text style={styles.muted}>Save useful job criteria so relevant new work can be surfaced without repeatedly checking the whole board.</Text>
        <Link href="/trader/saved-searches" asChild><Button mode="text">Manage job alerts →</Button></Link>
      </AppCard>
    </View>

    <AppCard>
      <Text style={styles.eyebrow}>PROFILE QUALITY</Text>
      <Text variant="titleLarge" style={styles.title}>A stronger profile gives homeowners more to judge</Text>
      <View style={styles.strengthGrid}>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{profile.bio?.length >= 50 ? '✓' : '○'}</Text><Text style={styles.strengthText}>Business bio</Text></View>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{profile.photos?.length ? '✓' : '○'}</Text><Text style={styles.strengthText}>Work gallery</Text></View>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{profile.qualifications?.length ? '✓' : '○'}</Text><Text style={styles.strengthText}>Declared qualifications</Text></View>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{profile.profileImageUrl ? '✓' : '○'}</Text><Text style={styles.strengthText}>Profile image</Text></View>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{profile.coverPhotoUrl ? '✓' : '○'}</Text><Text style={styles.strengthText}>Cover image</Text></View>
        <View style={styles.strengthItem}><Text style={styles.strengthStatus}>{(profile.verifiedCredentialCount ?? 0) > 0 ? '✓' : '○'}</Text><Text style={styles.strengthText}>Verified credential evidence</Text></View>
      </View>
      <Text style={styles.muted}>Declared qualifications and BuildPair-reviewed credential evidence are shown separately so customers are not encouraged to confuse a profile claim with verification.</Text>
    </AppCard>

    {error ? <EmptyState title="Something needs attention" body={error} action={<Button onPress={load}>Try again</Button>} /> : null}
    <DeleteAccountCard />
  </Screen>;
}

const styles = StyleSheet.create({
  profileCard: { padding: 0, overflow: 'hidden' },
  cover: { width: '100%', height: 205, backgroundColor: colors.border },
  coverFallback: { width: '100%', height: 145, backgroundColor: colors.navy, justifyContent: 'flex-end', padding: 18 },
  coverFallbackText: { color: '#DDE8EF', fontWeight: '700', fontSize: 12 },
  identity: { padding: 19, flexDirection: 'row', alignItems: 'center', gap: 15, flexWrap: 'wrap' },
  avatar: { width: 82, height: 82, borderRadius: 25, backgroundColor: colors.border },
  avatarFallback: { width: 82, height: 82, borderRadius: 25, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
  flex: { flex: 1, minWidth: 220, gap: 5 },
  identityTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  planPill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  planText: { color: colors.primaryDark, fontWeight: '900', fontSize: 10 },
  title: { fontWeight: '900', color: colors.charcoal },
  muted: { color: colors.muted, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  primaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  toolCard: { flexGrow: 1, flexBasis: 300, minWidth: 265 },
  toolTrust: { backgroundColor: colors.accentSoft, borderColor: '#CDE2DE' },
  toolPortfolio: { backgroundColor: colors.primarySoft, borderColor: '#F2D7C3' },
  toolAnalytics: { backgroundColor: colors.blueSoft, borderColor: '#D4E1E9' },
  toolAlerts: { backgroundColor: colors.goldSoft, borderColor: '#ECDDBF' },
  strengthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strengthItem: { flexGrow: 1, flexBasis: 180, minWidth: 160, borderRadius: 15, backgroundColor: colors.surfaceSoft, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  strengthStatus: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  strengthText: { color: colors.charcoalSoft, fontWeight: '700', flex: 1 },
});
