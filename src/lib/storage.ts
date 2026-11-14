/**
 * Profile format upgrades, and the board saved by older versions of the app.
 * Each child's profile is now kept per child (src/state/profileSync.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APPS_FOLDER_SLOT, createDefaultProfile, DEFAULT_SETTINGS } from '../data/defaults';
import { LANGS, type Lang, type Profile } from '../model/types';
import { intBetween, plain, safeLink } from './safety';

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

/** Fills in anything added to the defaults since the profile was saved. */
export function migrate(p: Partial<Profile>): Profile {
  const base = createDefaultProfile();
  const boards = { ...base.boards, ...plain(p.boards) };
  const migrations = [...(p.migrations ?? [])];
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
  // ARASAAC is no longer in the app (licence): a word that pointed to one of its pictograms goes
  // back to the app's own picture; pictures the family chose (photos, saved images) are kept.
  const overrides = plain(p.overrides);
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
  const customConcepts = plain(p.customConcepts);
  for (const [id, c] of Object.entries(customConcepts)) {
    if (c?.app && c.app.url !== safeLink(c.app.url)) customConcepts[id] = { ...c, app: { ...c.app, url: safeLink(c.app.url) } };
  }
  for (const [id, o] of Object.entries(overrides)) {
    if (o?.app && o.app.url !== safeLink(o.app.url)) overrides[id] = { ...o, app: { ...o.app, url: safeLink(o.app.url) } };
  }
  for (const [id, b] of Object.entries(boards)) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.cells)) {
      delete boards[id];
      continue;
    }
    const rows = intBetween(b.rows, 1, 40, 1);
    const cols = intBetween(b.cols, 1, 40, 1);
    if (rows !== b.rows || cols !== b.cols) boards[id] = { ...b, rows, cols };
  }
  const lang = LANGS.includes(p.settings?.lang as Lang) ? (p.settings!.lang as Lang) : DEFAULT_SETTINGS.lang;
  const symbolSet = p.settings?.symbolSet === 'emoji' ? 'emoji' : 'pictos';
  return {
    ...base,
    ...p,
    version: 1,
    settings: {
      ...DEFAULT_SETTINGS,
      langs: [lang],
      ...(p.settings ?? {}),
      lang,
      symbolSet,
      bar: { ...DEFAULT_SETTINGS.bar, ...(p.settings?.bar ?? {}) },
      timer: { ...DEFAULT_SETTINGS.timer, ...(p.settings?.timer ?? {}) },
      plans: { ...DEFAULT_SETTINGS.plans, ...(p.settings?.plans ?? {}) },
    },
    boards,
    tlaOrder: (p.tlaOrder ?? base.tlaOrder).filter((id) => boards[id]),
    help: { ...base.help, ...(p.help ?? {}) },
    overrides,
    customConcepts,
    schedules: p.schedules ?? base.schedules,
    demos: p.demos ?? [],
    weekPlan: p.weekPlan ?? {},
    monthPlan: p.monthPlan ?? {},
    migrations,
  };
}
