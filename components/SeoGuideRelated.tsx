import { type Href, Link } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/components/BrandButton';
import { SemanticHeading } from '@/components/SemanticHeading';
import { allAdviceGuideBySlug } from '@/lib/advice-catalog';
import type { SeoBatchThreeGuide } from '@/lib/seo-advice-batch-three';
export function SeoGuideRelated({ guide }: { guide: SeoBatchThreeGuide }) {
  return <View style={{ gap: 10 }}>
    <SemanticHeading level={2}>Related BuildPair guides</SemanticHeading>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {guide.related.map(slug => {
        const related = allAdviceGuideBySlug(slug);
        return related ? <Link key={slug} href={('/(public)/advice/' + slug) as Href} asChild><Button mode="outlined">{related.title}</Button></Link> : null;
      })}
    </View>
  </View>;
}
