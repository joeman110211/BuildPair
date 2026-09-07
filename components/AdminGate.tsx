import { useClerk } from '@clerk/expo';
import type { PropsWithChildren } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function AdminGate({ children }: PropsWithChildren) {
  const { user, loading, isSignedIn } = useCurrentUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (loading) return <LoadingScreen label="Checking administrator access…" />;
  if (!isSignedIn) return <Redirect href="/auth/sign-in?admin=1" />;
  if (!user) return <LoadingScreen label="Loading administrator account…" />;

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
