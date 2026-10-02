import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, radii } from '@/constants/theme';

const EXAMPLES = [
  { audience: 'For homeowners', title: 'Less chasing. More clarity.', body: 'Your agreed quote, conversations and changes stay attached to the job.', href: '/(public)/for-homeowners' as const, rows: [
    ['01', 'Agreed quote', 'Scope, materials and timing together'],
    ['02', 'Project messages', 'Keep the conversation with the work'],
    ['03', 'Changes & stages', 'Record decisions as the job progresses'],
  ] },
  { audience: 'For tradespeople', title: 'The work and the admin, together.', body: 'Quote, invoice and organise projects for BuildPair and your own customers. Features depend on your plan.', href: '/(public)/for-tradespeople' as const, rows: [
    ['01', 'Quote builder', 'Itemised prices, terms and revisions'],
    ['02', 'Customers & projects', 'One place for the jobs you manage'],
    ['03', 'Business tools', 'Availability, templates and insights'],
  ] },
];

export function ProductPreview() {
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const scroller = useRef<ScrollView>(null);
  const [panelWidth, setPanelWidth] = useState(Math.max(280, width - 32));
  const [active, setActive] = useState(0);
  const choose = (index: number) => {
    setActive(index);
    scroller.current?.scrollTo({ x: index * panelWidth, animated: true });
  };
  const panels = EXAMPLES.map((example) => <View key={example.audience} style={[styles.panel, mobile && { width: panelWidth, flexBasis: panelWidth }]}>
    <Text style={styles.audience}>{example.audience}</Text>
    <Text style={styles.title}>{example.title}</Text>
    <Text style={styles.body}>{example.body}</Text>
    <View style={styles.preview}>
      <View style={styles.previewHeader}><Text style={styles.previewTitle}>Project workspace</Text><Text style={styles.exampleLabel}>ILLUSTRATIVE VIEW</Text></View>
      {example.rows.map(([number, title, copy]) => <View key={title} style={styles.row}><View style={styles.number}><Text style={styles.numberText}>{number}</Text></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{copy}</Text></View></View>)}
    </View>
    <Link href={example.href} asChild><Button mode="text" style={styles.button}>Explore {example.audience === 'For homeowners' ? 'homeowner benefits' : 'trade tools'} →</Button></Link>
  </View>);
  return <View style={styles.wrap} onLayout={(event) => setPanelWidth(Math.max(1, Math.round(event.nativeEvent.layout.width)))}>
    {mobile ? <>
      <View style={styles.tabs}>{EXAMPLES.map((example, index) => <Pressable key={example.audience} accessibilityRole="button" accessibilityState={{ selected: active === index }} onPress={() => choose(index)} style={[styles.tab, active === index && styles.tabActive]}><Text style={[styles.tabText, active === index && styles.tabTextActive]}>{example.audience}</Text></Pressable>)}</View>
      <ScrollView ref={scroller} horizontal pagingEnabled snapToInterval={panelWidth} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActive(Math.max(0, Math.min(1, Math.round(event.nativeEvent.contentOffset.x / panelWidth))))} onScrollEndDrag={(event) => setActive(Math.max(0, Math.min(1, Math.round(event.nativeEvent.contentOffset.x / panelWidth))))}>{panels}</ScrollView>
      <Text style={styles.hint}>Swipe to explore both sides of BuildPair</Text>
    </> : <View style={styles.grid}>{panels}</View>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', minWidth: 0, gap: 12, overflow: 'hidden' }, grid: { flexDirection: 'row', gap: 16 }, panel: { flex: 1, minWidth: 0, padding: 20, borderRadius: radii.xl, backgroundColor: colors.surfaceRaised, gap: 12 },
  audience: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' }, title: { color: colors.charcoal, fontSize: 23, lineHeight: 29, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 23 },
  preview: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden', marginTop: 4 }, previewHeader: { padding: 14, gap: 4, backgroundColor: colors.navy }, previewTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, exampleLabel: { color: '#CBD9E4', fontSize: 9, letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, number: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.accentDark, fontSize: 11, fontWeight: '800' }, rowCopy: { flex: 1, minWidth: 0, gap: 3 }, rowTitle: { color: colors.charcoal, fontSize: 14, fontWeight: '700' }, rowBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 8 }, tab: { flex: 1, minHeight: 46, borderRadius: radii.md, borderWidth: 1, borderColor: '#CAD6E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, tabActive: { backgroundColor: colors.navy, borderColor: colors.navy }, tabText: { color: colors.navy, fontSize: 12, fontWeight: '700' }, tabTextActive: { color: '#FFFFFF' }, button: { alignSelf: 'flex-start', maxWidth: '100%' }, hint: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
