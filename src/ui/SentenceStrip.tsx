import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { renderStrip } from '../lib/grammar';
import { isRtl, symbolOf } from '../lib/lexicon';
import { speakSegments } from '../lib/speech';
import type { Profile, SymbolRef } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, radius } from './theme';
import { useWiggle } from './wiggle';

/** Persistent sentence strip (spec §10, COM-02). */
export function SentenceStrip({ compact }: { compact: boolean }) {
  const { strip, profile, lang, t, speakStrip, deleteLast, clearStrip, undo, canUndo, wiggle, pulse } = useApp();
  const tokens = useMemo(() => renderStrip(strip, profile), [strip, profile]);
  // Base direction follows the first word of the sentence (Unicode "first strong" rule).
  // An empty strip shows a hint in the navigation language, so it follows that direction.
  const rtl = strip.length ? isRtl(strip[0].lang) : profile.settings.uiLang === 'ar';
  const scroller = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (tokens.length) scroller.current?.scrollToEnd({ animated: true });
    else scroller.current?.scrollTo({ x: 0, animated: false });
  }, [tokens.length]);
  const chipSymbol = compact ? 30 : 40;

  return (
    <View style={[styles.wrap, compact && { minHeight: 70 }]}>
      <Pressable
        style={styles.stripArea}
        onPress={speakStrip}
        accessibilityRole="button"
        accessibilityLabel={t.speak}
      >
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chips, rtl && { flexDirection: 'row-reverse', flexGrow: 1 }]}
        >
          {tokens.length === 0 ? (
            <Text style={styles.hint}>{t.stripHint}</Text>
          ) : (
            tokens.map((tok) => (
              <Pressable
                key={tok.key}
                onPress={() => {
                  pulse(tok.concept ?? tok.picture?.word ?? '', tok.key);
                  speakSegments(
                    tok.audio ? [{ kind: 'audio', media: tok.audio }] : [{ kind: 'tts', text: tok.text, lang: tok.lang }],
                    profile.settings,
                  );
                }}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                accessibilityLabel={tok.text}
              >
                {tok.concept || tok.picture ? (
                  <ChipSymbol
                    symbol={chipPicture(profile, tok)}
                    size={chipSymbol}
                    wiggleN={wiggle?.key === tok.key ? wiggle.n : 0}
                  />
                ) : null}
                <Text
                  style={[styles.chipText, compact && { fontSize: 15 }, { writingDirection: isRtl(tok.lang) ? 'rtl' : 'ltr' }]}
                >
                  {tok.text}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Pressable>
      <View style={styles.actions}>
        <StripButton icon="undo" label={t.undo} caption={t.undo} onPress={undo} disabled={!canUndo} compact={compact} />
        <StripButton icon="backspace" label={t.deleteLast} caption={t.deleteShort} onPress={deleteLast} disabled={!strip.length} compact={compact} />
        <StripButton icon="trash" label={t.clear} caption={t.clear} onPress={clearStrip} disabled={!strip.length} compact={compact} danger />
        <Pressable
          onPress={speakStrip}
          accessibilityRole="button"
          accessibilityLabel={t.speak}
          style={({ pressed }) => [styles.speak, compact && { width: 64 }, pressed && { opacity: 0.75 }]}
        >
          <Icon name="volume" size={compact ? 26 : 30} color="#fff" />
          {!compact && <Text style={styles.speakText}>{t.speak}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

/** Picture of a card of the sentence: its word of the boards, or the library pictogram of a typed word. */
export function chipPicture(profile: Profile, tok: { concept?: string; picture?: { word?: string; picto?: string } }): SymbolRef {
  const word = tok.concept ?? tok.picture?.word;
  if (word) return symbolOf(profile, word);
  return { kind: 'picto', key: tok.picture?.picto ?? '' };
}

function ChipSymbol({ symbol, size, wiggleN }: { symbol: SymbolRef; size: number; wiggleN: number }) {
  const transform = useWiggle(wiggleN);
  return (
    <Animated.View style={{ transform }}>
      <SymbolView symbol={symbol} size={size} />
    </Animated.View>
  );
}

function StripButton({
  icon,
  label,
  caption,
  onPress,
  disabled,
  compact,
  danger,
}: {
  icon: 'undo' | 'backspace' | 'trash';
  label: string;
  caption: string;
  onPress: () => void;
  disabled: boolean;
  compact: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.stripBtn,
        compact && { width: 44 },
        danger && !disabled && styles.danger,
        { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} size={compact ? 22 : 24} color={danger ? C.help : C.text} />
      {!compact && (
        <Text style={[styles.caption, danger && { color: C.help }]} numberOfLines={2}>
          {caption}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    minHeight: 86,
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    padding: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  stripArea: { flex: 1, borderRadius: radius.md, backgroundColor: C.surfaceAlt, overflow: 'hidden' },
  chips: { alignItems: 'center', paddingHorizontal: 8, gap: 6, minHeight: '100%' },
  hint: { color: C.textMuted, fontSize: 16, paddingHorizontal: 6 },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 48,
  },
  chipText: { fontSize: 18, fontWeight: '700', color: C.text },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  stripBtn: { width: 66, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, gap: 2 },
  danger: { backgroundColor: C.helpSoft },
  caption: { fontSize: 11, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
  speak: {
    width: 104,
    borderRadius: radius.md,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  speakText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
