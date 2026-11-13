/**
 * PLACEHOLDER starter content (core board, folders, TLAs, schedules).
 * The layout and word choice must be designed/validated by the speech-language
 * therapist before release. Positions here only demonstrate the mechanics.
 */
import type { Board, Cell, HelpConfig, Profile, Schedule, Settings } from '../model/types';

type Spec = string | null | { c: string; f?: string; l?: 1 | 2 | 3 };

/** Build a row-major board from columns (top-to-bottom). */
function fromColumns(rows: number, columns: Spec[][]): (Cell | null)[] {
  const cols = columns.length;
  const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
  columns.forEach((column, c) => {
    column.forEach((spec, r) => {
      cells[r * cols + c] = toCell(spec);
    });
  });
  return cells;
}

/** Build a row-major board from a flat list (left-to-right, top-to-bottom). */
function fromList(rows: number, cols: number, list: Spec[]): (Cell | null)[] {
  const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
  list.forEach((spec, i) => {
    if (i < cells.length) cells[i] = toCell(spec);
  });
  return cells;
}

function toCell(spec: Spec): Cell | null {
  if (spec === null) return null;
  if (typeof spec === 'string') return { concept: spec };
  return { concept: spec.c, folder: spec.f, level: spec.l };
}

// Progressive reveal: level 1 = first words, 2 = intermediate, 3 = full board.
const L1 = new Set([
  'i', 'you', 'want', 'go', 'like', 'help', 'eat', 'drink', 'play', 'more', 'not', 'big', 'small',
  'what', 'where', 'yes', 'no', 'stop', 'done',
  'f_people', 'f_food', 'f_drinks', 'f_activities', 'f_feelings', 'f_mine',
]);
const L2 = new Set([
  'he', 'she', 'do', 'have', 'be', 'can', 'give', 'look', 'come', 'put', 'open', 'stop_v', 'finish',
  'with', 'in', 'on', 'here', 'there', 'after', 'good', 'bad', 'hot', 'cold',
  'who', 'when', 'why', 'wait_s', 'thanks', 'please', 'f_places', 'f_body', 'f_chat', 'f_time',
]);
const lvl = (id: string): 1 | 2 | 3 => (L1.has(id) ? 1 : L2.has(id) ? 2 : 3);
const w = (id: string): Spec => ({ c: id, l: lvl(id) });
const folder = (id: string, board: string): Spec => ({ c: id, f: board, l: lvl(id) });

const CORE: Board = {
  id: 'core',
  kind: 'core',
  concept: 'b_core',
  rows: 7,
  cols: 12,
  cells: fromColumns(7, [
    ['i', 'you', 'he', 'she', 'we', 'you_pl', 'they'].map(w),
    ['want', 'go', 'do', 'have', 'be', 'like', 'can'].map(w),
    ['help', 'give', 'look', 'come', 'say', 'know', 'take'].map(w),
    ['eat', 'drink', 'play', 'put', 'open', 'stop_v', 'finish'].map(w),
    ['more', 'not', 'with', 'in', 'on', 'for', 'and'].map(w),
    ['here', 'there', 'before', 'after', 'but', 'because', 'now'].map(w),
    ['big', 'small', 'good', 'bad', 'hot', 'cold', 'a_lot'].map(w),
    ['fast', 'slow', 'same', 'different', 'a_little', 'loud', 'broken'].map(w),
    ['who', 'what', 'where', 'when', 'why', 'how', 'how_much'].map(w),
    ['yes', 'no', 'stop', 'wait_s', 'done', 'thanks', 'please'].map(w),
    [
      folder('f_people', 'people'),
      folder('f_food', 'food'),
      folder('f_drinks', 'drinks'),
      folder('f_places', 'places'),
      folder('f_feelings', 'feelings'),
      folder('f_body', 'body'),
      folder('f_activities', 'activities'),
    ],
    [folder('f_chat', 'chat'), folder('f_time', 'time'), folder('f_mine', 'mine'), folder('f_apps', 'apps'), null, null, null],
  ]),
};

const folderBoard = (id: string, concept: string, rows: number, cols: number, list: string[]): Board => ({
  id,
  kind: 'folder',
  concept,
  rows,
  cols,
  cells: fromList(rows, cols, list),
});

