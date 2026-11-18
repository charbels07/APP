/**
 * The parent's consent before a child's profile is kept (set-up, and taking over a profile a
 * professional prepared). The text and its version: src/lib/consent.ts; the database keeps the record.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { consentText } from '../lib/consent';
import type { UiLang } from '../model/types';
import { checked } from './a11y';
import { useNavRtl } from './common';
import { Icon } from './Icon';
import { C } from './theme';

export function ConsentBox({ value, onChange, lang }: { value: boolean; onChange: (v: boolean) => void; lang: UiLang }) {
  const t = consentText[lang];
  const rtl = useNavRtl();
  const align = rtl ? styles.rtl : null;
  return (
    <View style={styles.card}>
      <Text style={[styles.title, align]} accessibilityRole="header">
        {t.title}
      </Text>
      <Text style={[styles.text, align]}>{t.text}</Text>
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="checkbox"
        {...checked(value)}
        accessibilityLabel={t.tick}
        style={[styles.row, rtl && { flexDirection: 'row-reverse' }]}
      >
        <View style={[styles.box, value && styles.boxOn]}>{value && <Icon name="check" size={18} color="#fff" />}</View>
        <Text style={[styles.tick, align]}>{t.tick}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceAlt },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
  text: { fontSize: 15, lineHeight: 21, color: C.text },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  box: { width: 28, height: 28, borderRadius: 6, borderWidth: 2, borderColor: C.inputBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  tick: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
});
