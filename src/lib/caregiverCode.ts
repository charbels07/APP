/**
 * The caregiver code and caregiver mode: the rules, apart from the screens.
 *
 * - "1234" is only what a new profile starts with. It means "not chosen yet" and is never a code:
 *   while nothing is chosen, no code opens anything.
 * - On a family's board the code is chosen by those who decide for the child (the owner, a
 *   co-parent who manages the profile), on their own device: never on a tablet linked with a code.
 *   At the first opening after the set-up the keypad comes by itself and cannot be closed
 *   (`mustChooseFirst`). Later, a board that still has no code is never covered (the child may be
 *   the one opening it): the code is chosen from "Caregiver", after the account's proof
 *   (`provesBeforeChoosing`), so that the child cannot be the one who chooses it.
 * - On a professional's boards the code asked is her own (src/state/ownCode.ts).
 * - Caregiver mode turns itself off after 5 minutes without a touch, and when the app goes to the
 *   background (`IDLE_MS`, `isAdultPanel`).
 */

/** What a new profile holds until the family chooses: never shown, never accepted. */
const NOT_CHOSEN = '1234';

/** Has the family's code been chosen? (a missing or damaged value counts as "not yet") */
export const familyCodeUnset = (pin: string | undefined | null): boolean => !pin || !/^\d{4}$/.test(pin) || pin === NOT_CHOSEN;

/** The code this keypad compares with, and whether there is one. `own`: a professional's own code. */
export function codeOf(own: { value?: string } | undefined, familyPin: string | undefined): { pin: string; unset: boolean } {
  if (own) {
    const pin = own.value ?? '';
    return { pin, unset: !/^\d{4}$/.test(pin) };
  }
  return { pin: familyPin ?? '', unset: familyCodeUnset(familyPin) };
}

/**
 * May this person choose the code here? Her own code: always. A board with no account behind it
 * (the try-it preview, the set-up's trial): it is the person's own. A family's board: only who
 * manages the profile (unknown while the rights have not arrived: no), and never on a tablet
 * linked with a code, even with full access: it is the child's, and it has no password or
 * mailbox to prove who is choosing.
 */
export const mayChooseCode = (o: { own: boolean; family: boolean; manager: boolean; device?: boolean }): boolean =>
  o.own || !o.family || (o.manager && !o.device);

/**
 * A family's board that has no code, outside the first opening: the account proves who is choosing
 * (its password, a code sent to its mailbox) before the keypad lets a code be chosen. Otherwise
 * the first person to press "Caregiver" on a device signed in with the parent's account, the child
 * included, would choose it. Not for the app's team (never asked a code).
 */
export const provesBeforeChoosing = (o: { family: boolean; own: boolean; team: boolean; first: boolean }): boolean =>
  o.family && !o.own && !o.team && !o.first;

/**
 * Where the keypad opens. Nothing chosen yet: who may choose chooses now (`proofFirst`: after
 * the account's proof); anyone else is told where it is chosen and gets no keypad, since no code
 * would be right.
 */
export function keypadStart(o: { unset: boolean; canChoose: boolean; proofFirst?: boolean }): 'enter' | 'choose' | 'prove' | 'notChosen' {
  if (!o.unset) return 'enter';
  if (!o.canChoose) return 'notChosen';
  return o.proofFirst ? 'prove' : 'choose';
}

/** Is the typed code the right one? Never while no code was chosen ("1234" included). */
export const codeAccepted = (typed: string, o: { pin: string; unset: boolean }): boolean => !o.unset && typed === o.pin;

/**
 * A family's board opened for the first time after its set-up (`fresh`: the guide is still waiting
 * to open), by someone who decides for the child, with no code chosen: the keypad comes first and
 * cannot be closed. Only then: the adult who just made the board is the one holding the device.
 * At any later opening the board is left free (see `provesBeforeChoosing`). Not on a child's
 * linked tablet, not for the app's team (never asked a code), not on a professional's boards.
 */
export function mustChooseFirst(o: { family: boolean; manager: boolean; own: boolean; team: boolean; device: boolean; fresh: boolean; pin: string | undefined }): boolean {
  return o.family && o.fresh && o.manager && !o.own && !o.team && !o.device && familyCodeUnset(o.pin);
}

/**
 * Settings → Code and data: who sees the code field. A professional sees her own code. The
 * family's code is shown to who may choose it (and on a board with no account behind it), never
 * on a child's board opened from a professional's workspace.
 */
export const showsCodeField = (o: { own: boolean; proBoard: boolean; family: boolean; manager: boolean }): boolean =>
  o.own || (!o.proBoard && (!o.family || o.manager));

/** 1234, 0000, 1111…: refused when a code is chosen. */
export const pinTooEasy = (code: string): boolean => code === NOT_CHOSEN || /^(\d)\1{3}$/.test(code);

/** After 5 wrong codes: a pause of 30 s, then 1, 2 and 5 minutes for each further wrong code. */
export const pinPause = (fails: number): number => (fails < 5 ? 0 : [30, 60, 120, 300][Math.min(fails - 5, 3)] * 1000);

/** After the caregiver code: do these panels open without switching the board to caregiver mode? */
export const opensAlone = (then: { kind: string } | undefined): boolean =>
  !!then && ['settings', 'lock', 'guide', 'openLink', 'picker', 'model', 'recordDemo'].includes(then.kind);

// ── Caregiver mode turns itself off ──

/** Without a touch for this long, the adults' tools close. */
export const IDLE_MS = 5 * 60 * 1000;

let lastTouch = Date.now();
/** A touch, a key, a letter typed in a field: the 5 minutes start again. */
export const touched = (): void => {
  lastTouch = Date.now();
};
export const lastTouchAt = (): number => lastTouch;

export const idleTooLong = (lastTouch: number, now: number): boolean => now - lastTouch >= IDLE_MS;

/** The panels that belong to the adults whatever opened them. */
const ADULT_PANELS = new Set(['settings', 'lock', 'print', 'editor', 'cellMenu', 'tlaMenu', 'shareTla', 'moveToTla', 'conceptEditor', 'scheduleEditor', 'newTla', 'newSequence', 'wordBin']);

interface PanelLike {
  kind: string;
  adult?: boolean;
  back?: unknown;
}

/**
 * Is an adults' panel open? Its own kind, a panel opened after the code (`adult`), or a panel
 * whose "Back" leads to one (the guide opened from the settings).
 */
export function isAdultPanel(overlay: PanelLike | null | undefined): boolean {
  for (let o = overlay, n = 0; o && n < 10; o = o.back as PanelLike | undefined, n++) {
    if (ADULT_PANELS.has(o.kind) || o.adult === true) return true;
  }
  return false;
}
