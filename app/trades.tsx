import { Redirect } from 'expo-router';

// Compatibility route for any stale browser/session links from older builds.
// The supported tradesperson dashboard lives at /trader/dashboard.
export default function LegacyTradesRoute() {
  return <Redirect href="/trader/dashboard" />;
}
