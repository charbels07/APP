/**
 * The parent's consent before a child's profile is created (or taken over from a professional):
 * the database keeps who, when and which text (supabase/migrations/20261118000500_privacy.sql,
 * `consent_version`). A new text: raise CHILD_DATA_CONSENT here and in the database together.
 * Draft wording, to be validated by the lawyer (docs/legal/PRIVACY-POLICY-DRAFT.md).
 */
import type { UiLang } from '../model/types';

export const CHILD_DATA_CONSENT = 1;

export const consentText: Record<UiLang, { title: string; text: string; tick: string; needed: string }> = {
  fr: {
    title: 'Votre accord',
    text:
      'Je suis le parent ou le représentant légal de l’enfant (ou j’agis avec leur accord). J’accepte que le tableau de l’enfant et ses réglages, qui peuvent révéler des informations sur sa santé, soient gardés sur le serveur de l’application pour la faire fonctionner et la partager avec l’équipe que je choisis. Je peux tout télécharger ou supprimer à tout moment (Réglages → Compte).',
    tick: 'Je suis le parent ou le représentant légal, et je suis d’accord',
    needed: 'Cochez la case pour continuer : sans votre accord, le profil de l’enfant ne peut pas être gardé.',
  },
  en: {
    title: 'Your agreement',
    text:
      'I am the child’s parent or legal guardian (or I act with their agreement). I agree that the child’s board and settings, which can reveal information about the child’s health, are kept on the app’s server to make it work and to share it with the team I choose. I can download or delete everything at any time (Settings → Account).',
    tick: 'I am the parent or legal guardian, and I agree',
    needed: 'Tick the box to go on: without your agreement, the child’s profile cannot be kept.',
  },
  ar: {
    title: 'موافقتك',
    text:
      'أنا والد الطفل أو وليّه القانوني (أو أتصرّف بموافقتهم). أوافق على أن تُحفظ لوحة الطفل وإعداداتها، التي قد تكشف معلومات عن صحته، على خادم التطبيق ليعمل وليُشارَك مع الفريق الذي أختاره. يمكنني تنزيل كل شيء أو حذفه في أي وقت (الإعدادات ← الحساب).',
    tick: 'أنا الوالد أو الوليّ القانوني، وأوافق',
    needed: 'ضع علامة في المربع للمتابعة: من دون موافقتك لا يمكن حفظ ملف الطفل.',
  },
};
