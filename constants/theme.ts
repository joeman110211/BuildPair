import { MD3LightTheme } from 'react-native-paper';

export const colors = {
  primary: '#D35400',
  primaryDark: '#963B00',
  primarySoft: '#FFF0E5',
  secondary: '#F2A65A',
  secondarySoft: '#FFF6E8',
  accent: '#23766D',
  accentSoft: '#E8F4F2',
  blue: '#3F6F8F',
  blueSoft: '#EAF2F7',
  navy: '#18354E',
  navySoft: '#EAF0F5',
  sage: '#5E7967',
  sageSoft: '#EDF4EF',
  violet: '#6B5C8D',
  violetSoft: '#F0EDF7',
  gold: '#B9791D',
  goldSoft: '#FFF5DF',
  background: '#F7F4F0',
  surface: '#FCFBF9',
  surfaceRaised: '#FFFFFF',
  surfaceSoft: '#F7F2EC',
  surfaceStrong: '#EEE7DF',
  charcoal: '#232930',
  charcoalSoft: '#3D444C',
  border: '#E3DBD2',
  text: '#23272B',
  muted: '#686F72',
  success: '#2E7D32',
  danger: '#B42318',
  warning: '#B76610',
  info: '#356C95',
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const layout = {
  pageMaxWidth: 1180,
  readingMaxWidth: 760,
  formMaxWidth: 820,
} as const;

export const controlHeights = {
  standard: 46,
  prominent: 50,
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: radii.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    onSecondary: colors.charcoal,
    secondaryContainer: colors.secondarySoft,
    onSecondaryContainer: colors.charcoal,
    tertiary: colors.accent,
    onTertiary: '#FFFFFF',
    tertiaryContainer: colors.accentSoft,
    onTertiaryContainer: colors.charcoal,
    background: colors.background,
    onBackground: colors.text,
    surface: colors.surfaceRaised,
    surfaceVariant: colors.surfaceSoft,
    surfaceDisabled: colors.surfaceStrong,
    outline: colors.border,
    outlineVariant: '#ECE5DE',
    onSurface: colors.text,
    onSurfaceVariant: colors.muted,
    error: colors.danger,
  },
};
