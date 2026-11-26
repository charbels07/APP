/**
 * Payment rules (owner's decisions, November 2026: gap review Q28, Q44–Q46, and the free week).
 * The database decides (`billing_state` in supabase/migrations/20261126000000_billing.sql); this
 * file is the same rule for the demo server and the screens, and it is tested against it.
 *
 *  - Payment is off until the owner switches it on (`billing_config.live`): everything is "free".
 *  - A family pays for its children (the account that owns the child's profile). A family that never
 *    subscribed has a free week from the day payment started for it (its account's creation, or the
 *    day payment was switched on if later): days 1–7 nothing is blocked; days 8–14 everything is
 *    paused except the child talking; after day 14 the board is frozen and the child still talks, for
 *    good. No card is asked for the free week (no store trial).
 *  - A family whose subscription ended: days 1–7 nothing is blocked, a reminder every day; days 8–14
 *    paused; then frozen. Paying gives everything back at once: nothing is deleted meanwhile.
 *  - "Paused" and "frozen" block the same things (new words, editing, sync, follow-up, team, backups);
 *    the child's voice is never blocked, offline included.
 *  - A professional pays once (her licence): needed to be on a child's team as a therapist or teacher.
 *  - Reminders never appear on the board while the child talks: a dot on "Settings" and "Caregiver",
 *    the full message after the caregiver code, a daily notification to the parent's account.
 */

export type BillingStatus =
  /** Payment is not switched on (or this board is not the family's to pay: a professional's draft). */
  | 'free'
  | 'paid'
  /** Never subscribed, days 1–7. */
  | 'trial'
  /** Subscription ended, days 1–7: nothing blocked. */
  | 'grace'
  /** Days 8–14: everything paused except the child talking. */
  | 'paused'
  /** After day 14: the board is frozen, the child still talks. */
  | 'frozen';

export interface BillingState {
  status: BillingStatus;
  /** Payment is switched on for the app. */
  live: boolean;
  /** When the free week or the 7 days of the ended subscription end (ms); then when the board freezes. */
  until?: number;
  /** The subscription renews by itself (paid only). */
  renews?: boolean;
}

export const FREE_DAYS = 7;
export const GRACE_DAYS = 7;
export const PAUSE_DAYS = 7;
const DAY = 24 * 3600 * 1000;

export interface BillingFacts {
  live: boolean;
  /** When payment was switched on (ms). */
  liveSince?: number;
  /** When the paying account was created (ms). */
  accountCreated: number;
  /** End of the family's subscription (ms): the latest one; absent if it never subscribed. */
  paidUntil?: number;
  renews?: boolean;
  /** The board belongs to a professional (her draft): the family is not asked to pay for it. */
  proOwned?: boolean;
  now: number;
}

/** Where a family's board stands. */
export function billingStatus(f: BillingFacts): BillingState {
  if (!f.live || f.proOwned) return { status: 'free', live: f.live };
  if (f.paidUntil != null && f.paidUntil > f.now) return { status: 'paid', live: true, until: f.paidUntil, renews: !!f.renews };
  const subscribed = f.paidUntil != null;
  // The clock starts at the end of the subscription, or (never subscribed) when payment started for this family.
  const start = subscribed ? Math.max(f.paidUntil!, f.liveSince ?? 0) : Math.max(f.accountCreated, f.liveSince ?? 0);
  const first = subscribed ? GRACE_DAYS : FREE_DAYS;
  const days = (f.now - start) / DAY;
  if (days < first) return { status: subscribed ? 'grace' : 'trial', live: true, until: start + first * DAY };
  if (days < first + PAUSE_DAYS) return { status: 'paused', live: true, until: start + (first + PAUSE_DAYS) * DAY };
  return { status: 'frozen', live: true };
}

/** Changes are refused (new words, editing, sync, follow-up, team, backups). The child still talks. */
export const changesBlocked = (s: BillingStatus | undefined) => s === 'paused' || s === 'frozen';

/** A reminder is due: the dot on "Settings" and "Caregiver", the message after the code. */
export const remindsToPay = (s: BillingStatus | undefined) => s === 'trial' || s === 'grace' || s === 'paused' || s === 'frozen';

/** Whole days left before `until` (at least 1 while it is in the future). */
export function daysLeft(until: number | undefined, now: number): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - now) / DAY));
}

/** What a person can buy: the family's subscription (monthly or yearly) or a professional's licence. */
export type BillingProduct = 'familyMonthly' | 'familyYearly' | 'proLicence';

/** The account's own purchases, as the server knows them (`billing_mine`). */
export interface MyBilling {
  live: boolean;
  /** The family's subscription. */
  family?: { until: number; renews: boolean; store: 'app_store' | 'play_store' | 'other' };
  /** The professional's licence was bought (it never ends). */
  pro: boolean;
}

/** The entitlement names of RevenueCat (the server reads the same ones: supabase/functions/caa-billing). */
export const ENTITLEMENTS = { family: 'family', pro: 'pro' } as const;
/** The offerings of RevenueCat: what the family's page and the professional's page show. */
export const OFFERINGS = { family: 'family', pro: 'pro' } as const;

/**
 * Shown under the plans (the stores require both on a subscription's page). The privacy page must
 * be published on the website before payment is switched on (docs/runbooks/STORE-BUILDS.md).
 */
export const LEGAL_LINKS = {
  privacy: 'https://daleth-aac.sarrouhcharbel.workers.dev/privacy/',
  /** Apple's standard licence on iPhone and iPad; the app's own terms elsewhere. */
  termsApple: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  terms: 'https://daleth-aac.sarrouhcharbel.workers.dev/terms/',
} as const;

/** "Later" was chosen today on this device for this child: the message after the code waits until tomorrow. */
export const laterKey = (profileId: string) => `caa.billing.later.${profileId}`;
export const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

/**
 * Right after the caregiver code: what comes first. 'none': what was asked opens. 'message': the
 * reminder, with "Later" (the payer, free week or ended subscription, once a day). 'blocked': paused
 * or frozen, nothing that changes the board opens (the message, with "My account").
 * The guide, "Lock the screen" and a link the child opens are never held back; the app's team never.
 */
export function afterCodeStop(s: { status?: BillingStatus; payer: boolean; laterToday: boolean; then?: string; team: boolean }): 'none' | 'message' | 'blocked' {
  if (s.team || !s.status) return 'none';
  if (s.then === 'guide' || s.then === 'lock' || s.then === 'openLink') return 'none';
  if (changesBlocked(s.status)) return 'blocked';
  if ((s.status === 'trial' || s.status === 'grace') && s.payer && !s.laterToday) return 'message';
  return 'none';
}
