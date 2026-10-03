import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '@/hooks/useResponsiveDimensions';
import { Text, TextInput } from 'react-native-paper';
import { Button } from '@/components/BrandButton';
import { PublicFooter } from '@/components/PublicFooter';
import { colors, publicResponsiveMetrics, radii } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

export default function ContactPage() {
  const { width } = useWindowDimensions();
  const metrics = publicResponsiveMetrics(width);
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  async function submit() {
    try {
      setSending(true);
      setError('');
      setStatus('');
      await apiFetch<{ ok: boolean }>('/api/contact', { method: 'POST', body: JSON.stringify({ name, email, subject, message }) });
      setStatus('Thanks. Your message has been sent to BuildPair support.');
      setName(''); setEmail(''); setSubject(''); setMessage('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <View style={[styles.hero, metrics.phone && styles.heroMobile]}>
      <View style={styles.glow} />
      <View style={styles.heroInner}>
        <Button mode="text" textColor={colors.primaryDark} compact style={styles.back} onPress={goBack}>← Back</Button>
        <Text style={[styles.eyebrow, { fontSize: metrics.eyebrowFontSize, lineHeight: metrics.eyebrowLineHeight }]}>Contact BuildPair</Text>
        <Text variant="displaySmall" style={[styles.title, { fontSize: metrics.heroTitleFontSize, lineHeight: metrics.heroTitleLineHeight }]}>How can we help?</Text>
        <Text variant="bodyLarge" style={styles.intro}>Get help with your account, projects or BuildPair business enquiries.</Text>
      </View>
    </View>

    <View style={[styles.content, metrics.phone && styles.contentMobile]}>
      <View style={styles.sideColumn}>
        <View style={styles.contactCard}>
          <Text style={styles.cardEyebrow}>EMAIL SUPPORT</Text>
          <Text variant="headlineSmall" style={styles.cardTitle}>info@buildpair.co.uk</Text>
          <Text style={styles.body}>For account support, marketplace feedback, policy questions and general BuildPair enquiries.</Text>
        </View>
        <View style={styles.safetyCard}>
          <Text style={styles.cardEyebrow}>SAFETY</Text>
          <Text variant="titleLarge" style={styles.cardTitle}>Something urgent?</Text>
          <Text style={styles.body}>Use BuildPair reporting for marketplace concerns. Immediate danger, crime in progress or emergencies should be reported to the appropriate emergency service or authority rather than waiting for platform support.</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardEyebrow}>SEND A MESSAGE</Text>
        <Text variant="headlineSmall" style={styles.cardTitle}>How can BuildPair help?</Text>
        <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} outlineStyle={styles.inputOutline} />
        <TextInput mode="outlined" label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} outlineStyle={styles.inputOutline} />
        <TextInput mode="outlined" label="Subject" value={subject} onChangeText={setSubject} outlineStyle={styles.inputOutline} />
        <TextInput mode="outlined" label="Message" multiline numberOfLines={6} value={message} onChangeText={setMessage} outlineStyle={styles.inputOutline} />
        <Text style={styles.body}>Include the account or job details we need to help. Do not send passwords, full card details or unnecessary sensitive information.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? <Text style={styles.success}>{status}</Text> : null}
        <Button mode="contained" loading={sending} disabled={sending || !name.trim() || !email.trim() || message.trim().length < 10} onPress={submit}>Send message</Button>
      </View>
    </View>
    <PublicFooter />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.background, paddingHorizontal: 20, paddingVertical: 62, overflow: 'hidden' },
  heroMobile: { paddingHorizontal: 16, paddingVertical: 42 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -110, top: -150, backgroundColor: 'rgba(211,84,0,0.23)' },
  heroInner: { width: '100%', maxWidth: 1040, alignSelf: 'center', gap: 13, alignItems: 'center' },
  back: { alignSelf: 'flex-start', marginLeft: -8 },
  eyebrow: { color: colors.primaryDark, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
  title: { color: colors.charcoal, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  intro: { color: colors.muted, lineHeight: 27, maxWidth: 820, textAlign: 'center' },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  contentMobile: { paddingHorizontal: 16, paddingVertical: 16 },
  sideColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: '100%', gap: 14 },
  contactCard: { backgroundColor: colors.primarySoft, borderRadius: radii.xl, padding: 23, gap: 9, borderWidth: 1, borderColor: '#F2D7C3' },
  safetyCard: { backgroundColor: colors.accentSoft, borderRadius: radii.xl, padding: 23, gap: 9, borderWidth: 1, borderColor: '#CDE2DE' },
  formCard: { flexGrow: 2, flexShrink: 1, flexBasis: 470, minWidth: 0, maxWidth: '100%', backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 14 },
  cardEyebrow: { color: colors.primary, fontSize: 11.2, lineHeight: 15, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { color: colors.charcoal, fontWeight: '900', fontSize: 22, lineHeight: 28 },
  body: { color: colors.muted, lineHeight: 23 },
  inputOutline: { borderRadius: 14 },
  error: { color: colors.danger, lineHeight: 20 },
  success: { color: colors.success, lineHeight: 20, fontWeight: '700' },
});
