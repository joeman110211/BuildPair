import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { interaction } from '@/constants/theme';

export function Reveal({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const hostRef = useRef<View>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(14));
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    let observer: IntersectionObserver | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!active) return;
      setReduceMotion(enabled);

      if (enabled) {
        setVisible(true);
        return;
      }

      const node = hostRef.current as unknown as Element | null;
      if (!node || typeof IntersectionObserver === 'undefined') {
        setVisible(true);
        return;
      }

      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer?.disconnect();
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      });

      observer.observe(node);
    });

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: interaction.revealMs,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: interaction.revealMs,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, reduceMotion, translateY, visible]);

  return <View ref={hostRef} style={style}>
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  </View>;
}
