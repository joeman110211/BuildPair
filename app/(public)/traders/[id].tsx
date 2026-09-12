import { useAuth } from '@clerk/expo';
import { type Href, Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ImageBackground, Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Divider, ProgressBar, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { ProfileShareButtons } from '@/components/ProfileShareButtons';
import { EmptyState, LoadingScreen, Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch, errorMessage } from '@/lib/api';
import type { AvailabilitySlot, ProjectStory, TraderCredential, TraderProfile } from '@/types';

type ProfileResult = Omit<TraderProfile, 'qualifications'> & {
  qualifications: string[];
  reviews: { id: string; rating: number; comment: string; createdAt: string }[];
  credentials: TraderCredential[];
  availability: AvailabilitySlot[];
  stories: ProjectStory[];
  savedByViewer: boolean;
  contact: { email: string | null; phone: string | null } | null;
  contactLocked: boolean;
};

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=82';

function planLabel(profile: ProfileResult) {
  if (profile.subscriptionTier === 'featured' && profile.isSubscriptionActive) return 'PRO MEMBER';
  if (profile.subscriptionTier === 'basic' && profile.isSubscriptionActive) return 'PLUS MEMBER';
  return 'STARTER';
}

function serviceList(profile: ProfileResult) {
  const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
  const selected = categories.flatMap((category) => profile.serviceSelections?.[category] ?? []);
  return Array.from(new Set(selected.length ? selected : profile.subSkills)).slice(0, 8);
}

export default function TraderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { getToken, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const getTokenRef = useRef(getToken);
  const [profile, setProfile] = useState<ProfileResult>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);
  const load = useCallback(async () => {
    try {
      setError('');
      const tokenGetter = isSignedIn ? () => getTokenRef.current() : undefined;
      setProfile(await apiFetch(`/api/traders/${id}`, {}, tokenGetter));
    } catch (e) { setError(errorMessage(e)); }
  }, [id, isSignedIn]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function toggleSaved() {
    if (!profile || profile.shareOnly || !user?.customerEnabled) return;
    try {
      setSaving(true);
      setError('');
      const next = !profile.savedByViewer;
      await apiFetch('/api/saved-traders', { method: 'POST', body: JSON.stringify({ traderId: profile.userId, saved: next }) }, () => getTokenRef.current());
      setProfile({ ...profile, savedByViewer: next });
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }

  if (error && !profile) return <Screen><EmptyState title="Profile unavailable" body={error} /></Screen>;
  if (!profile) return <LoadingScreen />;

  const memberSince = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Recently';
  const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
  const services = serviceList(profile);
  const serviceAreas = profile.serviceAreas?.length ? profile.serviceAreas : profile.locationLabel ? [profile.locationLabel] : [];
  const beforeAfter = profile.beforeAfterProjects ?? [];
  const paidProfile = !profile.shareOnly && !profile.isPreview && profile.canRequestQuote !== false;
  const isPro = profile.subscriptionTier === 'featured' && profile.isSubscriptionActive;
  const cover = profile.coverPhotoUrl || profile.photos[0] || FALLBACK_COVER;
  const avatar = profile.profileImageUrl || profile.logoUrl || null;
  const quoteLink = { pathname: '/customer/new-job', params: { traderId: profile.userId, traderName: profile.businessName, tradeCategory: categories[0] } } as Href;

  const quoteButton = profile.isPreview
    ? <Button mode="outlined" icon="flask-outline" disabled style={styles.pill} contentStyle={styles.ctaContent}>Preview only</Button>
    : !paidProfile
      ? <Button mode="outlined" icon="lock-outline" disabled style={styles.pill} contentStyle={styles.ctaContent}>Quotes unavailable</Button>
      : isSignedIn && user?.customerEnabled
        ? <Link href={quoteLink} asChild><Button mode="contained" icon="send" style={styles.pill} contentStyle={styles.ctaContent}>Get a Quote</Button></Link>
        : <Link href="/auth/account" asChild><Button mode="contained" icon="send" style={styles.pill} contentStyle={styles.ctaContent}>{isSignedIn ? 'Enable Homeowner Mode' : 'Get a Quote'}</Button></Link>;

  const messageButton = profile.contact?.email
    ? <Button mode="outlined" icon="message-outline" style={styles.pill} contentStyle={styles.ctaContent} onPress={() => Linking.openURL(`mailto:${profile.contact?.email}`)}>Message</Button>
    : isSignedIn && user?.customerEnabled
      ? <Link href="/customer/messages" asChild><Button mode="outlined" icon="message-outline" style={styles.pill} contentStyle={styles.ctaContent}>Message</Button></Link>
      : <Link href="/auth/account" asChild><Button mode="outlined" icon="message-outline" style={styles.pill} contentStyle={styles.ctaContent}>Message</Button></Link>;

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: profile.reviews.filter((review) => review.rating === rating).length }));
  const maxRatingCount = Math.max(1, ...ratingCounts.map((item) => item.count));

  return <Screen contentStyle={styles.screenContent}>
    {profile.shareOnly ? <AppCard style={styles.noticeCard}>
      <Text variant="titleMedium" style={styles.heading}>Shared Starter profile</Text>
      <Text style={styles.muted}>This profile was shared directly by {profile.businessName}. Starter profiles are not listed in marketplace search and cannot receive BuildPair quote requests.</Text>
    </AppCard> : null}

    <View style={styles.hero}>
      <ImageBackground source={{ uri: cover }} style={[styles.heroCover, wide && styles.heroCoverWide]} imageStyle={styles.heroCoverImage}>
        <View style={styles.heroShade} />
        <View style={[styles.heroOverlay, wide && styles.heroOverlayWide]}>
          <View style={styles.brandPanel}>
            {profile.logoUrl ? <Image source={{ uri: profile.logoUrl }} style={styles.heroLogo} resizeMode="contain" /> : <View style={styles.heroMonogram}><Text style={styles.heroMonogramText}>{profile.businessName.slice(0, 1).toUpperCase()}</Text></View>}
            <Text style={styles.heroBusiness}>{profile.businessName}</Text>
            <Text style={styles.heroTrade}>{categories.join(' · ')}</Text>
            <View style={styles.badges}>
              <View style={[styles.badge, isPro ? styles.proBadge : styles.memberBadge]}><Text style={styles.badgeText}>{planLabel(profile)}</Text></View>
              {isPro ? <View style={[styles.badge, styles.featureBadge]}><Text style={styles.featureBadgeText}>FEATURED ELIGIBLE</Text></View> : null}
              {(profile.verifiedCredentialCount ?? 0) > 0 ? <View style={[styles.badge, styles.verifiedBadge]}><Text style={styles.verifiedBadgeText}>✓ VERIFIED CREDENTIALS</Text></View> : null}
            </View>
            <View style={styles.heroProofs}>
              <Text style={styles.heroProof}>✓ Clear services</Text>
              <Text style={styles.heroProof}>⌂ {profile.locationLabel || 'Local service area'}</Text>
              <Text style={styles.heroProof}>★ {profile.reviewCount ? `${profile.averageRating.toFixed(1)} rating` : 'New on BuildPair'}</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>

    <View style={[styles.identityBar, wide && styles.identityBarWide]}>
      <View style={styles.identityMain}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{profile.businessName.slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.identityText}>
          <Text variant="headlineSmall" style={styles.heading}>{profile.businessName}</Text>
          <Text style={styles.tradeSubtitle}>{categories.join(' · ')}</Text>
          <Text style={styles.muted}>{profile.locationLabel || 'United Kingdom'} · {profile.reviewCount ? `${profile.averageRating.toFixed(1)} ★ from ${profile.reviewCount} review${profile.reviewCount === 1 ? '' : 's'}` : 'New on BuildPair'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {quoteButton}
        {paidProfile ? messageButton : null}
        {paidProfile && user?.customerEnabled ? <Button mode="outlined" icon={profile.savedByViewer ? 'heart' : 'heart-outline'} style={styles.pill} contentStyle={styles.ctaContent} loading={saving} disabled={saving} onPress={() => void toggleSaved()}>{profile.savedByViewer ? 'Saved' : 'Save Profile'}</Button> : null}
      </View>
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}

    <View style={[styles.twoColumn, wide && styles.twoColumnWide]}>
      <View style={styles.mainColumn}>
        <AppCard style={styles.premiumCard}>
          <Text variant="titleLarge" style={styles.heading}>About {profile.businessName}</Text>
          <Text style={styles.bodyCopy}>{profile.bio || `Professional ${profile.tradeCategory.toLowerCase()} services for local homeowners.`}</Text>
          <View style={styles.trustPills}>
            <Chip icon="diamond-stone">Quality focused</Chip>
            <Chip icon="handshake-outline">Clear communication</Chip>
            <Chip icon="broom">Clean & organised</Chip>
            <Chip icon="account-heart-outline">Customer focused</Chip>
          </View>
        </AppCard>

        <AppCard style={styles.premiumCard}>
          <View style={styles.cardHeadingRow}><Text variant="titleLarge" style={styles.heading}>Services</Text><Text style={styles.muted}>{categories.join(' · ')}</Text></View>
          <View style={styles.serviceGrid}>
            {(services.length ? services : categories).map((service, index) => <View key={`${service}-${index}`} style={styles.serviceTile}>
              <View style={styles.serviceIcon}><Text style={styles.serviceIconText}>{service.slice(0, 1).toUpperCase()}</Text></View>
              <Text style={styles.serviceName}>{service}</Text>
            </View>)}
          </View>
        </AppCard>
      </View>

      <View style={styles.sideColumn}>
        <AppCard style={[styles.premiumCard, styles.verifyCard]}>
          <View style={styles.verifyTitleRow}><View style={styles.verifyIcon}><Text style={styles.verifyIconText}>✓</Text></View><View style={styles.flex}><Text variant="titleLarge" style={styles.heading}>Trust & verification</Text><Text style={styles.muted}>BuildPair profile signals</Text></View></View>
          {profile.credentials?.length ? profile.credentials.map((credential) => <View key={credential.id} style={styles.credentialRow}>
            <View style={styles.credentialMark}><Text style={styles.credentialMarkText}>✓</Text></View>
            <View style={styles.flex}><Text style={styles.credentialName}>{credential.name}</Text><Text style={styles.muted}>{credential.issuer || credential.credentialType.replaceAll('_', ' ')} · Verified by BuildPair</Text></View>
          </View>) : <View style={styles.credentialRow}><View style={styles.credentialMarkNeutral}><Text style={styles.credentialMarkNeutralText}>•</Text></View><View style={styles.flex}><Text style={styles.credentialName}>Credentials</Text><Text style={styles.muted}>No BuildPair-verified credentials published yet</Text></View></View>}
          <Divider />
          <View style={styles.credentialRow}><View style={styles.infoMark}><Text style={styles.infoMarkText}>⌖</Text></View><View style={styles.flex}><Text style={styles.credentialName}>Service area</Text><Text style={styles.muted}>{profile.locationLabel || 'See areas below'} · {profile.radiusMiles} mile radius</Text></View></View>
          <View style={styles.credentialRow}><View style={styles.infoMark}><Text style={styles.infoMarkText}>★</Text></View><View style={styles.flex}><Text style={styles.credentialName}>{planLabel(profile)}</Text><Text style={styles.muted}>{isPro ? 'Eligible for Featured Trades' : 'BuildPair membership'}</Text></View></View>
        </AppCard>
      </View>
    </View>

    <AppCard style={styles.premiumCard}>
      <Text variant="titleLarge" style={styles.heading}>Service Areas</Text>
      <Text style={styles.muted}>Based on this tradesperson’s published service area and working radius.</Text>
      <View style={styles.trustPills}>{(serviceAreas.length ? serviceAreas : [profile.locationLabel || 'Local area']).map((place) => <Chip key={place} icon="map-marker-outline">{place}</Chip>)}<Chip icon="map-marker-radius">Up to {profile.radiusMiles} miles</Chip></View>
    </AppCard>

    {profile.photos.length ? <AppCard style={styles.premiumCard}>
      <View style={styles.cardHeadingRow}><Text variant="titleLarge" style={styles.heading}>Portfolio</Text><Text style={styles.muted}>{profile.photos.length} work photo{profile.photos.length === 1 ? '' : 's'}</Text></View>
      <View style={styles.portfolioGrid}>{profile.photos.slice(0, 8).map((uri, index) => <Image key={`${uri}-${index}`} source={{ uri }} style={[styles.portfolioImage, index === 0 && styles.portfolioLead]} resizeMode="cover" />)}</View>
    </AppCard> : <AppCard style={styles.premiumCard}><Text variant="titleLarge" style={styles.heading}>Portfolio</Text><Text style={styles.muted}>This tradesperson has not added portfolio photos yet.</Text></AppCard>}

    {profile.stories?.length ? <>
      <Text variant="titleLarge" style={styles.sectionHeading}>Project Stories</Text>
      <View style={styles.storyGrid}>{profile.stories.map((story) => <AppCard key={story.id} style={styles.storyCard}>
        <Text variant="titleMedium" style={styles.heading}>{story.title}</Text>
        <Text style={styles.muted}>{[story.locationLabel, story.durationDays ? `${story.durationDays} days` : null].filter(Boolean).join(' · ')}</Text>
        <Text style={styles.bodyCopy}>{story.summary}</Text>
        <View style={styles.beforeAfterRow}>{story.beforePhotos[0] ? <Image source={{ uri: story.beforePhotos[0] }} style={styles.beforeAfterPhoto} /> : null}{story.afterPhotos[0] ? <Image source={{ uri: story.afterPhotos[0] }} style={styles.beforeAfterPhoto} /> : null}</View>
      </AppCard>)}</View>
    </> : null}

    {beforeAfter.length ? <>
      <Text variant="titleLarge" style={styles.sectionHeading}>Before & After</Text>
      {beforeAfter.map((project, index) => <AppCard key={`${project.before}-${index}`} style={styles.premiumCard}>{project.caption ? <Text variant="titleMedium" style={styles.heading}>{project.caption}</Text> : null}<View style={styles.beforeAfterRow}><View style={styles.flex}><Text style={styles.imageLabel}>Before</Text><Image source={{ uri: project.before }} style={styles.beforeAfterLarge} /></View><View style={styles.flex}><Text style={styles.imageLabel}>After</Text><Image source={{ uri: project.after }} style={styles.beforeAfterLarge} /></View></View></AppCard>)}
    </> : null}

    {profile.availability?.length ? <AppCard style={styles.premiumCard}>
      <Text variant="titleLarge" style={styles.heading}>Upcoming Availability</Text>
      <View style={styles.trustPills}>{profile.availability.slice(0, 6).map((slot) => <Chip key={slot.id} icon="calendar-check">{new Date(slot.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Chip>)}</View>
      <Text style={styles.muted}>Availability is published by the tradesperson and should be confirmed when arranging the job.</Text>
    </AppCard> : null}

    {paidProfile ? <>
      <Text variant="titleLarge" style={styles.sectionHeading}>Customer Reviews</Text>
      <AppCard style={styles.premiumCard}>
        <View style={styles.ratingSummary}><View><Text style={styles.bigRating}>{profile.averageRating.toFixed(1)}</Text><Text style={styles.stars}>★★★★★</Text><Text style={styles.muted}>{profile.reviewCount} verified review{profile.reviewCount === 1 ? '' : 's'}</Text></View><View style={styles.ratingBars}>{ratingCounts.map((item) => <View key={item.rating} style={styles.ratingRow}><Text style={styles.ratingLabel}>{item.rating} ★</Text><ProgressBar progress={item.count / maxRatingCount} color={colors.primary} style={styles.ratingBar} /><Text style={styles.ratingCount}>{item.count}</Text></View>)}</View></View>
      </AppCard>
      {profile.reviews.map((review) => <AppCard key={review.id} style={styles.premiumCard}><View style={styles.cardHeadingRow}><View><Text variant="titleMedium" style={styles.heading}>Verified customer</Text><Text style={styles.stars}>{'★'.repeat(review.rating)}</Text></View><Chip compact icon="check-circle">Verified BuildPair job</Chip></View><Text style={styles.bodyCopy}>{review.comment}</Text><Text style={styles.muted}>{new Date(review.createdAt).toLocaleDateString('en-GB')}</Text></AppCard>)}
    </> : null}

    {profile.qualifications.length ? <AppCard style={styles.premiumCard}>
      <Text variant="titleLarge" style={styles.heading}>Other declared qualifications</Text>
      {profile.qualifications.map((item) => <View key={item} style={styles.declaredRow}><Text style={styles.declaredBullet}>•</Text><Text style={styles.bodyCopy}>{item}</Text></View>)}
      <Text style={styles.muted}>These are tradesperson-declared unless also shown in the verified credentials panel above.</Text>
    </AppCard> : null}

    <AppCard style={styles.finalCta}>
      <View style={[styles.finalRow, wide && styles.finalRowWide]}><View style={styles.flex}><Text variant="headlineSmall" style={styles.finalTitle}>Ready to start your project?</Text><Text style={styles.finalText}>{profile.isPreview ? 'This is example marketplace content.' : profile.shareOnly ? 'Use BuildPair to find active Plus and Pro tradespeople for your project.' : `Send ${profile.businessName} your job details and keep the job record together in BuildPair.`}</Text><Text style={styles.finalMeta}>BuildPair member since {memberSince}.</Text></View><View style={styles.actions}>{quoteButton}{paidProfile ? messageButton : null}{profile.shareOnly ? <Link href="/directory" asChild><Button mode="contained" icon="magnify" style={styles.pill} contentStyle={styles.ctaContent}>Find Trades</Button></Link> : null}</View></View>
    </AppCard>

    {!profile.isPreview ? <ProfileShareButtons profileId={profile.id} businessName={profile.businessName} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  screenContent: { gap: 18, paddingBottom: 30 },
  noticeCard: { backgroundColor: '#FFF8F2', borderColor: '#F1CFB8' },
  hero: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.navy },
  heroCover: { minHeight: 430, justifyContent: 'flex-end' },
  heroCoverWide: { minHeight: 480 },
  heroCoverImage: { borderRadius: 28 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,20,30,0.43)' },
  heroOverlay: { padding: 18, justifyContent: 'flex-end' },
  heroOverlayWide: { padding: 30, minHeight: 480, alignItems: 'flex-start' },
  brandPanel: { width: '100%', maxWidth: 590, gap: 11, padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.96)' },
  heroLogo: { width: '100%', maxWidth: 390, height: 120, alignSelf: 'flex-start' },
  heroMonogram: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  heroMonogramText: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  heroBusiness: { color: colors.charcoal, fontSize: 31, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  heroTrade: { color: colors.charcoalSoft, fontSize: 14, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  badge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  proBadge: { backgroundColor: '#D49A2A' },
  memberBadge: { backgroundColor: colors.navy },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  featureBadge: { backgroundColor: '#FFF0E6' },
  featureBadgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  verifiedBadge: { backgroundColor: '#E1F4E7' },
  verifiedBadgeText: { color: '#17723A', fontSize: 10, fontWeight: '900' },
  heroProofs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  heroProof: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '800' },
  identityBar: { gap: 16, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' },
  identityBarWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityMain: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 },
  identityText: { flex: 1, minWidth: 0, gap: 3 },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  avatarFallback: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarLetter: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  tradeSubtitle: { color: colors.navy, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { borderRadius: 999, maxWidth: '100%' },
  ctaContent: { minHeight: 48, paddingHorizontal: 4 },
  error: { color: colors.danger, fontWeight: '700' },
  twoColumn: { gap: 16 },
  twoColumnWide: { flexDirection: 'row', alignItems: 'stretch' },
  mainColumn: { flex: 1.55, minWidth: 0, gap: 16 },
  sideColumn: { flex: 0.85, minWidth: 0 },
  premiumCard: { gap: 12, borderRadius: 22, backgroundColor: '#FFFFFF' },
  verifyCard: { borderColor: '#CFE7D7' },
  heading: { color: colors.charcoal, fontWeight: '900' },
  sectionHeading: { color: colors.charcoal, fontWeight: '900', marginTop: 4 },
  muted: { color: colors.muted, lineHeight: 20 },
  bodyCopy: { color: colors.text, lineHeight: 23 },
  trustPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 9 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  serviceTile: { flexGrow: 1, flexBasis: 128, minWidth: 120, maxWidth: 220, minHeight: 112, gap: 9, padding: 13, borderRadius: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  serviceIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  serviceIconText: { color: colors.primary, fontWeight: '900' },
  serviceName: { color: colors.charcoal, fontWeight: '800', lineHeight: 19 },
  verifyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1AA24A' },
  verifyIconText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  credentialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  credentialMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E1F4E7' },
  credentialMarkText: { color: '#17723A', fontWeight: '900' },
  credentialMarkNeutral: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  credentialMarkNeutralText: { color: colors.muted, fontWeight: '900' },
  infoMark: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3F6' },
  infoMarkText: { color: colors.navy, fontWeight: '900' },
  credentialName: { color: colors.charcoal, fontWeight: '900' },
  flex: { flex: 1, minWidth: 0, gap: 3 },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioImage: { flexGrow: 1, flexBasis: 220, minWidth: 150, height: 210, borderRadius: 16, backgroundColor: colors.border },
  portfolioLead: { flexBasis: 420, height: 300 },
  storyGrid: { gap: 12 },
  storyCard: { gap: 9 },
  beforeAfterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  beforeAfterPhoto: { flex: 1, minWidth: 220, height: 220, borderRadius: 14, backgroundColor: colors.border },
  beforeAfterLarge: { width: '100%', height: 240, borderRadius: 14, backgroundColor: colors.border },
  imageLabel: { color: colors.muted, fontWeight: '900' },
  ratingSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, alignItems: 'center' },
  bigRating: { color: colors.charcoal, fontSize: 42, fontWeight: '900' },
  stars: { color: '#D89B00', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  ratingBars: { flex: 1, minWidth: 220, gap: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { width: 34, color: colors.muted, fontWeight: '700' },
  ratingBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.surfaceStrong },
  ratingCount: { width: 22, textAlign: 'right', color: colors.muted },
  declaredRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  declaredBullet: { color: colors.primary, fontWeight: '900' },
  finalCta: { gap: 12, backgroundColor: colors.navy, borderColor: colors.navy },
  finalRow: { gap: 16 },
  finalRowWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  finalTitle: { color: '#FFFFFF', fontWeight: '900' },
  finalText: { color: '#DCE7EE', lineHeight: 22 },
  finalMeta: { color: '#AFC2CD', fontSize: 12 },
});
