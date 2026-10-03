import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { Text } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { LoadingScreen, Screen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { UserRole } from '@/types';

export function RoleGate({ role, children }: PropsWithChildren<{ role: UserRole }>) {
  const { user, loading, error, refresh, isSignedIn } = useCurrentUser();

  if (loading) return <LoadingScreen label="Checking your account…" />;
  if (!isSignedIn) return <Redirect href="/auth/account" />;

  if (error) {
    return (
      <Screen title="We couldn't load your account" subtitle="BuildPair could not finish checking your account. Your sign-in is still valid.">
        <Text>{error}</Text>
        <Button mode="contained" onPress={() => void refresh()}>Try again</Button>
      </Screen>
    );
  }

  if (!user) return <Redirect href="/auth/account" />;
  const enabled = role === 'customer' ? user.customerEnabled : user.traderEnabled;
  if (!enabled) return <Redirect href={{ pathname: '/auth/choose-role', params: { mode: role } }} />;
  return children;
}
