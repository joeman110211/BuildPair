import { type Href, usePathname, useRouter } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageSkeleton } from '@/components/Skeleton';
import { colors, layout, publicResponsiveMetrics, radii, shadows, spacing, typography } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  backHref?: Href;
  footer?: ReactNode;
  stickyFooter?: boolean;
}>;

export function Screen({ children, title, subtitle, scroll = true, backHref, footer, stickyFooter = false }: ScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const canGoBack = router.canGoBack();
  const sectionBackHref: Href | undefined = backHref ?? (title
    ? pathname === '/trader/dashboard' || pathname === '/customer/dashboard'
      ? '/'
      : pathname.startsWith('/trader/')
        ? '/trader/dashboard'
        : pathname.startsWith('/customer/')
          ? '/customer/dashboard'
          : undefined
    : undefined);
  const showBack = canGoBack || Boolean(sectionBackHref);
  const footerInScroll = Boolean(footer && scroll && width < 900 && !stickyFooter);
  const compact = width < 720;
  const contentPadding = width < 520 ? styles.contentMobile : width < 900 ? styles.contentTablet : styles.contentDesktop;

  function goBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    if (sectionBackHref) router.replace(sectionBackHref);
  }

  const content = (
    <View style={[styles.content, compact && styles.contentCompact, contentPadding]}>
      {showBack ? <View style={styles.backRow}><Button icon="arrow-left" mode="text" compact onPress={goBack}>Back</Button></View> : null}
      {title || subtitle ? <View style={[styles.headingBlock, compact && styles.headingBlockCompact]}>
        {title ? <Text variant="headlineMedium" style={[styles.title, { fontSize: metrics.sectionTitleFontSize, lineHeight: metrics.sectionTitleLineHeight }]}>{title}</Text> : null}
        {subtitle ? <Text variant="bodyLarge" style={styles.subtitle}>{subtitle}</Text> : null}
      </View> : null}
      {children}
      {footerInScroll ? <View style={styles.inlineFooter}>{footer}</View> : null}
    </View>
  );

  const webScrollStyle = Platform.OS === 'web'
    ? ({ overflowY: 'auto', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' } as never)
    : undefined;

  return <SafeAreaView style={styles.safe}>
    {scroll ? <ScrollView
      style={[styles.scrollView, webScrollStyle]}
      contentContainerStyle={[styles.scroll, footer && !footerInScroll ? styles.scrollWithFooter : null]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator
    >{content}</ScrollView> : <View style={styles.staticBody}>{content}</View>}
    {footer && !footerInScroll ? <View style={[styles.footerShell, compact && styles.footerShellCompact]}><View style={styles.footerContent}>{footer}</View></View> : null}
  </SafeAreaView>;
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return <Screen scroll={false}><View style={styles.loading}><PageSkeleton /><Text style={styles.loadingLabel}>{label}</Text></View></Screen>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>BP</Text></View><Text variant="titleLarge" style={styles.emptyTitle}>{title}</Text><Text style={[styles.subtitle, styles.emptyBody]}>{body}</Text>{action ? <View style={styles.emptyAction}>{action}</View> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { flexGrow: 1, paddingBottom: 72 },
  scrollWithFooter: { paddingBottom: spacing.xxxl },
  staticBody: { flex: 1, minHeight: 0 },
  content: { width: '100%', minWidth: 0, maxWidth: layout.pageMaxWidth, alignSelf: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.xxl },
  contentCompact: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  contentMobile: { paddingHorizontal: spacing.lg },
  contentTablet: { paddingHorizontal: spacing.xxl },
  contentDesktop: { paddingHorizontal: spacing.xxxl },
  backRow: { alignSelf: 'flex-start', marginBottom: -spacing.md },
  headingBlock: { width: '100%', maxWidth: layout.readingMaxWidth, alignSelf: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  headingBlockCompact: { gap: spacing.xs, paddingVertical: 0 },
  title: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  inlineFooter: { width: '100%', borderWidth: 1, borderColor: '#E8E1DA', backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginTop: spacing.xs, marginBottom: 78, ...shadows.subtle },
  footerShell: { width: '100%', flexShrink: 0, borderTopWidth: 1, borderTopColor: '#E8E1DA', backgroundColor: 'rgba(255,255,255,0.985)', paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, ...shadows.subtle },
  footerShellCompact: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  footerContent: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center' },
  loading: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.xl },
  loadingLabel: { ...typography.body, color: colors.muted, textAlign: 'center' },
  empty: { paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xxl, borderWidth: 1, borderColor: '#E8E1DA', borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, alignItems: 'center', gap: spacing.md, ...shadows.subtle },
  emptyIcon: { width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#F0C9AA', alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.primaryDark, fontWeight: '900', letterSpacing: -0.3 },
  emptyTitle: { fontWeight: '800', color: colors.charcoal, textAlign: 'center' },
  emptyBody: { maxWidth: 520, textAlign: 'center' },
  emptyAction: { marginTop: spacing.xs, alignItems: 'center' },
});
