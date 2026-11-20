/**
 * The real server: Supabase (PostgreSQL database, logins, file storage).
 *
 * Same contract as the demo server. Security is enforced by the database itself
 * (supabase/migrations: row-level security and checked functions), so this file mostly
 * translates between the app's shapes (camelCase, timestamps in ms) and the tables
 * (snake_case, ISO dates). Errors raised by the database carry short codes
 * (forbidden, conflict…) that become BackendError codes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AiRequest } from '../../supabase/functions/_shared/aiPrompts';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { sessionStore } from '../lib/keepSignedIn';
import type { Profile, UiLang } from '../model/types';
import { isSyncable } from '../lib/mediaPlan';
import type { ProblemItem } from '../lib/product';
import type { Op } from '../lib/profileDiff';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';
import { BackendError, type AdminRetention, type Backend, type BinEntry, type CodeSent, type SecurityState, type SignInMethods, type SignUpInput, type Snapshot, type TwoStepSetup } from './Backend';
import { normEmail, normPhone } from './local';
import {
  DEFAULT_PREFS,
  type Observation,
  type UsageDay,
  type Account,
  type AccountPrefs,
  type ChildRecord,
  type Device,
  type HistoryEntry,
  type Intake,
  type Invitation,
  type Membership,
  type Notice,
  type ProfileSummary,
  type Proposal,
  type ProposalStatus,
  type Resource,
  type ResourceShare,
  type Role,
  type SaveResult,
  type Verification,
  type AdminBugs,
  type AdminLogEntry,
  type AdminOverview,
  type AdminProduct,
  type AdminRoadmapItem,
  type AdminVerification,
  type FeatureDay,
  type PushDevice,
  type RoadmapAudience,
  type RoadmapItem,
  type RoadmapStatus,
  type Feedback,
  type FeedbackKind,
} from './types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** An idea's title in the three languages (a missing one is an empty text). */
const titleOf = (t: unknown): Record<UiLang, string> => {
  const o = (t ?? {}) as Record<string, unknown>;
  const text = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '');
  return { fr: text('fr'), en: text('en'), ar: text('ar') };
};

const ms = (iso?: string | null) => (iso ? Date.parse(iso) : undefined);
const iso = (t?: number | null) => (t ? new Date(t).toISOString() : null);
const PENDING_ROLE = 'caa.pendingRole';

const isNetworkError = (e: { name?: string; message?: string; status?: number }) =>
  e.name === 'AuthRetryableFetchError' || e.status === 0 || /network|fetch|timed? ?out/i.test(e.message ?? '');
/**
 * The server could not answer (down, overloaded, paused, too many requests): that is "no internet"
 * for the app, never "signed out". Only a clear "this session or account does not exist" signs
 * out, because signing out erases the child's copy from the device.
 */
export const serverUnavailable = (e: { name?: string; message?: string; status?: number }) =>
  isNetworkError(e) || (e.status ?? 0) >= 500 || e.status === 429 || e.status === 408;

/** The person's name as Google or Apple gave it with the sign-in, if any. */
export function providerName(meta: Record<string, unknown> | null | undefined): string {
  const pick = (k: string) => (typeof meta?.[k] === 'string' ? (meta[k] as string).trim() : '');
  return (pick('full_name') || pick('name')).slice(0, 80);
}

/** Database / auth error → the app's short codes. */
function fail(error: { message?: string } | null | undefined): never {
  const m = error?.message ?? 'unknown';
  if (/row-level security|permission denied/i.test(m)) throw new BackendError('forbidden', m);
  if (/invalid login credentials/i.test(m)) throw new BackendError('wrong_credentials', m);
  if (/email not confirmed|phone not confirmed/i.test(m)) throw new BackendError('not_verified', m);
  if (/token has expired|otp.*expired/i.test(m)) throw new BackendError('code_expired', m);
  if (/token.*invalid|invalid.*otp/i.test(m)) throw new BackendError('code_invalid', m);
  if (/already registered|already exists/i.test(m)) throw new BackendError('account_exists', m);
  if (/password should be|weak password/i.test(m)) throw new BackendError('weak_password', m);
  // "For security purposes, you can only request this after 43 seconds": not a failure, a pause.
  if (/only request this after/i.test(m)) throw new BackendError('wait', m);
  if (/rate limit|too many/i.test(m)) throw new BackendError('too_many', m);
  if (/provider is not enabled|unsupported provider/i.test(m)) throw new BackendError('provider_off', m);
  if (/signups not allowed|anonymous sign-ins are disabled/i.test(m)) throw new BackendError('signup_off', m);
  if (/network|fetch/i.test(m)) throw new BackendError('offline', m);
  throw new BackendError(m.split(/\s/)[0], m);
}
/**
 * File storage error → the app's short codes (a child's photos and recordings). The storage
 * server answers with a status and a message; the database's own refusals (`media_quota`,
 * `media_type`, `too_large`, `too_many`: migration 20261118000300) arrive inside the message.
 */
export function mediaFail(error: unknown): never {
  const e = (error ?? {}) as { message?: string; status?: number; statusCode?: string; code?: string; name?: string };
  const m = e.message ?? 'unknown';
  const status = Number(e.status ?? e.statusCode ?? NaN);
  if (/media_quota/.test(m)) throw new BackendError('media_quota', m);
  if (/too_many/.test(m)) throw new BackendError('too_many', m);
  if (/already exists|duplicate/i.test(m) || status === 409 || e.code === 'ResourceAlreadyExists') throw new BackendError('exists', m);
  if (/too_large|maximum allowed size|too large/i.test(m) || status === 413 || e.code === 'EntityTooLarge') throw new BackendError('too_large', m);
  if (/media_type|mime type|not supported/i.test(m) || status === 415 || e.code === 'InvalidMimeType') throw new BackendError('media_type', m);
  if (/not.?found/i.test(m) || status === 404 || e.code === 'NoSuchKey') throw new BackendError('not_found', m);
  if (/row-level security|unauthori[sz]ed|access denied|permission|forbidden/i.test(m) || status === 403 || status === 401) throw new BackendError('forbidden', m);
  if (/network|fetch|timed? ?out|abort/i.test(m) || status === 0 || e.name === 'StorageUnknownError') throw new BackendError('offline', m);
  throw new BackendError('media_error', m);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The place of a child's file in the account; a name the app does not make never becomes a path. */
function mediaPath(profileId: string, name: string): string {
  if (!UUID.test(profileId) || !isSyncable(name)) throw new BackendError('invalid');
  return `${profileId}/${name}`;
}

async function data<T>(q: PromiseLike<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
  const { data: d, error } = await q;
  if (error) fail(error);
  return d as T;
}

/** The database has not received the newest update yet (the app may be published before it). */
const missingFunction = (e: unknown) => /could not find the function|does not exist|PGRST202/i.test(String((e as { message?: string })?.message ?? e));

/** What the app reads of a child's profile (the family's connection code is read through its function). */
const PROFILE_COLS = 'id, owner_id, name, age, intake, data, version, updated_at, updated_by';

/** The QR code Supabase gives is an SVG "data:" address: its text. */
export function svgOfDataUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.trim().startsWith('<svg')) return url;
  const m = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/s.exec(url);
  if (!m) return undefined;
  if (/;base64/.test(m[1] ?? '')) {
    try {
      return typeof atob === 'function' ? atob(m[2]) : Buffer.from(m[2], 'base64').toString('utf8');
    } catch {
      return undefined;
    }
  }
  try {
    return decodeURIComponent(m[2]);
  } catch {
    return m[2];
  }
}

