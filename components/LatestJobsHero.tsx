import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { SkeletonBlock } from '@/components/Skeleton';
import { colors, radii } from '@/constants/theme';
import { signUpHref } from '@/lib/account-mode';
import { apiFetch } from '@/lib/api';
import type { Job } from '@/types';

const MAX_RECENT_JOBS = 6;

function groupJobs(items: Job[], count: number) {
  const groups: Job[][] = [];
  for (let index = 0; index < items.length; index += count) groups.push(items.slice(index, index + count));
  return groups;
}

function LatestJobCard({ job }: { job: Job }) {
  const router = useRouter();
  const location = job.locationLabel?.trim() || job.postcode?.trim() || 'Location available on request';

  return <Pressable
    testID="bp-home-latest-job-card"
    accessibilityRole="button"
    accessibilityLabel={`View job: ${job.title}`}
    onPress={() => router.push(`/(public)/jobs/${encodeURIComponent(job.id)}` as Href)}
    style={({ pressed }) => [styles.jobCard, pressed && styles.pressed]}
  >
    <View style={styles.jobCardContent}>
      <View style={styles.cardTop}>
        <Text numberOfLines={1} style={styles.category}>{job.category}</Text>
        <Text style={styles.openLabel}>OPEN JOB</Text>
      </View>
      <Text numberOfLines={2} style={styles.jobTitle}>{job.title}</Text>
      <Text numberOfLines={2} style={styles.jobLocation}>{location}</Text>
      {job.budgetRange?.trim() ? <Text numberOfLines={2} style={styles.jobBudget}>Budget: {job.budgetRange}</Text> : null}
      <View style={styles.jobFoot}>
        <Text numberOfLines={1} style={styles.jobMeta}>{job.urgency || 'Open request'}</Text>
        <Text style={styles.jobAction}>View job →</Text>
      </View>
    </View>
  </Pressable>;
}

export function LatestJobsHero() {
  const { width } = useWindowDimensions();
  const scrollView = useRef<ScrollView>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const fallbackWidth = Math.max(280, Math.min(width - 32, 1140));
  const pageWidth = Math.max(1, Math.min(containerWidth || fallbackWidth, 1140));
  const jobsPerPage = pageWidth >= 880 ? 3 : pageWidth >= 560 ? 2 : 1;

  useEffect(() => {
    let mounted = true;
    apiFetch<Job[]>('/api/public/jobs')
      .then((rows) => {
        if (!mounted) return;
        const eligible = (Array.isArray(rows) ? rows : [])
          .filter((job) => Boolean(job?.id && job?.title)
            && !job.isPreview
            && !job.targetTraderId
            && !job.acceptedQuoteId
            && (job.status === 'open' || job.status === 'quoted'))
          .slice(0, MAX_RECENT_JOBS);
        setJobs(eligible);
      })
      .catch(() => { if (mounted) setUnavailable(true); })
      .finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  if (!loaded) {
    return <View style={styles.loadingShell} testID="bp-home-latest-jobs-loading">
      <SkeletonBlock style={styles.loadingTitle} />
      <SkeletonBlock style={styles.loadingCard} />
    </View>;
  }

  if (!jobs.length) {
    return <View testID="bp-home-latest-jobs-empty" style={styles.emptyCard}>
      <View style={styles.emptyAccent}>
        <Text style={styles.emptyEyebrow}>{unavailable ? 'JOB BOARD' : 'JUST OPENED'}</Text>
        <Text style={styles.emptyTitle}>{unavailable ? 'Latest jobs are temporarily unavailable.' : 'Our job marketplace has just opened.'}</Text>
        <Text style={styles.emptyBody}>{unavailable
          ? 'We could not load the latest requests. You can still visit the job board or post a job.'
          : 'Homeowners can post jobs now. New requests will appear here as soon as they are available.'}</Text>
        <View style={styles.emptyActions}>
          <Link href="/(public)/jobs" asChild><Button mode="contained" style={styles.actionButton}>Browse job board</Button></Link>
          <Link href={signUpHref('customer', '/customer/new-job')} asChild><Button mode="outlined" style={styles.actionButton}>Post a job</Button></Link>
        </View>
      </View>
    </View>;
  }

  const pages = groupJobs(jobs, jobsPerPage);
  const currentPage = Math.min(activePage, Math.max(0, pages.length - 1));

  function updatePage(offsetX: number) {
    setActivePage(Math.max(0, Math.min(pages.length - 1, Math.round(offsetX / pageWidth))));
  }

  return <View
    style={styles.wrapper}
    testID="bp-home-latest-jobs-carousel"
    onLayout={(event) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth > 0 && nextWidth !== containerWidth) setContainerWidth(nextWidth);
    }}
  >
    <ScrollView
      ref={scrollView}
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
        {page.map((job) => <LatestJobCard key={job.id} job={job} />)}
        {page.length < jobsPerPage ? Array.from({ length: jobsPerPage - page.length }).map((_, index) => <View key={`spacer-${index}`} style={styles.spacer} />) : null}
      </View>)}
    </ScrollView>
    <View style={styles.carouselFooter}>
      <Text style={styles.swipeHint}>{pages.length > 1 ? 'Swipe to explore job requests' : 'Real homeowner job requests'}</Text>
      {pages.length > 1 ? <View style={styles.dots}>
        {pages.map((_, index) => <Pressable
          key={`job-dot-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Show job group ${index + 1} of ${pages.length}`}
          accessibilityState={{ selected: index === currentPage }}
          onPress={() => { setActivePage(index); scrollView.current?.scrollTo({ x: index * pageWidth, animated: true }); }}
          style={styles.dotControl}
        ><View style={[styles.dot, index === currentPage && styles.dotActive]} /></Pressable>)}
      </View> : null}
    </View>
    <Link href="/(public)/jobs" asChild><Button mode="text" textColor={colors.primaryDark} style={styles.browseAll}>Browse all recent jobs →</Button></Link>
  </View>;
}

