import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { PublicFooter } from '@/components/PublicFooter';
import { colors } from '@/constants/theme';
import { apiFetch, errorMessage } from '@/lib/api';

export default function ContactPage() {
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
    <View style={styles.hero}>
      <View style={styles.glow} />
      <View style={styles.heroInner}>
        <Button mode="text" textColor="#FFFFFF" compact style={styles.back} onPress={goBack}>← Back</Button>
        <Text style={styles.eyebrow}>Contact BuildPair</Text>
        <Text variant="displaySmall" style={styles.title}>Support, marketplace questions and business enquiries.</Text>
        <Text variant="bodyLarge" style={styles.intro}>Tell us what you need help with and include enough detail for the team to understand the account, job or issue involved. Do not send passwords, full payment-card details or other unnecessary sensitive information.</Text>
      </View>
    </View>

    <View style={styles.content}>
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
  hero: { backgroundColor: colors.navy, paddingHorizontal: 20, paddingVertical: 62, overflow: 'hidden' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -110, top: -150, backgroundColor: 'rgba(211,84,0,0.23)' },
  heroInner: { width: '100%', maxWidth: 1040, alignSelf: 'center', gap: 13 },
  back: { alignSelf: 'flex-start', marginLeft: -8 },
  eyebrow: { color: '#FFD7BA', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
  title: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -1 },
  intro: { color: '#DFE8EE', lineHeight: 27, maxWidth: 820 },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  sideColumn: { flexGrow: 1, flexBasis: 280, gap: 14 },
  contactCard: { backgroundColor: colors.primarySoft, borderRadius: 26, padding: 23, gap: 9, borderWidth: 1, borderColor: '#F2D7C3' },
  safetyCard: { backgroundColor: colors.accentSoft, borderRadius: 26, padding: 23, gap: 9, borderWidth: 1, borderColor: '#CDE2DE' },
  formCard: { flexGrow: 2, flexBasis: 470, backgroundColor: colors.surfaceRaised, borderRadius: 26, padding: 24, borderWidth: 1, borderColor: colors.border, gap: 14 },
  cardEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { color: colors.charcoal, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 23 },
  inputOutline: { borderRadius: 14 },
  error: { color: colors.danger, lineHeight: 20 },
  success: { color: colors.success, lineHeight: 20, fontWeight: '700' },
});
