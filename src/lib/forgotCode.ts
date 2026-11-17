/**
 * "Forgot the code?" on the caregiver keypad: who may choose a new family code without the old
 * one, and how they show that the signed-in account is theirs first.
 *
 * Only the family: the person must be allowed to change the family's code by the database
 * (`save_profile`: the owner, or a co-parent who manages the profile) and must be able to prove
 * who they are again. A tablet linked with a code has no password and no e-mail; a professional
 * types her own code on every board (src/state/ownCode.ts) and never changes the family's.
 */
import type { Account } from '../backend/types';

export interface ForgotWays {
  /** The account was created with a password (Google / Apple accounts were not). */
  password: boolean;
  /** Where a sign-in code can be sent. */
  code: 'email' | 'phone' | null;
  /** The account's address or number, shown so the person knows which account is meant. */
  account: string;
}

/** Null: the keypad offers no way around the code to this person. */
export function forgotCodeWays(opts: { account: Account | null | undefined; manager: boolean; ownCode: boolean }): ForgotWays | null {
  const a = opts.account;
  if (!a || opts.ownCode || a.role === 'pro') return null;
  if (a.provider === 'device') return null;
  if (!opts.manager) return null;
  const password = a.provider === 'email' || a.provider === 'phone';
  const code = a.email ? 'email' : a.phone ? 'phone' : null;
  if (!password && !code) return null;
  return { password, code, account: a.email ?? a.phone ?? '' };
}
