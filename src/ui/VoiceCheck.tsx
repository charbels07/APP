/**
 * "No voice for Arabic on this device": shown in the set-up's voice step and in Settings → Board →
 * Voice when the device has no voice for one of the child's languages (an Android tablet without
 * Arabic voice data…), with where to install one. The board cannot say those words until then;
 * a word recorded by the family is still played.
 */
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { installSteps, NO_VOICE } from '../i18n/voiceCheck';
import { missingVoices } from '../lib/speech';
import type { Lang, UiLang } from '../model/types';
import { C, radius } from './theme';

export function NoVoiceWarning({ langs, uiLang }: { langs: Lang[]; uiLang: UiLang }) {
  const [missing, setMissing] = useState<Lang[]>([]);
  const key = langs.join(',');
  useEffect(() => {
    let alive = true;
    missingVoices(langs)
      .then((m) => alive && setMissing(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!missing.length) return null;
  const t = NO_VOICE[uiLang];
  const rtl = uiLang === 'ar';
  const names = missing.map((l) => t.names[l]).join(rtl ? ' و' : uiLang === 'fr' ? ' et ' : ' and ');
  const align = rtl ? ({ textAlign: 'right', writingDirection: 'rtl' } as const) : null;
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={[styles.title, align]}>{t.none(names)}</Text>
      {installSteps(uiLang, Platform.OS).map((line) => (
        <Text key={line} style={[styles.line, align]}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4, backgroundColor: C.editSoft, borderRadius: radius.md, padding: 10 },
  title: { color: C.edit, fontSize: 15, fontWeight: '700' },
  line: { color: C.edit, fontSize: 14 },
});
