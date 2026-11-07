import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { renderStrip } from '../lib/grammar';
import { isRtl, symbolOf } from '../lib/lexicon';
import { speakSegments } from '../lib/speech';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, radius } from './theme';

/** Persistent sentence strip (spec §10, COM-02). */
export function SentenceStrip({ compact }: { compact: boolean }) {
  const { strip, profile, lang, t, speakStrip, deleteLast, clearStrip, undo, canUndo } = useApp();
  const tokens = useMemo(() => renderStrip(strip, profile), [strip, profile]);
  // Base direction follows the first word of the sentence (Unicode "first strong" rule).
  const rtl = isRtl(strip.length ? strip[0].lang : lang);
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
                onPress={() =>
                  speakSegments(
                    tok.audio ? [{ kind: 'audio', media: tok.audio }] : [{ kind: 'tts', text: tok.text, lang: tok.lang }],
                    profile.settings,
                  )
                }
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
                accessibilityLabel={tok.text}
              >
                {tok.concept ? <SymbolView symbol={symbolOf(profile, tok.concept)} size={chipSymbol} /> : null}
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
        <StripButton icon="undo" label={t.undo} onPress={undo} disabled={!canUndo} compact={compact} />
        <StripButton icon="backspace" label={t.deleteLast} onPress={deleteLast} disabled={!strip.length} compact={compact} />
        <StripButton icon="x" label={t.clear} onPress={clearStrip} disabled={!strip.length} compact={compact} />
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

function StripButton({
  icon,
  label,
  onPress,
  disabled,
  compact,
}: {
  icon: 'undo' | 'backspace' | 'x';
  label: string;
  onPress: () => void;
  disabled: boolean;
  compact: boolean;
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
        { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} size={compact ? 22 : 26} color={C.text} />
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
  stripBtn: { width: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
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
