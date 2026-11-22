/**
 * The small things that stay on each device and never travel to the account (owner's decision,
 * November 2026): the activity board opened last, the sequence shown and its ticked steps, the
 * welcome card and what was read in the guide.
 *
 * They change while the child simply uses the board. Sent like the rest, they made a "use only"
 * tablet try to save, be refused, and stop receiving the family's changes. So: a change of these
 * alone is kept on the device and nothing is sent; what is sent never carries them; what is
 * received never replaces them.
 */
import type { Profile, Schedule } from '../model/types';

const unticked = (s: Schedule): Schedule => ({ ...s, steps: (s.steps ?? []).map((st) => ({ ...st, done: false })) });

/** The profile as it travels: without this device's own small things. */
export function travelling(p: Profile): Profile {
  const { lastTla: _lastTla, activeSchedule: _active, guide, ...rest } = p;
  const out = { ...rest, schedules: (p.schedules ?? []).map(unticked) } as Profile;
  if (guide?.tailored) out.guide = { tailored: guide.tailored };
  return out;
}

/** What is compared to know whether something that travels changed. */
export const travelKey = (p: Profile): string => JSON.stringify(travelling(p));

/**
 * A version received from the account, with this device's own small things put back (`mine`: what
 * the device shows now). The first time a device receives a board (`mine` undefined) it starts
 * from what the account holds: the board of a set-up just finished opens its guide once, and an
 * older board does not show its welcome card again on every new device.
 */
export function withDeviceThings(theirs: Profile, mine?: Profile): Profile {
  const from = mine ?? theirs;
  const ticked = new Set<string>();
  for (const s of mine?.schedules ?? []) for (const st of s.steps ?? []) if (st.done) ticked.add(`${s.id}\n${st.id}`);
  const schedules = (theirs.schedules ?? []).map((s) => ({ ...s, steps: (s.steps ?? []).map((st) => ({ ...st, done: ticked.has(`${s.id}\n${st.id}`) })) }));
  const out: Profile = { ...theirs, schedules };
  if (from.lastTla && theirs.boards[from.lastTla]) out.lastTla = from.lastTla;
  else delete out.lastTla;
  out.activeSchedule = schedules.some((s) => s.id === from.activeSchedule) ? from.activeSchedule : schedules[0]?.id;
  const tailored = theirs.guide?.tailored ? { tailored: theirs.guide.tailored } : {};
  if (mine) {
    const g = mine.guide;
    out.guide = { ...tailored, ...(g?.seen !== undefined ? { seen: g.seen } : {}), ...(g?.read ? { read: g.read } : {}), ...(g?.openOnStart !== undefined ? { openOnStart: g.openOnStart } : {}) };
  } else {
    const g = theirs.guide;
    out.guide = { ...tailored, seen: g?.seen ?? true, ...(g?.openOnStart ? { openOnStart: true } : {}) };
  }
  return out;
}
