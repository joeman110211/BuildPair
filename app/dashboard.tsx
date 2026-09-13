import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/Screen';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { dashboardHref } from '@/lib/account-mode';
import type { UserRole } from '@/types';

export default function DashboardRedirect() {
  const { user, loading, isSignedIn } = useCurrentUser();

  if (loading) return <LoadingScreen label="Opening your dashboard…" />;
  if (!isSignedIn || !user) return <Redirect href="/auth/account" />;

  let mode: UserRole | null = null;
  if (user.activeMode === 'trader' && user.traderEnabled) mode = 'trader';
  else if (user.activeMode === 'customer' && user.customerEnabled) mode = 'customer';
  else if (user.traderEnabled) mode = 'trader';
  else if (user.customerEnabled) mode = 'customer';

  if (!mode) return <Redirect href="/auth/choose-role" />;
  return <Redirect href={dashboardHref(mode)} />;
}
