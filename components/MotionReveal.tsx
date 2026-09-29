import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '@/constants/theme';

export function MotionReveal({
  children,
  delay = 0,
  distance = motion.revealDistance,
}: PropsWithChildren<{ delay?: number; distance?: number }>) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.reveal,
      delay,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  return <Animated.View style={{
    opacity: progress,
    transform: [{
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [distance, 0],
      }),
    }],
  }}>{children}</Animated.View>;
}
