import { Redirect } from 'expo-router';

export default function SignUpVerificationClosed() {
  return <Redirect href="/(public)/waitlist?source=signup-verification" />;
}
