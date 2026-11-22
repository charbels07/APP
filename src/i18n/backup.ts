/**
 * Texts of the bin of children's profiles and of the board's earlier versions
 * (src/ui/settings/Backups.tsx). Navigation language (FR / EN / AR).
 */
import type { UiLang } from '../model/types';
import type { Snapshot } from '../backend/Backend';

const fr = {
  wordBin: 'Mots et tableaux supprimés',
  wordBinOpen: (n: number) => `Mots et tableaux supprimés (${n})`,
  wordBinNote: 'Gardés 30 jours. Un mot revient à sa place si elle est encore vide, sinon à la première place vide de son tableau.',
  wordBinEmpty: 'Rien de supprimé ces 30 derniers jours.',
  onBoard: (board: string) => `Sur : ${board}`,
  activityBoard: 'Tableau d’activité',
  backPlace: 'Remis à sa place.',
  backMoved: 'Remis sur son tableau, à la première place vide.',
  boardFull: 'Son tableau est plein : faites d’abord de la place.',
  binTitle: 'Profils supprimés',
  binNote: 'Gardés 30 jours dans la corbeille, puis effacés définitivement avec leurs photos et enregistrements.',
  binUntil: (name: string, date: string) => `${name} · effacé le ${date}`,
  putBack: 'Remettre',
  backOk: (name: string) => `${name} est de retour.`,
  versions: 'Versions précédentes du tableau',
  versionsNote:
    'Une copie du tableau est gardée chaque semaine et avant un grand changement (beaucoup de mots retirés d’un coup). Les 10 dernières sont gardées. Remettre une copie garde d’abord le tableau actuel : on peut revenir en arrière.',
  reasons: { weekly: 'Copie de la semaine', big_change: 'Avant un grand changement', before_restore: 'Avant une remise', manual: 'Gardée à la main' } as Record<Snapshot['reason'], string>,
  words: (n: number) => `${n} mots`,
  keepNow: 'Garder une copie maintenant',
  kept: 'Copie gardée.',
  confirmBack: (date: string) => `Remettre le tableau comme il était le ${date} ? Tous les appareils de l’enfant l’afficheront à leur prochaine vérification. Le code, l’enregistrement et le partage restent comme maintenant.`,
  confirm: 'Oui, remettre',
  cancel: 'Annuler',
  backDone: (date: string) => `Le tableau est revenu comme il était le ${date}.`,
  none: 'Pas encore de copie : la première est gardée au prochain changement.',
  historyRestore: (date: string) => `Tableau remis comme il était le ${date}`,
  failed: 'Cela n’a pas marché. Vérifiez la connexion internet et réessayez.',
  rescueTitle: 'Le tableau n’a pas pu s’afficher',
  rescueNote: 'Rien n’est effacé. Réessayez d’abord. Si cela recommence, une version précédente du tableau peut être remise, puis « Réessayer ».',
  rescueRetry: 'Réessayer',
  rescueAsk: 'Si cela recommence, demandez à un parent de remettre une version précédente du tableau (Réglages → Compte).',
  deleteToBin: 'Supprimer',
  deleteProfileNote: 'Le profil va dans la corbeille, pour toute l’équipe et sur tous les appareils : vous pouvez le remettre pendant 30 jours, puis il est effacé définitivement avec ses photos et enregistrements. Tapez le prénom pour confirmer :',
};

type Dict = typeof fr;

const en: Dict = {
  wordBin: 'Deleted words and boards',
  wordBinOpen: (n) => `Deleted words and boards (${n})`,
  wordBinNote: 'Kept 30 days. A word comes back to its place if it is still empty, otherwise to the first empty place of its board.',
  wordBinEmpty: 'Nothing deleted in the last 30 days.',
  onBoard: (board) => `On: ${board}`,
  activityBoard: 'Activity board',
  backPlace: 'Back in its place.',
  backMoved: 'Back on its board, in the first empty place.',
  boardFull: 'Its board is full: make room first.',
  binTitle: 'Deleted profiles',
  binNote: 'Kept 30 days in the bin, then erased for good with their photos and recordings.',
  binUntil: (name, date) => `${name} · erased on ${date}`,
  putBack: 'Put back',
  backOk: (name) => `${name} is back.`,
  versions: 'Earlier versions of the board',
  versionsNote:
    'A copy of the board is kept every week and before a big change (many words removed at once). The last 10 are kept. Putting a copy back first keeps the board as it is now, so it can be undone.',
  reasons: { weekly: 'Weekly copy', big_change: 'Before a big change', before_restore: 'Before putting a copy back', manual: 'Kept by hand' },
  words: (n) => `${n} words`,
  keepNow: 'Keep a copy now',
  kept: 'Copy kept.',
  confirmBack: (date) => `Put the board back as it was on ${date}? Every device of the child will show it at its next check. The code, the follow-up and the sharing stay as they are now.`,
  confirm: 'Yes, put it back',
  cancel: 'Cancel',
  backDone: (date) => `The board is back as it was on ${date}.`,
  none: 'No copy yet: the first one is kept at the next change.',
  historyRestore: (date) => `Board put back as it was on ${date}`,
  failed: 'It did not work. Check the internet connection and try again.',
  rescueTitle: 'The board could not be shown',
  rescueNote: 'Nothing is erased. Try again first. If it happens again, an earlier version of the board can be put back, then “Try again”.',
  rescueRetry: 'Try again',
  rescueAsk: 'If it happens again, ask a parent to put back an earlier version of the board (Settings → Account).',
  deleteToBin: 'Delete',
  deleteProfileNote: 'The profile goes to the bin, for the whole team and on every device: you can put it back for 30 days, then it is erased for good with its photos and recordings. Type the first name to confirm:',
};

