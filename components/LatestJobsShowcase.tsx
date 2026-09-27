import { useAuth } from '@clerk/expo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { colors, controlHeights, radii } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import type { Job, TraderProfile } from '@/types';

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages;
}

function joinHref(job: Job): Href {
  const location = job.locationLabel ?? job.postcode ?? '';
  return `/auth/sign-up?mode=trader&jobId=${encodeURIComponent(job.id)}&jobTitle=${encodeURIComponent(job.title)}&jobCategory=${encodeURIComponent(job.category)}&jobLocation=${encodeURIComponent(location)}` as Href;
}

function postedLabel(createdAt?: string | null) {
  if (!createdAt) return 'Recently posted';
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently posted';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 2) return 'Just posted';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function LatestJobsShowcase({ wide }: { wide: boolean }) {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { width } = useWindowDimensions();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [openingJobId, setOpeningJobId] = useState<string | null>(null);

  const fallbackWidth = Math.max(280, Math.min(width - 36, 1140));
  const pageWidth = Math.max(1, Math.min(containerWidth || fallbackWidth, 1140));
  const pageSize = pageWidth >= 760 ? 3 : 2;

  useEffect(() => {
    let active = true;
    apiFetch<Job[]>('/api/public/jobs')
      .then((rows) => {
        if (active) setJobs(rows.filter((job) => !job.isPreview).slice(0, 6));
      })
      .catch(() => {
        if (active) setJobs([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const pages = useMemo(() => chunk(jobs, pageSize), [jobs, pageSize]);
  const visibleActivePage = Math.min(activePage, Math.max(0, pages.length - 1));

  async function openJob(job: Job) {
    if (openingJobId) return;
    if (!isLoaded || !isSignedIn) {
      router.push(joinHref(job));
      return;
    }

    try {
      setOpeningJobId(job.id);
      const profile = await apiFetch<TraderProfile>('/api/me/profile', {}, getToken);
      const paid = Boolean(profile.isSubscriptionActive && profile.subscriptionTier !== 'free');
      if (!paid) {
        router.push('/trader/subscription');
        return;
      }
      router.push(`/trader/job-board?jobId=${encodeURIComponent(job.id)}` as Href);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        router.push('/trader/onboarding');
        return;
      }
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.push(`/auth/choose-role?mode=trader&returnTo=${encodeURIComponent(`/trader/job-board?jobId=${job.id}`)}` as Href);
        return;
      }
      router.push(`/(public)/jobs/${encodeURIComponent(job.id)}` as Href);
    } finally {
      setOpeningJobId(null);
    }
  }

  if (!loaded) {
    return <View style={[styles.section, wide && styles.sectionWide]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>LATEST JOBS</Text>
          <Text variant="headlineSmall" style={styles.title}>New local work posted through BuildPair.</Text>
          <Text style={styles.muted}>Live customer requests appear here when available. BuildPair checks the current marketplace when the page opens.</Text>
        </View>
        <Button mode="text" style={styles.button} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/jobs')}>Browse jobs →</Button>
      </View>
      <View style={styles.preloadCard}><Text style={styles.preloadText}>Checking current BuildPair job requests…</Text></View>
    </View>;
  }

  if (!jobs.length) {
    return <View style={[styles.section, wide && styles.sectionWide]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>LATEST JOBS</Text>
          <Text variant="headlineSmall" style={styles.title}>New local jobs will appear here after launch.</Text>
          <Text style={styles.muted}>When homeowners start posting work through the live marketplace, the latest genuine local opportunities will appear here automatically for tradespeople to browse.</Text>
        </View>
        <Button mode="text" style={styles.button} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/jobs')}>Browse jobs →</Button>
      </View>
      <View style={styles.preloadCard}><Text style={styles.preloadText}>No live marketplace jobs yet. This section is ready for launch.</Text></View>
    </View>;
  }

  const updatePage = (offsetX: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, Math.round(offsetX / pageWidth)));
    setActivePage(next);
  };

  return <View
    style={[styles.section, wide && styles.sectionWide]}
    testID="home-latest-jobs"
    onLayout={(event) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth > 0 && nextWidth !== containerWidth) setContainerWidth(nextWidth);
    }}
  >
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        <Text style={styles.eyebrow}>LATEST JOBS</Text>
        <Text variant="headlineSmall" style={styles.title}>Latest work posted on BuildPair.</Text>
        <Text style={styles.muted}>A live preview for tradespeople. Eligible members can open matching jobs and quote through the Job Board.</Text>
      </View>
      <Button mode="text" style={styles.button} contentStyle={styles.buttonContent} onPress={() => router.push('/(public)/jobs')}>See all jobs →</Button>
    </View>

    <ScrollView
      horizontal
      pagingEnabled
      snapToInterval={pageWidth}
      disableIntervalMomentum
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      contentContainerStyle={styles.carouselContent}
      onMomentumScrollEnd={(event) => updatePage(event.nativeEvent.contentOffset.x)}
      onScrollEndDrag={(event) => updatePage(event.nativeEvent.contentOffset.x)}
    >
      {pages.map((page, pageIndex) => <View key={`jobs-page-${pageIndex}`} style={[styles.page, { width: pageWidth }]}>
        {page.map((job) => <Pressable
          key={job.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${job.title}`}
          onPress={() => void openJob(job)}
          style={({ pressed }) => [styles.jobCard, pressed && styles.pressed]}
        >
          <View style={styles.cardTop}>
            <Chip compact icon="briefcase-outline">New job</Chip>
            <Text style={styles.posted}>{postedLabel(job.createdAt)}</Text>
          </View>
          <Text numberOfLines={2} variant="titleMedium" style={styles.jobTitle}>{job.title}</Text>
          <Text numberOfLines={2} style={styles.jobMeta}>{job.category}</Text>
          <View style={styles.metaRow}>
            <Text numberOfLines={1} style={styles.metaPill}>📍 {job.locationLabel ?? job.postcode ?? 'Local area'}</Text>
            <Text numberOfLines={1} style={styles.metaPill}>💷 {job.budgetRange || 'Budget open'}</Text>
          </View>
          <Text numberOfLines={2} style={styles.description}>{job.description}</Text>
          <View style={styles.cardFoot}>
            <Text numberOfLines={1} style={styles.urgency}>{job.urgency}</Text>
            <Text style={styles.openText}>{openingJobId === job.id ? 'Opening…' : 'View job →'}</Text>
          </View>
        </Pressable>)}
        {page.length < pageSize ? Array.from({ length: pageSize - page.length }).map((_, index) => <View key={`job-spacer-${index}`} style={styles.spacer} />) : null}
      </View>)}
    </ScrollView>

    <View style={styles.footer}>
      <Text style={styles.swipeHint}>{wide ? 'Scroll or swipe through the newest opportunities' : 'Swipe to see more jobs'}</Text>
      <View style={styles.dots}>{pages.map((_, index) => <View key={`job-dot-${index}`} style={[styles.dot, index === visibleActivePage && styles.dotActive]} />)}</View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', marginTop: 20, paddingTop: 28, borderTopWidth: 1, borderTopColor: colors.border, gap: 14 },
  sectionWide: { width: '100%', maxWidth: 1140 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  headingCopy: { flex: 1, minWidth: 230, gap: 5 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.charcoal, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20, maxWidth: 720 },
  preloadCard: { minHeight: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft, padding: 16 },
  preloadText: { color: colors.muted, fontWeight: '800', textAlign: 'center' },
  carousel: { width: '100%', maxWidth: 1140 },
  carouselContent: { alignItems: 'stretch' },
  page: { flexDirection: 'row', gap: 10, paddingHorizontal: 1 },
  jobCard: { flex: 1, minWidth: 0, minHeight: 245, borderRadius: 20, padding: 15, gap: 9, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  spacer: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  posted: { flexShrink: 0, color: colors.muted, fontSize: 10, fontWeight: '700' },
  jobTitle: { color: colors.charcoal, fontWeight: '900', lineHeight: 21 },
  jobMeta: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  metaRow: { gap: 4 },
  metaPill: { color: colors.charcoalSoft, fontSize: 11, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  cardFoot: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 },
  urgency: { flexShrink: 1, color: colors.charcoalSoft, fontSize: 10, fontWeight: '800' },
  openText: { flexShrink: 0, color: colors.primary, fontSize: 11, fontWeight: '900' },
  button: { borderRadius: radii.md },
  buttonContent: { minHeight: controlHeights.standard },
  footer: { minHeight: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 2, marginTop: 2 },
  swipeHint: { flexShrink: 1, color: colors.muted, fontSize: 11, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#CBD4D9' },
  dotActive: { width: 20, backgroundColor: colors.primary },
});
