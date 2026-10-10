import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { SemanticHeading } from '@/components/SemanticHeading';
import { colors } from '@/constants/theme';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideHero({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View style={{ paddingHorizontal: 16, paddingVertical: 48 }}>
    <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', gap: 14 }}>
      <Text style={{ color: colors.primary, fontWeight: '900' }}>HOMEOWNER · {guide.category}</Text>
      <SemanticHeading level={1} style={{ color: colors.charcoal, fontSize: 36, lineHeight: 43, fontWeight: '900' }}>{guide.title}</SemanticHeading>
      <Text style={{ color: colors.charcoalSoft, fontSize: 18, lineHeight: 28 }}>{guide.summary}</Text>
      <Text style={{ color: colors.muted }}>Applies to: {guide.appliesTo} · Last checked: 10 October 2026</Text>
    </View>
  </View>;
}