const FOLDERS: Board[] = [
  folderBoard('people', 'f_people', 3, 6, [
    'mom', 'dad', 'brother', 'sister', 'baby', 'grandma',
    'grandpa', 'friend', 'teacher', 'doctor', 'dentist', 'therapist',
  ]),
  folderBoard('food', 'f_food', 4, 7, [
    'bread', 'manakish', 'labneh', 'hummus', 'falafel', 'cheese', 'egg',
    'rice', 'pasta', 'chicken', 'meat', 'soup', 'salad', 'sandwich',
    'apple', 'banana', 'strawberry', 'grapes', 'yogurt', 'pizza', 'fries',
    'chips', 'cake', 'chocolate', 'biscuit', 'ice_cream',
  ]),
  folderBoard('drinks', 'f_drinks', 2, 4, ['water', 'milk', 'juice', 'hot_chocolate', 'tea']),
  folderBoard('places', 'f_places', 3, 5, [
    'home', 'school', 'park', 'toilet', 'bedroom',
    'kitchen', 'car', 'shop', 'hospital', 'beach',
    'pool', 'restaurant', 'outside', 'waiting_room',
  ]),
  folderBoard('feelings', 'f_feelings', 3, 5, [
    'happy', 'sad', 'angry', 'scared', 'tired',
    'sick', 'calm', 'surprised', 'bored', 'shy',
    'hungry', 'thirsty', 'it_hurts', 'need_break',
  ]),
  folderBoard('body', 'f_body', 3, 4, [
    'head', 'eyes', 'ear', 'nose', 'mouth', 'teeth', 'throat', 'tummy', 'back', 'arm', 'hand', 'foot',
  ]),
  folderBoard('activities', 'f_activities', 3, 6, [
    'ball', 'puzzle', 'book', 'music', 'tv', 'tablet',
    'bike', 'swing', 'slide', 'sand', 'bath', 'walk',
    'toys', 'draw', 'sing', 'dance', 'read', 'write',
  ]),
  folderBoard('chat', 'f_chat', 4, 6, [
    'hello', 'bye', 'dont_understand', 'repeat', 'not_that', 'i_meant',
    'dont_know', 'maybe', 'agree', 'disagree', 'me_too', 'and_you',
    'i_like_it', 'dont_like', 'funny', 'joking', 'look_at', 'bravo',
    'my_turn', 'your_turn', 'leave_me', 'need_break', 'help_me', 'im_scared',
  ]),
  folderBoard('time', 'f_time', 3, 4, [
    'today', 'yesterday', 'tomorrow', 'now', 'first', 'then', 'before', 'after', 'later', 'morning', 'evening', 'night',
  ]),
  folderBoard('mine', 'f_mine', 3, 4, []),
  folderBoard('apps', 'f_apps', 2, 4, ['app_youtube', 'app_whatsapp', 'app_spotify', 'app_anghami']),
];

/** Where the apps folder sits on the core board (an empty slot: nothing else moves). */
export const APPS_FOLDER_SLOT = 3 * 12 + 11;

/** TLAs share a fixed block of core words in the two left columns (TLA-01, TLA-02). */
export const TLA_CORE: string[][] = [
  ['i', 'want'],
  ['you', 'like'],
  ['more', 'not'],
  ['done', 'stop'],
  ['help_me', 'what'],
];

function tla(id: string, concept: string, specific: string[]): Board {
  const rows = 5;
  const cols = 6;
  const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
  for (let r = 0; r < rows; r++) {
    cells[r * cols] = { concept: TLA_CORE[r][0] };
    cells[r * cols + 1] = { concept: TLA_CORE[r][1] };
    for (let c = 2; c < cols; c++) {
      const word = specific[r * (cols - 2) + (c - 2)];
      cells[r * cols + c] = word ? { concept: word } : null;
    }
  }
  return { id, kind: 'tla', concept, rows, cols, cells };
}