const ar: Dict = {
  wordBin: 'الكلمات واللوحات المحذوفة',
  wordBinOpen: (n) => `الكلمات واللوحات المحذوفة (${n})`,
  wordBinNote: 'تُحفظ 30 يومًا. تعود الكلمة إلى مكانها إن كان لا يزال فارغًا، وإلا إلى أول مكان فارغ في لوحتها.',
  wordBinEmpty: 'لم يُحذف شيء خلال آخر 30 يومًا.',
  onBoard: (board) => `في: ${board}`,
  activityBoard: 'لوحة نشاط',
  backPlace: 'أُعيدت إلى مكانها.',
  backMoved: 'أُعيدت إلى لوحتها، في أول مكان فارغ.',
  boardFull: 'لوحتها ممتلئة: أفرغ مكانًا أولًا.',
  binTitle: 'الملفات المحذوفة',
  binNote: 'تُحفظ 30 يومًا في سلة المحذوفات، ثم تُمحى نهائيًا مع صورها وتسجيلاتها.',
  binUntil: (name, date) => `${name} · يُمحى في ${date}`,
  putBack: 'إعادة',
  backOk: (name) => `عاد ملف ${name}.`,
  versions: 'نسخ سابقة من اللوحة',
  versionsNote:
    'تُحفظ نسخة من اللوحة كل أسبوع وقبل أي تغيير كبير (حذف كلمات كثيرة دفعة واحدة). تُحفظ آخر 10 نسخ. عند إعادة نسخة تُحفظ اللوحة الحالية أولًا، فيمكن التراجع.',
  reasons: { weekly: 'نسخة الأسبوع', big_change: 'قبل تغيير كبير', before_restore: 'قبل إعادة نسخة', manual: 'محفوظة يدويًا' },
  words: (n) => `${n} كلمة`,
  keepNow: 'حفظ نسخة الآن',
  kept: 'تم حفظ النسخة.',
  confirmBack: (date) => `إعادة اللوحة كما كانت في ${date}؟ ستظهر على كل أجهزة الطفل عند تحقّقها التالي. يبقى الرمز والمتابعة والمشاركة كما هي الآن.`,
  confirm: 'نعم، أعِدها',
  cancel: 'إلغاء',
  backDone: (date) => `عادت اللوحة كما كانت في ${date}.`,
  none: 'لا توجد نسخة بعد: تُحفظ الأولى عند التغيير التالي.',
  historyRestore: (date) => `أُعيدت اللوحة كما كانت في ${date}`,
  failed: 'لم ينجح ذلك. تحقّق من الاتصال بالإنترنت وحاول مجددًا.',
  rescueTitle: 'تعذّر عرض اللوحة',
  rescueNote: 'لم يُمحَ شيء. حاول مجددًا أولًا. إذا تكرّر ذلك، يمكن إعادة نسخة سابقة من اللوحة ثم «حاول مجددًا».',
  rescueRetry: 'حاول مجددًا',
  rescueAsk: 'إذا تكرّر ذلك، اطلب من أحد الوالدين إعادة نسخة سابقة من اللوحة (الإعدادات ← الحساب).',
  deleteToBin: 'حذف',
  deleteProfileNote: 'ينتقل الملف إلى سلة المحذوفات لكل الفريق وعلى كل الأجهزة: يمكنك إعادته خلال 30 يومًا، ثم يُمحى نهائيًا مع صوره وتسجيلاته. اكتب الاسم للتأكيد:',
};

const DICTS: Record<UiLang, Dict> = { fr, en, ar };
export type BackupStrings = Dict;
export const backupStrings = (lang: UiLang): Dict => DICTS[lang];
