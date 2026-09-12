import { Redirect, useLocalSearchParams } from 'expo-router';
import { parseAccountMode } from '@/lib/account-mode';
import { waitlistHref } from '@/lib/launch';

export default function SignUpClosed() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = parseAccountMode(params.mode);
  return <Redirect href={waitlistHref(mode, 'direct-signup')} />;
}
