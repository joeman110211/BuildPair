import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors } from '@/constants/theme';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideBody({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View style={{ gap: 22 }}><Text style={{ color: colors.charcoal, fontWeight: '900', fontSize: 20 }}>Key points</Text>{guide.keyPoints.map(p => <Text key={p}>{p}</Text>)}{guide.sections.map(section => <View key={section.heading} style={{ gap: 10 }}>
    <SemanticHeading level={2} style={{ color: colors.charcoal, fontSize: 26, fontWeight: '900' }}>{section.heading}</SemanticHeading>
    {(section.paragraphs ?? []).map(p => <Text key={p}>{p}</Text>)}
    {(section.bullets ?? []).map(p => <Text key={p}>• {p}</Text>)}
  </View>)}</View>;
}
