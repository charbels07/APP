/**
 * Changes in plain words, for proposals (before/after preview) and the change history:
 * « pizza » ajouté dans « nourriture », Réglage modifié : vitesse de la voix…
 * Labels of the old values come from the profile before the change, new ones from after.
 */
import type { Lang, Profile, UiLang } from '../model/types';
import type { IconName } from '../ui/Icon';
import { areaOf } from './permissions';
import { getConcept, label } from './lexicon';
import { applyOps, type Op } from './profileDiff';

export interface ChangeItem {
  icon: IconName;
  text: string;
  /** Word shown before / after (for pictures in the preview). */
  before?: string;
  after?: string;
  /** Changes the main board's word positions (the child's motor plan). */
  core: boolean;
}

const W = {
  fr: {
    added: (w: string, b: string) => `« ${w} » ajouté dans « ${b} »`,
    removed: (w: string, b: string) => `« ${w} » retiré de « ${b} »`,
    replaced: (a: string, w: string, b: string) => `« ${a} » remplacé par « ${w} » dans « ${b} »`,
    cellChanged: (w: string, b: string) => `« ${w} » modifié dans « ${b} » (taille, couleur ou niveau)`,
    boardNew: (b: string) => `Nouveau tableau « ${b} »`,
    boardGone: (b: string) => `Tableau « ${b} » supprimé`,
    boardChanged: (b: string) => `Tableau « ${b} » réorganisé`,
    wordNew: (w: string) => `Nouveau mot « ${w} »`,
    wordGone: (w: string) => `Mot « ${w} » supprimé`,
    wordChanged: (w: string) => `Mot « ${w} » modifié`,
    look: (w: string) => `Image, nom ou son de « ${w} » modifié`,
    scheduleNew: (s: string) => `Nouveau planning « ${s} »`,
    scheduleGone: (s: string) => `Planning « ${s} » supprimé`,
    scheduleChanged: (s: string) => `Planning « ${s} » modifié`,
    tlaOrder: 'Ordre des TLA modifié',
    activeSchedule: 'Planning du jour changé',
    setting: (n: string) => `Réglage modifié : ${n}`,
    firstThen: 'D’abord / Ensuite modifié',
    help: 'Bouton Aide modifié',
  },
  en: {
    added: (w: string, b: string) => `“${w}” added to “${b}”`,
    removed: (w: string, b: string) => `“${w}” removed from “${b}”`,
    replaced: (a: string, w: string, b: string) => `“${a}” replaced by “${w}” in “${b}”`,
    cellChanged: (w: string, b: string) => `“${w}” changed in “${b}” (size, colour or level)`,
    boardNew: (b: string) => `New board “${b}”`,
    boardGone: (b: string) => `Board “${b}” deleted`,
    boardChanged: (b: string) => `Board “${b}” rearranged`,
    wordNew: (w: string) => `New word “${w}”`,
    wordGone: (w: string) => `Word “${w}” deleted`,
    wordChanged: (w: string) => `Word “${w}” changed`,
    look: (w: string) => `Picture, name or sound of “${w}” changed`,
    scheduleNew: (s: string) => `New schedule “${s}”`,
    scheduleGone: (s: string) => `Schedule “${s}” deleted`,
    scheduleChanged: (s: string) => `Schedule “${s}” changed`,
    tlaOrder: 'Order of the activity boards changed',
    activeSchedule: 'Today’s schedule changed',
    setting: (n: string) => `Setting changed: ${n}`,
    firstThen: 'First / Then changed',
    help: 'Help button changed',
  },
  ar: {
    added: (w: string, b: string) => `أُضيفت «${w}» إلى «${b}»`,
    removed: (w: string, b: string) => `أُزيلت «${w}» من «${b}»`,
    replaced: (a: string, w: string, b: string) => `استُبدلت «${a}» بـ«${w}» في «${b}»`,
    cellChanged: (w: string, b: string) => `تعديل «${w}» في «${b}» (الحجم أو اللون أو المستوى)`,
    boardNew: (b: string) => `لوحة جديدة «${b}»`,
    boardGone: (b: string) => `حُذفت اللوحة «${b}»`,
    boardChanged: (b: string) => `أُعيد ترتيب اللوحة «${b}»`,
    wordNew: (w: string) => `كلمة جديدة «${w}»`,
    wordGone: (w: string) => `حُذفت الكلمة «${w}»`,
    wordChanged: (w: string) => `عُدّلت الكلمة «${w}»`,
    look: (w: string) => `تعديل صورة أو اسم أو صوت «${w}»`,
    scheduleNew: (s: string) => `جدول جديد «${s}»`,
    scheduleGone: (s: string) => `حُذف الجدول «${s}»`,
    scheduleChanged: (s: string) => `عُدّل الجدول «${s}»`,
    tlaOrder: 'تغيّر ترتيب اللوحات',
    activeSchedule: 'تغيّر جدول اليوم',
    setting: (n: string) => `تعديل إعداد: ${n}`,
    firstThen: 'تعديل أولاً / ثم',
    help: 'تعديل زر المساعدة',
  },
};

