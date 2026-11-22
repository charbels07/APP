/**
 * "No voice for Arabic on this device": shown in the set-up's voice step and in Settings → Board →
 * Voice when the device has no voice for one of the child's languages (an Android tablet without
 * Arabic voice data…), with where to install one. The board cannot say those words until then;
 * a word recorded by the family is still played. The board itself says it too, in one line
 * (`NoVoiceNotice`): a silent board must show its reason.
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { installSteps, NO_VOICE } from '../i18n/voiceCheck';
import { missingVoices } from '../lib/speech';
import type { Lang, UiLang } from '../model/types';
import { Icon } from './Icon';
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

/**
 * On the board itself, for the adults: this device has no voice for the language the board is
 * in, so touching a word says nothing. One line above the board, closed with its cross (it comes
 * back the next time the board opens, until a voice is installed). An empty voice list means
 * "not known" (`langsWithoutVoice`): nothing is shown then.
 */
export function NoVoiceNotice({ lang, uiLang, closeLabel }: { lang: Lang; uiLang: UiLang; closeLabel: string }) {
  const [missing, setMissing] = useState<Lang | null>(null);
  const [closed, setClosed] = useState<Lang | null>(null);
  useEffect(() => {
    let alive = true;
    missingVoices([lang])
      .then((m) => alive && setMissing(m.includes(lang) ? lang : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lang]);
  if (missing !== lang || closed === lang) return null;
  const t = NO_VOICE[uiLang];
  const rtl = uiLang === 'ar';
  return (
    <View style={[styles.notice, rtl && { flexDirection: 'row-reverse' }]} accessibilityRole="alert">
      <Icon name="volume" size={20} color={C.edit} />
      <Text style={[styles.noticeText, rtl && ({ textAlign: 'right', writingDirection: 'rtl' } as const)]}>{t.onBoard(t.names[lang])}</Text>
      <Pressable onPress={() => setClosed(lang)} style={styles.close} accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={6}>
        <Icon name="x" size={20} color={C.edit} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.editSoft, borderColor: '#FEC84B', borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 10 },
  noticeText: { flex: 1, color: C.edit, fontSize: 14, fontWeight: '600' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  box: { gap: 4, backgroundColor: C.editSoft, borderRadius: radius.md, padding: 10 },
  title: { color: C.edit, fontSize: 15, fontWeight: '700' },
  line: { color: C.edit, fontSize: 14 },
});
