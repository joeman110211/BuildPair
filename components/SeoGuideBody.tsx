import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { SemanticHeading } from '@/components/SemanticHeading';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideBody({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View>{guide.sections.map(section => <View key={section.heading}>
    <SemanticHeading level={2}>{section.heading}</SemanticHeading>
    {(section.paragraphs ?? []).map(p => <Text key={p}>{p}</Text>)}
    {(section.bullets ?? []).map(p => <Text key={p}>• {p}</Text>)}
  </View>)}</View>;
}
