import { type Href, useRouter } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

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

  function goBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    if (backHref) router.replace(backHref);
  }

  const content = (
    <View style={styles.content}>
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
  const webViewportStyle = Platform.OS === 'web'
    ? ({ minHeight: '100dvh', height: '100dvh' } as never)
    : undefined;

  return <SafeAreaView style={[styles.safe, webViewportStyle]}>
    {scroll ? <ScrollView
      style={[styles.scrollView, webScrollStyle]}
      contentContainerStyle={[styles.scroll, footer && !footerInScroll ? styles.scrollWithFooter : null]}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator
    >{content}</ScrollView> : <View style={styles.staticBody}>{content}</View>}
    {footer && !footerInScroll ? <View style={styles.footerShell}><View style={styles.footerContent}>{footer}</View></View> : null}
  </SafeAreaView>;
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator size="large" /><Text style={styles.subtitle}>{label}</Text></View></Screen>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>BP</Text></View><Text variant="titleLarge" style={styles.emptyTitle}>{title}</Text><Text style={[styles.subtitle, styles.emptyBody]}>{body}</Text>{action}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { flexGrow: 1, paddingBottom: 64 },
  scrollWithFooter: { paddingBottom: 28 },
  staticBody: { flex: 1, minHeight: 0 },
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 20 },
  backRow: { alignSelf: 'flex-start', marginBottom: -8 },
  headingBlock: { gap: 8, paddingHorizontal: 2 },
  title: { color: colors.charcoal, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: colors.muted, lineHeight: 24 },
  inlineFooter: { width: '100%', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginTop: 2, marginBottom: 24 },
  footerShell: { width: '100%', flexShrink: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceRaised, paddingHorizontal: 18, paddingVertical: 10 },
  footerContent: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  loading: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { paddingVertical: 38, paddingHorizontal: 26, borderWidth: 1, borderColor: colors.border, borderRadius: 26, backgroundColor: colors.surfaceRaised, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: colors.secondary, fontWeight: '900' },
  emptyTitle: { fontWeight: '800', color: colors.charcoal, textAlign: 'center' },
  emptyBody: { maxWidth: 500, textAlign: 'center' },
});
