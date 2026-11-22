/**
 * "Reset" of a board (Settings → Board → Code and data): the starting board again, keeping what
 * the family decided: the caregiver code, the follow-up and sharing choices, and the child's
 * languages. The photos and recordings of the old board stay 30 days (`eraseLater`), and with an
 * account the board as it was stays among its earlier versions (the server keeps a copy before a
 * big change). With an account the same proof as deleting is asked first (`checkFreshProof`).
 */
import { createDefaultProfile } from '../data/defaults';
import type { Profile } from '../model/types';

const KEPT = ['pin', 'dataCollection', 'shareStats', 'shareTerms', 'uiLang', 'lang', 'langs', 'arabic'] as const;

export function resetKeeping(current: Profile): Profile {
  const next = createDefaultProfile();
  const from = current.settings as unknown as Record<string, unknown>;
  const to = next.settings as unknown as Record<string, unknown>;
  for (const k of KEPT) {
    if (from[k] === undefined) delete to[k];
    else to[k] = JSON.parse(JSON.stringify(from[k]));
  }
  return next;
}