const toProfileRec = (r: Row): ChildRecord => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  age: r.age ?? undefined,
  intake: r.intake ?? undefined,
  data: r.data,
  version: r.version,
  updatedAt: ms(r.updated_at) ?? 0,
  updatedBy: r.updated_by ?? '',
});
const toMember = (r: Row): Membership => ({
  profileId: r.profile_id,
  userId: r.user_id,
  displayName: r.display_name,
  email: r.email ?? undefined,
  role: r.role,
  level: r.level,
  perms: r.perms,
  status: r.status,
  expiresAt: ms(r.expires_at),
  createdAt: ms(r.created_at) ?? 0,
});
const toInvitation = (r: Row): Invitation => ({
  id: r.id,
  direction: r.direction,
  profileId: r.profile_id,
  childName: r.child_name,
  fromUserId: r.from_user_id,
  fromName: r.from_name,
  email: r.email ?? undefined,
  toUserId: r.to_user_id ?? undefined,
  name: r.name ?? undefined,
  code: r.code,
  role: r.role,
  level: r.level,
  perms: r.perms,
  message: r.message ?? undefined,
  status: r.status,
  createdAt: ms(r.created_at) ?? 0,
});
const toProposal = (r: Row): Proposal => ({
  id: r.id,
  profileId: r.profile_id,
  childName: r.child_name,
  authorId: r.author_id,
  authorName: r.author_name,
  authorRole: r.author_role,
  title: r.title,
  reason: r.reason ?? undefined,
  ops: r.ops,
  baseVersion: r.base_version,
  status: r.status,
  decisionNote: r.decision_note ?? undefined,
  createdAt: ms(r.created_at) ?? 0,
  decidedAt: ms(r.decided_at),
  decidedBy: r.decided_by ?? undefined,
});
const toHistory = (r: Row): HistoryEntry => ({
  id: r.id,
  profileId: r.profile_id,
  actorId: r.actor_id ?? '',
  actorName: r.actor_name,
  summary: r.summary,
  ops: r.ops,
  inverse: r.inverse,
  proposalId: r.proposal_id ?? undefined,
  createdAt: ms(r.created_at) ?? 0,
  undoneAt: ms(r.undone_at),
});
const toDevice = (r: Row): Device => ({
  id: r.id,
  profileId: r.profile_id,
  userId: r.user_id,
  name: r.name,
  kind: r.kind,
  platform: r.platform,
  appVersion: r.app_version || undefined,
  lastSyncedAt: ms(r.last_synced_at),
  lastBackupAt: ms(r.last_backup_at),
  pendingChanges: r.pending_changes,
  revoked: r.revoked,
  createdAt: ms(r.created_at) ?? 0,
});
const toVerification = (r: Row): Verification => ({
  userId: r.user_id,
  fullName: r.full_name,
  country: r.country,
  profession: r.profession,
  organization: r.organization ?? undefined,
  documents: r.documents ?? [],
  status: r.status,
  note: r.note ?? undefined,
  submittedAt: ms(r.submitted_at),
  decidedAt: ms(r.decided_at),
});
/** An observation's readable columns (its texts are sealed: read through list_observations). */
const OBSERVATION_COLS = 'id, profile_id, created_by, author_name, at, sample_t, utterance, function, context, partner, autonomy, result, note, created_at, updated_at';

const toObservation = (r: Row): Observation => ({
  id: r.id,
  profileId: r.profile_id,
  at: ms(r.at) ?? 0,
  sampleT: r.sample_t ?? undefined,
  utterance: r.utterance || undefined,
  function: r.function ?? undefined,
  context: r.context ?? undefined,
  partner: r.partner ?? undefined,
  autonomy: r.autonomy ?? undefined,
  result: r.result ?? undefined,
  note: r.note || undefined,
  createdBy: r.created_by ?? '',
  authorName: r.author_name ?? '',
  createdAt: ms(r.created_at) ?? 0,
});

