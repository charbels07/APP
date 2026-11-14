/**
 * Notices ("Sarah invites you…", "Your certificate was accepted…") are written by the server
 * when things happen, as one sentence, in the language the person had at that moment (or in
 * French for the older ones). The person may read them later with other menus: so the app
 * recognises each kind of sentence and shows it again in the language of the menus.
 * A sentence it does not recognise is shown as it was written.
 *
 * `{1}` and `{2}` are the names inside the sentence (a person, a child, a title): kept as they are.
 * When the server gains a new notice, add its three versions here (a test lists them).
 */
import type { UiLang } from '../model/types';

type Template = Record<UiLang, string>;

/** More precise sentences first (a reminder is also an invitation). */
const TEMPLATES: Template[] = [
  // invitations and requests
  { fr: 'Rappel : {1} vous invite à rejoindre l’équipe de {2}.', en: 'Reminder: {1} invites you to join {2}’s team.', ar: 'تذكير: {1} يدعوك للانضمام إلى فريق {2}.' },
  { fr: '{1} vous invite à rejoindre l’équipe de {2}.', en: '{1} invites you to join {2}’s team.', ar: '{1} يدعوك للانضمام إلى فريق {2}.' },
  { fr: '{1} demande à rejoindre l’équipe de {2}.', en: '{1} asks to join {2}’s team.', ar: '{1} يطلب الانضمام إلى فريق {2}.' },
  { fr: '{1} a rejoint l’équipe de {2}.', en: '{1} joined {2}’s team.', ar: '{1} انضم إلى فريق {2}.' },
  { fr: '{1} a accepté l’invitation pour {2}.', en: '{1} accepted the invitation for {2}.', ar: '{1} قبل الدعوة الخاصة بـ {2}.' },
  { fr: '{1} a refusé l’invitation pour {2}.', en: '{1} declined the invitation for {2}.', ar: '{1} رفض الدعوة الخاصة بـ {2}.' },
  { fr: 'Votre demande pour {1} a été acceptée.', en: 'Your request for {1} was accepted.', ar: 'تم قبول طلبك بخصوص {1}.' },
  { fr: 'Votre demande pour {1} a été refusée.', en: 'Your request for {1} was declined.', ar: 'تم رفض طلبك بخصوص {1}.' },
  // access
  { fr: 'Vos droits sur le profil de {1} ont changé.', en: 'Your rights on {1}’s profile have changed.', ar: 'تغيّرت صلاحياتك على ملف {1}.' },
  { fr: 'Votre accès au profil de {1} a été retiré.', en: 'Your access to {1}’s profile was removed.', ar: 'أُزيل وصولك إلى ملف {1}.' },
  {
    fr: '{1} est maintenant le parent responsable du profil de {2}. Vous restez dans son équipe.',
    en: '{1} is now the parent in charge of {2}’s profile. You stay on the team.',
    ar: '{1} هو الآن ولي الأمر المسؤول عن ملف {2}. تبقى ضمن الفريق.',
  },
  {
    fr: 'Un appareil vient d’être relié ({1}, accès complet). Si ce n’est pas vous : Réglages → Compte → Appareils → Retirer.',
    en: 'A device was just linked ({1}, full access). If it was not you: Settings → Account → Devices → Remove.',
    ar: 'تم ربط جهاز الآن ({1}، وصول كامل). إن لم تكن أنت: الإعدادات ← الحساب ← الأجهزة ← إزالة.',
  },
  {
    fr: 'Un appareil vient d’être relié ({1}). Si ce n’est pas vous : Réglages → Compte → Appareils → Retirer.',
    en: 'A device was just linked ({1}). If it was not you: Settings → Account → Devices → Remove.',
    ar: 'تم ربط جهاز الآن ({1}). إن لم تكن أنت: الإعدادات ← الحساب ← الأجهزة ← إزالة.',
  },
  // proposals
  { fr: '{1} propose : {2}', en: '{1} proposes: {2}', ar: '{1} يقترح: {2}' },
  { fr: '{1} a révisé : {2}', en: '{1} revised: {2}', ar: '{1} عدّل: {2}' },
  { fr: 'Proposition acceptée : {1}', en: 'Proposal accepted: {1}', ar: 'تم قبول الاقتراح: {1}' },
  { fr: 'Proposition refusée : {1}', en: 'Proposal declined: {1}', ar: 'تم رفض الاقتراح: {1}' },
  { fr: 'Révision demandée : {1}', en: 'Revision requested: {1}', ar: 'طُلب تعديل: {1}' },
  // shared materials
  { fr: '{1} a partagé « {2} » avec vous.', en: '{1} shared “{2}” with you.', ar: '{1} شارك «{2}» معك.' },
  { fr: '{1} a partagé « {2} ».', en: '{1} shared “{2}”.', ar: '{1} شارك «{2}».' },
  // professional verification ({1}: what the team wrote)
  {
    fr: 'Votre certificat a été accepté : vous pouvez maintenant rejoindre l’équipe d’un enfant.',
    en: 'Your certificate was accepted: you can now join a child’s team.',
    ar: 'تم قبول شهادتك: يمكنك الآن الانضمام إلى فريق طفل.',
  },
  { fr: 'Vérification : il nous manque une information. {1}', en: 'Verification: we need one more thing. {1}', ar: 'التحقق: نحتاج إلى معلومة إضافية. {1}' },
  {
    fr: 'Votre demande de vérification n’a pas été acceptée. {1}',
    en: 'Your verification request was not accepted. {1}',
    ar: 'لم يتم قبول طلب التحقق. {1}',
  },
];

const LANGS: UiLang[] = ['fr', 'en', 'ar'];

/** A sentence with its names → a pattern that finds the names again. Straight and curly apostrophes are the same. */
function pattern(sentence: string): RegExp {
  const src = sentence
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{(\d)\\\}/g, '(.+?)')
    .replace(/[’']/g, '[’\']')
    .replace(/ /g, '[ \\u00a0]');
  return new RegExp(`^${src}$`, 's');
}

const COMPILED = TEMPLATES.map((t) => ({
  t,
  // The order of the names in each version ("{2}" may come before "{1}" in another language).
  versions: LANGS.map((l) => ({ re: pattern(t[l]), order: [...t[l].matchAll(/\{(\d)\}/g)].map((m) => Number(m[1])) })),
}));

/** The notice in the language of the menus (unchanged when it is not a sentence the app knows). */
export function noticeText(text: string, lang: UiLang): string {
  const clean = (text ?? '').trim();
  for (const { t, versions } of COMPILED) {
    for (const v of versions) {
      const m = v.re.exec(clean);
      if (!m) continue;
      const names: Record<number, string> = {};
      v.order.forEach((n, i) => (names[n] = m[i + 1]));
      return t[lang].replace(/\{(\d)\}/g, (_, n: string) => names[Number(n)] ?? '');
    }
  }
  return text;
}

/** For the tests: every sentence the app knows, in the three languages. */
export const NOTICE_TEMPLATES: readonly Template[] = TEMPLATES;
