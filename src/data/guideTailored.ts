/**
 * First guide chapter after the set-up journey: "Your board", written from the child's own
 * settings (how many words are shown, how to select, languages, favourites) so the family
 * starts with what matters for them.
 */
import { LANG_NAMES } from '../lib/lexicon';
import type { Profile, UiLang } from '../model/types';
import type { GuideChapter } from './guide';

type L3 = Record<UiLang, string>;
const pick = (x: L3, l: UiLang) => x[l];

export function tailoredChapter(p: Profile): GuideChapter | null {
  const t = p.guide?.tailored;
  if (!t) return null;
  const st = p.settings;
  const shown = p.boards.core.cells.filter((c) => c && (c.level ?? 1) <= st.revealLevel).length;
  const favourites = (p.boards.mine?.cells ?? []).filter(Boolean).length;
  const langs = (st.langs?.length ? st.langs : [st.lang]).map((l) => LANG_NAMES[l]).join(', ');

  const lines: L3[] = [];
  lines.push(
    st.revealLevel < 3
      ? {
          fr: `Le tableau montre ${shown} mots pour commencer. Les autres attendent, cachés à leur place : quand l’enfant est prêt, montrez-en plus dans Réglages → « Vocabulaire révélé ». Rien ne bouge.`,
          en: `The board shows ${shown} words to start with. The others wait, hidden in their place: when the child is ready, show more in Settings → “Revealed vocabulary”. Nothing moves.`,
          ar: `تعرض اللوحة ${shown} كلمة للبداية. الكلمات الأخرى مخفية في مكانها: عندما يكون الطفل جاهزاً، أظهر المزيد في الإعدادات ← «المفردات الظاهرة». لا يتحرك شيء.`,
        }
      : {
          fr: `Le tableau complet est affiché (${shown} mots), toujours à la même place.`,
          en: `The full board is shown (${shown} words), always in the same place.`,
          ar: `اللوحة الكاملة ظاهرة (${shown} كلمة)، دائماً في المكان نفسه.`,
        },
  );
  lines.push(
    st.access === 'hold'
      ? {
          fr: `Pour choisir un mot, l’enfant garde le doigt appuyé ${st.holdTime} s : les appuis par erreur ne comptent pas.`,
          en: `To choose a word, the child keeps the finger pressed for ${st.holdTime} s: accidental touches don’t count.`,
          ar: `لاختيار كلمة، يُبقي الطفل إصبعه مضغوطاً ${st.holdTime} ث: اللمسات الخاطئة لا تُحتسب.`,
        }
      : st.access === 'press'
        ? {
            fr: 'Un mot est choisi dès que le doigt le touche.',
            en: 'A word is chosen as soon as the finger touches it.',
            ar: 'تُختار الكلمة بمجرد أن يلمسها الإصبع.',
          }
        : {
            fr: 'Un mot est choisi quand le doigt se lève : l’enfant peut glisser vers un autre mot avant.',
            en: 'A word is chosen when the finger lifts: the child can slide to another word first.',
            ar: 'تُختار الكلمة عند رفع الإصبع: يمكن للطفل أن ينزلق إلى كلمة أخرى قبل ذلك.',
          },
  );
  if ((st.langs?.length ?? 1) > 1) {
    lines.push({
      fr: `Langues de l’enfant : ${langs}. On change de langue dans les Réglages (mode accompagnant) ; les mots restent au même endroit.`,
      en: `The child’s languages: ${langs}. The language is changed in Settings (caregiver mode); words stay in the same place.`,
      ar: `لغات الطفل: ${langs}. تُغيَّر اللغة من الإعدادات (وضع المرافق)؛ تبقى الكلمات في المكان نفسه.`,
    });
  }
  if (favourites) {
    lines.push({
      fr: 'Ses activités préférées sont dans le dossier « mes mots » (étoile).',
      en: 'Their favourite activities are in the “my words” folder (star).',
      ar: 'نشاطاته المفضّلة موجودة في مجلد «كلماتي» (النجمة).',
    });
  }
  if (t.newToAac) {
    lines.push({
      fr: 'Vous découvrez la CAA : le plus important est de montrer vous-même les mots en parlant à l’enfant (« modéliser »), sans rien exiger. Le bouton « Essayer » montre une phrase avec une main animée.',
      en: 'You are new to AAC: the most important thing is to show the words yourself while talking to the child (“modelling”), without asking anything. The “Try it” button shows a sentence with an animated hand.',
      ar: 'أنتم جدد على التواصل البديل: الأهم أن تُظهروا الكلمات بأنفسكم وأنتم تتكلمون مع الطفل («النمذجة») من دون أن تطلبوا منه شيئاً. زر «جرّب» يعرض جملة بيد متحركة.',
    });
  }
  const title: L3 = { fr: 'Votre tableau', en: 'Your board', ar: 'لوحتكم' };
  const steps = (['fr', 'en', 'ar'] as UiLang[]).reduce(
    (acc, l) => ({ ...acc, [l]: lines.map((x) => pick(x, l)) }),
    {} as Record<UiLang, string[]>,
  );
  return { id: 'your_board', track: 'start', icon: 'star', title, steps, action: t.newToAac ? 'demo' : undefined };
}
