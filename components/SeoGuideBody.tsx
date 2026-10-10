import { View } from 'react-native';
import { Text } from 'react-native-paper';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideBody({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View>{guide.sections.map(section => <Text key={section.heading}>{section.heading}</Text>)}</View>;
}
