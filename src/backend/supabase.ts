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
import type { Profile } from '../model/types';
import type { Op } from '../lib/profileDiff';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';
import { BackendError, type Backend, type CodeSent, type SignUpInput } from './Backend';
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
} from './types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ms = (iso?: string | null) => (iso ? Date.parse(iso) : undefined);
const iso = (t?: number | null) => (t ? new Date(t).toISOString() : null);
const PENDING_ROLE = 'caa.pendingRole';

const isNetworkError = (e: { name?: string; message?: string; status?: number }) =>
  e.name === 'AuthRetryableFetchError' || e.status === 0 || /network|fetch|timed? ?out/i.test(e.message ?? '');

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
  if (/rate limit|too many/i.test(m)) throw new BackendError('too_many', m);
  if (/provider is not enabled|unsupported provider/i.test(m)) throw new BackendError('provider_off', m);
  if (/signups not allowed|anonymous sign-ins are disabled/i.test(m)) throw new BackendError('signup_off', m);
  if (/network|fetch/i.test(m)) throw new BackendError('offline', m);
  throw new BackendError(m.split(/\s/)[0], m);
}
async function data<T>(q: PromiseLike<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
  const { data: d, error } = await q;
  if (error) fail(error);
  return d as T;
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
const toObservation = (r: Row): Observation => ({
  id: r.id,
  profileId: r.profile_id,
  at: ms(r.at) ?? 0,
  sampleT: r.sample_t ?? undefined,
  utterance: r.utterance ?? undefined,
  function: r.function ?? undefined,
  context: r.context ?? undefined,
  partner: r.partner ?? undefined,
  autonomy: r.autonomy ?? undefined,
  result: r.result ?? undefined,
  note: r.note ?? undefined,
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
  constructor(url: string, anonKey: string, opts: { storageKey?: string; fetch?: typeof fetch } = {}) {
    this.sb = createClient(url, anonKey, {
      ...(opts.fetch ? { global: { fetch: opts.fetch } } : {}),
      auth: {
        storage: AsyncStorage,
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
    if (se && isNetworkError(se)) throw new BackendError('offline', se.message);
    if (!s.session) return null;
    const { data: d, error } = await this.sb.auth.getUser();
    if (error) {
      if (isNetworkError(error)) throw new BackendError('offline', error.message);
      return null;
    }
    const u = d.user;
    if (!u) return null;
    let row = await data<Row | null>(this.sb.from('accounts').select('*').eq('id', u.id).maybeSingle());
    // Google / Apple accounts are created without a role: apply the one chosen before signing in.
    const pending = await AsyncStorage.getItem(PENDING_ROLE);
    if (row && pending && row.role !== pending && Date.now() - (ms(row.created_at) ?? 0) < 10 * 60 * 1000) {
      row = await data<Row>(this.sb.from('accounts').update({ role: pending }).eq('id', u.id).select().single());
    }
    if (pending) await AsyncStorage.removeItem(PENDING_ROLE);
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

  async signInWithProvider(provider: 'google' | 'apple', role: Role): Promise<Account> {
    await AsyncStorage.setItem(PENDING_ROLE, role);
    if (provider === 'apple' && Platform.OS === 'ios') {
      // Native "Sign in with Apple" sheet, then the token is exchanged with Supabase.
      const Apple = await import('expo-apple-authentication');
      const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL] });
      if (!cred.identityToken) throw new BackendError('cancelled');
      const { error } = await this.sb.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (error) fail(error);
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
    await this.sb.auth.signOut();
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
    await data(this.sb.rpc('delete_account'));
    await this.sb.auth.signOut();
  }

  // ── Profiles ──

  async listProfiles(): Promise<ProfileSummary[]> {
    const rows = await data<Row[]>(this.sb.rpc('list_profiles'));
    return rows.map((r) => ({ id: r.id, name: r.name, age: r.age ?? undefined, ownerId: r.owner_id, access: r.access, level: r.level, updatedAt: ms(r.updated_at) ?? 0 }));
  }

  async createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile }): Promise<ChildRecord> {
    const uid = await this.uid();
    const r = await data<Row>(
      this.sb.from('profiles').insert({ owner_id: uid, name: input.name.trim(), age: input.age ?? null, intake: input.intake ?? null, data: input.data }).select().single(),
    );
    return toProfileRec(r);
  }

  async getProfile(id: string): Promise<ChildRecord> {
    const r = await data<Row | null>(this.sb.from('profiles').select('*').eq('id', id).maybeSingle());
    if (!r) throw new BackendError('forbidden');
    return toProfileRec(r);
  }

  async saveProfile(id: string, profile: Profile, baseVersion: number): Promise<SaveResult> {
    const r = await data<Row>(this.sb.rpc('save_profile', { p_id: id, p_data: profile, p_base: baseVersion }));
    return r.ok ? { ok: true, version: r.version } : { ok: false, conflict: toProfileRec(r.conflict) };
  }

  async deleteProfile(id: string): Promise<void> {
    await data(this.sb.from('profiles').delete().eq('id', id));
  }

  async myAccess(profileId: string) {
    const rows = await data<Row[]>(this.sb.rpc('access_of', { p_profile: profileId }));
    const r = rows[0];
    return r ? { owner: r.owner, role: r.role as CollaboratorRole | 'owner', level: r.level as AccessLevel, perms: r.perms as PermissionSet } : null;
  }

  // ── Team ──

  async listMembers(profileId: string): Promise<Membership[]> {
    return (await data<Row[]>(this.sb.from('members').select('*').eq('profile_id', profileId))).map(toMember);
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
    return toInvitation(await data<Row>(this.sb.rpc('accept_invitation_code', { p_code: code })));
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
    return toInvitation(
      await data<Row>(this.sb.rpc('request_connection', { p_code: code, p_role: input.role, p_level: input.level, p_perms: input.perms, p_message: input.message ?? null })),
    );
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

  async registerDevice(profileId: string, input: { id: string; name: string; kind: Device['kind']; platform: string }): Promise<Device> {
    return toDevice(
      await data<Row>(this.sb.rpc('register_device', { p_id: profileId, p_dev: input.id, p_name: input.name, p_kind: input.kind, p_platform: input.platform })),
    );
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
    return data<string>(this.sb.rpc('redeem_pairing_code', { p_code: code, p_dev: device.id, p_name: device.name, p_platform: device.platform }));
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
      status: cur?.status === 'more_info' ? 'more_info' : 'draft',
    };
    return toVerification(await data<Row>(this.sb.from('verifications').upsert(row).select().single()));
  }

  async uploadVerificationDocument(file: { uri: string; name: string; mimeType?: string }): Promise<string> {
    const uid = await this.uid();
    const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const body = await (await fetch(file.uri)).arrayBuffer();
    const { error } = await this.sb.storage.from('verification-docs').upload(path, body, { contentType: file.mimeType ?? 'application/octet-stream' });
    if (error) fail(error);
    return path;
  }

  async submitVerification(): Promise<Verification> {
    return toVerification(await data<Row>(this.sb.rpc('submit_verification')));
  }

  // ── Communication data (Suivi) ──

  async saveUsageDay(profileId: string, d: UsageDay): Promise<void> {
    // The database keeps only what the family's consent allows (save_usage_day).
    await data(this.sb.rpc('save_usage_day', { p_id: profileId, p_dev: d.deviceId, p_day: d.day, p_data: d }));
  }

  async listUsage(profileId: string, fromDay: string): Promise<UsageDay[]> {
    const rows = await data<Row[]>(this.sb.from('usage_days').select('data').eq('profile_id', profileId).gte('day', fromDay));
    return rows.map((r) => r.data as UsageDay);
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
    const rows = await data<Row[]>(this.sb.from('observations').select('*').eq('profile_id', profileId).order('at', { ascending: false }));
    return rows.map(toObservation);
  }

  async saveObservation(o: Omit<Observation, 'id' | 'createdBy' | 'authorName' | 'createdAt'> & { id?: string }): Promise<Observation> {
    const me = await this.me();
    const row: Row = {
      profile_id: o.profileId,
      at: new Date(o.at).toISOString(),
      sample_t: o.sampleT ?? null,
      utterance: o.utterance ?? null,
      function: o.function ?? null,
      context: o.context ?? null,
      partner: o.partner ?? null,
      autonomy: o.autonomy ?? null,
      result: o.result ?? null,
      note: o.note ?? null,
      updated_at: new Date().toISOString(),
    };
    const saved = o.id
      ? await data<Row>(this.sb.from('observations').update(row).eq('id', o.id).select().single())
      : await data<Row>(this.sb.from('observations').insert({ ...row, created_by: me.id, author_name: me.displayName }).select().single());
    return toObservation(saved);
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
    const row: Row = { id: r.id, kind: r.kind, title: r.title, profile_id: r.profileId ?? null, data: r.data, updated_at: new Date().toISOString() };
    const saved = exists
      ? await data<Row>(this.sb.from('resources').update(row).eq('id', r.id).select().single())
      : await data<Row>(this.sb.from('resources').insert({ ...row, owner_id: me.id, owner_name: me.displayName }).select().single());
    return toResource(saved, []);
  }

  async deleteResource(id: string): Promise<void> {
    await data(this.sb.from('resources').delete().eq('id', id));
  }

  async shareResource(id: string, target: { email?: string; profileId?: string; mode: 'view' | 'edit' }): Promise<void> {
    await data(this.sb.rpc('share_resource', { p_res: id, p_email: normEmail(target.email) ?? null, p_profile: target.profileId ?? null, p_mode: target.mode }));
  }
}
