import { ScrollView, View } from 'react-native';
import { PublicFooter } from '@/components/PublicFooter';
import { PublicSeo } from '@/components/PublicSeo';
import { SeoArticleSchema } from '@/components/SeoArticleSchema';
import { SeoGuideBody } from '@/components/SeoGuideBody';
import { SeoGuideHero } from '@/components/SeoGuideHero';
import { SeoGuideRelated } from '@/components/SeoGuideRelated';
import { SeoGuideSources } from '@/components/SeoGuideSources';
import { colors } from '@/constants/theme';
import { SEO_ADVICE_BATCH_THREE } from '@/lib/seo-advice-batch-three';
export function SeoAdviceBatchThreePage({ slug }: { slug: string }) {
  const guide = SEO_ADVICE_BATCH_THREE.find(g => g.slug === slug);
  if (!guide) return null;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1 }}>
    <PublicSeo title={guide.title} description={guide.summary} />
    <SeoArticleSchema title={guide.title} description={guide.summary} url={'https://www.buildpair.co.uk/advice/' + slug} />
    <SeoGuideHero guide={guide} />
    <View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 48, gap: 24 }}>
      <SeoGuideBody guide={guide} />
      <SeoGuideSources guide={guide} />
      <SeoGuideRelated guide={guide} />
    </View>
    <PublicFooter />
  </ScrollView>;
}
