/**
 * The app itself sent the person outside for a moment: the camera, the photo library, a file
 * chooser, the share or print sheet, a permission question, a new e-mail already written, the app
 * a link is being tested with. On Android these put the app in the background, and caregiver mode
 * turns itself off when the app goes to the background (src/lib/caregiverCode.ts): not for these,
 * or a parent could never add a photo to a word. The 5 minutes without a touch still count: on
 * the way back, caregiver mode is off if they have passed.
 */

/** Longer than this, it is no longer "a moment": the person left. */
const LONGEST = 3 * 60 * 1000;
/** Some sheets appear a moment after the call has answered. */
const AFTER = 2000;

let holds = 0;
let since = 0;
let until = 0;
/** Screens on show that wait for something the person fetches elsewhere. */
let waits = 0;

/** Runs something that shows a system screen over the app. */
export async function outside<T>(run: () => Promise<T>): Promise<T> {
  holds++;
  since = Date.now();
  try {
    return await run();
  } finally {
    holds = Math.max(0, holds - 1);
    until = Date.now() + AFTER;
  }
}

/**
 * A screen that waits for something the person fetches elsewhere: the code sent to their mailbox,
 * the code of their authenticator app. They have to leave the app and come back to this very
 * screen: leaving does not close it (it would send a new code each time, for ever). Returns what
 * to call when the screen goes away.
 */
export function waitsElsewhere(): () => void {
  waits++;
  let over = false;
  return () => {
    if (!over) waits = Math.max(0, waits - 1);
    over = true;
  };
}

/** Is the person on a screen the app opened itself, or fetching what a screen of the app waits for? */
export function isOutside(now = Date.now()): boolean {
  return (holds > 0 && now - since < LONGEST) || now < until || waits > 0;
}

/** For the tests. */
export function resetOutside(): void {
  holds = 0;
  since = 0;
  until = 0;
  waits = 0;
}
