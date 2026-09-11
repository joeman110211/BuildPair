import { Redirect } from 'expo-router';

export default function SignUpClosed() {
  return <Redirect href="/(public)/waitlist?source=direct-signup" />;
}
