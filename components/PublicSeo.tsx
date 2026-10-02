import Head from 'expo-router/head';
import { usePathname } from 'expo-router';

export const PUBLIC_SHARE_IMAGE = 'https://res.cloudinary.com/qrrcn7ma/image/upload/e_trim/v1789145309/buildpair-logo-transparent.png';

export function PublicSeo({ title, description }: { title: string; description: string }) {
  const pathname = usePathname();
  const pageTitle = `${title} | BuildPair`;
  const url = `https://www.buildpair.co.uk${pathname === '/' ? '/' : pathname}`;
  return <Head>
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={url} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="BuildPair" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={url} />
    <meta property="og:image" content={PUBLIC_SHARE_IMAGE} />
    <meta property="og:image:alt" content="BuildPair. Pairing homeowners with the right trades." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={PUBLIC_SHARE_IMAGE} />
  </Head>;
}
