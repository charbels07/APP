/** Texts of the ways to choose without pointing precisely (Settings → Touch, and on the board). */
import type { UiLang } from '../model/types';

const fr = {
  // Settings → Touch
  scan: 'Balayage (contacteur)',
  scanModes: { off: 'Non', auto: 'Automatique', step: 'Pas à pas' },
  scanKeysAuto: 'Le contacteur : Espace ou Entrée (clavier ou boîtier de contacteurs), ou tout l’écran.',
  scanKeysStep: 'Espace avance, Entrée choisit (clavier ou boîtier de contacteurs).',
  scanPattern: 'Parcours',
  scanPatterns: { rows: 'Ligne puis case', cards: 'Case par case' },
  scanSpeed: 'Temps sur chaque étape',
  scanLoops: 'Tours avant l’arrêt',
  scanSpeak: 'Dire tout bas le mot éclairé',
  scanScreen: 'Tout l’écran sert de contacteur',
  scanScreenStep: 'Moitié gauche : avancer. Moitié droite : choisir.',
  dwell: 'Choisir en gardant le pointeur dessus',
  off: 'Non',
  touchPoint: 'Toucher qui compte',
  touchPoints: { lift: 'Où le doigt se lève', land: 'Où il se pose d’abord' },
  bigTouch: 'Zone de toucher agrandie',
  bigOnHold: 'Appui long sur un mot : le montrer en grand',
  // On the board
  next: 'Avancer',
  choose: 'Choisir',
  waiting: 'Balayage en pause : appuyez sur le contacteur',
  stopped: 'Balayage arrêté.',
  restart: 'Reprendre le balayage',
};

type Dict = typeof fr;

const en: Dict = {
  scan: 'Switch scanning',
  scanModes: { off: 'Off', auto: 'Automatic', step: 'Step by step' },
  scanKeysAuto: 'The switch: Space or Enter (a keyboard or a switch interface), or the whole screen.',
  scanKeysStep: 'Space moves, Enter chooses (a keyboard or a switch interface).',
  scanPattern: 'How it goes',
  scanPatterns: { rows: 'Row, then card', cards: 'Card by card' },
  scanSpeed: 'Time on each step',
  scanLoops: 'Turns before it stops',
  scanSpeak: 'Say the lit word quietly',
  scanScreen: 'The whole screen is the switch',
  scanScreenStep: 'Left half: next. Right half: choose.',
  dwell: 'Choose by resting the pointer',
  off: 'Off',
  touchPoint: 'Touch that counts',
  touchPoints: { lift: 'Where the finger lifts', land: 'Where it first lands' },
  bigTouch: 'Bigger touch area',
  bigOnHold: 'Long press on a word: show it big',
  next: 'Next',
  choose: 'Choose',
  waiting: 'Scanning paused: press the switch',
  stopped: 'Scanning stopped.',
  restart: 'Start scanning again',
};

const ar: Dict = {
  scan: 'المسح بالمفتاح',
  scanModes: { off: 'متوقف', auto: 'تلقائي', step: 'خطوة بخطوة' },
  scanKeysAuto: 'المفتاح: المسافة أو الإدخال (لوحة مفاتيح أو جهاز مفاتيح)، أو الشاشة كلها.',
  scanKeysStep: 'المسافة للتقدّم، والإدخال للاختيار (لوحة مفاتيح أو جهاز مفاتيح).',
  scanPattern: 'طريقة المرور',
  scanPatterns: { rows: 'صفّ ثم بطاقة', cards: 'بطاقة بعد بطاقة' },
  scanSpeed: 'الوقت على كل خطوة',
  scanLoops: 'عدد الدورات قبل التوقف',
  scanSpeak: 'نطق الكلمة المضاءة بصوت خافت',
  scanScreen: 'الشاشة كلها تعمل كمفتاح',
  scanScreenStep: 'النصف الأيسر: التالي. النصف الأيمن: اختيار.',
  dwell: 'الاختيار بإبقاء المؤشر فوقها',
  off: 'متوقف',
  touchPoint: 'اللمسة التي تُحتسب',
  touchPoints: { lift: 'حيث يُرفع الإصبع', land: 'حيث يلمس أولاً' },
  bigTouch: 'منطقة لمس أكبر',
  bigOnHold: 'الضغط المطوّل على كلمة: إظهارها بحجم كبير',
  next: 'التالي',
  choose: 'اختيار',
  waiting: 'المسح متوقف مؤقتاً: اضغط على المفتاح',
  stopped: 'توقّف المسح.',
  restart: 'استئناف المسح',
};

const DICTS: Record<UiLang, Dict> = { fr, en, ar };
export type AccessStrings = Dict;
export const accessStrings = (l: UiLang): Dict => DICTS[l];