const toNotice = (r: Row): Notice => ({
  id: r.id,
  userId: r.user_id,
  kind: r.kind,
  text: r.text,
  profileId: r.profile_id ?? undefined,
  refId: r.ref_id ?? undefined,
  createdAt: ms(r.created_at) ?? 0,
  read: r.read,
});
const toShare = (r: Row): ResourceShare => ({
  userId: r.user_id ?? undefined,
  profileId: r.profile_id ?? undefined,
  mode: r.mode,
  sharedBy: r.shared_by,
  sharedAt: ms(r.shared_at) ?? 0,
});
const toResource = (r: Row, shares: Row[]): Resource => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  kind: r.kind,
  title: r.title,
  profileId: r.profile_id ?? undefined,
  data: r.data,
  shares: shares.filter((s) => s.resource_id === r.id).map(toShare),
  createdAt: ms(r.created_at) ?? 0,
  updatedAt: ms(r.updated_at) ?? 0,
});

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;

  /**
   * `storageKey`: where the login is kept on the device (tests use one per person).
   * `fetch`: how requests reach the internet (tests running outside the app bring their own).
   */
  constructor(
    private url: string,
    private anonKey: string,
    private opts: { storageKey?: string; fetch?: typeof fetch } = {},
  ) {
    this.sb = createClient(url, anonKey, {
      ...(opts.fetch ? { global: { fetch: opts.fetch } } : {}),
      auth: {
        // On the device, or for this visit only: the person's choice at sign-in ("Keep me logged in").
        storage: sessionStore,
        ...(opts.storageKey ? { storageKey: opts.storageKey } : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
  }

  private async uid(): Promise<string> {
    const { data: d } = await this.sb.auth.getUser();
    if (!d.user) throw new BackendError('not_signed_in');
    return d.user.id;
  }

  // ── Accounts ──

  async currentAccount(): Promise<Account | null> {
    // No internet is not "signed out": the app then keeps working from the device copy.
    const { data: s, error: se } = await this.sb.auth.getSession();
    if (se && serverUnavailable(se)) throw new BackendError('offline', se.message);
    if (!s.session) return null;
    const { data: d, error } = await this.sb.auth.getUser();
    if (error) {
      if (serverUnavailable(error)) throw new BackendError('offline', error.message);
      return null;
    }
    const u = d.user;
    if (!u) return null;
    // The account's row: if the database cannot answer now, the app keeps working from the device.
    let row = await data<Row | null>(this.sb.from('accounts').select('*').eq('id', u.id).maybeSingle()).catch((e: unknown) => {
      throw new BackendError('offline', String((e as Error)?.message ?? e));
    });
    // Google / Apple accounts are created without a role: apply the one chosen before signing in.
    const pending = await AsyncStorage.getItem(PENDING_ROLE);
    if (row && (pending === 'parent' || pending === 'pro') && row.role !== pending && Date.now() - (ms(row.created_at) ?? 0) < 10 * 60 * 1000) {
      // Accepted by the database only for a brand-new account that has done nothing yet.
      const { data: chosen } = await this.sb.rpc('choose_role', { p_role: pending });
      if (chosen && (chosen as Row).id) row = chosen as Row;
    }
    if (pending) await AsyncStorage.removeItem(PENDING_ROLE);
    // Google gives the person's name with the sign-in: it becomes the account's name, once.
    const given = providerName(u.user_metadata);
    if (row && !row.display_name && given) {
      row = (await data<Row | null>(this.sb.from('accounts').update({ display_name: given }).eq('id', u.id).select().maybeSingle())) ?? row;
    }
    const provider = u.is_anonymous ? 'device' : ((u.app_metadata?.provider as Account['provider']) ?? (u.email ? 'email' : 'phone'));
    return {
      id: u.id,
      role: (row?.role as Role) ?? 'parent',
      displayName: row?.display_name ?? '',
      email: u.email ?? undefined,
      phone: u.phone || undefined,
      provider: provider === 'google' || provider === 'apple' || provider === 'phone' || provider === 'device' ? provider : 'email',
      verified: !!(u.email_confirmed_at || u.phone_confirmed_at),
      createdAt: ms(u.created_at) ?? 0,
      prefs: { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) },
    };
  }

  private async me(): Promise<Account> {
    const a = await this.currentAccount();
    if (!a) throw new BackendError('not_signed_in');
    return a;
  }

  async signUp(input: SignUpInput): Promise<CodeSent> {
    const email = normEmail(input.email);
    const phone = normPhone(input.phone);
    const options = { data: { role: input.role, display_name: input.displayName.trim() } };
    if (!email && !phone) throw new BackendError('missing_contact');
    const { data: d, error } = email
      ? await this.sb.auth.signUp({ email, password: input.password, options })
      : await this.sb.auth.signUp({ phone: phone!, password: input.password, options });
    if (error) fail(error);
    // An address already in use comes back without identities (Supabase hides it on purpose).
    if (d.user && !d.user.identities?.length) throw new BackendError('account_exists');
    // "Confirm email" turned off in Supabase: signed in at once, no code to type.
    return { sentTo: (email ?? phone)!, signedIn: !!d.session };
  }

  async verifyCode(target: { email?: string; phone?: string }, code: string): Promise<Account> {
    const email = normEmail(target.email);
    const { error } = email
      ? await this.sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
      : await this.sb.auth.verifyOtp({ phone: normPhone(target.phone)!, token: code.trim(), type: 'sms' });
    if (error) fail(error);
    return this.me();
  }

  async resendCode(target: { email?: string; phone?: string }): Promise<CodeSent> {
    const email = normEmail(target.email);
    const { error } = email
      ? await this.sb.auth.resend({ type: 'signup', email })
      : await this.sb.auth.resend({ type: 'sms', phone: normPhone(target.phone)! });
    if (error) fail(error);
    return { sentTo: (email ?? normPhone(target.phone))! };
  }

  async signIn(input: { email?: string; phone?: string; password: string }): Promise<Account> {
    const email = normEmail(input.email);
    const { error } = email
      ? await this.sb.auth.signInWithPassword({ email, password: input.password })
      : await this.sb.auth.signInWithPassword({ phone: normPhone(input.phone)!, password: input.password });
    if (error) fail(error);
    return this.me();
  }

  private methods?: Promise<SignInMethods>;
  /**
   * Asks the server which sign-in methods are turned on (public information, no account needed).
   * If the answer cannot be read, only e-mail is offered: a button must never lead to an error page.
   */
  signInMethods(): Promise<SignInMethods> {
    return (this.methods ??= (this.opts.fetch ?? fetch)(`${this.url}/auth/v1/settings`, { headers: { apikey: this.anonKey } })
      .then((r) => r.json() as Promise<{ external?: Record<string, boolean> }>)
      .then((j) => ({ google: !!j.external?.google, apple: !!j.external?.apple, phone: !!j.external?.phone }))
      .catch(() => {
        this.methods = undefined;
        return { google: false, apple: false, phone: false };
      }));
  }

  async signInWithProvider(provider: 'google' | 'apple', role: Role): Promise<Account> {
    if (!(await this.signInMethods())[provider]) throw new BackendError('provider_off');
    await AsyncStorage.setItem(PENDING_ROLE, role);
    if (provider === 'apple' && Platform.OS === 'ios') {
      // Native "Sign in with Apple" sheet, then the token is exchanged with Supabase.
      const Apple = await import('expo-apple-authentication');
      const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL] });
      if (!cred.identityToken) throw new BackendError('cancelled');
      const { error } = await this.sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (error) fail(error);
      // Apple gives the name only the very first time, and only to the app: keep it now.
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
      if (name) await this.sb.auth.updateUser({ data: { full_name: name } }).catch(() => {});
      return this.me();
    }
    if (Platform.OS === 'web') {
      // The page goes to Google / Apple and comes back signed in.
      const { error } = await this.sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href.split('#')[0] } });
      if (error) fail(error);
      throw new BackendError('redirecting');
    }
    // Phones / tablets: the provider's page opens in a secure browser sheet, then returns a code.
    const redirectTo = Linking.createURL('auth');
    const { data: d, error } = await this.sb.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !d?.url) fail(error);
    const res = await WebBrowser.openAuthSessionAsync(d.url, redirectTo);
    if (res.type !== 'success') throw new BackendError('cancelled');
    const authCode = new URL(res.url).searchParams.get('code');
    if (!authCode) throw new BackendError('cancelled');
    const { error: e2 } = await this.sb.auth.exchangeCodeForSession(authCode);
    if (e2) fail(e2);
    return this.me();
  }

  async signOut(): Promise<void> {
    // "local": this device forgets the session even when the server cannot be reached (a tablet
    // without Wi-Fi must not stay signed in), and the person's other devices stay signed in.
    const { error } = await this.sb.auth.signOut({ scope: 'local' });
    if (error) {
      // Last resort: remove the stored session ourselves (secure storage and ordinary storage).
      const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
      await AsyncStorage.multiRemove(keys.filter((k) => /^sb-.*-auth-token/.test(k) || k === this.opts.storageKey)).catch(() => {});
      const key = this.opts.storageKey ?? `sb-${new URL(this.url).hostname.split('.')[0]}-auth-token`;
      for (const k of [key, `${key}-code-verifier`, `${key}-user`]) await sessionStore.removeItem(k).catch(() => {});
    }
    await AsyncStorage.removeItem(PENDING_ROLE).catch(() => {});
  }

  async requestPasswordReset(target: { email?: string; phone?: string }): Promise<CodeSent> {
    const email = normEmail(target.email);
    const { error } = email
      ? await this.sb.auth.resetPasswordForEmail(email)
      : await this.sb.auth.signInWithOtp({ phone: normPhone(target.phone)!, options: { shouldCreateUser: false } });
    if (error) fail(error);
    return { sentTo: (email ?? normPhone(target.phone))! };
  }

  async resetPassword(target: { email?: string; phone?: string }, code: string, password: string): Promise<void> {
    const email = normEmail(target.email);
    const { error } = email
      ? await this.sb.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
      : await this.sb.auth.verifyOtp({ phone: normPhone(target.phone)!, token: code.trim(), type: 'sms' });
    if (error) fail(error);
    const { error: e2 } = await this.sb.auth.updateUser({ password });
    if (e2) fail(e2);
  }

  async checkResetCode(target: { email?: string; phone?: string }, code: string): Promise<void> {
    // The same check as a password reset, without choosing a new password: the session simply
    // starts again for the same account.
    const email = normEmail(target.email);
    const { error } = email
      ? await this.sb.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
      : await this.sb.auth.verifyOtp({ phone: normPhone(target.phone)!, token: code.trim(), type: 'sms' });
    if (error) fail(error);
  }

  async checkPassword(password: string): Promise<void> {
    // Signing in again as the same account, with its own address: the session starts again,
    // nothing else changes.
    const me = await this.me();
    if (me.provider === 'device') throw new BackendError('forbidden');
    const email = normEmail(me.email);
    const phone = normPhone(me.phone);
    if (!email && !phone) throw new BackendError('missing_contact');
    const { error } = email
      ? await this.sb.auth.signInWithPassword({ email, password })
      : await this.sb.auth.signInWithPassword({ phone: phone!, password });
    if (error) fail(error);
  }

  async changePassword(current: string, next: string): Promise<void> {
    const me = await this.me();
    const check = me.email
      ? await this.sb.auth.signInWithPassword({ email: me.email, password: current })
      : await this.sb.auth.signInWithPassword({ phone: me.phone!, password: current });
    if (check.error) fail(check.error);
    const { error } = await this.sb.auth.updateUser({ password: next });
    if (error) fail(error);
  }

  async updateAccount(patch: { displayName?: string; email?: string; phone?: string; prefs?: Partial<AccountPrefs> }): Promise<Account> {
    const me = await this.me();
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName.trim();
    if (patch.prefs) row.prefs = { ...me.prefs, ...patch.prefs };
    if (Object.keys(row).length) await data(this.sb.from('accounts').update(row).eq('id', me.id));
    // Changing the email / phone sends a confirmation code to the new one.
    if (patch.email !== undefined || patch.phone !== undefined) {
      const { error } = await this.sb.auth.updateUser({ email: normEmail(patch.email), phone: normPhone(patch.phone) });
      if (error) fail(error);
    }
    return this.me();
  }

  async deleteAccount(): Promise<void> {
    // The person's own documents (diploma, identity) are deleted first: files are not rows,
    // they would stay behind.
    const uid = await this.uid();
    const { data: files } = await this.sb.storage.from('verification-docs').list(uid, { limit: 100 });
    if (files?.length) await this.sb.storage.from('verification-docs').remove(files.map((f) => `${uid}/${f.name}`));
    await data(this.sb.rpc('delete_account'));
    await this.signOut();
  }

  // ── Two-step sign-in and fresh proofs ──

  async security(): Promise<SecurityState> {
    try {
      const r = await data<Row>(this.sb.rpc('my_security'));
      return { team: !!r.team, twoStep: !!r.twoStep, level: r.level === 'aal2' ? 'aal2' : 'aal1' };
    } catch (e) {
      if (!missingFunction(e)) throw e;
      // Database not updated yet: the same answers from the sign-in service.
      const { data: f } = await this.sb.auth.mfa.listFactors();
      const { data: l } = await this.sb.auth.mfa.getAuthenticatorAssuranceLevel();
      const team = !!(await data<boolean>(this.sb.rpc('is_admin')).catch(() => false));
      return { team, twoStep: !!f?.totp?.length, level: l?.currentLevel === 'aal2' ? 'aal2' : 'aal1' };
    }
  }

  async twoStepStart(): Promise<TwoStepSetup> {
    // A setting-up left half-way has no use: it is removed first (its name must be unique).
    const { data: f } = await this.sb.auth.mfa.listFactors();
    for (const old of f?.all ?? []) {
      if (old.status !== 'verified') await this.sb.auth.mfa.unenroll({ factorId: old.id }).catch(() => {});
    }
    const { data: d, error } = await this.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Empower Communication', issuer: 'Empower Communication' });
    if (error || !d) fail(error);
    return { factorId: d.id, secret: d.totp.secret, uri: d.totp.uri, qrSvg: svgOfDataUrl(d.totp.qr_code) };
  }

  async twoStepConfirm(factorId: string, code: string): Promise<void> {
    const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
    if (error) throw new BackendError('code_invalid', error.message);
  }

  private async verifiedFactor(): Promise<string> {
    const { data: f, error } = await this.sb.auth.mfa.listFactors();
    if (error) fail(error);
    const id = f?.totp?.[0]?.id;
    if (!id) throw new BackendError('two_step_off');
    return id;
  }

  async twoStepCode(code: string): Promise<void> {
    const factorId = await this.verifiedFactor();
    const { error } = await this.sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
    if (error) throw new BackendError('code_invalid', error.message);
  }

  async twoStepOff(code: string): Promise<void> {
    await this.twoStepCode(code);
    const { data: f } = await this.sb.auth.mfa.listFactors();
    for (const factor of f?.all ?? []) {
      const { error } = await this.sb.auth.mfa.unenroll({ factorId: factor.id });
      if (error) fail(error);
    }
    // A new session without the second step: the token says so at once.
    await this.sb.auth.refreshSession().catch(() => {});
  }

  // ── Profiles ──

  async listProfiles(): Promise<ProfileSummary[]> {
    const rows = await data<Row[]>(this.sb.rpc('list_profiles'));
    return rows.map((r) => ({ id: r.id, name: r.name, age: r.age ?? undefined, ownerId: r.owner_id, access: r.access, level: r.level, updatedAt: ms(r.updated_at) ?? 0 }));
  }

  async createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile; consent?: number }): Promise<ChildRecord> {
    const uid = await this.uid();
    // The parent's consent is kept by the database first; the profile is refused without it.
    if (input.consent) await this.giveConsent(input.consent);
    const r = await data<Row>(
      this.sb.from('profiles').insert({ owner_id: uid, name: input.name.trim(), age: input.age ?? null, intake: input.intake ?? null, data: input.data }).select(PROFILE_COLS).single(),
    );
    return toProfileRec(r);
  }

  async giveConsent(version: number): Promise<void> {
    try {
      await data(this.sb.rpc('give_consent', { p_kind: 'child_data', p_version: version }));
    } catch (e) {
      if (!missingFunction(e)) throw e;
    }
  }

  async exportMyData(): Promise<unknown> {
    return data<unknown>(this.sb.rpc('export_my_data'));
  }

  async getProfile(id: string): Promise<ChildRecord> {
    const r = await data<Row | null>(this.sb.from('profiles').select(PROFILE_COLS).eq('id', id).maybeSingle());
    if (!r) throw new BackendError('forbidden');
    return toProfileRec(r);
  }

  async profileVersion(id: string): Promise<number> {
    // One column, same reading rule as the whole row: no content leaves the database.
    const r = await data<Row | null>(this.sb.from('profiles').select('version').eq('id', id).maybeSingle());
    if (!r) throw new BackendError('forbidden');
    return r.version;
  }

  async saveProfile(id: string, profile: Profile, baseVersion: number): Promise<SaveResult> {
    const r = await data<Row>(this.sb.rpc('save_profile', { p_id: id, p_data: profile, p_base: baseVersion }));
    return r.ok ? { ok: true, version: r.version } : { ok: false, conflict: toProfileRec(r.conflict) };
  }

  async deleteProfile(id: string): Promise<void> {
    // Into the family's bin (30 days); the database asks for a fresh proof first.
    try {
      await data(this.sb.rpc('delete_profile', { p_id: id }));
    } catch (e) {
      if (!missingFunction(e)) throw e;
      await data(this.sb.from('profiles').delete().eq('id', id));
    }
  }

  async listBin(): Promise<BinEntry[]> {
    try {
      const rows = await data<Row[]>(this.sb.rpc('list_bin'));
      return rows.map((r) => ({ id: r.id, name: r.name, deletedAt: ms(r.deleted_at) ?? 0, eraseAt: ms(r.erase_at) ?? 0 }));
    } catch (e) {
      if (missingFunction(e)) return [];
      throw e;
    }
  }

  async restoreProfile(id: string): Promise<void> {
    await data(this.sb.rpc('restore_profile', { p_id: id }));
  }

  async listSnapshots(profileId: string): Promise<Snapshot[]> {
    try {
      const rows = await data<Row[]>(this.sb.rpc('list_snapshots', { p_id: profileId }));
      return rows.map((r) => ({ id: r.id, createdAt: ms(r.created_at) ?? 0, reason: r.reason, version: r.version, words: r.words }));
    } catch (e) {
      if (missingFunction(e)) return [];
      throw e;
    }
  }

  async takeSnapshot(profileId: string): Promise<void> {
    await data(this.sb.rpc('take_snapshot', { p_id: profileId }));
  }

  async restoreSnapshot(snapshotId: string): Promise<number> {
    return data<number>(this.sb.rpc('restore_snapshot', { p_snap: snapshotId }));
  }

  async myAccess(profileId: string) {
    const rows = await data<Row[]>(this.sb.rpc('access_of', { p_profile: profileId }));
    const r = rows[0];
    return r ? { owner: r.owner, role: r.role as CollaboratorRole | 'owner', level: r.level as AccessLevel, perms: r.perms as PermissionSet } : null;
  }

  // ── Team ──

  async listMembers(profileId: string): Promise<Membership[]> {
    // Through the database's function: the addresses only for the family and the team's managers.
    try {
      return (await data<Row[]>(this.sb.rpc('list_members', { p_id: profileId }))).map(toMember);
    } catch (e) {
      if (!missingFunction(e)) throw e;
      return (await data<Row[]>(this.sb.from('members').select('*').eq('profile_id', profileId))).map(toMember);
    }
  }

  async updateMember(profileId: string, userId: string, patch: { level?: AccessLevel; perms?: PermissionSet; role?: CollaboratorRole; expiresAt?: number | null }): Promise<void> {
    await data(
      this.sb.rpc('update_member', {
        p_id: profileId,
        p_user: userId,
        p_level: patch.level ?? null,
        p_perms: patch.perms ?? null,
        p_role: patch.role ?? null,
        p_expires: iso(patch.expiresAt),
        p_set_expiry: patch.expiresAt !== undefined,
      }),
    );
  }

  async revokeMember(profileId: string, userId: string): Promise<void> {
    await data(this.sb.rpc('revoke_member', { p_id: profileId, p_user: userId }));
  }

  async invite(profileId: string, input: { email?: string; name?: string; role: CollaboratorRole; level: AccessLevel; perms: PermissionSet }): Promise<Invitation> {
    const r = await data<Row>(
      this.sb.rpc('invite', { p_id: profileId, p_email: normEmail(input.email) ?? null, p_name: input.name ?? null, p_role: input.role, p_level: input.level, p_perms: input.perms }),
    );
    return toInvitation(r);
  }

  async profileInvitations(profileId: string): Promise<Invitation[]> {
    return (await data<Row[]>(this.sb.from('invitations').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }))).map(toInvitation);
  }

  async myInvitations(): Promise<{ received: Invitation[]; sent: Invitation[] }> {
    const me = await this.me();
    const rows = (await data<Row[]>(this.sb.from('invitations').select('*').order('created_at', { ascending: false }))).map(toInvitation);
    return {
      received: rows.filter((i) => i.direction === 'invite' && (i.toUserId === me.id || (!!me.email && i.email === me.email))),
      sent: rows.filter((i) => i.direction === 'request' && i.fromUserId === me.id),
    };
  }

  async respondInvitation(id: string, accept: boolean): Promise<void> {
    await data(this.sb.rpc('respond_invitation', { p_inv: id, p_accept: accept }));
  }

  async acceptInvitationCode(code: string): Promise<Invitation> {
    const r = await data<Row | null>(this.sb.rpc('accept_invitation_code', { p_code: code }));
    if (!r?.id) throw new BackendError('code_invalid');
    return toInvitation(r);
  }

  async cancelInvitation(id: string): Promise<void> {
    await data(this.sb.rpc('cancel_invitation', { p_inv: id }));
  }

  async resendInvitation(id: string): Promise<Invitation> {
    return toInvitation(await data<Row>(this.sb.rpc('resend_invitation', { p_inv: id })));
  }

  async connectionCode(profileId: string, renew = false): Promise<string> {
    return data<string>(this.sb.rpc('connection_code', { p_id: profileId, p_renew: renew }));
  }

  async requestConnection(code: string, input: { role: CollaboratorRole; level: AccessLevel; perms: PermissionSet; message?: string }): Promise<Invitation> {
    const r = await data<Row | null>(
      this.sb.rpc('request_connection', { p_code: code, p_role: input.role, p_level: input.level, p_perms: input.perms, p_message: input.message ?? null }),
    );
    if (!r?.id) throw new BackendError('code_invalid');
    return toInvitation(r);
  }

  async approveRequest(id: string, grant: { level: AccessLevel; perms: PermissionSet }): Promise<void> {
    await data(this.sb.rpc('approve_request', { p_inv: id, p_level: grant.level, p_perms: grant.perms }));
  }

  // ── Proposals ──

  async listProposals(filter: { profileId: string } | { mine: true }): Promise<Proposal[]> {
    let q = this.sb.from('proposals').select('*');
    q = 'mine' in filter ? q.eq('author_id', await this.uid()) : q.eq('profile_id', filter.profileId);
    return (await data<Row[]>(q.order('created_at', { ascending: false }))).map(toProposal);
  }

  async createProposal(profileId: string, input: { title: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal> {
    return toProposal(
      await data<Row>(this.sb.rpc('create_proposal', { p_id: profileId, p_title: input.title, p_reason: input.reason ?? null, p_ops: input.ops, p_base: input.baseVersion })),
    );
  }

  async updateProposal(id: string, input: { title?: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal> {
    return toProposal(
      await data<Row>(this.sb.rpc('update_proposal', { p_prop: id, p_title: input.title ?? null, p_reason: input.reason ?? null, p_ops: input.ops, p_base: input.baseVersion })),
    );
  }

  async setProposalStatus(id: string, status: ProposalStatus, note?: string): Promise<void> {
    await data(this.sb.rpc('set_proposal_status', { p_prop: id, p_status: status, p_note: note ?? null }));
  }

  // ── History ──

  async listHistory(profileId: string): Promise<HistoryEntry[]> {
    return (await data<Row[]>(this.sb.from('history').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }))).map(toHistory);
  }

  async addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'actorId' | 'actorName'>): Promise<HistoryEntry> {
    return toHistory(
      await data<Row>(
        this.sb.rpc('add_history', { p_id: entry.profileId, p_summary: entry.summary, p_ops: entry.ops, p_inverse: entry.inverse, p_proposal: entry.proposalId ?? null }),
      ),
    );
  }

  async markUndone(id: string): Promise<void> {
    await data(this.sb.rpc('mark_undone', { p_hist: id }));
  }

  // ── Devices ──

  async listDevices(profileId: string): Promise<Device[]> {
    return (await data<Row[]>(this.sb.from('devices').select('*').eq('profile_id', profileId))).map(toDevice);
  }

  async registerDevice(profileId: string, input: { id: string; name: string; kind: Device['kind']; platform: string; appVersion?: string }): Promise<Device> {
    const args = { p_id: profileId, p_dev: input.id, p_name: input.name, p_kind: input.kind, p_platform: input.platform };
    return toDevice(await data<Row>(this.sb.rpc('register_device', { ...args, p_version: input.appVersion ?? '' })));
  }

  async reportSync(profileId: string, deviceId: string, info: { synced?: boolean; backedUp?: boolean; pendingChanges?: number }): Promise<void> {
    await data(
      this.sb.rpc('report_sync', { p_id: profileId, p_dev: deviceId, p_synced: !!info.synced, p_backed: !!info.backedUp, p_pending: info.pendingChanges ?? null }),
    );
  }

  async revokeDevice(profileId: string, deviceId: string): Promise<void> {
    await data(this.sb.rpc('revoke_device', { p_id: profileId, p_dev: deviceId }));
  }

  async createPairingCode(profileId: string, access: 'full' | 'use'): Promise<{ code: string; expiresAt: number }> {
    const rows = await data<Row[]>(this.sb.rpc('create_pairing_code', { p_id: profileId, p_access: access }));
    return { code: rows[0].code, expiresAt: ms(rows[0].expires_at) ?? Date.now() };
  }

  async redeemPairingCode(code: string, device: { id: string; name: string; platform: string }): Promise<string> {
    const { data: d } = await this.sb.auth.getSession();
    if (!d.session) {
      // The new tablet gets its own anonymous login, limited to this child's profile.
      const { error } = await this.sb.auth.signInAnonymously();
      if (error) fail(error);
    }
    const id = await data<string | null>(this.sb.rpc('redeem_pairing_code', { p_code: code, p_dev: device.id, p_name: device.name, p_platform: device.platform }));
    if (!id) throw new BackendError('code_invalid');
    return id;
  }

  // ── Verification ──

  async getVerification(): Promise<Verification | null> {
    const r = await data<Row | null>(this.sb.from('verifications').select('*').eq('user_id', await this.uid()).maybeSingle());
    return r ? toVerification(r) : null;
  }

  async saveVerification(v: Omit<Verification, 'userId' | 'status' | 'submittedAt' | 'decidedAt'>): Promise<Verification> {
    const uid = await this.uid();
    const cur = await this.getVerification();
    if (cur && (cur.status === 'pending' || cur.status === 'verified')) throw new BackendError('verification_locked');
    const row = {
      user_id: uid,
      full_name: v.fullName,
      country: v.country,
      profession: v.profession,
      organization: v.organization ?? null,
      documents: v.documents,
    };
    // A file taken out of the list is deleted from the storage too (it would stay there for ever).
    const kept = new Set(v.documents.map((d) => d.ref));
    const gone = (cur?.documents ?? []).map((d) => d.ref).filter((ref) => !kept.has(ref) && ref.startsWith(`${uid}/`));
    if (gone.length) await this.sb.storage.from('verification-docs').remove(gone);
    return toVerification(await data<Row>(this.sb.from('verifications').upsert(row).select().single()));
  }

  async uploadVerificationDocument(file: { uri: string; name: string; mimeType?: string }): Promise<string> {
    const uid = await this.uid();
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const body = await (await fetch(file.uri)).arrayBuffer();
    // The storage only accepts pictures and PDF: the kind is read from the name when the picker did not give it.
    const byName: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
    const contentType = file.mimeType && file.mimeType !== 'application/octet-stream' ? file.mimeType : (byName[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream');
    const { error } = await this.sb.storage.from('verification-docs').upload(path, body, { contentType });
    if (error) fail(error);
    return path;
  }

  async submitVerification(): Promise<Verification> {
    return toVerification(await data<Row>(this.sb.rpc('submit_verification')));
  }

  // ── A child's photos and recordings ──

  async uploadMedia(profileId: string, name: string, body: ArrayBuffer | Blob, contentType: string): Promise<void> {
    const path = mediaPath(profileId, name);
    // A name is never used twice for different files: a file that is already there is not replaced.
    const { error } = await this.sb.storage.from('profile-media').upload(path, body, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) mediaFail(error);
  }

  async mediaUrl(profileId: string, name: string): Promise<string> {
    const { data: d, error } = await this.sb.storage.from('profile-media').createSignedUrl(mediaPath(profileId, name), 300);
    if (error || !d) mediaFail(error);
    return d.signedUrl;
  }

  async listMedia(profileId: string): Promise<{ name: string; size: number; createdAt: number }[]> {
    if (!UUID.test(profileId)) throw new BackendError('invalid');
    const out: { name: string; size: number; createdAt: number }[] = [];
    for (let offset = 0; offset < 5000; offset += 1000) {
      const { data: page, error } = await this.sb.storage.from('profile-media').list(profileId, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) mediaFail(error);
      for (const f of page ?? []) {
        if (!f.id || !isSyncable(f.name)) continue;
        out.push({ name: f.name, size: Number(f.metadata?.size ?? 0), createdAt: ms(f.created_at) ?? 0 });
      }
      if ((page ?? []).length < 1000) break;
    }
    return out;
  }

  async removeMedia(profileId: string, names: string[]): Promise<void> {
    const paths = names.map((n) => mediaPath(profileId, n));
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await this.sb.storage.from('profile-media').remove(paths.slice(i, i + 100));
      if (error) mediaFail(error);
    }
  }

  // ── Messages to the app's team ──

  async sendFeedback(input: { kind: FeedbackKind; text: string; platform: string; appVersion: string }): Promise<void> {
    const send = (kind: string, text: string) => data(this.sb.rpc('send_feedback', { p_kind: kind, p_text: text, p_platform: input.platform, p_version: input.appVersion }));
    try {
      await send(input.kind, input.text);
    } catch (e) {
      // A database that was not updated yet only knows "problem", "idea" and "other": the message
      // is not lost, it is filed under the nearest of them with its subject written first.
      if (input.kind === 'problem' || input.kind === 'other' || !(e instanceof BackendError) || !/kind/.test(e.message)) throw e;
      await send(input.kind === 'access' ? 'problem' : 'idea', `[${input.kind}] ${input.text}`);
    }
  }

  async roadmapList(): Promise<RoadmapItem[]> {
    return (await data<Row[]>(this.sb.rpc('roadmap_list'))).map((r) => ({ id: r.id, title: titleOf(r.title), status: r.status, votes: r.votes ?? 0, mine: !!r.mine }));
  }

  async roadmapVote(id: string, on: boolean): Promise<void> {
    await data(this.sb.rpc('roadmap_vote', { p_item: id, p_on: on }));
  }

  // ── Figures for the app's team (the database checks the family's agreement and keeps known names and numbers only) ──

  async saveFeatureDay(profileId: string, d: FeatureDay): Promise<void> {
    await data(
      this.sb.rpc('save_feature_day', { p_id: profileId, p_dev: d.deviceId, p_day: d.day, p_counts: d.counts, p_platform: d.platform, p_form: d.form, p_version: d.appVersion }),
    );
  }

  async reportProblems(profileId: string, items: (ProblemItem & { platform: string; form: string; version: string })[]): Promise<void> {
    await data(this.sb.rpc('report_problems', { p_id: profileId, p_items: items }));
  }

  // ── Back office (every function checks, in the database, that the account is in the app's team) ──

  async adminProduct(): Promise<AdminProduct> {
    return data<AdminProduct>(this.sb.rpc('admin_product'));
  }

  async adminBugs(): Promise<AdminBugs> {
    return data<AdminBugs>(this.sb.rpc('admin_bugs'));
  }

  async adminRetention(): Promise<AdminRetention> {
    const r = await data<Row>(this.sb.rpc('admin_retention'));
    const n = (k: string) => Number(r?.[k] ?? 0) || 0;
    return { inactiveAccounts: n('inactiveAccounts'), inBin: n('inBin'), filesWaiting: n('filesWaiting'), twoStepTeam: n('twoStepTeam'), team: n('team'), consents: n('consents') };
  }

  async adminRoadmap(): Promise<AdminRoadmapItem[]> {
    return (await data<Row[]>(this.sb.rpc('admin_roadmap'))).map((r) => ({
      id: r.id,
      title: titleOf(r.title),
      status: r.status,
      votes: r.votes ?? 0,
      parents: r.parents ?? 0,
      pros: r.pros ?? 0,
      createdAt: Date.parse(r.created_at),
      audience: r.audience === 'parent' || r.audience === 'pro' ? r.audience : 'all',
    }));
  }

  async adminRoadmapSave(input: { id?: string; title: Record<UiLang, string>; status: RoadmapStatus; audience?: RoadmapAudience }): Promise<void> {
    const base = { p_id: input.id ?? null, p_title: input.title, p_status: input.status };
    try {
      await data(this.sb.rpc('admin_roadmap_save', { ...base, p_audience: input.audience ?? null }));
    } catch (e) {
      // A server without the audience yet (migration 20261120000000 not run): the idea is for everyone.
      if (!missingFunction(e)) throw e;
      await data(this.sb.rpc('admin_roadmap_save', base));
    }
  }

  async isAdmin(): Promise<boolean> {
    // On the team (the back office itself also needs the two-step code: is_admin in the database).
    try {
      return !!(await data<boolean>(this.sb.rpc('is_team')));
    } catch (e) {
      if (!missingFunction(e)) throw e;
    }
    return !!(await data<boolean>(this.sb.rpc('is_admin')));
  }

  async adminVerifications(): Promise<AdminVerification[]> {
    return (await data<Row[]>(this.sb.rpc('admin_verifications'))).map((r) => ({
      ...toVerification(r),
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      accountName: r.account_name ?? '',
      accountCreatedAt: ms(r.account_created_at) ?? 0,
      children: r.children ?? 0,
    }));
  }

  async adminDecideVerification(userId: string, status: 'verified' | 'more_info' | 'rejected', note?: string): Promise<void> {
    // Checked here too, so that no file is deleted for a decision the database would then refuse.
    if (status !== 'verified' && !note?.trim()) throw new BackendError('note_required');
    if (status !== 'more_info') {
      // The identity document is deleted as soon as the request is accepted or refused.
      const v = (await this.adminVerifications()).find((x) => x.userId === userId);
      const ids = (v?.documents ?? []).filter((d) => d.kind === 'id' && d.ref.startsWith(`${userId}/`)).map((d) => d.ref);
      if (ids.length) {
        const { error } = await this.sb.storage.from('verification-docs').remove(ids);
        if (error) fail(error);
      }
    }
    await data(this.sb.rpc('admin_decide_verification', { p_user: userId, p_status: status, p_note: note ?? null }));
  }

  async adminDocumentUrl(userId: string, ref: string): Promise<string> {
    // Writes who opened which document, then asks for an address that stops working after 5 minutes.
    const path = await data<string>(this.sb.rpc('admin_open_document', { p_user: userId, p_ref: ref }));
    const { data: d, error } = await this.sb.storage.from('verification-docs').createSignedUrl(path, 300);
    if (error || !d) fail(error);
    return d.signedUrl;
  }

  async adminOverview(): Promise<AdminOverview> {
    return data<AdminOverview>(this.sb.rpc('admin_overview'));
  }

  async adminLog(): Promise<AdminLogEntry[]> {
    return (await data<Row[]>(this.sb.rpc('admin_history'))).map((r) => ({
      id: r.id,
      adminName: r.admin_name,
      action: r.action,
      targetName: r.target_name ?? undefined,
      detail: r.detail ?? undefined,
      createdAt: ms(r.created_at) ?? 0,
    }));
  }

  async adminFeedback(): Promise<Feedback[]> {
    return (await data<Row[]>(this.sb.rpc('admin_feedback'))).map((r) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      platform: r.platform,
      appVersion: r.app_version,
      status: r.status,
      createdAt: ms(r.created_at) ?? 0,
      fromName: r.from_name,
      fromRole: r.from_role,
      fromEmail: r.from_email ?? undefined,
    }));
  }

  async adminSetFeedback(id: string, status: 'new' | 'done'): Promise<void> {
    await data(this.sb.rpc('admin_set_feedback', { p_id: id, p_status: status }));
  }

  // ── Communication data (Suivi) ──

  async saveUsageDay(profileId: string, d: UsageDay): Promise<void> {
    // The database keeps only what the family's consent allows (save_usage_day).
    await data(this.sb.rpc('save_usage_day', { p_id: profileId, p_dev: d.deviceId, p_day: d.day, p_data: d }));
  }

  async listUsage(profileId: string, fromDay: string): Promise<UsageDay[]> {
    // The children's sentences are sealed in the database: read back through usage_of.
    try {
      return await data<UsageDay[]>(this.sb.rpc('usage_of', { p_id: profileId, p_from: fromDay }));
    } catch (e) {
      if (!missingFunction(e)) throw e;
    }
    const rows = await data<Row[]>(this.sb.from('usage_days').select('data').eq('profile_id', profileId).gte('day', fromDay));
    return rows.map((r) => r.data as UsageDay);
  }

  private aiAnswer: Promise<boolean> | null = null;
  private aiRetryAt = 0;
  /**
   * Is the server function "caa-ai" installed? Asked with the person's session (so the server's
   * own door check passes): the function refuses this kind of request with an answer of its own
   * ("wrong method"), which proves it is there; "not found" means it is not. When the browser
   * gets no readable answer (not installed, or no connection), the answer is "no" for five
   * minutes, then it is asked again.
   */
  aiReady(): Promise<boolean> {
    if (this.aiAnswer && (!this.aiRetryAt || Date.now() < this.aiRetryAt)) return this.aiAnswer;
    this.aiRetryAt = 0;
    const unsure = () => {
      this.aiRetryAt = Date.now() + 5 * 60 * 1000;
      return false;
    };
    this.aiAnswer = this.sb.functions
      .invoke('caa-ai', { method: 'GET' })
      .then(({ error }) => {
        if (!error) return true;
        const status = (error.context as { status?: number } | undefined)?.status;
        return typeof status === 'number' ? status !== 404 : unsure();
      })
      .catch(unsure);
    return this.aiAnswer;
  }

  async askAi(req: AiRequest, signal?: AbortSignal): Promise<unknown> {
    const { data: out, error } = await this.sb.functions.invoke('caa-ai', { body: req, signal, timeout: 120000 });
    if (error) throw new BackendError('offline', error.message);
    return out;
  }

  async deleteUsage(profileId: string): Promise<void> {
    await data(this.sb.from('usage_days').delete().eq('profile_id', profileId));
  }

  async listObservations(profileId: string): Promise<Observation[]> {
    // What the child said and the adult's note are sealed in the database: read back through list_observations.
    try {
      return (await data<Row[]>(this.sb.rpc('list_observations', { p_id: profileId }))).map(toObservation);
    } catch (e) {
      if (!missingFunction(e)) throw e;
    }
    const rows = await data<Row[]>(this.sb.from('observations').select('*').eq('profile_id', profileId).order('at', { ascending: false }));
    return rows.map(toObservation);
  }

  async saveObservation(o: Omit<Observation, 'id' | 'createdBy' | 'authorName' | 'createdAt'> & { id?: string }): Promise<Observation> {
    const me = await this.me();
    const row: Row = {
      profile_id: o.profileId,
      at: new Date(o.at).toISOString(),
      sample_t: o.sampleT ?? null,
      // '' clears a text (the database seals the texts and keeps them when a column is left out).
      utterance: o.utterance ?? '',
      function: o.function ?? null,
      context: o.context ?? null,
      partner: o.partner ?? null,
      autonomy: o.autonomy ?? null,
      result: o.result ?? null,
      note: o.note ?? '',
      updated_at: new Date().toISOString(),
    };
    const saved = o.id
      ? await data<Row>(this.sb.from('observations').update(row).eq('id', o.id).select(OBSERVATION_COLS).single())
      : await data<Row>(this.sb.from('observations').insert({ ...row, created_by: me.id, author_name: me.displayName }).select(OBSERVATION_COLS).single());
    // The database gives the sealed texts back empty: they are the ones just written.
    return toObservation({ ...saved, utterance: o.utterance, note: o.note });
  }

  async deleteObservation(id: string): Promise<void> {
    await data(this.sb.from('observations').delete().eq('id', id));
  }

  // ── Notifications ──

  async listNotices(): Promise<Notice[]> {
    return (await data<Row[]>(this.sb.from('notices').select('*').order('created_at', { ascending: false }).limit(100))).map(toNotice);
  }

  async markNoticesRead(ids?: string[]): Promise<void> {
    let q = this.sb.from('notices').update({ read: true }).eq('user_id', await this.uid());
    if (ids) q = q.in('id', ids);
    await data(q);
  }

  async pushKey(): Promise<string | null> {
    // A server that cannot send notifications (migration not run, function not deployed) or that
    // cannot be reached: no key, and the app offers nothing.
    try {
      const key = await data<string | null>(this.sb.rpc('push_key'));
      return typeof key === 'string' && key ? key : null;
    } catch {
      return null;
    }
  }

  async pushSubscribe(d: PushDevice): Promise<void> {
    await data(this.sb.rpc('push_subscribe', { p_endpoint: d.endpoint, p_p256dh: d.p256dh, p_auth: d.auth, p_lang: d.lang, p_tz: d.tz }));
  }

  async pushUnsubscribe(endpoint: string): Promise<void> {
    await data(this.sb.rpc('push_unsubscribe', { p_endpoint: endpoint }));
  }

  async boardSeen(profileId: string): Promise<void> {
    try {
      await data(this.sb.rpc('board_seen', { p_profile: profileId }));
    } catch (e) {
      if (!missingFunction(e)) throw e;
    }
  }

  // ── Library ──

  async listResources(): Promise<{ mine: Resource[]; sharedWithMe: Resource[] }> {
    const uid = await this.uid();
    const rows = await data<Row[]>(this.sb.from('resources').select('*').order('updated_at', { ascending: false }));
    const shares = await data<Row[]>(this.sb.from('resource_shares').select('*'));
    const all = rows.map((r) => toResource(r, shares));
    return { mine: all.filter((r) => r.ownerId === uid), sharedWithMe: all.filter((r) => r.ownerId !== uid) };
  }

  async saveResource(r: Omit<Resource, 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt' | 'shares'> & { shares?: ResourceShare[] }): Promise<Resource> {
    const me = await this.me();
    const exists = await data<Row | null>(this.sb.from('resources').select('id').eq('id', r.id).maybeSingle());
    const row: Row = { kind: r.kind, title: r.title, profile_id: r.profileId ?? null, data: r.data, updated_at: new Date().toISOString() };
    const saved = exists
      ? await data<Row>(this.sb.from('resources').update(row).eq('id', r.id).select().single())
      : await data<Row>(this.sb.from('resources').insert({ ...row, id: r.id, owner_id: me.id, owner_name: me.displayName }).select().single());
    return toResource(saved, []);
  }

  async deleteResource(id: string): Promise<void> {
    await data(this.sb.from('resources').delete().eq('id', id));
  }

  async shareResource(id: string, target: { email?: string; profileId?: string; mode: 'view' | 'edit' }): Promise<void> {
    await data(this.sb.rpc('share_resource', { p_res: id, p_email: normEmail(target.email) ?? null, p_profile: target.profileId ?? null, p_mode: target.mode }));
  }
}
