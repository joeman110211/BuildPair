import { useClerk } from '@clerk/expo';
import type { PropsWithChildren } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function AdminGate({ children }: PropsWithChildren) {
  const { user, loading, error, refresh, isSignedIn } = useCurrentUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (loading) return <LoadingScreen label="Checking administrator access…" />;
  if (!isSignedIn) return <Redirect href="/auth/sign-in?admin=1" />;

  if (!user) {
    return (
      <Screen title="Unable to verify administrator access" subtitle="BuildPair could not load the signed-in administrator account.">
        <Text>{error || 'The administrator account could not be loaded. Try the check again or sign in again.'}</Text>
        <Button mode="contained" onPress={() => void refresh()}>Try again</Button>
        <Button onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>Sign out and sign in again</Button>
      </Screen>
    );
  }

  if (!user.isAdmin) {
    return (
      <Screen title="Administrator access required" subtitle="This BuildPair control app is restricted to authorised administrator accounts.">
        <Text>Your signed-in account does not have administrator access.</Text>
        <Button mode="contained" onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>Sign out</Button>
      </Screen>
    );
  }

  return children;
}
