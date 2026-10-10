import Head from 'expo-router/head';
import { PUBLIC_SHARE_IMAGE } from '@/components/PublicSeo';

export function SeoArticleSchema({ title, description, url }: { title: string; description: string; url: string }) {
  const organisation = { '@type': 'Organization', name: 'BuildPair', url: 'https://www.buildpair.co.uk/' };
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: url,
    datePublished: '2026-10-10',
    dateModified: '2026-10-10',
    image: PUBLIC_SHARE_IMAGE,
    author: organisation,
    publisher: { ...organisation, logo: { '@type': 'ImageObject', url: PUBLIC_SHARE_IMAGE } },
    inLanguage: 'en-GB',
  };
  return <Head><script type="application/ld+json">{JSON.stringify(data)}</script></Head>;
}
