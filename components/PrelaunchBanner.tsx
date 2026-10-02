import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { colors, controlHeights, radii, spacing } from '@/constants/theme';
import { LAUNCH_DATE_LABEL, MARKETPLACE_OPEN, REGISTRATION_OPEN, waitlistHref } from '@/lib/launch';

export function PrelaunchBanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [showTerms, setShowTerms] = useState(false);
  if (MARKETPLACE_OPEN && REGISTRATION_OPEN) return null;

  return (
    <View style={styles.shell}>
      <View style={styles.topAccent} />
      <View style={[styles.inner, compact && styles.innerCompact]}>
        <View style={[styles.copy, compact && styles.copyCompact]}>
          <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LAUNCHING SOON</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Read free Pro offer terms" accessibilityState={{ expanded: showTerms }} onPress={() => setShowTerms(!showTerms)} style={styles.offerPill}>
              <Text style={styles.offerPillText}>3 MONTHS PRO FREE · TERMS {showTerms ? '−' : '+'}</Text>
            </Pressable>
          </View>

          <View style={styles.textBlock}>
            <Text style={[styles.title, compact && styles.titleCompact]}>
              BuildPair opens {LAUNCH_DATE_LABEL}.
            </Text>
            <Text style={[styles.body, compact && styles.bodyCompact]}>
              Profiles are open. Jobs, quotes, messaging, BuildPay and paid plans open at launch.
            </Text>
          </View>
          {showTerms ? <Text style={styles.body}>Create a trade profile before 15 October 2026 to receive Pro access from 15 October 2026 until 15 January 2027. No paid subscription is created automatically. Profile setup is free; marketplace activity remains closed until launch.</Text> : null}
        </View>

        {compact ? (
          <View style={styles.mobileActions}>
            <Button
              mode="contained"
              style={StyleSheet.flatten([styles.button, styles.primaryButton])}
              contentStyle={styles.buttonContent}
              onPress={() => router.push(waitlistHref('trader', 'homepage-banner'))}
            >
              Trade signup
            </Button>
            <Button
              mode="outlined"
              textColor="#FFFFFF"
              style={StyleSheet.flatten([styles.button, styles.secondaryButton])}
              contentStyle={styles.buttonContent}
              onPress={() => router.push(waitlistHref('customer', 'homepage-banner'))}
            >
              Homeowner list
            </Button>
          </View>
        ) : (
          <View style={styles.actions}>
            <Link href={waitlistHref('trader', 'homepage-banner')} asChild>
              <Button
                mode="contained"
                  style={StyleSheet.flatten([styles.button, styles.primaryButton])}
                contentStyle={styles.buttonContent}
              >
                Trade signup
              </Button>
            </Link>
            <Link href={waitlistHref('customer', 'homepage-banner')} asChild>
              <Button
                mode="outlined"
                textColor="#FFFFFF"
                style={StyleSheet.flatten([styles.button, styles.secondaryButton])}
                contentStyle={styles.buttonContent}
              >
                Homeowner list
              </Button>
            </Link>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  termsLink: { color: '#FFD7BA', fontSize: 12, lineHeight: 20, fontWeight: '700', paddingVertical: 6 },
  shell: {
    width: '100%',
    backgroundColor: colors.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: '#394149',
  },
  topAccent: {
    width: '100%',
    height: 4,
    backgroundColor: colors.primary,
  },
  inner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  innerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  copyCompact: {
    width: '100%',
    gap: 9,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaRowCompact: {
    gap: 6,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#303841',
    borderWidth: 1,
    borderColor: '#4A535D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  offerPill: {
    backgroundColor: '#FFF0E5',
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 32, justifyContent: 'center', paddingVertical: 7,
  },
  offerPillText: {
    color: colors.primaryDark,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  textBlock: {
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  body: {
    color: '#D7DBDF',
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 760,
  },
  bodyCompact: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  actions: {
    width: 260,
    flexShrink: 0,
    gap: 8,
  },
  mobileActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    borderRadius: radii.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  secondaryButton: {
    borderColor: '#68717A',
    flex: 1,
  },
  buttonContent: {
    minHeight: controlHeights.standard,
    paddingHorizontal: 8,
  },
});