const styles = StyleSheet.create({
  loadingShell: { width: '100%', maxWidth: 1140, alignSelf: 'center', gap: 12 },
  loadingTitle: { width: 170, height: 14, alignSelf: 'center' },
  loadingCard: { width: '100%', height: 208, borderRadius: radii.lg },
  emptyCard: { width: '100%', maxWidth: 900, alignSelf: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  emptyAccent: { borderLeftWidth: 4, borderLeftColor: colors.primary, paddingHorizontal: 22, paddingVertical: 26, alignItems: 'center', gap: 12 },
  emptyEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  emptyTitle: { maxWidth: 550, color: colors.charcoal, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  emptyBody: { maxWidth: 540, color: colors.charcoalSoft, lineHeight: 23, textAlign: 'center' },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', paddingTop: 4 },
  actionButton: { borderRadius: radii.md, maxWidth: '100%' },
  wrapper: { width: '100%', maxWidth: 1140, minWidth: 0, alignSelf: 'center', gap: 12, overflow: 'hidden' },
  carousel: { width: '100%', maxWidth: 1140, minWidth: 0 },
  carouselContent: { alignItems: 'stretch' },
  page: { flexDirection: 'row', gap: 10, paddingHorizontal: 1 },
  spacer: { flex: 1, minWidth: 0 },
  jobCard: { flex: 1, minWidth: 0, minHeight: 218, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  jobCardContent: { flex: 1, padding: 16, gap: 11 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  category: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  openLabel: { color: colors.navy, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: colors.navySoft, borderRadius: radii.sm },
  jobTitle: { color: colors.charcoal, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  jobLocation: { color: colors.charcoalSoft, fontSize: 13, lineHeight: 19 },
  jobBudget: { color: colors.charcoalSoft, fontSize: 12, lineHeight: 18 },
  jobFoot: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  jobMeta: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  jobAction: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', flexShrink: 0 },
  carouselFooter: { minHeight: 24, flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  swipeHint: { color: colors.muted, fontSize: 12 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  dotControl: { minWidth: 35, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
  browseAll: { alignSelf: 'center', maxWidth: '100%', borderRadius: radii.md },
});
