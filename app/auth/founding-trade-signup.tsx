import { useSignUp } from '@clerk/expo';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, HelperText, Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { AppCard } from '@/components/AppCard';
import { LegalAcceptance } from '@/components/LegalAcceptance';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { modeSetupHref, signInHref } from '@/lib/account-mode';
import { errorMessage } from '@/lib/api';
import { TRADER_PRELAUNCH_REGISTRATION_OPEN } from '@/lib/launch';
import { firstParam } from '@/lib/search-params';


export default function FoundingTradeSignup() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string | string[]; ref?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';
  const source = firstParam(params.source)?.slice(0, 150) || 'founding-trade-signup';
  const referralCode = firstParam(params.ref)?.slice(0, 40) || '';
  const normalisedEmail = email.trim().toLowerCase();
  const canCreate = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail) && password.length >= 8, [normalisedEmail, password.length]);
  const needsEmailVerification = signUp.status === 'missing_requirements'
    && signUp.unverifiedFields.includes('email_address')
    && signUp.missingFields.length === 0;

  async function startSignup() {
    if (!legalAccepted) return;
    if (!canCreate || !TRADER_PRELAUNCH_REGISTRATION_OPEN) return;
    try {
      setError('');
      const result = await signUp.password({
        emailAddress: normalisedEmail,
        password,
        legalAccepted,
        unsafeMetadata: {
          buildpairMode: 'trader',
          buildpairPrelaunch: true,
          buildpairFoundingTrade: true,
          buildpairAcquisitionSource: source,
          buildpairReferralCode: referralCode || undefined,
        },
      });
      if (result.error) throw result.error;
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) throw verification.error;
      setCode('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function verifyEmail() {
    try {
      setError('');
      const verification = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verification.error) throw verification.error;
      if (signUp.status !== 'complete') {
        const missing = signUp.missingFields?.join(', ');
        throw new Error(missing ? `Account verification still needs: ${missing}.` : `Account verification is incomplete (${signUp.status}).`);
      }
      const finalized = await signUp.finalize({
        navigate: async ({ session }) => {
          if (session?.currentTask) throw new Error('Your account needs another setup step before BuildPair can continue.');
          router.replace(modeSetupHref('trader'));
        },
      });
      if (finalized.error) throw finalized.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function resendCode() {
    try {
      setError('');
      const result = await signUp.verifications.sendEmailCode();
      if (result.error) throw result.error;
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (needsEmailVerification) {
    return <Screen title="Verify your trade account" subtitle={`We sent a 6-digit code to ${signUp.emailAddress ?? normalisedEmail}.`}>
      <AppCard style={styles.heroCard}>
        <Chip icon="hammer-wrench">Trade member</Chip>
        <Text variant="titleLarge" style={styles.heading}>Your profile is nearly ready to start.</Text>
        <Text style={styles.body}>Verify your email, then BuildPair will take you straight into your real tradesperson profile setup.</Text>
      </AppCard>
      <TextInput mode="outlined" label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" loading={busy} disabled={busy || !code.trim()} onPress={() => void verifyEmail()} contentStyle={styles.button}>Verify and build my profile</Button>
      <Button disabled={busy} onPress={() => void resendCode()}>Send another code</Button>
    </Screen>;
  }

  return <Screen title="Create your BuildPair trade profile" subtitle="Show your business, services and completed work in one place.">

    <AppCard style={styles.heroCard}>
      <Text variant="headlineSmall" style={styles.heading}>Build your profile. Show your work.</Text>
      <Text style={styles.body}>Create your BuildPair account and add your business details, service area, portfolio, credentials and Google review connection.</Text>
      <Text style={styles.body}>Get three months of BuildPair Pro free from completing your profile. No payment details or automatic paid subscription required. BuildPay is coming soon.</Text>
    </AppCard>

    <AppCard>
      <Text variant="titleMedium" style={styles.heading}>Create your account</Text>
      <TextInput mode="outlined" label="Business email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextInput mode="outlined" label="Choose a password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Text variant="bodySmall" style={styles.hint}>Use at least 8 characters. We’ll verify the email before opening profile setup.</Text>
      <LegalAcceptance accepted={legalAccepted} onChange={setLegalAccepted} disabled={busy} />
      <View nativeID="clerk-captcha" />
      <HelperText type="error" visible={Boolean(error)}>{error}</HelperText>
      <Button mode="contained" icon="hammer-wrench" loading={busy} disabled={busy || !legalAccepted || !canCreate || !TRADER_PRELAUNCH_REGISTRATION_OPEN} onPress={() => void startSignup()} contentStyle={styles.button}>Create profile</Button>
      <Link href={signInHref('trader')} asChild><Button mode="text">Already have an account? Sign in</Button></Link>
    </AppCard>
  </Screen>;
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  heading: { color: colors.charcoal, fontWeight: '900' },
  strong: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.text, lineHeight: 22 },
  hint: { color: colors.muted, lineHeight: 19 },
  button: { minHeight: 50 },
});
