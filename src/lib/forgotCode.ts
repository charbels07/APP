/**
 * "Forgot the code?" on the caregiver keypad: who may choose a new code without the old one, and
 * how they show that the signed-in account is theirs first.
 *
 * - The family's code: only someone the database lets change it (`save_profile`: the owner, or a
 *   co-parent who manages the profile).
 * - On a professional's board the code asked is her own (src/state/ownCode.ts): she may choose
 *   hers again; the family's code is never hers to change.
 * - A tablet linked with a code has no password and no mailbox: it is done from a parent's device.
 *
 * Two proofs: a code sent to the account's own e-mail (else its phone), or the account's password
 * when it was created with one (Google / Apple accounts were not).
 */
import type { Account } from '../backend/types';

export interface ForgotWays {
  /** Where the check code is sent: always the account's own address or number. */
  contact: { email: string } | { phone: string };
  to: string;
  /** The account's password can be typed instead of waiting for a code. */
  password: boolean;
}

/** Null: this person is not offered a way around the code (they are told where to do it). */
export function forgotCodeWays(opts: { account: Account | null | undefined; manager: boolean; ownCode: boolean }): ForgotWays | null {
  const a = opts.account;
  if (!a || a.provider === 'device') return null;
  if (!opts.ownCode && !opts.manager) return null;
  const contact = a.email ? { email: a.email } : a.phone ? { phone: a.phone } : null;
  if (!contact) return null;
  return { contact, to: a.email || a.phone || '', password: a.provider === 'email' || a.provider === 'phone' };
}
