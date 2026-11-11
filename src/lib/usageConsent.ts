/**
 * What may be kept of one day of data at a consent level: the server applies this too,
 * so nothing beyond the family's choice is ever stored.
 */
import type { UsageDay } from '../backend/types';
import type { Settings } from '../model/types';

export type CollectLevel = Settings['dataCollection'];

export const LEVEL_RANK: Record<CollectLevel, number> = { off: 0, usage: 1, vocabulary: 2, language: 3 };

export function limitToConsent(day: UsageDay, level: CollectLevel): UsageDay | null {
  if (level === 'off') return null;
  const out: UsageDay = { ...day, level };
  if (LEVEL_RANK[level] < 2) {
    delete out.concepts;
    delete out.searched;
  }
  if (LEVEL_RANK[level] < 3) delete out.samples;
  return out;
}
