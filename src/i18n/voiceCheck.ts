/**
 * "No voice for Arabic on this device" (src/ui/VoiceCheck.tsx): the warning and where to install a
 * voice, in the three languages of the menus.
 */
import type { Lang, UiLang } from '../model/types';

export const NO_VOICE: Record<
  UiLang,
  { names: Record<Lang, string>; none: (lang: string) => string; onBoard: (lang: string) => string; ios: string; android: string; computer: string }
> = {
  fr: {
    names: { fr: 'le français', en: 'l’anglais', ar: 'l’arabe' },
    none: (lang) => `Pas de voix pour ${lang} sur cet appareil : les mots dans cette langue ne seront pas dits.`,
    onBoard: (lang) => `Pas de voix pour ${lang} sur cet appareil : le tableau ne peut pas dire ses mots (un mot enregistré par la famille est quand même joué). Pour en installer une : Réglages → Voix.`,
    ios: 'iPad / iPhone : Réglages → Accessibilité → Contenu énoncé → Voix, choisissez la langue et téléchargez une voix.',
    android: 'Android : Paramètres → Système → Langues → Synthèse vocale, puis installez les données vocales de la langue.',
    computer: 'Ordinateur : ajoutez la langue et sa voix dans les réglages du système, puis rouvrez le navigateur.',
  },
  en: {
    names: { fr: 'French', en: 'English', ar: 'Arabic' },
    none: (lang) => `No voice for ${lang} on this device: words in this language will not be said.`,
    onBoard: (lang) => `No voice for ${lang} on this device: the board cannot say its words (a word recorded by the family is still played). To install one: Settings → Voice.`,
    ios: 'iPad / iPhone: Settings → Accessibility → Spoken Content → Voices, choose the language and download a voice.',
    android: 'Android: Settings → System → Languages → Text-to-speech, then install the language’s voice data.',
    computer: 'Computer: add the language and its voice in the system settings, then reopen the browser.',
  },
  ar: {
    names: { fr: 'الفرنسية', en: 'الإنجليزية', ar: 'العربية' },
    none: (lang) => `لا يوجد صوت لـ${lang} على هذا الجهاز: لن تُقال الكلمات بهذه اللغة.`,
    onBoard: (lang) => `لا يوجد صوت لـ${lang} على هذا الجهاز: لا تستطيع اللوحة قول كلماتها (الكلمة التي سجّلتها العائلة تُشغَّل مع ذلك). لتثبيت صوت: الإعدادات ← الصوت.`,
    ios: 'iPad / iPhone: الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات، اختاروا اللغة ونزّلوا صوتاً.',
    android: 'Android: الإعدادات ← النظام ← اللغات ← تحويل النص إلى كلام، ثم ثبّتوا البيانات الصوتية للغة.',
    computer: 'الحاسوب: أضيفوا اللغة وصوتها في إعدادات النظام، ثم أعيدوا فتح المتصفح.',
  },
};

/** How to install a voice on this kind of device (the browser can be on a tablet or a computer). */
export function installSteps(ui: UiLang, os: string): string[] {
  const t = NO_VOICE[ui];
  return os === 'ios' ? [t.ios] : os === 'android' ? [t.android] : [t.ios, t.android, t.computer];
}
