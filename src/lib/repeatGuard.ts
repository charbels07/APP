/**
 * Minimum delay between two presses on the same pictogram (Settings → Communication).
 *
 * A child who taps the same card again and again ("pas pas pas") gets it once: a second
 * press on the same pictogram within the delay is ignored — nothing is said or added.
 * The delay counts from the last accepted press; other pictograms stay usable at once.
 */
export function createRepeatGuard() {
  const last = new Map<string, number>();
  /** True if this press is accepted (and remembered), false if it comes too soon. */
  return (id: string, delayMs: number, now: number = Date.now()): boolean => {
    if (delayMs <= 0) return true;
    const prev = last.get(id);
    if (prev !== undefined && now - prev < delayMs) return false;
    last.set(id, now);
    return true;
  };
}
