import { type Href, Redirect, useLocalSearchParams } from 'expo-router';
import { firstParam } from '@/lib/search-params';


export default function FoundingTradesPage() {
  const params = useLocalSearchParams<{ source?: string | string[]; ref?: string | string[] }>();
  const query = new URLSearchParams();
  query.set('source', firstParam(params.source) || 'founding-trades');
  const referral = firstParam(params.ref);
  if (referral) query.set('ref', referral);
  return <Redirect href={`/auth/founding-trade-signup?${query.toString()}` as Href} />;
}
