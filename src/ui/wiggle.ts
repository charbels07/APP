import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

const nativeDriver = Platform.OS !== 'web';

/**
 * A short wiggle of a pictogram (setting « Faire vibrer les pictogrammes »).
 * `n` changes at each new wiggle (0 = none); returns the transform to apply.
 */
export function useWiggle(n: number | undefined) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!n) return;
    v.stopAnimation();
    v.setValue(0);
    const step = (to: number, duration: number) => Animated.timing(v, { toValue: to, duration, useNativeDriver: nativeDriver });
    Animated.sequence([step(1, 60), step(-1, 90), step(0.8, 90), step(-0.6, 80), step(0.3, 70), step(0, 60)]).start();
  }, [n, v]);
  return [
    { rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) },
    { scale: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 1.08] }) },
  ];
}