const TLAS: Board[] = [
  tla('tla_meal', 't_meal', [
    'eat', 'drink', 'water', 'bread',
    'juice', 'plate', 'spoon', 'fork',
    'cup', 'napkin', 'hot', 'cold',
    'yummy', 'dont_like', 'a_little', 'a_lot',
    'hungry', 'thirsty', 'toilet', 'wait_s',
  ]),
  tla('tla_park', 't_park', [
    'play', 'go', 'swing', 'slide',
    'ball', 'sand', 'bike', 'friend',
    'my_turn', 'your_turn', 'up', 'down',
    'fast', 'slow', 'look_at', 'scared',
    'happy', 'water', 'home', 'need_break',
  ]),
  tla('tla_dentist', 't_dentist', [
    'open', 'mouth', 'teeth', 'toothbrush',
    'chair', 'light', 'spit', 'water',
    'it_hurts', 'im_scared', 'wait_s', 'gently',
    'how_long', 'is_it_done', 'need_break', 'bravo',
    'reward', 'dentist', 'mom', 'dont_understand',
  ]),
  tla('tla_school', 't_school', [
    'teacher', 'friend', 'read', 'write',
    'draw', 'book', 'pencil', 'scissors',
    'glue', 'notebook', 'bag', 'recess',
    'canteen', 'toilet', 'dont_understand', 'repeat',
    'my_turn', 'play', 'sing', 'need_break',
  ]),
];

/** Empty TLA that already contains the shared core block. */
export function blankTla(id: string, concept: string): Board {
  return tla(id, concept, []);
}

let stepSeq = 0;
const step = (concept: string, extra: { tla?: string; timerMin?: number } = {}) => ({
  id: `step_${++stepSeq}`,
  concept,
  done: false,
  ...extra,
});

export const DEFAULT_SCHEDULES: Schedule[] = [
  {
    id: 'sched_morning',
    title: '',
    concept: 's_morning',
    recurring: true,
    steps: [
      step('wake_up'),
      step('toilet'),
      step('get_dressed'),
      step('breakfast', { tla: 'tla_meal', timerMin: 15 }),
      step('brush_teeth', { timerMin: 2 }),
      step('shoes'),
      step('school', { tla: 'tla_school' }),
    ],
  },
  {
    id: 'sched_dentist',
    title: '',
    concept: 't_dentist',
    recurring: false,
    steps: [
      step('car'),
      step('waiting_room', { timerMin: 5 }),
      step('dentist', { tla: 'tla_dentist' }),
      step('reward'),
      step('park', { tla: 'tla_park' }),
      step('home'),
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  lang: 'fr',
  uiLang: 'fr',
  gender: 'm',
  revealLevel: 3,
  symbolSet: 'pictos',
  showLabels: true,
  speakOnTap: true,
  addToStrip: true,
  grammar: true,
  quickZone: false,
  bar: { tla: true, schedule: true, timer: true },
  speechRate: 1,
  voices: {},
  pin: '1234',
  timer: { display: ['circle', 'digits'], sound: true, haptic: true },
  modelPace: 1,
  aiSuggestions: true,
  wiggle: false,
  autoOpenApps: true,
  voiceKind: 'device',
  voiceAge: 'adult',
  repeatDelay: 2,
  langs: ['fr'],
  arabic: 'lb',
  dialectVoice: true,
  visual: 'standard',
  pictoSize: 'normal',
  reduceMotion: false,
  haptics: true,
  access: 'release',
  holdTime: 1,
  plans: { week: false, month: false },
  dataCollection: 'off',
  shareStats: 'none',
};

export const DEFAULT_HELP: HelpConfig = {
  message: { fr: 'Aide-moi !', en: 'Help me!', ar: 'ساعدني!' },
  options: ['it_hurts', 'im_scared', 'dont_understand', 'want_leave', 'need_break', 'toilet'],
  howICommunicate: '',
  emergencyContact: '',
};

/** Urgent / repair messages for the optional fixed zone (spec §7). */
export const QUICK_ZONE = ['yes', 'no', 'stop', 'wait_s', 'more', 'done', 'help_me'];

export function createDefaultProfile(): Profile {
  const boards: Record<string, Board> = {};
  for (const b of [CORE, ...FOLDERS, ...TLAS]) boards[b.id] = structuredClone(b);
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    boards,
    tlaOrder: TLAS.map((t) => t.id),
    schedules: structuredClone(DEFAULT_SCHEDULES),
    activeSchedule: DEFAULT_SCHEDULES[0].id,
    overrides: {},
    customConcepts: {},
    help: structuredClone(DEFAULT_HELP),
    demos: [],
    weekPlan: {},
    monthPlan: {},
    migrations: ['apps'],
  };
}
