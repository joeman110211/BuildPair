import { useAuth } from '@clerk/expo';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Divider, IconButton, Text } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { ProfileShareButtons } from '@/components/ProfileShareButtons';
import { ServiceAreaMap } from '@/components/ServiceAreaMap';
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

type SectionKey = 'overview' | 'services' | 'gallery' | 'reviews' | 'credentials';

const SECTION_TABS: { key: SectionKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'services', label: 'Services' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'credentials', label: 'Credentials' },
];

const COMPACT_LIST_LIMIT = 6;

function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <AppCard style={styles.panel}>
    <View style={styles.panelHeader}>
      <Text variant="titleLarge" style={styles.panelTitle}>{title}</Text>
      {action}
    </View>
    {children}
  </AppCard>;
}

export default function TraderProfileStorefront() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useCurrentUser();
  const { width } = useWindowDimensions();
  const desktop = width >= 980;
  const mobile = width < 600;
  const narrowMobile = width < 360;
  const getTokenRef = useRef(getToken);
  const [profile, setProfile] = useState<ProfileResult>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const load = useCallback(async () => {
    try {
      setError('');
      const tokenGetter = isSignedIn ? () => getTokenRef.current() : undefined;
      setProfile(await apiFetch(`/api/traders/${id}`, {}, tokenGetter));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, isSignedIn]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setShowAllCategories(false);
    setShowAllServices(false);
  }, [id]);

  async function toggleSaved() {
    if (!profile || profile.shareOnly || !user?.customerEnabled) return;
    try {
      setSaving(true);
      setError('');
      const next = !profile.savedByViewer;
      await apiFetch('/api/saved-traders', { method: 'POST', body: JSON.stringify({ traderId: profile.userId, saved: next }) }, () => getTokenRef.current());
      setProfile({ ...profile, savedByViewer: next });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (error && !profile) return <Screen><EmptyState title="Profile unavailable" body={error} /></Screen>;
  if (!profile) return <LoadingScreen />;

  const galleryPhotos = profile.photos;
  const categories = profile.tradeCategories?.length ? profile.tradeCategories : [profile.tradeCategory];
  const serviceAreas = profile.serviceAreas?.length ? profile.serviceAreas : profile.locationLabel ? [profile.locationLabel] : [];
  const selectedServices = categories.flatMap((category) => profile.serviceSelections?.[category] ?? []);
  const serviceList = selectedServices.length ? selectedServices : profile.subSkills;
  const visibleCategories = showAllCategories ? categories : categories.slice(0, COMPACT_LIST_LIMIT);
  const visibleServices = showAllServices ? serviceList : serviceList.slice(0, COMPACT_LIST_LIMIT);
  const hiddenCategoryCount = Math.max(categories.length - COMPACT_LIST_LIMIT, 0);
  const hiddenServiceCount = Math.max(serviceList.length - COMPACT_LIST_LIMIT, 0);
  const identityCategories = categories.slice(0, COMPACT_LIST_LIMIT);
  const beforeAfter = profile.beforeAfterProjects ?? [];
  const memberSince = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Recently';
  const paidProfile = !profile.shareOnly && !profile.isPreview && profile.canRequestQuote !== false;
  const isAvailable = profile.availability?.some((slot) => slot.status === 'available') ?? false;
  const nextAvailability = profile.availability?.find((slot) => slot.status === 'available');
  const quoteLink = `/customer/new-job?traderId=${encodeURIComponent(profile.userId)}&traderName=${encodeURIComponent(profile.businessName)}&tradeCategory=${encodeURIComponent(categories[0] ?? '')}`;
  const quoteDestination = isSignedIn
    ? user?.customerEnabled
      ? quoteLink
      : `/auth/choose-role?mode=customer&returnTo=${encodeURIComponent(quoteLink)}`
    : `/auth/sign-in?mode=customer&returnTo=${encodeURIComponent(quoteLink)}`;

  const quoteButton = profile.isPreview
    ? <Button mode="outlined" icon="flask-outline" disabled>Preview profile only</Button>
    : !paidProfile
      ? <Button mode="outlined" icon="lock-outline" disabled>Quote requests unavailable</Button>
      : <Button
          mode="contained"
          icon="file-document-edit-outline"
          onPress={() => router.push(quoteDestination as Href)}
        >
          {isSignedIn && !user?.customerEnabled ? 'Add Homeowner Mode' : isSignedIn ? 'Request a Quote' : 'Sign in to Request a Quote'}
        </Button>;

  const showOverview = activeSection === 'overview';
  const showServices = showOverview || activeSection === 'services';
  const showGallery = showOverview || activeSection === 'gallery';
  const showReviews = showOverview || activeSection === 'reviews';
  const showCredentials = showOverview || activeSection === 'credentials';
  const showAbout = showOverview;
  const selectedGalleryPhoto = galleryIndex === null ? null : galleryPhotos[galleryIndex];

  function changeGalleryPhoto(delta: number) {
    if (!galleryPhotos.length) return;
    setGalleryIndex((current) => {
      const index = current ?? 0;
      return (index + delta + galleryPhotos.length) % galleryPhotos.length;
    });
  }

  return <Screen>
    {profile.shareOnly ? <AppCard style={styles.noticeCard}>
      <Text variant="titleMedium" style={styles.panelTitle}>Shared BuildPair profile</Text>
      <Text style={styles.muted}>This Starter profile was shared directly by {profile.businessName}. Starter profiles are not listed in marketplace search.</Text>
    </AppCard> : null}

    <View style={styles.profileShell}>
      <View style={styles.coverWrap}>
        {profile.coverPhotoUrl ? <Image source={{ uri: profile.coverPhotoUrl }} style={styles.cover} /> : <View style={styles.coverFallback}><Text style={styles.coverFallbackBrand}>BuildPair</Text><Text style={styles.coverFallbackText}>{categories[0]}</Text></View>}
        <View style={styles.coverShade} />
        <View style={[styles.coverCopy, mobile && styles.coverCopyMobile]}>
          <Text style={[styles.coverEyebrow, mobile && styles.coverEyebrowMobile]}>{categories[0]}</Text>
          <Text style={[styles.coverTitle, mobile && styles.coverTitleMobile]}>Professional local work, presented properly.</Text>
        </View>
        {desktop ? <View style={styles.coverServices}>
          {serviceList.slice(0, COMPACT_LIST_LIMIT).map((service, index) => <View key={`${service}-${index}`} style={styles.coverService}><Text style={styles.coverServiceText}>{service}</Text></View>)}
        </View> : null}
      </View>

      <View style={[styles.identityStrip, desktop && styles.identityStripDesktop]}>
        <View style={styles.identityLeft}>
          {profile.logoUrl ? <Image source={{ uri: profile.logoUrl }} style={styles.avatar} /> : profile.profileImageUrl ? <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{profile.businessName.slice(0, 1).toUpperCase()}</Text></View>}
          <View style={styles.identityCopy}>
            <View style={styles.nameRow}>
              <Text variant="headlineMedium" style={styles.businessName}>{profile.businessName}</Text>
              {!profile.isPreview && profile.verifiedCredentialCount ? <View style={styles.verifiedBadge}><Text style={styles.verifiedBadgeText}>✓</Text></View> : null}
            </View>
            <Text style={styles.locationLine}>{profile.locationLabel || 'UK'}{identityCategories.length ? ` · ${identityCategories.join(' · ')}` : ''}{hiddenCategoryCount ? ` · +${hiddenCategoryCount} more` : ''}</Text>
            <View style={styles.ratingLine}>
              <Text style={styles.stars}>★★★★★</Text>
              <Text style={styles.ratingText}>{profile.averageRating.toFixed(1)} ({profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'})</Text>
            </View>
            <View style={styles.trustRow}>
              {!profile.isPreview && profile.verifiedCredentialCount ? <Chip compact icon="shield-check">Verified trader</Chip> : null}
              <Chip compact icon="map-marker-radius">{profile.radiusMiles} mile radius</Chip>
              {profile.isSubscriptionActive ? <Chip compact icon="check-decagram">Active member</Chip> : null}
            </View>
          </View>
        </View>

        <View style={styles.identityActions}>
          {paidProfile && profile.contact?.email ? <Button mode="contained" icon="message-outline" onPress={() => Linking.openURL(`mailto:${profile.contact?.email}`)}>Message</Button> : null}
          {quoteButton}
          {paidProfile && user?.customerEnabled ? <Button mode="outlined" icon={profile.savedByViewer ? 'heart' : 'heart-outline'} loading={saving} disabled={saving} onPress={() => void toggleSaved()}>{profile.savedByViewer ? 'Saved' : 'Save'}</Button> : null}
          <View style={styles.responseLine}><View style={[styles.statusDot, isAvailable && styles.statusDotLive]} /><Text style={styles.responseText}>{isAvailable ? 'Currently taking on work' : profile.availabilitySummary || 'Availability on request'}</Text></View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={[styles.tabsContent, mobile && styles.tabsContentMobile]}
      >
        {SECTION_TABS.map((tab) => <Pressable key={tab.key} onPress={() => setActiveSection(tab.key)} style={[styles.tab, mobile && styles.tabMobile, activeSection === tab.key && styles.tabActive]}>
          <Text numberOfLines={1} style={[styles.tabText, mobile && styles.tabTextMobile, narrowMobile && styles.tabTextNarrowMobile, activeSection === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </Pressable>)}
      </ScrollView>
    </View>

    {error ? <Text style={styles.error}>{error}</Text> : null}

    <View style={[styles.contentGrid, desktop && styles.contentGridDesktop]}>
      <View style={styles.mainColumn}>
        {showAbout ? <SectionCard title={`About ${profile.businessName}`}>
          <Text style={styles.bio}>{profile.bio || 'This tradesperson has not added an introduction yet.'}</Text>
          <Divider style={styles.divider} />
          <View style={styles.detailList}>
            <View style={styles.detailRow}><Text style={styles.detailIcon}>◉</Text><Text style={styles.detailText}>{profile.yearsExperience ?? 0}+ years of experience</Text></View>
            {profile.yearEstablished ? <View style={styles.detailRow}><Text style={styles.detailIcon}>◉</Text><Text style={styles.detailText}>Established {profile.yearEstablished}</Text></View> : null}
            <View style={styles.detailRow}><Text style={styles.detailIcon}>◉</Text><Text style={styles.detailText}>BuildPair member since {memberSince}</Text></View>
            {serviceAreas.length ? <View style={styles.detailRow}><Text style={styles.detailIcon}>◉</Text><Text style={styles.detailText}>Covers {serviceAreas.join(', ')}</Text></View> : null}
          </View>
        </SectionCard> : null}

        {showGallery && profile.photos.length ? <SectionCard title="Gallery" action={<Text style={styles.linkText}>{profile.photos.length} photos</Text>}>
          {mobile ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryMobileRow}>
            {profile.photos.map((uri, index) => <Pressable key={`${uri}-${index}`} onPress={() => setGalleryIndex(index)} style={[styles.galleryMobileItem, { width: Math.min(Math.max(width - 92, 220), 310) }]}>
              <Image source={{ uri }} style={styles.galleryMobileImage} />
            </Pressable>)}
          </ScrollView> : <View style={styles.galleryGrid}>
            <Pressable onPress={() => setGalleryIndex(0)} style={styles.galleryHeroButton}>
              <Image source={{ uri: profile.photos[0] }} style={styles.galleryHero} />
            </Pressable>
            <View style={styles.gallerySide}>
              {profile.photos.slice(1, 5).map((uri, index) => <Pressable key={`${uri}-${index}`} onPress={() => setGalleryIndex(index + 1)} style={styles.galleryThumbButton}><Image source={{ uri }} style={styles.galleryThumb} /></Pressable>)}
              {profile.photos.length > 5 ? <Pressable onPress={() => setGalleryIndex(5)} style={styles.morePhotos}><Text style={styles.morePhotosText}>+{profile.photos.length - 5}</Text></Pressable> : null}
            </View>
          </View>}
          <Text variant="bodySmall" style={styles.galleryHint}>{mobile ? 'Swipe through photos or tap one to enlarge.' : 'Click a photo to enlarge it.'}</Text>
        </SectionCard> : null}

        {showGallery && !profile.photos.length ? <SectionCard title="Gallery"><Text style={styles.muted}>No work photos have been added yet.</Text></SectionCard> : null}

        {showServices ? <SectionCard title="Trades & Services">
          <View style={styles.listBlock}>
            <Text variant="titleMedium" style={styles.listHeading}>Trade categories</Text>
            <View style={styles.serviceTags}>
              {visibleCategories.map((category) => <Chip key={category} icon="hammer-wrench" style={styles.serviceChip}>{category}</Chip>)}
            </View>
            {hiddenCategoryCount ? <Button compact mode="text" icon={showAllCategories ? 'chevron-up' : 'chevron-down'} onPress={() => setShowAllCategories((value) => !value)}>
              {showAllCategories ? 'Show fewer categories' : `Show ${hiddenCategoryCount} more categor${hiddenCategoryCount === 1 ? 'y' : 'ies'}`}
            </Button> : null}
          </View>
          <Divider />
          <View style={styles.listBlock}>
            <Text variant="titleMedium" style={styles.listHeading}>Services</Text>
            <View style={styles.serviceTags}>
              {visibleServices.length ? visibleServices.map((service, index) => <Chip key={`${service}-${index}`} icon="check-circle-outline" style={styles.serviceChip}>{service}</Chip>) : visibleCategories.map((category) => <Chip key={category} icon="check-circle-outline" style={styles.serviceChip}>{category}</Chip>)}
            </View>
            {hiddenServiceCount ? <Button compact mode="text" icon={showAllServices ? 'chevron-up' : 'chevron-down'} onPress={() => setShowAllServices((value) => !value)}>
              {showAllServices ? 'Show fewer services' : `Show ${hiddenServiceCount} more services`}
            </Button> : null}
          </View>
        </SectionCard> : null}

        {showReviews && paidProfile ? <SectionCard title="Reviews" action={<Text style={styles.linkText}>{profile.reviewCount} verified</Text>}>
          <View style={styles.reviewSummary}>
            <View><Text style={styles.bigRating}>{profile.averageRating.toFixed(1)}</Text><Text style={styles.stars}>★★★★★</Text><Text style={styles.muted}>{profile.reviewCount} verified review{profile.reviewCount === 1 ? '' : 's'}</Text></View>
          </View>
          {profile.reviews.length ? profile.reviews.slice(0, 3).map((review) => <View key={review.id} style={styles.reviewItem}>
            <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>✓</Text></View>
            <View style={styles.flex}>
              <View style={styles.reviewTop}><Text style={styles.reviewName}>Verified customer</Text><Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('en-GB')}</Text></View>
              <Text style={styles.stars}>{'★'.repeat(review.rating)}</Text>
              <Text style={styles.reviewText}>{review.comment}</Text>
            </View>
          </View>) : <Text style={styles.muted}>No customer reviews yet.</Text>}
        </SectionCard> : null}

        {showCredentials ? <SectionCard title="Credentials & Insurance">
          <View style={styles.credentialGrid}>
            {profile.credentials?.length ? profile.credentials.map((credential) => <View key={credential.id} style={styles.credentialCard}>
              <View style={styles.credentialIcon}><Text style={styles.credentialTick}>✓</Text></View>
              <Text style={styles.credentialName}>{credential.name}</Text>
              <Text style={styles.credentialStatus}>{credential.status === 'verified' ? 'Verified' : credential.status}</Text>
            </View>) : <Text style={styles.muted}>No BuildPair-verified credentials have been published yet.</Text>}
            {profile.qualifications.map((qualification) => <View key={qualification} style={styles.credentialCard}>
              <View style={styles.credentialIconMuted}><Text style={styles.credentialDot}>•</Text></View>
              <Text style={styles.credentialName}>{qualification}</Text>
              <Text style={styles.credentialDeclared}>Trader-declared</Text>
            </View>)}
          </View>
          <Text variant="bodySmall" style={styles.muted}>Only items marked Verified have been reviewed by BuildPair.</Text>
        </SectionCard> : null}

        {showGallery && profile.stories?.length ? <SectionCard title="Project Stories">
          {profile.stories.slice(0, 3).map((story) => <View key={story.id} style={styles.storyItem}>
            <Text variant="titleMedium" style={styles.storyTitle}>{story.title}</Text>
            <Text style={styles.muted}>{[story.locationLabel, story.durationDays ? `${story.durationDays} days` : null].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.reviewText}>{story.summary}</Text>
            <View style={styles.beforeAfterRow}>
              {story.beforePhotos[0] ? <Image source={{ uri: story.beforePhotos[0] }} style={styles.beforeAfterPhoto} /> : null}
              {story.afterPhotos[0] ? <Image source={{ uri: story.afterPhotos[0] }} style={styles.beforeAfterPhoto} /> : null}
            </View>
          </View>)}
        </SectionCard> : null}

        {showGallery && beforeAfter.length ? <SectionCard title="Before & After">
          {beforeAfter.slice(0, 4).map((project, index) => <View key={`${project.before}-${index}`} style={styles.beforeAfterProject}>
            {project.caption ? <Text variant="titleMedium" style={styles.storyTitle}>{project.caption}</Text> : null}
            <View style={styles.beforeAfterRow}>
              <View style={styles.beforeAfterItem}><Text style={styles.imageLabel}>Before</Text><Image source={{ uri: project.before }} style={styles.beforeAfterPhoto} /></View>
              <View style={styles.beforeAfterItem}><Text style={styles.imageLabel}>After</Text><Image source={{ uri: project.after }} style={styles.beforeAfterPhoto} /></View>
            </View>
          </View>)}
        </SectionCard> : null}
      </View>

      <View style={[styles.sidebar, desktop && styles.sidebarDesktop]}>
        <AppCard style={styles.sideCard}>
          <Text variant="titleLarge" style={styles.panelTitle}>Get in touch</Text>
          <Text style={styles.muted}>Message {profile.businessName} or request a quote for your project.</Text>
          {paidProfile && profile.contact?.email ? <Button mode="contained" icon="message-outline" onPress={() => Linking.openURL(`mailto:${profile.contact?.email}`)}>Message</Button> : null}
          {quoteButton}
          {paidProfile && profile.contact?.phone ? <Button mode="outlined" icon="phone" onPress={() => Linking.openURL(`tel:${profile.contact?.phone}`)}>Call</Button> : null}
          <View style={styles.responseLine}><View style={[styles.statusDot, isAvailable && styles.statusDotLive]} /><Text style={styles.responseText}>{isAvailable ? 'Currently taking on work' : 'Availability on request'}</Text></View>
        </AppCard>

        <AppCard style={styles.sideCard}>
          <Text variant="titleLarge" style={styles.panelTitle}>Service area</Text>
          <ServiceAreaMap
            latitude={profile.latitude}
            longitude={profile.longitude}
            radiusMiles={profile.radiusMiles}
            locationLabel={profile.locationLabel}
          />
          <Text style={styles.muted}>Typically works within approximately {profile.radiusMiles} miles{serviceAreas.length ? ` · ${serviceAreas.slice(0, 3).join(', ')}` : ''}.</Text>
        </AppCard>

        <AppCard style={styles.sideCard}>
          <Text variant="titleLarge" style={styles.panelTitle}>Availability</Text>
          <View style={styles.availabilityStatus}><View style={[styles.statusDot, isAvailable && styles.statusDotLive]} /><Text style={styles.availabilityTitle}>{isAvailable ? 'Currently taking on new work' : 'Ask for availability'}</Text></View>
          {nextAvailability ? <Text style={styles.muted}>Next listed availability: {new Date(nextAvailability.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text> : null}
          {profile.availabilitySummary ? <Text style={styles.muted}>{profile.availabilitySummary}</Text> : null}
        </AppCard>

        {!profile.isPreview ? <AppCard style={styles.sideCard}>
          <Text variant="titleLarge" style={styles.panelTitle}>Share profile</Text>
          <ProfileShareButtons profileId={profile.id} businessName={profile.businessName} />
        </AppCard> : null}

        {Object.entries(profile.externalLinks ?? {}).filter(([, url]) => url).length ? <AppCard style={styles.sideCard}>
          <Text variant="titleLarge" style={styles.panelTitle}>Online presence</Text>
          {Object.entries(profile.externalLinks ?? {}).filter(([, url]) => url).map(([name, url]) => <Button key={name} mode="text" icon="open-in-new" onPress={() => Linking.openURL(url)}>{name}</Button>)}
        </AppCard> : null}
      </View>
    </View>

    <View style={styles.bottomCta}>
      <View style={styles.flex}>
        <Text style={styles.bottomEyebrow}>BUILDPAIR TRADES</Text>
        <Text variant="headlineSmall" style={styles.bottomTitle}>Need a reliable {categories[0]?.toLowerCase() || 'tradesperson'}?</Text>
        <Text style={styles.bottomText}>Keep the quote, messages and project record together from first contact to completion.</Text>
      </View>
      {quoteButton}
    </View>

    <Modal visible={galleryIndex !== null} transparent animationType="fade" onRequestClose={() => setGalleryIndex(null)}>
      <View style={styles.lightboxBackdrop}>
        <View style={styles.lightboxHeader}>
          <Text style={styles.lightboxCounter}>{galleryIndex === null ? '' : `${galleryIndex + 1} / ${profile.photos.length}`}</Text>
          <IconButton icon="close" iconColor="#FFFFFF" size={28} accessibilityLabel="Close photo" onPress={() => setGalleryIndex(null)} />
        </View>
        <View style={styles.lightboxBody}>
          {profile.photos.length > 1 ? <IconButton icon="chevron-left" iconColor="#FFFFFF" containerColor="rgba(0,0,0,0.45)" size={32} style={styles.lightboxArrow} accessibilityLabel="Previous photo" onPress={() => changeGalleryPhoto(-1)} /> : null}
          <View style={styles.lightboxImageFrame}>{selectedGalleryPhoto ? <Image source={{ uri: selectedGalleryPhoto }} style={styles.lightboxImage} /> : null}</View>
          {profile.photos.length > 1 ? <IconButton icon="chevron-right" iconColor="#FFFFFF" containerColor="rgba(0,0,0,0.45)" size={32} style={styles.lightboxArrow} accessibilityLabel="Next photo" onPress={() => changeGalleryPhoto(1)} /> : null}
        </View>
        <Text style={styles.lightboxHint}>Use the arrows to browse photos.</Text>
      </View>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  profileShell: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  coverWrap: { height: 300, position: 'relative', overflow: 'hidden', backgroundColor: colors.navy },
  cover: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#233542', gap: 6 },
  coverFallbackBrand: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  coverFallbackText: { color: '#FFD0AE', fontSize: 17, fontWeight: '800' },
  coverShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8,21,31,0.28)' },
  coverCopy: { position: 'absolute', left: 20, bottom: 20, maxWidth: 320, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(10,24,36,0.82)' },
  coverCopyMobile: { left: 10, bottom: 10, maxWidth: 180, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9 },
  coverEyebrow: { color: '#FFD0AE', fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  coverEyebrowMobile: { fontSize: 7, letterSpacing: 0.7 },
  coverTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 3 },
  coverTitleMobile: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  coverServices: { position: 'absolute', right: 18, top: 18, gap: 7, alignItems: 'flex-end' },
  coverService: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(10,24,36,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  coverServiceText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  identityStrip: { padding: 20, gap: 18, backgroundColor: '#FFFFFF' },
  identityStripDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  identityLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityCopy: { flex: 1, minWidth: 0, gap: 5 },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 5, borderColor: '#FFFFFF', backgroundColor: colors.surfaceSoft },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, borderWidth: 5, borderColor: '#FFFFFF', backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 38, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  businessName: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.6 },
  verifiedBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2F80ED', alignItems: 'center', justifyContent: 'center' },
  verifiedBadgeText: { color: '#FFFFFF', fontWeight: '900' },
  locationLine: { color: colors.charcoalSoft, fontWeight: '700' },
  ratingLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  stars: { color: '#F4A000', fontWeight: '900', letterSpacing: 1 },
  ratingText: { color: colors.charcoalSoft, fontWeight: '700' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  identityActions: { minWidth: 250, gap: 9, alignItems: 'stretch' },
  responseLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#AAB4BB' },
  statusDotLive: { backgroundColor: '#31B66B' },
  responseText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  tabs: { width: '100%', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
  tabsContent: { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 18 },
  tabsContentMobile: { flexGrow: 1, width: '100%', paddingHorizontal: 4 },
  tab: { paddingHorizontal: 13, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabMobile: { flex: 1, minWidth: 0, paddingHorizontal: 2, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '800' },
  tabTextMobile: { fontSize: 12.5, textAlign: 'center' },
  tabTextNarrowMobile: { fontSize: 10.5, letterSpacing: -0.2 },
  tabTextActive: { color: colors.primary },
  contentGrid: { width: '100%', gap: 18 },
  contentGridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  mainColumn: { flex: 1, minWidth: 0, gap: 16 },
  sidebar: { width: '100%', gap: 16 },
  sidebarDesktop: { width: 340, flexShrink: 0 },
  sideCard: { gap: 12 },
  panel: { gap: 14 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  panelTitle: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 21 },
  bio: { color: colors.charcoalSoft, lineHeight: 25 },
  divider: { marginVertical: 4 },
  detailList: { gap: 9 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  detailIcon: { color: colors.primary, fontWeight: '900' },
  detailText: { flex: 1, color: colors.charcoalSoft, lineHeight: 21 },
  galleryGrid: { minHeight: 300, flexDirection: 'row', gap: 8 },
  galleryHeroButton: { flex: 2, minWidth: 0, borderRadius: 16, overflow: 'hidden' },
  galleryHero: { width: '100%', height: '100%', minHeight: 300, resizeMode: 'cover' },
  gallerySide: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryThumbButton: { width: '47%', minHeight: 140, flexGrow: 1, borderRadius: 12, overflow: 'hidden' },
  galleryThumb: { width: '100%', height: '100%', minHeight: 140, resizeMode: 'cover' },
  galleryMobileRow: { gap: 10, paddingRight: 4 },
  galleryMobileItem: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  galleryMobileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  galleryHint: { color: colors.muted, marginTop: -2 },
  morePhotos: { width: '47%', minHeight: 140, flexGrow: 1, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  morePhotosText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  linkText: { color: colors.primary, fontWeight: '800' },
  listBlock: { gap: 8 },
  listHeading: { color: colors.charcoal, fontWeight: '900' },
  serviceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { backgroundColor: '#FFFFFF' },
  reviewSummary: { paddingBottom: 4 },
  bigRating: { color: colors.charcoal, fontSize: 42, lineHeight: 48, fontWeight: '900' },
  reviewItem: { flexDirection: 'row', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: '#FFFFFF', fontWeight: '900' },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  reviewName: { color: colors.charcoal, fontWeight: '900' },
  reviewDate: { color: colors.muted, fontSize: 12 },
  reviewText: { color: colors.charcoalSoft, lineHeight: 22 },
  credentialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  credentialCard: { flexGrow: 1, flexBasis: 190, minWidth: 0, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', gap: 5 },
  credentialIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E8F7EF', alignItems: 'center', justifyContent: 'center' },
  credentialIconMuted: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  credentialTick: { color: '#238A52', fontWeight: '900' },
  credentialDot: { color: colors.muted, fontWeight: '900' },
  credentialName: { color: colors.charcoal, fontWeight: '800' },
  credentialStatus: { color: '#238A52', fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  credentialDeclared: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  storyItem: { gap: 7, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  storyTitle: { color: colors.charcoal, fontWeight: '900' },
  beforeAfterProject: { gap: 9, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  beforeAfterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  beforeAfterItem: { flex: 1, minWidth: 180, gap: 5 },
  imageLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  beforeAfterPhoto: { flex: 1, minWidth: 180, height: 180, borderRadius: 14, resizeMode: 'cover' },
  mapMock: { minHeight: 190, borderRadius: 16, backgroundColor: '#EEF1EC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  mapRing: { width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(234,107,31,0.13)', alignItems: 'center', justifyContent: 'center' },
  mapPin: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapPinText: { color: '#FFFFFF', fontSize: 10 },
  mapLabel: { position: 'absolute', bottom: 12, color: colors.charcoal, fontWeight: '900' },
  availabilityStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityTitle: { color: colors.charcoal, fontWeight: '900' },
  bottomCta: { width: '100%', borderRadius: 22, backgroundColor: colors.navy, padding: 22, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  bottomEyebrow: { color: '#FFD0AE', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  bottomTitle: { color: '#FFFFFF', fontWeight: '900' },
  bottomText: { color: '#D9E4EA', lineHeight: 21 },
  lightboxBackdrop: { flex: 1, backgroundColor: 'rgba(4,10,15,0.96)', paddingTop: 20, paddingBottom: 24, paddingHorizontal: 10 },
  lightboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54 },
  lightboxCounter: { color: '#FFFFFF', fontWeight: '800', paddingLeft: 12 },
  lightboxBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  lightboxImageFrame: { flex: 1, minWidth: 0, height: '100%', maxWidth: 1100, alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  lightboxArrow: { margin: 0, flexShrink: 0 },
  lightboxHint: { color: '#D7E0E6', textAlign: 'center', paddingTop: 8 },
  noticeCard: { gap: 6 },
  error: { color: colors.danger, fontWeight: '700' },
  flex: { flex: 1, minWidth: 0 },
});
