import { SignUp } from '@clerk/expo/web';
import { type Href, Redirect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { modeSetupHref, parseAccountMode, safeInternalReturnTo, signInHref } from '@/lib/account-mode';
import { clerkWebAppearance } from '@/lib/clerk-web';
import { firstParam } from '@/lib/search-params';

export default function SignUpWebEntry() {
  const params = useLocalSearchParams<{ invite?: string | string[]; mode?: string | string[]; returnTo?: string | string[] }>();
  const invite = firstParam(params.invite)?.trim();
  const mode = parseAccountMode(params.mode) ?? 'customer';
  const returnTo = safeInternalReturnTo(params.returnTo);

  if (invite) {
    return <Redirect href={`/auth/early-access?invite=${encodeURIComponent(invite)}` as Href} />;
  }

  return <Screen title={mode === 'trader' ? 'Tradesperson sign up' : 'Homeowner sign up'}>
    <SignUp
      routing="path"
      path="/auth/sign-up"
      signInUrl={String(signInHref(mode, returnTo))}
      forceRedirectUrl={String(modeSetupHref(mode, returnTo))}
      appearance={clerkWebAppearance}
    />
  </Screen>;
}
