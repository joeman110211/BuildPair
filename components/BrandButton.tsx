import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { controlHeights, radii } from '@/constants/theme';

/** Shared shape and touch target; preserves Paper and Expo Link behaviour. */
export const Button = forwardRef<ComponentRef<typeof PaperButton>, ComponentProps<typeof PaperButton>>(
  function BrandButton({ style, contentStyle, labelStyle, testID, ...props }, ref) {
    const content = StyleSheet.flatten(contentStyle);
    return <PaperButton
      {...props}
      ref={ref}
      testID={testID ?? 'brand-button'}
      style={[styles.button, style, { borderRadius: radii.md }]}
      contentStyle={[contentStyle, { minHeight: Math.max(controlHeights.standard, typeof content?.minHeight === 'number' ? content.minHeight : 0) }]}
      labelStyle={[styles.label, labelStyle, Platform.OS === 'web' && styles.webLabel]}
    />;
  },
);

const styles = StyleSheet.create({
  button: { borderRadius: radii.md, minWidth: 0, maxWidth: '100%', flexShrink: 1 },
  label: { flexShrink: 1 },
  webLabel: { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' } as never,
});
