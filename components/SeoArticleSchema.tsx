import Head from 'expo-router/head';
export function SeoArticleSchema({ title, url }: { title: string; url: string }) {
  const data = { '@context': 'https://schema.org', '@type': 'Article', headline: title, mainEntityOfPage: url };
  return <Head><script type="application/ld+json">{JSON.stringify(data)}</script></Head>;
}
