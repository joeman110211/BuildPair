import { Linking, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { SemanticHeading } from '@/components/SemanticHeading';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideSources({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View style={{ gap: 12, padding: 20 }}>
    <SemanticHeading level={2}>Sources and methodology</SemanticHeading>
    <Text>Prices are third-party UK market estimates, not BuildPair prices or guaranteed quotes. Check current official rules before acting.</Text>
    {guide.sources.map(s => <Button key={s.url} mode="outlined" onPress={() => Linking.openURL(s.url)}>{s.publisher}: {s.title}</Button>)}
  </View>;
}
