import { useAuth, useClerk } from '@clerk/expo';
import type { PropsWithChildren } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const verifiedAdminSessions = new Set<string>();

export function AdminGate({ children }: PropsWithChildren) {
  const { user, loading, error, refresh, isSignedIn } = useCurrentUser();
  const { sessionId } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const sessionAlreadyVerified = Boolean(sessionId && verifiedAdminSessions.has(sessionId));

  if (!isSignedIn) {
    if (sessionId) verifiedAdminSessions.delete(sessionId);
    return <Redirect href="/auth/sign-in?admin=1" />;
  }

  if (loading && !sessionAlreadyVerified) return <LoadingScreen label="Checking administrator access…" />;

  // Once this exact Clerk session has been verified as an administrator, keep the
  // admin shell mounted while /api/me refreshes. This removes the full-screen
  // loading flash that previously appeared between admin routes.
  if (loading && sessionAlreadyVerified) return children;

  if (!user) {
    if (sessionId) verifiedAdminSessions.delete(sessionId);
    return (
      <Screen title="Unable to verify administrator access" subtitle="BuildPair could not load the signed-in administrator account.">
        <Text>{error || 'The administrator account could not be loaded. Try the check again or sign in again.'}</Text>
        <Button mode="contained" onPress={() => void refresh()}>Try again</Button>
        <Button onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>Sign out and sign in again</Button>
      </Screen>
    );
  }

  if (!user.isAdmin) {
    if (sessionId) verifiedAdminSessions.delete(sessionId);
    return (
      <Screen title="Administrator access required" subtitle="This BuildPair control app is restricted to authorised administrator accounts.">
        <Text>Your signed-in account does not have administrator access.</Text>
        <Button mode="contained" onPress={() => signOut(() => router.replace('/auth/sign-in?admin=1'))}>Sign out</Button>
      </Screen>
    );
  }

  if (sessionId) verifiedAdminSessions.add(sessionId);
  return children;
}
