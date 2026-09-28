import { type Href, Redirect, useLocalSearchParams } from 'expo-router';
import { parseAccountMode } from '@/lib/account-mode';
import { waitlistHref } from '@/lib/launch';
import { firstParam } from '@/lib/search-params';


export default function SignUpWebEntry() {
  const params = useLocalSearchParams<{ invite?: string | string[]; mode?: string | string[] }>();
  const invite = firstParam(params.invite)?.trim();
  const mode = parseAccountMode(params.mode);

  if (invite) {
    return <Redirect href={`/auth/early-access?invite=${encodeURIComponent(invite)}` as Href} />;
  }

  return <Redirect href={waitlistHref(mode, 'direct-signup')} />;
}
