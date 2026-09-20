import { type Href, Redirect, useLocalSearchParams } from 'expo-router';

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function FoundingTradesPage() {
  const params = useLocalSearchParams<{ source?: string | string[]; ref?: string | string[] }>();
  const query = new URLSearchParams();
  query.set('source', scalar(params.source) || 'founding-trades');
  const referral = scalar(params.ref);
  if (referral) query.set('ref', referral);
  return <Redirect href={`/auth/founding-trade-signup?${query.toString()}` as Href} />;
}
