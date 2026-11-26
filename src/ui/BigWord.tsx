import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { isRtl, label, symbolOf, wordClass } from '../lib/lexicon';
import { useApp } from '../state/AppState';
import { spoken } from './a11y';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, CLASS_COLORS, radius } from './theme';

/**
 * Outside caregiver mode, a long press on a word (Settings → Touch, "Long press on a word: show it
 * big"): the word fills the board part of the screen; the sentence and the bar stay. Touching the
 * picture says it again; the ✕ (or Escape on a computer) returns to the board.
 */
export function BigWord({ concept }: { concept: string }) {
  const app = useApp();
  const { profile, lang, t } = app;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const close = () => app.setOverlay(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && app.setOverlay(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - box.w) > 1 || Math.abs(height - box.h) > 1) setBox({ w: width, h: height });
  };
  const word = label(profile, concept, lang);
  const colors = CLASS_COLORS[wordClass(profile, concept)];
  // The picture as big as the place allows, with room for the word under it.
  const size = Math.max(80, Math.min(box.w * 0.8, (box.h - 40) * 0.72));
  const fontSize = Math.max(24, Math.min(72, size * 0.16));
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, borderColor: colors.border }]} onLayout={onLayout} accessibilityViewIsModal>
      {box.w > 0 && (
        <Pressable
          onPress={() => app.speakConcept(concept)}
          accessibilityRole="button"
          accessibilityLabel={word}
          {...spoken(lang)}
          style={({ pressed }) => [styles.word, pressed && { opacity: 0.8 }]}
        >
          <SymbolView symbol={symbolOf(profile, concept)} size={size} />
          <Text style={[styles.text, { fontSize, writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]} numberOfLines={2}>
            {word}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t.close}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Icon name="x" size={34} color={C.text} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    borderRadius: radius.lg,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  word: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontWeight: '900', color: C.text, textAlign: 'center' },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
