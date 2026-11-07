/**
 * Local persistence of the profile (offline-first, spec §32). Cloud sync is a
 * later phase; the profile format is versioned so it can be migrated and synced.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDefaultProfile, DEFAULT_SETTINGS } from '../data/defaults';
import type { Profile } from '../model/types';

const KEY = 'caa.profile.v1';

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupted: start from defaults */
  }
  return createDefaultProfile();
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function saveProfile(profile: Profile): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => {});
  }, 300);
}

export async function resetProfile(): Promise<Profile> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return createDefaultProfile();
}

/** Fills in anything added to the defaults since the profile was saved. */
export function migrate(p: Partial<Profile>): Profile {
  const base = createDefaultProfile();
  const boards = { ...base.boards, ...(p.boards ?? {}) };
  return {
    ...base,
    ...p,
    version: 1,
    settings: {
      ...DEFAULT_SETTINGS,
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
  };
}
