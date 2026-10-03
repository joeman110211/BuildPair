import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { colors, radii } from '@/constants/theme';

const AUDIENCES = ['For homeowners', 'For tradespeople'] as const;
const EXAMPLES = [
  [
    { audience: 'For homeowners', title: 'Agree the job with confidence.', body: 'Keep the scope, price and conversation together before work begins.', href: '/(public)/for-homeowners' as const, workspace: 'Your agreed job', rows: [
      ['01', 'Clear quotes', 'See scope, materials and timing together'],
      ['02', 'Project messages', 'Keep the conversation attached to the job'],
    ] },
    { audience: 'For homeowners', title: 'Stay clear as work progresses.', body: 'Keep agreed changes and payment decisions connected to the work.', href: '/(public)/for-homeowners' as const, workspace: 'Your project record', rows: [
      ['01', 'Agreed changes', 'Record updates to the scope and price'],
      ['02', 'Payment stages', 'Follow the payment route you both agree'],
    ] },
  ],
  [
    { audience: 'For tradespeople', title: 'Turn enquiries into clear quotes.', body: 'Prepare quotes and organise projects for BuildPair and your own customers. Features depend on your plan.', href: '/(public)/for-tradespeople' as const, workspace: 'Quotes & customers', rows: [
      ['01', 'Quote builder', 'Itemised prices, terms and revisions'],
      ['02', 'Customers & projects', 'Keep the jobs you manage together'],
    ] },
    { audience: 'For tradespeople', title: 'Keep the admin moving.', body: 'Keep invoices, project conversations and agreed changes organised. Features depend on your plan.', href: '/(public)/for-tradespeople' as const, workspace: 'Your business workspace', rows: [
      ['01', 'Invoices', 'Keep billing connected to the work'],
      ['02', 'Project records', 'Messages and agreed changes in one place'],
    ] },
  ],
];

export function ProductPreview() {
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const scroller = useRef<ScrollView>(null);
  const [panelWidth, setPanelWidth] = useState(Math.max(280, width - 32));
  const [audience, setAudience] = useState(0);
  const [activeCard, setActiveCard] = useState(0);
  const choose = (index: number) => {
    setAudience(index);
    setActiveCard(0);
    scroller.current?.scrollTo({ x: 0, animated: false });
  };
  const examples = EXAMPLES[audience] ?? EXAMPLES[0]!;
  const panels = examples.map((example) => <View key={example.title} style={[styles.panel, mobile && { width: panelWidth, flexBasis: 'auto', flexGrow: 0, flexShrink: 0 }]}>
    <Text style={styles.audience}>{example.audience}</Text>
    <Text style={styles.title}>{example.title}</Text>
    <Text style={styles.body}>{example.body}</Text>
    <View style={styles.preview}>
      <View style={styles.previewHeader}><Text style={styles.previewTitle}>{example.workspace}</Text><Text style={styles.exampleLabel}>ILLUSTRATIVE VIEW</Text></View>
      {example.rows.map(([number, title, copy]) => <View key={title} style={styles.row}><View style={styles.number}><Text style={styles.numberText}>{number}</Text></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{copy}</Text></View></View>)}
    </View>
    <Link href={example.href} asChild><Button mode="text" style={styles.button}>Explore {example.audience === 'For homeowners' ? 'homeowner benefits' : 'trade tools'} →</Button></Link>
  </View>);
  return <View style={styles.wrap} onLayout={(event) => setPanelWidth(Math.max(1, Math.round(event.nativeEvent.layout.width)))}>
    <View style={styles.tabs}>{AUDIENCES.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: audience === index }} onPress={() => choose(index)} style={[styles.tab, audience === index && styles.tabActive]}><Text style={[styles.tabText, audience === index && styles.tabTextActive]}>{label}</Text></Pressable>)}</View>
    {mobile ? <>
      <ScrollView key={audience} ref={scroller} style={styles.carousel} contentContainerStyle={styles.carouselContent} horizontal pagingEnabled snapToInterval={panelWidth} decelerationRate="fast" showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActiveCard(Math.max(0, Math.min(1, Math.round(event.nativeEvent.contentOffset.x / panelWidth))))}>{panels}</ScrollView>
      <View style={styles.pagination}>{examples.map((example, index) => <Pressable key={example.title} accessibilityRole="button" accessibilityLabel={`Show card ${index + 1}: ${example.title}`} accessibilityState={{ selected: activeCard === index }} onPress={() => { setActiveCard(index); scroller.current?.scrollTo({ x: index * panelWidth, animated: true }); }} style={styles.pageControl}><View style={[styles.dot, activeCard === index && styles.dotActive]} /></Pressable>)}</View>
      <Text style={styles.hint}>{activeCard + 1} of 2 · Swipe to explore {audience === 0 ? 'homeowner benefits' : 'trade tools'}</Text>
    </> : <View style={styles.grid}>{panels}</View>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', minWidth: 0, gap: 12 }, carousel: { flexGrow: 0, flexShrink: 0 }, carouselContent: { alignItems: 'stretch' }, pagination: { flexDirection: 'row', justifyContent: 'center' }, pageControl: { width: 44, height: 32, alignItems: 'center', justifyContent: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CAD6E0' }, dotActive: { backgroundColor: colors.navy }, grid: { flexDirection: 'row', gap: 16 }, panel: { flexShrink: 1, maxWidth: '100%', flexGrow: 1, flexBasis: 0, minWidth: 0, padding: 20, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, gap: 12 },
  audience: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }, title: { color: colors.charcoal, fontSize: 23, lineHeight: 29, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 23 },
  preview: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden', marginTop: 4 }, previewHeader: { padding: 14, gap: 4, backgroundColor: colors.navy }, previewTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, exampleLabel: { color: '#CBD9E4', fontSize: 9, letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, number: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.accentDark, fontSize: 11, fontWeight: '800' }, rowCopy: { flex: 1, minWidth: 0, gap: 3 }, rowTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' }, rowBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 8 }, tab: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, borderColor: '#CAD6E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, tabActive: { backgroundColor: colors.navy, borderColor: colors.navy }, tabText: { color: colors.navy, fontSize: 12, fontWeight: '700' }, tabTextActive: { color: '#FFFFFF' }, button: { alignSelf: 'flex-start', maxWidth: '100%' }, hint: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