/** Names of the settings people change most. */
const SETTING_NAMES: Record<string, Record<UiLang, string>> = {
  lang: { fr: 'langue de communication', en: 'communication language', ar: 'لغة التواصل' },
  langs: { fr: 'langues de l’enfant', en: 'child’s languages', ar: 'لغات الطفل' },
  revealLevel: { fr: 'vocabulaire révélé', en: 'revealed vocabulary', ar: 'المفردات الظاهرة' },
  speechRate: { fr: 'vitesse de la voix', en: 'speech rate', ar: 'سرعة الصوت' },
  voiceKind: { fr: 'voix', en: 'voice', ar: 'الصوت' },
  voiceAge: { fr: 'âge de la voix', en: 'voice age', ar: 'عمر الصوت' },
  voices: { fr: 'voix de l’appareil', en: 'device voice', ar: 'صوت الجهاز' },
  gender: { fr: 'accord (garçon / fille)', en: 'agreement (boy / girl)', ar: 'التوافق (صبي / بنت)' },
  showLabels: { fr: 'mots sous les images', en: 'words under pictures', ar: 'الكلمات تحت الصور' },
  visual: { fr: 'présentation', en: 'presentation', ar: 'العرض' },
  pictoSize: { fr: 'taille des images', en: 'picture size', ar: 'حجم الصور' },
  access: { fr: 'façon de sélectionner', en: 'access method', ar: 'طريقة الاختيار' },
  holdTime: { fr: 'durée d’appui', en: 'hold time', ar: 'مدة الضغط' },
  repeatDelay: { fr: 'délai entre deux appuis', en: 'delay between presses', ar: 'المدة بين ضغطتين' },
  wiggle: { fr: 'pictos qui bougent', en: 'moving pictures', ar: 'الصور المتحركة' },
  reduceMotion: { fr: 'moins d’animations', en: 'fewer animations', ar: 'حركة أقل' },
  quickZone: { fr: 'zone rapide', en: 'quick zone', ar: 'المنطقة السريعة' },
  bar: { fr: 'boutons de la barre', en: 'bar buttons', ar: 'أزرار الشريط' },
  symbolSet: { fr: 'jeu de symboles', en: 'symbol set', ar: 'مجموعة الرموز' },
  grammar: { fr: 'grammaire automatique', en: 'automatic grammar', ar: 'القواعد التلقائية' },
  speakOnTap: { fr: 'dire chaque mot', en: 'say each word', ar: 'نطق كل كلمة' },
  addToStrip: { fr: 'ajouter à la phrase', en: 'add to sentence', ar: 'الإضافة إلى الجملة' },
  timer: { fr: 'minuteur', en: 'timer', ar: 'المؤقت' },
  autoOpenApps: { fr: 'ouverture des applis', en: 'opening apps', ar: 'فتح التطبيقات' },
};

export function describeOps(ops: Op[], before: Profile, ui: UiLang, lang: Lang): ChangeItem[] {
  const w = W[ui];
  const after = applyOps(before, ops, { force: true }).profile;
  const wordB = (id?: string) => (id ? label(before, id, lang) : '');
  const wordA = (id?: string) => (id ? label(getConcept(after, id) ? after : before, id, lang) : '');
  const boardName = (p: Profile, id: string) => {
    const b = p.boards[id];
    return b ? label(p, b.concept, lang) : id;
  };
  return ops.map((op): ChangeItem => {
    const core = areaOf(op, before) === 'core';
    const [kind] = op.path;
    if (kind === 'cell') {
      const board = op.path[1] as string;
      const b = op.before as { concept?: string } | null | undefined;
      const a = op.after as { concept?: string } | null | undefined;
      const name = boardName(after.boards[board] ? after : before, board);
      if (!b?.concept && a?.concept) return { icon: 'plus', text: w.added(wordA(a.concept), name), after: a.concept, core };
      if (b?.concept && !a?.concept) return { icon: 'trash', text: w.removed(wordB(b.concept), name), before: b.concept, core };
      if (b?.concept && a?.concept && b.concept !== a.concept)
        return { icon: 'refresh', text: w.replaced(wordB(b.concept), wordA(a.concept), name), before: b.concept, after: a.concept, core };
      return { icon: 'pencil', text: w.cellChanged(wordA(a?.concept), name), before: b?.concept, after: a?.concept, core };
    }
    if (kind === 'board') {
      const id = op.path[1] as string;
      if (op.before === undefined) return { icon: 'grid', text: w.boardNew(boardName(after, id)), core };
      if (op.after === undefined) return { icon: 'trash', text: w.boardGone(boardName(before, id)), core };
      return { icon: 'grid', text: w.boardChanged(boardName(after, id)), core };
    }
    if (kind === 'concept') {
      const id = op.path[1] as string;
      if (op.before === undefined) return { icon: 'plus', text: w.wordNew(wordA(id)), after: id, core };
      if (op.after === undefined) return { icon: 'trash', text: w.wordGone(wordB(id)), before: id, core };
      return { icon: 'pencil', text: w.wordChanged(wordA(id)), before: id, after: id, core };
    }
    if (kind === 'override') {
      const id = op.path[1] as string;
      return { icon: 'image', text: w.look(wordA(id)), before: id, after: id, core };
    }
    if (kind === 'schedule') {
      const sb = op.before as { title?: string } | undefined;
      const sa = op.after as { title?: string } | undefined;
      if (!sb) return { icon: 'calendar', text: w.scheduleNew(sa?.title ?? ''), core };
      if (!sa) return { icon: 'calendar', text: w.scheduleGone(sb.title ?? ''), core };
      return { icon: 'calendar', text: w.scheduleChanged(sa.title ?? ''), core };
    }
    if (kind === 'setting') {
      const k = op.path[1] as string;
      return { icon: 'settings', text: w.setting(SETTING_NAMES[k]?.[ui] ?? k), core };
    }
    if (kind === 'tlaOrder') return { icon: 'list', text: w.tlaOrder, core };
    if (kind === 'activeSchedule') return { icon: 'calendar', text: w.activeSchedule, core };
    if (kind === 'firstThen') return { icon: 'chevronRight', text: w.firstThen, core };
    return { icon: 'help', text: w.help, core };
  });
}
