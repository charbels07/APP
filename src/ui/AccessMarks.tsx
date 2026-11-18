/**
 * What the child sees of the ways to choose without pointing (Settings → Touch): the scanning
 * highlight (a thick violet ring with a white ring inside, visible on light and dark cards alike)
 * and the filling of a card while the pointer rests on it.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { C } from './theme';

/** The scanning highlight, drawn over its target. `outset`: how far it goes beyond the target's edge. */
export function ScanRing({ outset = 0, radius = 12, row = false }: { outset?: number; radius?: number; row?: boolean }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.ring, { top: -outset, left: -outset, right: -outset, bottom: -outset, borderRadius: radius + outset }, row && styles.row]}
    >
      <View style={[styles.inner, { borderRadius: Math.max(2, radius + outset - RING) }]} />
    </View>
  );
}

/** The card fills up from the bottom while the pointer rests on it (`ms`: the time it takes). */
export function DwellFill({ ms, radius = 10 }: { ms: number; radius?: number }) {
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fill.setValue(0);
    const anim = Animated.timing(fill, { toValue: 1, duration: ms, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [fill, ms]);
  const height = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.fillBox, { borderRadius: radius }]}>
      <Animated.View style={[styles.fill, { height }]} />
    </View>
  );
}

const RING = 6;

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: RING, borderColor: C.scan, zIndex: 25 },
  row: { backgroundColor: C.scanSoft },
  inner: { flex: 1, borderWidth: 3, borderColor: C.scanInner },
  fillBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 4, borderColor: C.scan },
  fill: { width: '100%', backgroundColor: C.scanFill },
});
