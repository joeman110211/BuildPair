import { createElement, type ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Platform, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function SemanticHeading({
  level,
  style,
  children,
}: {
  level: 1 | 2 | 3;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  if (Platform.OS === 'web') {
    const flattened = StyleSheet.flatten(style) ?? {};
    const lineHeight = typeof flattened.lineHeight === 'number' ? `${flattened.lineHeight}px` : flattened.lineHeight;
    return createElement('h' + level, { style: { margin: 0, ...flattened, lineHeight } }, children);
  }

  return <Text accessibilityRole="header" style={style}>{children}</Text>;
}
