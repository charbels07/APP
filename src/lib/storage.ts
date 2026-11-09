/**
 * Profile format upgrades, and the board saved by older versions of the app.
 * Each child's profile is now kept per child (src/state/profileSync.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APPS_FOLDER_SLOT, createDefaultProfile, DEFAULT_SETTINGS } from '../data/defaults';
import type { Profile } from '../model/types';

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
  const boards = { ...base.boards, ...(p.boards ?? {}) };
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
  return {
    ...base,
    ...p,
    version: 1,
    settings: {
      ...DEFAULT_SETTINGS,
      langs: [p.settings?.lang ?? DEFAULT_SETTINGS.lang],
      ...(p.settings ?? {}),
      bar: { ...DEFAULT_SETTINGS.bar, ...(p.settings?.bar ?? {}) },
      timer: { ...DEFAULT_SETTINGS.timer, ...(p.settings?.timer ?? {}) },
    },
    boards,
    tlaOrder: (p.tlaOrder ?? base.tlaOrder).filter((id) => boards[id]),
    help: { ...base.help, ...(p.help ?? {}) },
    overrides: p.overrides ?? {},
    customConcepts: p.customConcepts ?? {},
    schedules: p.schedules ?? base.schedules,
    demos: p.demos ?? [],
    migrations,
  };
}
