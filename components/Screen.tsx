import { type Href, useRouter } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, radii, spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  backHref?: Href;
  footer?: ReactNode;
}>;

export function Screen({ children, title, subtitle, scroll = true, backHref, footer }: ScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const canGoBack = router.canGoBack();
  const showBack = canGoBack || Boolean(backHref);
  const footerInScroll = Boolean(footer && scroll && width < 900);
  const contentPadding = width < 520 ? styles.contentMobile : width < 900 ? styles.contentTablet : styles.contentDesktop;

  function goBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    if (backHref) router.replace(backHref);
  }

  const content = (
    <View style={[styles.content, contentPadding]}>
      {showBack ? <View style={styles.backRow}><Button icon="arrow-left" mode="text" compact onPress={goBack}>Back</Button></View> : null}
      {title || subtitle ? <View style={styles.headingBlock}>
        {title ? <Text variant="headlineMedium" style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text variant="bodyLarge" style={styles.subtitle}>{subtitle}</Text> : null}
      </View> : null}
      {children}
      {footerInScroll ? <View style={styles.inlineFooter}>{footer}</View> : null}
    </View>
  );

  const webScrollStyle = Platform.OS === 'web'
    ? ({ overflowY: 'auto', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' } as never)
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
    {footer && !footerInScroll ? <View style={styles.footerShell}><View style={styles.footerContent}>{footer}</View></View> : null}
  </SafeAreaView>;
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator size="large" /><Text style={styles.loadingLabel}>{label}</Text></View></Screen>;
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
  content: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.xxl },
  contentMobile: { paddingHorizontal: spacing.lg },
  contentTablet: { paddingHorizontal: spacing.xxl },
  contentDesktop: { paddingHorizontal: spacing.xxxl },
  backRow: { alignSelf: 'flex-start', marginBottom: -spacing.md },
  headingBlock: { width: '100%', maxWidth: layout.readingMaxWidth, alignSelf: 'center', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  title: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  inlineFooter: { width: '100%', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginTop: spacing.xs, marginBottom: 78 },
  footerShell: { width: '100%', flexShrink: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md },
  footerContent: { width: '100%', maxWidth: layout.pageMaxWidth, alignSelf: 'center' },
  loading: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingLabel: { color: colors.muted, lineHeight: 24, textAlign: 'center' },
  empty: { paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xxl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, alignItems: 'center', gap: spacing.md },
  emptyIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.secondary, fontWeight: '900' },
  emptyTitle: { fontWeight: '800', color: colors.charcoal, textAlign: 'center' },
  emptyBody: { maxWidth: 520, textAlign: 'center' },
  emptyAction: { marginTop: spacing.xs, alignItems: 'center' },
});
