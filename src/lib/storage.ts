/**
 * Profile format upgrades, and the board saved by older versions of the app.
 * Each child's profile is now kept per child (src/state/profileSync.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APPS_FOLDER_SLOT, createDefaultProfile, DEFAULT_SETTINGS } from '../data/defaults';
import { LANGS, type Board, type Lang, type Profile, type Settings } from '../model/types';
import { binOf, boardOf, conceptsOf, idOk, demosOf, guideOf, helpOf, monthPlanOf, overridesOf, schedulesOf, settingsOf, weekPlanOf } from './profileShape';
import { plain, safeLink } from './safety';

/** Where the app kept its one profile before accounts existed. */
const LEGACY_KEY = 'caa.profile.v1';

/** The board made on this device before accounts (offered when creating the first child). */
export async function loadLegacyProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupted */
  }
  return null;
}

export async function forgetLegacyProfile(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
}

/**
 * Fills in anything added to the defaults since the profile was saved, and makes sure every part
 * is of the shape the screens expect (src/lib/profileShape.ts): a profile that comes back damaged
 * still gives a board that opens. What is sound is never changed, and no word ever moves.
 */
export function migrate(input: Partial<Profile> | null | undefined): Profile {
  const p: Partial<Profile> = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const base = createDefaultProfile();
  // The family's own boards, as saved: a default activity board the family deleted is not added back.
  const boards: Record<string, Board> = {};
  for (const [id, b] of Object.entries(plain(p.boards as Record<string, unknown> | undefined))) {
    if (!idOk(id)) continue;
    const ok = boardOf(id, b);
    if (ok) boards[id] = ok;
  }
  // Nothing readable at all: the starting boards. Otherwise the main board at least is always there.
  const none = !Object.keys(boards).length;
  if (none) Object.assign(boards, base.boards);
  if (!boards.core || boards.core.kind !== 'core') boards.core = base.boards.core;
  const migrations = Array.isArray(p.migrations) ? p.migrations.filter((m) => typeof m === 'string') : [];
  // Apps folder (round 5): placed only if its slot is still empty, never moving a word.
  if (!migrations.includes('apps')) {
    migrations.push('apps');
    const core = boards.core;
    if (core && !core.cells.some((c) => c?.folder === 'apps') && core.cells[APPS_FOLDER_SLOT] === null) {
      const cells = [...core.cells];
      cells[APPS_FOLDER_SLOT] = base.boards.core.cells[APPS_FOLDER_SLOT];
      boards.core = { ...core, cells };
    }
  }
  // A folder card always has its board to open: the app's own (a folder added by an update, a
  // board lost in a damaged copy), or an empty one for a folder the family made.
  for (const b of Object.values(boards)) {
    for (const c of b.cells) {
      if (!c?.folder || boards[c.folder]) continue;
      boards[c.folder] = base.boards[c.folder] ?? { id: c.folder, kind: 'folder', concept: c.concept, rows: 3, cols: 4, cells: Array<null>(12).fill(null) };
    }
  }
  // What the family changed on the app's words, and the words it made.
  const overrides = overridesOf(p.overrides);
  // ARASAAC is no longer in the app (licence): a word that pointed to one of its pictograms goes
  // back to the app's own picture; pictures the family chose (photos, saved images) are kept.
  for (const [id, o] of Object.entries(overrides)) {
    if ((o.symbol as { kind?: string } | undefined)?.kind === 'arasaac') {
      const { symbol: _old, ...rest } = o;
      overrides[id] = rest;
    }
  }
  // Data that may come from someone else (the server copy is edited by the whole team):
  //  - a link on a card is kept only if it is a web page or a known app (never "javascript:" …);
  //  - a board's rows and columns are small whole numbers (they end up in the printed page);
  //  - identifiers that would change how the app's objects behave are dropped.
  const customConcepts = conceptsOf(p.customConcepts);
  for (const [id, c] of Object.entries(customConcepts)) {
    if (c?.app && c.app.url !== safeLink(c.app.url)) customConcepts[id] = { ...c, app: { ...c.app, url: safeLink(c.app.url) } };
  }
  for (const [id, o] of Object.entries(overrides)) {
    if (o?.app && o.app.url !== safeLink(o.app.url)) overrides[id] = { ...o, app: { ...o.app, url: safeLink(o.app.url) } };
  }
  // The list of activity boards: the family's order, without what no longer exists; an activity
  // board the family made that the list lost (two people adding one at the same time) is put
  // back at the end. The app's own starting boards are only listed when the family's list has them.
  const listed = Array.isArray(p.tlaOrder) ? p.tlaOrder.filter(idOk) : undefined;
  const tlaIds = Object.keys(boards).filter((id) => boards[id].kind === 'tla');
  const tlaOrder = [...new Set(none ? base.tlaOrder : listed ? listed.filter((id) => boards[id]) : [...base.tlaOrder.filter((id) => boards[id]), ...tlaIds])];
  for (const id of tlaIds) if (!tlaOrder.includes(id) && !base.boards[id]) tlaOrder.push(id);

  const given = settingsOf(p.settings, DEFAULT_SETTINGS) as Partial<Settings>;
  const lang = LANGS.includes(given.lang as Lang) ? (given.lang as Lang) : DEFAULT_SETTINGS.lang;
  const symbolSet = given.symbolSet === 'emoji' ? 'emoji' : 'pictos';
  const schedules = p.schedules === undefined ? base.schedules : schedulesOf(p.schedules, base.schedules);
  const out: Profile = {
    ...base,
    ...p,
    version: 1,
    settings: {
      ...DEFAULT_SETTINGS,
      langs: [lang],
      ...given,
      lang,
      symbolSet,
      bar: { ...DEFAULT_SETTINGS.bar, ...(given.bar ?? {}) },
      timer: { ...DEFAULT_SETTINGS.timer, ...(given.timer ?? {}) },
      plans: { ...DEFAULT_SETTINGS.plans, ...(given.plans ?? {}) },
      // Switch scanning (Settings → Touch): a profile saved before it gets the defaults (off);
      // the values are kept within bounds where they are read (scanOf in src/lib/scanning.ts).
      scan: { ...DEFAULT_SETTINGS.scan!, ...plain(given.scan as Record<string, unknown> | undefined) },
    },
    boards,
    tlaOrder,
    help: helpOf(p.help, base.help),
    overrides,
    customConcepts,
    schedules,
    activeSchedule: typeof p.activeSchedule === 'string' ? p.activeSchedule : schedules[0]?.id,
    demos: demosOf(p.demos),
    weekPlan: weekPlanOf(p.weekPlan),
    monthPlan: monthPlanOf(p.monthPlan),
    migrations,
  };
  if (!idOk(out.lastTla)) delete out.lastTla;
  const guide = guideOf(p.guide);
  if (guide) out.guide = guide;
  else delete out.guide;
  const bin = binOf(p.bin);
  if (bin) out.bin = bin;
  else delete out.bin;
  const ft = p.firstThen as Record<string, unknown> | undefined;
  if (ft && typeof ft === 'object' && !Array.isArray(ft)) {
    out.firstThen = { ...(typeof ft.first === 'string' ? { first: ft.first } : {}), ...(typeof ft.then === 'string' ? { then: ft.then } : {}) };
  } else delete out.firstThen;
  return out;
}
