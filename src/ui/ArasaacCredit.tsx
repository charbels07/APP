/**
 * ARASAAC logo and credit, as ARASAAC's terms of use ask (https://arasaac.org/terms-of-use):
 * the author (Sergio Palao), the owner (Government of Aragón), the origin (ARASAAC) and the
 * licence (Creative Commons BY-NC-SA). The official logo has white lettering: it sits on a dark
 * badge, as on ARASAAC's own website. Touching it opens arasaac.org.
 */
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ARASAAC_CREDIT } from '../data/arasaacCredit';
import type { UiLang } from '../model/types';
import { C, radius } from './theme';

export { ARASAAC_CREDIT };

const LOGO = require('../../assets/arasaac-logo.png');
const RATIO = 1440 / 285;

const SHORT: Record<UiLang, string> = {
  fr: 'Pictogrammes : Sergio Palao · ARASAAC · Gouvernement d’Aragon · CC BY-NC-SA',
  en: 'Pictograms: Sergio Palao · ARASAAC · Government of Aragón · CC BY-NC-SA',
  ar: 'الرموز: سيرجيو بالاو · ARASAAC · حكومة أراغون · CC BY-NC-SA',
};

export function ArasaacLogo({ height = 30 }: { height?: number }) {
  return (
    <Pressable
      onPress={() => Linking.openURL('https://arasaac.org').catch(() => {})}
      style={[s.badge, { paddingVertical: height * 0.22, paddingHorizontal: height * 0.35 }]}
      accessibilityRole="link"
      accessibilityLabel="ARASAAC — arasaac.org"
    >
      <Image source={LOGO} style={{ height, width: height * RATIO }} resizeMode="contain" />
    </Pressable>
  );
}

/** Logo + credit. `compact`: one short line (welcome page); otherwise ARASAAC's full sentence. */
export function ArasaacCredit({ lang, compact = false }: { lang: UiLang; compact?: boolean }) {
  const rtl = lang === 'ar';
  return (
    <View style={[s.wrap, compact && { alignItems: 'center' }]}>
      <ArasaacLogo height={compact ? 22 : 30} />
      <Text style={[s.text, compact && { textAlign: 'center', fontSize: 12 }, rtl && !compact && { textAlign: 'right', writingDirection: 'rtl' }]}>
        {compact ? SHORT[lang] : ARASAAC_CREDIT[lang]}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8, alignItems: 'flex-start' },
  badge: { backgroundColor: C.rail, borderRadius: radius.md, alignSelf: 'auto' },
  text: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
});
