/**
 * A server simulated on the device: the demo and offline fallback for the Backend contract.
 *
 * Everything is kept in the device's storage (AsyncStorage, i.e. the browser's storage on
 * the web), as one small database. Several accounts can live on one device, so the whole
 * collaboration flow can be tried by signing out and in as another person.
 * Verification codes are returned to the screen instead of being emailed / texted.
 * Passwords are stored as salted SHA-256 hashes (the real server uses its own login system).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile, UiLang } from '../model/types';
import type { Op } from '../lib/profileDiff';
import { type AccessLevel, type CollaboratorRole, type PermissionSet, preset } from '../lib/permissions';
import { deleteMedia, mediaUri, saveMedia } from '../lib/media';
import { exampleBugs, exampleDocument, exampleOverview, exampleProduct, exampleRequests, exampleRoadmap } from '../lib/demoBackOffice';
import { COUNTERS, PROBLEM_KINDS, SCREENS, sharesProduct, type ProblemItem } from '../lib/product';
import { demoObservations, demoUsage } from '../lib/demoUsage';
import { limitToConsent } from '../lib/usageConsent';
import { BackendError, type AdminRetention, type Backend, type BinEntry, type CodeSent, type SecurityState, type SignUpInput, type Snapshot, type TwoStepSetup } from './Backend';
import { newTotpSecret, totp, totpMatches, totpUri } from '../lib/totp';
import {
  DEFAULT_PREFS,
  type Observation,
  type UsageDay,
  type Account,
  type AccountPrefs,
  type AdminBugs,
  type AdminLogEntry,
  type AdminOverview,
  type AdminProduct,
  type AdminRoadmapItem,
  type AdminVerification,
  type FeatureDay,
  type RoadmapItem,
  type RoadmapStatus,
  type ChildRecord,
  type Feedback,
  type FeedbackKind,
  type Device,
  type HistoryEntry,
  type Intake,
  type Invitation,
  type Membership,
  type Notice,
  type NoticeKind,
  type ProfileSummary,
  type Proposal,
  type ProposalStatus,
  type Resource,
  type ResourceShare,
  type Role,
  type SaveResult,
  type Verification,
  type VerificationStatus,
} from './types';

const DB_KEY = 'caa.server.v1';
const SESSION_KEY = 'caa.session.v1';
/** This session's two-step level and when the person last proved who they are (sign-in, password, code). */
const SESSION_META_KEY = 'caa.session.meta.v1';
const PROOF_TTL = 10 * 60 * 1000;
interface SessionMeta {
  aal: 'aal1' | 'aal2';
  proofAt: number;
}
const CODE_TTL = 10 * 60 * 1000;

interface StoredAccount extends Account {
  salt: string;
  hash?: string;
  /** Two-step sign-in: the authenticator key; `on` once its first code was typed. */
  twoStep?: { secret: string; on: boolean };
}
interface PendingCode {
  target: string;
  code: string;
  purpose: 'verify' | 'reset';
  expiresAt: number;
}
interface StoredProfile extends ChildRecord {
  connectionCode?: string;
  /** In the family's bin since then (erased 30 days later). */
  deletedAt?: number;
}
const BIN_DAYS = 30;
/** Words on a board, all boards together (as word_count in the database). */
const wordCount = (d: Profile) => Object.values(d.boards ?? {}).reduce((n, b) => n + (b?.cells ?? []).filter(Boolean).length, 0);
interface DB {
  accounts: Record<string, StoredAccount>;
  codes: PendingCode[];
  profiles: Record<string, StoredProfile>;
  members: Membership[];
  invitations: Invitation[];
  proposals: Proposal[];
  history: HistoryEntry[];
  devices: Device[];
  pairings: { code: string; profileId: string; access: 'full' | 'use'; expiresAt: number }[];
  verifications: Record<string, Verification>;
  notices: Notice[];
  resources: Resource[];
  usage?: { profileId: string; data: UsageDay }[];
  observations?: Observation[];
  /** Accounts of the app's own team (back office). */
  admins?: string[];
  adminLog?: AdminLogEntry[];
  feedback?: (Feedback & { userId: string })[];
  /** Feature counters of the families who agreed, and technical problems (which belong to nobody). */
  featureDays?: { profileId: string; data: FeatureDay }[];
  problems?: Record<string, AdminBugs['top'][number]>;
  /** Ideas put to the vote (`base`: invented votes of the demonstration). */
  roadmap?: { id: string; title: Record<UiLang, string>; status: RoadmapStatus; createdAt: number; base?: { parents: number; pros: number } }[];
  roadmapVotes?: { itemId: string; userId: string; role: string }[];
  /** The example requests of the back-office demonstration were added. */
  backOfficeSeeded?: boolean;
  /** The parents' consents (who, when, which text version, for which child). */
  consents?: { userId: string; version: number; profileId?: string; at: number }[];
  /** Copies of the boards (weekly, before a big change, by hand, before putting one back): 10 per child. */
  snapshots?: (Snapshot & { profileId: string; data: Profile })[];
}
const emptyDb = (): DB => ({
  accounts: {},
  codes: [],
  profiles: {},
  members: [],
  invitations: [],
  proposals: [],
  history: [],
  devices: [],
  pairings: [],
  verifications: {},
  notices: [],
  resources: [],
});

let seq = 0;
/** Set for each call: the signed-in account turned two-step on and has not typed its code yet. */
let codeOwed = false;
/**
 * Device storage, with a memory fallback: if the browser refuses storage (private window,
 * sandboxed page), the demo keeps working for the session instead of failing.
 */
const memory = new Map<string, string>();
const store = {
  async get(k: string): Promise<string | null> {
    try {
      return (await AsyncStorage.getItem(k)) ?? memory.get(k) ?? null;
    } catch {
      return memory.get(k) ?? null;
    }
  },
  async set(k: string, v: string): Promise<void> {
    memory.set(k, v);
    try {
      await AsyncStorage.setItem(k, v);
    } catch {
      /* memory only */
    }
  },
  async remove(k: string): Promise<void> {
    memory.delete(k);
    try {
      await AsyncStorage.removeItem(k);
    } catch {
      /* memory only */
    }
  },
};

export const uid = (prefix = '') => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
/** Codes people type: no 0/O or 1/I. */
const friendlyCode = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const normEmail = (e?: string) => (e ?? '').trim().toLowerCase() || undefined;
export const normPhone = (p?: string) => {
  const d = (p ?? '').replace(/[^\d+]/g, '');
  return d.length >= 6 ? d : undefined;
};

async function sha256(text: string): Promise<string> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

const memberName = (a?: Account) => a?.displayName || a?.email || a?.phone || '—';

export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  private queue: Promise<unknown> = Promise.resolve();

  /** Read-modify-write of the whole database, one call at a time. */
  private tx<T>(fn: (db: DB, me: StoredAccount | null) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const raw = await store.get(DB_KEY);
      const db: DB = raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb();
      const sid = (await store.get(SESSION_KEY)) ?? '';
      const me = db.accounts[sid] ?? null;
      const level = (await this.meta()).aal;
      codeOwed = !!me?.twoStep?.on && level !== 'aal2';
      LocalBackend.adminLevel = level === 'aal2';
      const out = await fn(db, me);
      await store.set(DB_KEY, JSON.stringify(db));
      return out;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private static need(me: StoredAccount | null): StoredAccount {
    if (!me) throw new BackendError('not_signed_in');
    // Same rule as the real database: nothing about the children before the two-step code.
    if (codeOwed) throw new BackendError('two_step_needed');
    return me;
  }

  private async meta(): Promise<SessionMeta> {
    try {
      const raw = await store.get(SESSION_META_KEY);
      if (raw) return JSON.parse(raw) as SessionMeta;
    } catch {
      /* none */
    }
    return { aal: 'aal1', proofAt: 0 };
  }
  private async setMeta(patch: Partial<SessionMeta>): Promise<void> {
    await store.set(SESSION_META_KEY, JSON.stringify({ ...(await this.meta()), ...patch }));
  }
  /** A new sign-in: a fresh proof, and the two-step code still to type (if it is on). */
  private async startSession(accountId: string, aal: SessionMeta['aal'] = 'aal1'): Promise<void> {
    await store.set(SESSION_KEY, accountId);
    await store.set(SESSION_META_KEY, JSON.stringify({ aal, proofAt: Date.now() }));
  }
  /** Signed in or proved again in the last 10 minutes (as the real database's fresh_proof). */
  private async requireProof(): Promise<void> {
    if (Date.now() - (await this.meta()).proofAt > PROOF_TTL) throw new BackendError('proof_needed');
  }

  private static notify(db: DB, userId: string | undefined, kind: NoticeKind, text: string, extra: { profileId?: string; refId?: string } = {}) {
    if (!userId) return;
    db.notices.push({ id: uid('n'), userId, kind, text, createdAt: Date.now(), read: false, ...extra });
  }

  /** Owner, or an active, non-expired member. */
  private static access(db: DB, profileId: string, userId: string) {
    const p = db.profiles[profileId];
    if (!p || p.deletedAt) return null;
    if (p.ownerId === userId) {
      // A professional who created the profile and is no longer accepted: suspended too.
      if (!LocalBackend.cleared(db, userId)) return null;
      return { owner: true, role: 'owner' as const, level: 3 as AccessLevel, perms: preset('parent').perms };
    }
    const m = db.members.find((x) => x.profileId === profileId && x.userId === userId && x.status === 'active');
    if (!m || (m.expiresAt && m.expiresAt < Date.now())) return null;
    // A professional whose acceptance was withdrawn: access suspended (it comes back if accepted again).
    if (!LocalBackend.cleared(db, userId)) return null;
    return { owner: false, role: m.role, level: m.level, perms: m.perms };
  }
  /** A family account, or a professional whose certificate was accepted (same rule as the real server). */
  private static cleared(db: DB, userId: string): boolean {
    return db.accounts[userId]?.role !== 'pro' || db.verifications[userId]?.status === 'verified';
  }
  private static requireAdmin(db: DB, me: StoredAccount | null): StoredAccount {
    const a = LocalBackend.need(me);
    if (!(db.admins ?? []).includes(a.id) || !LocalBackend.adminLevel) throw new BackendError('forbidden');
    return a;
  }
  /** Set for each call: this session typed its two-step code (the back office needs it, as on the real server). */
  private static adminLevel = false;
  private static adminNote(db: DB, me: StoredAccount, action: string, targetName?: string, detail?: string) {
    (db.adminLog ??= []).unshift({ id: uid('l'), adminName: memberName(me), action, targetName, detail, createdAt: Date.now() });
  }
  private static managers(db: DB, profileId: string): string[] {
    const p = db.profiles[profileId];
    const ids = db.members.filter((m) => m.profileId === profileId && m.status === 'active' && m.perms.manager).map((m) => m.userId);
    return p ? [p.ownerId, ...ids] : ids;
  }
  private static requireManager(db: DB, profileId: string, me: StoredAccount) {
    const a = LocalBackend.access(db, profileId, me.id);
    if (!a || !(a.owner || a.perms.manager)) throw new BackendError('forbidden');
    return a;
  }
  private static requireAccess(db: DB, profileId: string, me: StoredAccount) {
    const a = LocalBackend.access(db, profileId, me.id);
    if (!a) throw new BackendError('forbidden');
    return a;
  }
  private static findAccount(db: DB, t: { email?: string; phone?: string }) {
    const email = normEmail(t.email);
    const phone = normPhone(t.phone);
    return Object.values(db.accounts).find((a) => (email && a.email === email) || (phone && a.phone === phone));
  }
  private static newCode(db: DB, target: string, purpose: PendingCode['purpose']): string {
    const code = digits(6);
    db.codes = db.codes.filter((c) => !(c.target === target && c.purpose === purpose));
    db.codes.push({ target, code, purpose, expiresAt: Date.now() + CODE_TTL });
    return code;
  }
  private static takeCode(db: DB, target: string, code: string, purpose: PendingCode['purpose']) {
    const c = db.codes.find((x) => x.target === target && x.purpose === purpose);
    if (!c || c.expiresAt < Date.now()) throw new BackendError('code_expired');
    if (c.code !== code.trim()) throw new BackendError('code_invalid');
    db.codes = db.codes.filter((x) => x !== c);
  }
  /** Invitations sent to an email before the person had an account. */
  private static attachInvitations(db: DB, acc: StoredAccount) {
    for (const inv of db.invitations)
      if (inv.direction === 'invite' && inv.status === 'pending' && !inv.toUserId && inv.email && inv.email === acc.email) {
        inv.toUserId = acc.id;
        LocalBackend.notify(db, acc.id, 'invitation', `${inv.fromName} vous invite à rejoindre l’équipe de ${inv.childName}.`, { refId: inv.id });
      }
  }
  private static public(a: StoredAccount): Account {
    const { salt: _s, hash: _h, ...rest } = a;
    return clone(rest);
  }

  // ── Accounts ──

  async currentAccount(): Promise<Account | null> {
    return this.tx((_db, me) => (me ? LocalBackend.public(me) : null));
  }

  async signUp(input: SignUpInput): Promise<CodeSent> {
    const email = normEmail(input.email);
    const phone = normPhone(input.phone);
    if (!email && !phone) throw new BackendError('missing_contact');
    if (input.password.length < 8) throw new BackendError('weak_password');
    const salt = uid();
    const hash = await sha256(salt + input.password);
    return this.tx((db) => {
      const existing = LocalBackend.findAccount(db, { email, phone });
      if (existing?.verified) throw new BackendError('account_exists');
      if (existing) delete db.accounts[existing.id];
      const acc: StoredAccount = {
        id: uid('u'),
        role: input.role,
        displayName: input.displayName.trim(),
        email,
        phone,
        provider: email ? 'email' : 'phone',
        verified: false,
        createdAt: Date.now(),
        prefs: clone(DEFAULT_PREFS),
        salt,
        hash,
      };
      db.accounts[acc.id] = acc;
      const target = (email ?? phone)!;
      return { sentTo: target, demoCode: LocalBackend.newCode(db, target, 'verify') };
    });
  }

  async verifyCode(target: { email?: string; phone?: string }, code: string): Promise<Account> {
    const t = normEmail(target.email) ?? normPhone(target.phone);
    if (!t) throw new BackendError('missing_contact');
    const acc = await this.tx((db) => {
      LocalBackend.takeCode(db, t, code, 'verify');
      const a = LocalBackend.findAccount(db, target);
      if (!a) throw new BackendError('no_account');
      a.verified = true;
      LocalBackend.attachInvitations(db, a);
      return a;
    });
    await this.startSession(acc.id);
    return LocalBackend.public(acc);
  }

  async resendCode(target: { email?: string; phone?: string }): Promise<CodeSent> {
    const t = normEmail(target.email) ?? normPhone(target.phone);
    if (!t) throw new BackendError('missing_contact');
    return this.tx((db) => ({ sentTo: t, demoCode: LocalBackend.newCode(db, t, 'verify') }));
  }

  async signIn(input: { email?: string; phone?: string; password: string }): Promise<Account> {
    const acc = await this.tx((db) => LocalBackend.findAccount(db, input) ?? null);
    if (!acc?.hash || (await sha256(acc.salt + input.password)) !== acc.hash) throw new BackendError('wrong_credentials');
    if (!acc.verified) throw new BackendError('not_verified');
    await this.startSession(acc.id);
    return LocalBackend.public(acc);
  }

  async signInWithProvider(provider: 'google' | 'apple', role: Role): Promise<Account> {
    // Demo: a stand-in account per provider and role. The real server opens Google / Apple.
    const email = `${provider}.${role}@demo.local`;
    const acc = await this.tx((db) => {
      let a = LocalBackend.findAccount(db, { email });
      if (!a) {
        a = {
          id: uid('u'),
          role,
          displayName: provider === 'google' ? 'Compte Google (démo)' : 'Compte Apple (démo)',
          email,
          provider,
          verified: true,
          createdAt: Date.now(),
          prefs: clone(DEFAULT_PREFS),
          salt: uid(),
        };
        db.accounts[a.id] = a;
      }
      return a;
    });
    await this.startSession(acc.id);
    return LocalBackend.public(acc);
  }

  async signOut(): Promise<void> {
    await store.remove(SESSION_KEY);
    await store.remove(SESSION_META_KEY);
  }

  async requestPasswordReset(target: { email?: string; phone?: string }): Promise<CodeSent> {
    const t = normEmail(target.email) ?? normPhone(target.phone);
    if (!t) throw new BackendError('missing_contact');
    return this.tx((db) => {
      // Same answer whether or not the account exists (never reveal who has an account).
      const code = LocalBackend.findAccount(db, target) ? LocalBackend.newCode(db, t, 'reset') : digits(6);
      return { sentTo: t, demoCode: code };
    });
  }

  async resetPassword(target: { email?: string; phone?: string }, code: string, password: string): Promise<void> {
    if (password.length < 8) throw new BackendError('weak_password');
    const t = normEmail(target.email) ?? normPhone(target.phone);
    if (!t) throw new BackendError('missing_contact');
    const salt = uid();
    const hash = await sha256(salt + password);
    await this.tx((db) => {
      LocalBackend.takeCode(db, t, code, 'reset');
      const a = LocalBackend.findAccount(db, target);
      if (!a) throw new BackendError('no_account');
      Object.assign(a, { salt, hash, verified: true });
    });
  }

  async checkResetCode(target: { email?: string; phone?: string }, code: string): Promise<void> {
    const t = normEmail(target.email) ?? normPhone(target.phone);
    if (!t) throw new BackendError('missing_contact');
    await this.tx((db) => LocalBackend.takeCode(db, t, code, 'reset'));
    await this.setMeta({ proofAt: Date.now() });
  }

  async checkPassword(password: string): Promise<void> {
    const me = LocalBackend.need(await this.tx((_db, m) => m));
    if (me.provider === 'device') throw new BackendError('forbidden');
    // Google / Apple accounts have no password here: only the e-mailed code proves them.
    if (!me.hash || (await sha256(me.salt + password)) !== me.hash) throw new BackendError('wrong_credentials');
    await this.setMeta({ proofAt: Date.now() });
  }

  async changePassword(current: string, next: string): Promise<void> {
    if (next.length < 8) throw new BackendError('weak_password');
    const me = LocalBackend.need(await this.tx((_db, m) => m));
    if (me.hash && (await sha256(me.salt + current)) !== me.hash) throw new BackendError('wrong_credentials');
    const salt = uid();
    const hash = await sha256(salt + next);
    await this.tx((db) => Object.assign(db.accounts[me.id], { salt, hash }));
  }

  async updateAccount(patch: { displayName?: string; email?: string; phone?: string; prefs?: Partial<AccountPrefs> }): Promise<Account> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const a = db.accounts[me.id];
      if (patch.displayName !== undefined) a.displayName = patch.displayName.trim();
      if (patch.email !== undefined) a.email = normEmail(patch.email);
      if (patch.phone !== undefined) a.phone = normPhone(patch.phone);
      if (patch.prefs) a.prefs = { ...a.prefs, ...patch.prefs };
      return LocalBackend.public(a);
    });
  }

  async deleteAccount(): Promise<void> {
    await this.requireProof();
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const owned = new Set(Object.values(db.profiles).filter((p) => p.ownerId === me.id).map((p) => p.id));
      for (const id of owned) delete db.profiles[id];
      const keep = <T extends { profileId?: string }>(x: T) => !x.profileId || !owned.has(x.profileId);
      db.members = db.members.filter((x) => keep(x) && x.userId !== me.id);
      db.invitations = db.invitations.filter((x) => keep(x) && x.fromUserId !== me.id);
      db.proposals = db.proposals.filter(keep);
      db.history = db.history.filter(keep);
      db.devices = db.devices.filter((x) => keep(x) && x.userId !== me.id);
      db.notices = db.notices.filter((x) => x.userId !== me.id);
      db.resources = db.resources.filter((x) => x.ownerId !== me.id);
      db.usage = (db.usage ?? []).filter((u) => !owned.has(u.profileId));
      db.observations = (db.observations ?? []).filter((o) => !owned.has(o.profileId));
      db.snapshots = (db.snapshots ?? []).filter((x) => !owned.has(x.profileId));
      delete db.verifications[me.id];
      db.admins = (db.admins ?? []).filter((id) => id !== me.id);
      db.feedback = (db.feedback ?? []).filter((f) => f.userId !== me.id);
      delete db.accounts[me.id];
    });
    await store.remove(SESSION_KEY);
  }

  // ── Two-step sign-in and fresh proofs ──

  async security(): Promise<SecurityState> {
    const meta = await this.meta();
    return this.tx((db, me) => ({
      team: !!me && me.provider !== 'device' && (db.admins ?? []).includes(me.id),
      twoStep: !!me?.twoStep?.on,
      level: meta.aal,
    }));
  }

  async twoStepStart(): Promise<TwoStepSetup> {
    return this.tx((db, m) => {
      if (!m) throw new BackendError('not_signed_in');
      if (m.provider === 'device') throw new BackendError('forbidden');
      if (m.twoStep?.on) throw new BackendError('two_step_on');
      const secret = newTotpSecret();
      db.accounts[m.id].twoStep = { secret, on: false };
      return { factorId: `totp-${m.id}`, secret, uri: totpUri(secret, m.email || m.phone || m.displayName) };
    });
  }

  async twoStepConfirm(_factorId: string, code: string): Promise<void> {
    await this.tx((db, m) => {
      const t = m && db.accounts[m.id].twoStep;
      if (!t) throw new BackendError('not_signed_in');
      if (!totpMatches(t.secret, code)) throw new BackendError('code_invalid');
      t.on = true;
    });
    await this.setMeta({ aal: 'aal2', proofAt: Date.now() });
  }

  async twoStepCode(code: string): Promise<void> {
    await this.tx((_db, m) => {
      if (!m?.twoStep?.on) throw new BackendError('two_step_off');
      if (!totpMatches(m.twoStep.secret, code)) throw new BackendError('code_invalid');
    });
    await this.setMeta({ aal: 'aal2', proofAt: Date.now() });
  }

  async twoStepOff(code: string): Promise<void> {
    await this.twoStepCode(code);
    await this.tx((db, m) => {
      if (m) delete db.accounts[m.id].twoStep;
    });
  }

  async demoTwoStepCode(): Promise<string | undefined> {
    return this.tx((_db, m) => (m?.twoStep ? totp(m.twoStep.secret) : undefined));
  }

  // ── Profiles ──

  async listProfiles(): Promise<ProfileSummary[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const out: ProfileSummary[] = [];
      for (const p of Object.values(db.profiles)) {
        const a = LocalBackend.access(db, p.id, me.id);
        if (!a) continue;
        out.push({ id: p.id, name: p.name, age: p.age, ownerId: p.ownerId, access: a.owner ? 'owner' : (a.role as CollaboratorRole), level: a.level, updatedAt: p.updatedAt });
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile; consent?: number }): Promise<ChildRecord> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const data = clone(input.data);
      // The demonstration keeps the consent as the real server does (which also refuses a family's profile without it).
      const consent = input.consent && me.role !== 'pro' ? { userId: me.id, version: input.consent, at: Date.now() } : null;
      if (me.role === 'pro') {
        // A professional prepares a child's profile before the family has an account: only once
        // accepted, and nothing is recorded or shared until the family decides (same as the real server).
        if (!LocalBackend.cleared(db, me.id)) throw new BackendError('pro_not_verified');
        data.settings.dataCollection = 'off';
        data.settings.shareStats = 'none';
      }
      // An agreement only counts with the family's own choice to share.
      if (data.settings.shareStats !== 'anonymous') delete data.settings.shareTerms;
      const rec: StoredProfile = {
        id: uid('p'),
        ownerId: me.id,
        name: input.name.trim(),
        age: input.age,
        intake: input.intake,
        data,
        version: 1,
        updatedAt: Date.now(),
        updatedBy: me.id,
      };
      db.profiles[rec.id] = rec;
      if (consent) (db.consents ??= []).push({ ...consent, profileId: rec.id });
      return clone(rec);
    });
  }

  async giveConsent(version: number): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (me.provider === 'device') throw new BackendError('forbidden');
      (db.consents ??= []).push({ userId: me.id, version, at: Date.now() });
    });
  }

  async exportMyData(): Promise<unknown> {
    await this.requireProof();
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (me.provider === 'device') throw new BackendError('forbidden');
      const mine = new Set(Object.values(db.profiles).filter((p) => p.ownerId === me.id).map((p) => p.id));
      const of = <T extends { profileId?: string }>(list: T[] | undefined) => (list ?? []).filter((x) => x.profileId && mine.has(x.profileId));
      return clone({
        exportedAt: new Date().toISOString(),
        format: 'empower-communication/export-1',
        account: LocalBackend.public(me),
        consents: (db.consents ?? []).filter((c) => c.userId === me.id),
        children: Object.values(db.profiles).filter((p) => mine.has(p.id)),
        teams: db.members.filter((x) => mine.has(x.profileId) || x.userId === me.id),
        invitations: db.invitations.filter((i) => mine.has(i.profileId) || i.fromUserId === me.id || i.toUserId === me.id),
        proposals: db.proposals.filter((x) => mine.has(x.profileId) || x.authorId === me.id),
        history: of(db.history),
        devices: db.devices.filter((d) => mine.has(d.profileId) || d.userId === me.id),
        followUpDays: (db.usage ?? []).filter((u) => mine.has(u.profileId)).map((u) => u.data),
        observations: (db.observations ?? []).filter((o) => mine.has(o.profileId) || o.createdBy === me.id),
        boardCopies: of(db.snapshots),
        notices: db.notices.filter((n) => n.userId === me.id),
        verification: db.verifications[me.id] ?? null,
        materials: db.resources.filter((r) => r.ownerId === me.id),
        messagesToTheTeam: (db.feedback ?? []).filter((f) => f.userId === me.id),
        notIncluded: 'Photos and recordings: they are files, kept in the app.',
      });
    });
  }

  async getProfile(id: string): Promise<ChildRecord> {
    return this.tx((db, m) => {
      LocalBackend.requireAccess(db, id, LocalBackend.need(m));
      const { connectionCode: _c, ...rec } = db.profiles[id];
      return clone(rec);
    });
  }

  async profileVersion(id: string): Promise<number> {
    return this.tx((db, m) => {
      LocalBackend.requireAccess(db, id, LocalBackend.need(m));
      return db.profiles[id].version;
    });
  }

  async saveProfile(id: string, data: Profile, baseVersion: number): Promise<SaveResult> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const a = LocalBackend.requireAccess(db, id, me);
      const p = db.profiles[id];
      const manager = a.owner || a.perms.manager;
      if (!manager && a.level < 3) throw new BackendError('forbidden');
      // Core-vocabulary positions change only through an approved proposal.
      if (!manager && JSON.stringify(data.boards.core) !== JSON.stringify(p.data.boards.core)) throw new BackendError('core_protected');
      if (p.version !== baseVersion) {
        const { connectionCode: _c, ...rec } = p;
        return { ok: false, conflict: clone(rec) };
      }
      // What is recorded, what is shared and the caregiver code are the family's own decisions.
      const was = p.data.settings;
      const now = data.settings;
      const consentChanged =
        (now.dataCollection ?? 'off') !== (was.dataCollection ?? 'off') ||
        (now.shareStats ?? 'none') !== (was.shareStats ?? 'none') ||
        (now.shareTerms ?? 0) !== (was.shareTerms ?? 0);
      if (!manager && (consentChanged || now.pin !== was.pin)) throw new BackendError('consent_protected');
      // A professional who created the profile edits everything except these two choices.
      if (a.owner && me.role === 'pro' && consentChanged) throw new BackendError('consent_protected');
      // The family stops sharing: what was counted for the team is erased at once.
      if (was.shareStats === 'anonymous' && now.shareStats !== 'anonymous') db.featureDays = (db.featureDays ?? []).filter((f) => f.profileId !== p.id);
      LocalBackend.snapshotBefore(db, p, data, me.id);
      Object.assign(p, { data: clone(data), version: p.version + 1, updatedAt: Date.now(), updatedBy: me.id });
      return { ok: true, version: p.version };
    });
  }

  async deleteProfile(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      // The owner only, and for a professional only while the certificate is accepted (same as the real server).
      const p = db.profiles[id];
      if (!p || p.deletedAt || p.ownerId !== me.id || !LocalBackend.cleared(db, me.id)) throw new BackendError('forbidden');
    });
    await this.requireProof();
    await this.tx((db) => {
      // Into the bin: hidden from everybody, put back by the family within 30 days.
      const p = db.profiles[id];
      p.deletedAt = Date.now();
      delete p.connectionCode;
      db.pairings = db.pairings.filter((x) => x.profileId !== id);
      for (const inv of db.invitations) if (inv.profileId === id && inv.status === 'pending') inv.status = 'cancelled';
    });
  }

  /** Profiles in the bin for more than 30 days are erased for good (done at each look at the bin). */
  private static eraseOldBin(db: DB) {
    for (const p of Object.values(db.profiles)) {
      if (p.deletedAt && p.deletedAt < Date.now() - BIN_DAYS * 86_400_000) LocalBackend.erase(db, p.id);
    }
  }

  private static erase(db: DB, id: string) {
    delete db.profiles[id];
    const other = <T extends { profileId?: string }>(x: T) => x.profileId !== id;
    db.members = db.members.filter(other);
    db.invitations = db.invitations.filter(other);
    db.proposals = db.proposals.filter(other);
    db.history = db.history.filter(other);
    db.devices = db.devices.filter(other);
    db.usage = (db.usage ?? []).filter((u) => u.profileId !== id);
    db.observations = (db.observations ?? []).filter(other);
    db.snapshots = (db.snapshots ?? []).filter(other);
  }

  async listBin(): Promise<BinEntry[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.eraseOldBin(db);
      return Object.values(db.profiles)
        .filter((p) => p.deletedAt && p.ownerId === me.id && LocalBackend.cleared(db, me.id))
        .sort((a, b) => b.deletedAt! - a.deletedAt!)
        .map((p) => ({ id: p.id, name: p.name, deletedAt: p.deletedAt!, eraseAt: p.deletedAt! + BIN_DAYS * 86_400_000 }));
    });
  }

  async restoreProfile(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const p = db.profiles[id];
      if (!p?.deletedAt || p.ownerId !== me.id || !LocalBackend.cleared(db, me.id)) throw new BackendError('forbidden');
      delete p.deletedAt;
    });
  }

  // ── Copies of the board ──

  private static keepSnapshot(db: DB, p: StoredProfile, reason: Snapshot['reason']) {
    const list = (db.snapshots ??= []);
    list.push({ id: uid('s'), profileId: p.id, data: clone(p.data), version: p.version, reason, createdAt: Date.now(), words: wordCount(p.data) });
    const mine = list.filter((x) => x.profileId === p.id).sort((a, b) => b.createdAt - a.createdAt);
    const drop = new Set(mine.slice(10).map((x) => x.id));
    db.snapshots = list.filter((x) => !drop.has(x.id));
  }

  /** Before a save: once a week, and before a big change (as snapshot_before_change in the database). */
  private static snapshotBefore(db: DB, p: StoredProfile, next: Profile, _by: string) {
    const mine = (db.snapshots ?? []).filter((x) => x.profileId === p.id);
    const last = Math.max(0, ...mine.map((x) => x.createdAt));
    if (Date.now() - last > 7 * 86_400_000) return LocalBackend.keepSnapshot(db, p, 'weekly');
    const before = wordCount(p.data);
    const big = (before > 0 && wordCount(next) < before * 0.9) || Object.keys(next.boards ?? {}).length < Object.keys(p.data.boards ?? {}).length;
    const recent = mine.some((x) => x.reason === 'big_change' && Date.now() - x.createdAt < 3_600_000);
    if (big && !recent) LocalBackend.keepSnapshot(db, p, 'big_change');
  }

  async listSnapshots(profileId: string): Promise<Snapshot[]> {
    return this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      return (db.snapshots ?? [])
        .filter((x) => x.profileId === profileId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ id, createdAt, reason, version, words }) => ({ id, createdAt, reason, version, words }));
    });
  }

  async takeSnapshot(profileId: string): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      LocalBackend.keepSnapshot(db, db.profiles[profileId], 'manual');
    });
  }

  async restoreSnapshot(snapshotId: string): Promise<number> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const snap = (db.snapshots ?? []).find((x) => x.id === snapshotId);
      if (!snap) throw new BackendError('forbidden');
      LocalBackend.requireManager(db, snap.profileId, me);
      const p = db.profiles[snap.profileId];
      LocalBackend.keepSnapshot(db, p, 'before_restore');
      const d = clone(snap.data);
      // The family's own choices stay as they are now.
      const now = p.data.settings;
      d.settings = { ...d.settings, dataCollection: now.dataCollection, shareStats: now.shareStats, shareTerms: now.shareTerms, pin: now.pin };
      Object.assign(p, { data: d, version: p.version + 1, updatedAt: Date.now(), updatedBy: me.id });
      db.history.push({ id: uid('h'), profileId: p.id, actorId: me.id, actorName: memberName(me), summary: `restore:${new Date(snap.createdAt).toISOString()}`, ops: [], inverse: [], createdAt: Date.now() });
      return p.version;
    });
  }

  async myAccess(profileId: string) {
    return this.tx((db, m) => {
      const a = LocalBackend.access(db, profileId, LocalBackend.need(m).id);
      return a ? clone(a) : null;
    });
  }

  // ── Team ──

  async listMembers(profileId: string): Promise<Membership[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      // The addresses only for the family, the team's managers and each person their own (as list_members).
      const manager = LocalBackend.managers(db, profileId).includes(me.id);
      return clone(db.members.filter((x) => x.profileId === profileId)).map((x) => (manager || x.userId === me.id ? x : { ...x, email: undefined }));
    });
  }

  async updateMember(profileId: string, userId: string, patch: { level?: AccessLevel; perms?: PermissionSet; role?: CollaboratorRole; expiresAt?: number | null }): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const x = db.members.find((y) => y.profileId === profileId && y.userId === userId);
      if (!x) throw new BackendError('not_found');
      if (patch.level) x.level = patch.level;
      if (patch.perms) x.perms = patch.perms;
      if (patch.role) x.role = patch.role;
      if (patch.expiresAt !== undefined) x.expiresAt = patch.expiresAt ?? undefined;
      LocalBackend.notify(db, userId, 'access', `Vos droits sur le profil de ${db.profiles[profileId].name} ont changé.`, { profileId });
    });
  }

  async revokeMember(profileId: string, userId: string): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const x = db.members.find((y) => y.profileId === profileId && y.userId === userId);
      if (x) x.status = 'revoked';
      LocalBackend.notify(db, userId, 'access', `Votre accès au profil de ${db.profiles[profileId].name} a été retiré.`, { profileId });
    });
  }

  async invite(profileId: string, input: { email?: string; name?: string; role: CollaboratorRole; level: AccessLevel; perms: PermissionSet }): Promise<Invitation> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const a = LocalBackend.requireAccess(db, profileId, me);
      if (!(a.owner || a.perms.invite || a.perms.manager)) throw new BackendError('forbidden');
      // Someone who may only invite gives at most what they hold, and never the family's own rights.
      const boss = a.owner || a.perms.manager;
      const level = boss ? input.level : (Math.min(input.level, a.level) as AccessLevel);
      const perms: PermissionSet = boss
        ? input.perms
        : {
            createMaterials: input.perms.createMaterials && a.perms.createMaterials,
            proposeVocabulary: input.perms.proposeVocabulary && a.perms.proposeVocabulary,
            viewData: !!input.perms.viewData && !!a.perms.viewData,
            changeAccess: false,
            invite: false,
            manageDevices: false,
            manager: false,
          };
      const email = normEmail(input.email);
      const to = email ? LocalBackend.findAccount(db, { email }) : undefined;
      const inv: Invitation = {
        id: uid('i'),
        direction: 'invite',
        profileId,
        childName: db.profiles[profileId].name,
        fromUserId: me.id,
        fromName: memberName(me),
        email,
        toUserId: to?.verified ? to.id : undefined,
        name: input.name?.trim() || undefined,
        code: friendlyCode(),
        role: input.role,
        level,
        perms,
        status: 'pending',
        createdAt: Date.now(),
      };
      db.invitations.push(inv);
      LocalBackend.notify(db, inv.toUserId, 'invitation', `${inv.fromName} vous invite à rejoindre l’équipe de ${inv.childName}.`, { refId: inv.id });
      return clone(inv);
    });
  }

  async profileInvitations(profileId: string): Promise<Invitation[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAccess(db, profileId, LocalBackend.need(m));
      return clone(db.invitations.filter((i) => i.profileId === profileId));
    });
  }

  async myInvitations(): Promise<{ received: Invitation[]; sent: Invitation[] }> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const mine = (i: Invitation) => i.direction === 'invite' && (i.toUserId === me.id || (!!me.email && i.email === me.email));
      return {
        received: clone(db.invitations.filter(mine)),
        sent: clone(db.invitations.filter((i) => i.direction === 'request' && i.fromUserId === me.id)),
      };
    });
  }

  private static join(db: DB, inv: Invitation, userId: string, grant?: { level: AccessLevel; perms: PermissionSet }) {
    // A professional joins a child's team only once the app's team accepted the certificate.
    if (!LocalBackend.cleared(db, userId)) throw new BackendError('pro_not_verified');
    const acc = db.accounts[userId];
    // A parent accepts the "parent" invitation written by the professional who created the
    // profile: the parent becomes the owner, the professional stays on the team (same as the real server).
    const p = db.profiles[inv.profileId];
    const was = p ? db.accounts[p.ownerId] : undefined;
    if (p && was && inv.direction === 'invite' && inv.role === 'parent' && inv.fromUserId === was.id && was.role === 'pro' && acc?.role === 'parent' && acc.provider !== 'device' && acc.id !== was.id) {
      p.ownerId = userId;
      // The caregiver code becomes "not chosen yet": the family chooses its own.
      if (p.data?.settings) p.data.settings.pin = '1234';
      p.version += 1;
      p.updatedAt = Date.now();
      db.members = db.members.filter((x) => !(x.profileId === p.id && (x.userId === userId || x.userId === was.id)));
      if (LocalBackend.cleared(db, was.id)) {
        db.members.push({
          profileId: p.id,
          userId: was.id,
          displayName: memberName(was),
          email: was.email,
          role: 'therapist',
          level: 3,
          perms: { createMaterials: true, proposeVocabulary: true, changeAccess: false, invite: false, manageDevices: false, manager: false, viewData: false },
          status: 'active',
          createdAt: Date.now(),
        });
      }
      for (const other of db.invitations) if (other.profileId === p.id && other.fromUserId === was.id && other.status === 'pending' && other.id !== inv.id) other.status = 'cancelled';
      inv.status = 'accepted';
      inv.toUserId = userId;
      const lang = was.prefs?.uiLang ?? 'fr';
      const who = memberName(acc);
      LocalBackend.notify(
        db,
        was.id,
        'access',
        lang === 'en'
          ? `${who} is now the parent in charge of ${inv.childName}'s profile. You stay on the team.`
          : lang === 'ar'
            ? `${who} هو الآن ولي الأمر المسؤول عن ملف ${inv.childName}. تبقى ضمن الفريق.`
            : `${who} est maintenant le parent responsable du profil de ${inv.childName}. Vous restez dans son équipe.`,
        { profileId: p.id },
      );
      return;
    }
    db.members = db.members.filter((x) => !(x.profileId === inv.profileId && x.userId === userId));
    db.members.push({
      profileId: inv.profileId,
      userId,
      displayName: inv.direction === 'invite' ? inv.name || memberName(acc) : memberName(acc),
      email: acc?.email,
      role: inv.role,
      level: grant?.level ?? inv.level,
      perms: grant?.perms ?? inv.perms,
      status: 'active',
      createdAt: Date.now(),
    });
    inv.status = 'accepted';
  }

  async respondInvitation(id: string, accept: boolean): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const inv = db.invitations.find((i) => i.id === id && i.status === 'pending');
      if (!inv) throw new BackendError('not_found');
      if (inv.direction === 'request') {
        LocalBackend.requireManager(db, inv.profileId, me);
        // The family accepts a request through approveRequest (where it chooses the rights).
        if (accept) throw new BackendError('forbidden');
        inv.status = 'declined';
        LocalBackend.notify(db, inv.fromUserId, 'access', accept ? `Votre demande pour ${inv.childName} a été acceptée.` : `Votre demande pour ${inv.childName} a été refusée.`, { profileId: inv.profileId });
        return;
      }
      if (!(inv.toUserId === me.id || (me.email && inv.email === me.email))) throw new BackendError('forbidden');
      if (accept) LocalBackend.join(db, inv, me.id);
      else inv.status = 'declined';
      LocalBackend.notify(db, inv.fromUserId, 'access', `${memberName(me)} a ${accept ? 'accepté' : 'refusé'} l’invitation pour ${inv.childName}.`, { profileId: inv.profileId });
    });
  }

  async acceptInvitationCode(code: string): Promise<Invitation> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const inv = db.invitations.find((i) => i.direction === 'invite' && i.status === 'pending' && i.code === code.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      if (!inv) throw new BackendError('code_invalid');
      // Nobody accepts an invitation they wrote themselves.
      if (inv.fromUserId === me.id) throw new BackendError('forbidden');
      LocalBackend.join(db, inv, me.id);
      LocalBackend.notify(db, inv.fromUserId, 'access', `${memberName(me)} a rejoint l’équipe de ${inv.childName}.`, { profileId: inv.profileId });
      return clone(inv);
    });
  }

  async cancelInvitation(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) throw new BackendError('not_found');
      if (inv.fromUserId !== me.id) LocalBackend.requireManager(db, inv.profileId, me);
      if (inv.status === 'accepted') {
        const x = db.members.find((y) => y.profileId === inv.profileId && y.userId === inv.toUserId);
        if (x) x.status = 'revoked';
      }
      inv.status = 'cancelled';
    });
  }

  async resendInvitation(id: string): Promise<Invitation> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const inv = db.invitations.find((i) => i.id === id);
      if (!inv) throw new BackendError('not_found');
      LocalBackend.requireManager(db, inv.profileId, me);
      inv.createdAt = Date.now();
      LocalBackend.notify(db, inv.toUserId, 'invitation', `Rappel : ${inv.fromName} vous invite à rejoindre l’équipe de ${inv.childName}.`, { refId: inv.id });
      return clone(inv);
    });
  }

  async connectionCode(profileId: string, renew = false): Promise<string> {
    return this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const p = db.profiles[profileId];
      if (!p.connectionCode || renew) p.connectionCode = friendlyCode();
      return p.connectionCode;
    });
  }

  async requestConnection(code: string, input: { role: CollaboratorRole; level: AccessLevel; perms: PermissionSet; message?: string }): Promise<Invitation> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const p = Object.values(db.profiles).find((x) => x.connectionCode && x.connectionCode === code.trim().toUpperCase());
      if (!p) throw new BackendError('code_invalid');
      if (LocalBackend.access(db, p.id, me.id)) throw new BackendError('already_member');
      if (!LocalBackend.cleared(db, me.id)) throw new BackendError('pro_not_verified');
      const inv: Invitation = {
        id: uid('i'),
        direction: 'request',
        profileId: p.id,
        childName: p.name,
        fromUserId: me.id,
        fromName: memberName(me),
        email: me.email,
        code: friendlyCode(),
        role: input.role,
        level: input.level,
        // A request never carries the family's own rights.
        perms: { ...input.perms, manager: false, invite: false, manageDevices: false, changeAccess: false },
        message: input.message?.trim() || undefined,
        status: 'pending',
        createdAt: Date.now(),
      };
      db.invitations.push(inv);
      for (const id of LocalBackend.managers(db, p.id))
        LocalBackend.notify(db, id, 'request', `${inv.fromName} demande à rejoindre l’équipe de ${p.name}.`, { profileId: p.id, refId: inv.id });
      return clone(inv);
    });
  }

  async approveRequest(id: string, grant: { level: AccessLevel; perms: PermissionSet }): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const inv = db.invitations.find((i) => i.id === id && i.direction === 'request' && i.status === 'pending');
      if (!inv) throw new BackendError('not_found');
      LocalBackend.requireManager(db, inv.profileId, me);
      // Approving a request never makes the person a parent, whatever was sent.
      LocalBackend.join(db, inv, inv.fromUserId, { level: grant.level, perms: { ...grant.perms, manager: false } });
      LocalBackend.notify(db, inv.fromUserId, 'access', `Votre demande pour ${inv.childName} a été acceptée.`, { profileId: inv.profileId });
    });
  }

  // ── Proposals ──

  async listProposals(filter: { profileId: string } | { mine: true }): Promise<Proposal[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const list =
        'mine' in filter
          ? db.proposals.filter((p) => p.authorId === me.id)
          : (LocalBackend.requireAccess(db, filter.profileId, me), db.proposals.filter((p) => p.profileId === filter.profileId));
      return clone(list.sort((a, b) => b.createdAt - a.createdAt));
    });
  }

  async createProposal(profileId: string, input: { title: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const a = LocalBackend.requireAccess(db, profileId, me);
      if (!a.owner && a.level < 2 && !a.perms.manager) throw new BackendError('forbidden');
      const prop: Proposal = {
        id: uid('r'),
        profileId,
        childName: db.profiles[profileId].name,
        authorId: me.id,
        authorName: memberName(me),
        authorRole: a.owner ? 'parent' : (a.role as CollaboratorRole),
        title: input.title.trim(),
        reason: input.reason?.trim() || undefined,
        ops: clone(input.ops),
        baseVersion: input.baseVersion,
        status: 'pending',
        createdAt: Date.now(),
      };
      db.proposals.push(prop);
      for (const id of LocalBackend.managers(db, profileId))
        if (id !== me.id) LocalBackend.notify(db, id, 'proposal', `${prop.authorName} propose : ${prop.title}`, { profileId, refId: prop.id });
      return clone(prop);
    });
  }

  async updateProposal(id: string, input: { title?: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const prop = db.proposals.find((p) => p.id === id);
      if (!prop || prop.authorId !== me.id) throw new BackendError('forbidden');
      Object.assign(prop, {
        title: input.title?.trim() || prop.title,
        reason: input.reason?.trim() || prop.reason,
        ops: clone(input.ops),
        baseVersion: input.baseVersion,
        status: 'pending',
        decisionNote: undefined,
      });
      for (const uidm of LocalBackend.managers(db, prop.profileId))
        LocalBackend.notify(db, uidm, 'proposal', `${prop.authorName} a révisé : ${prop.title}`, { profileId: prop.profileId, refId: prop.id });
      return clone(prop);
    });
  }

  async setProposalStatus(id: string, status: ProposalStatus, note?: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const prop = db.proposals.find((p) => p.id === id);
      if (!prop) throw new BackendError('not_found');
      if (status === 'withdrawn') {
        if (prop.authorId !== me.id) throw new BackendError('forbidden');
      } else LocalBackend.requireManager(db, prop.profileId, me);
      Object.assign(prop, { status, decisionNote: note?.trim() || undefined, decidedAt: Date.now(), decidedBy: me.id });
      const text =
        status === 'approved'
          ? `Proposition acceptée : ${prop.title}`
          : status === 'declined'
            ? `Proposition refusée : ${prop.title}`
            : status === 'revision'
              ? `Révision demandée : ${prop.title}`
              : '';
      if (text) LocalBackend.notify(db, prop.authorId, status === 'revision' ? 'revision' : 'decision', text, { profileId: prop.profileId, refId: prop.id });
    });
  }

  // ── History ──

  async listHistory(profileId: string): Promise<HistoryEntry[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAccess(db, profileId, LocalBackend.need(m));
      return clone(db.history.filter((h) => h.profileId === profileId).sort((a, b) => b.createdAt - a.createdAt));
    });
  }

  async addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'actorId' | 'actorName'>): Promise<HistoryEntry> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, entry.profileId, me);
      const h: HistoryEntry = { ...clone(entry), id: uid('h'), actorId: me.id, actorName: memberName(me), createdAt: Date.now() };
      db.history.push(h);
      return clone(h);
    });
  }

  async markUndone(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const h = db.history.find((x) => x.id === id);
      if (!h) throw new BackendError('not_found');
      LocalBackend.requireManager(db, h.profileId, me);
      h.undoneAt = Date.now();
    });
  }

  // ── Devices ──

  async listDevices(profileId: string): Promise<Device[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const a = LocalBackend.requireAccess(db, profileId, me);
      const list = db.devices.filter((d) => d.profileId === profileId && (a.owner || a.perms.manager || d.userId === me.id));
      return clone(list);
    });
  }

  async registerDevice(profileId: string, input: { id: string; name: string; kind: Device['kind']; platform: string; appVersion?: string }): Promise<Device> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      let d = db.devices.find((x) => x.id === input.id && x.profileId === profileId);
      if (d?.revoked) throw new BackendError('device_revoked');
      if (!d) {
        d = { ...input, profileId, userId: me.id, pendingChanges: 0, revoked: false, createdAt: Date.now() };
        db.devices.push(d);
      } else Object.assign(d, { name: input.name, kind: input.kind, platform: input.platform, appVersion: input.appVersion });
      return clone(d);
    });
  }

  async reportSync(profileId: string, deviceId: string, info: { synced?: boolean; backedUp?: boolean; pendingChanges?: number }): Promise<void> {
    await this.tx((db) => {
      const d = db.devices.find((x) => x.id === deviceId && x.profileId === profileId);
      if (!d) return;
      if (d.revoked) throw new BackendError('device_revoked');
      if (info.synced) d.lastSyncedAt = Date.now();
      if (info.backedUp) d.lastBackupAt = Date.now();
      if (info.pendingChanges !== undefined) d.pendingChanges = info.pendingChanges;
    });
  }

  async revokeDevice(profileId: string, deviceId: string): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const d = db.devices.find((x) => x.id === deviceId && x.profileId === profileId);
      if (!d) throw new BackendError('not_found');
      d.revoked = true;
      // A device linked with a pairing code has its own access: it ends too.
      const member = db.members.find((x) => x.profileId === profileId && x.userId === d.userId && x.role === 'device');
      if (member) member.status = 'revoked';
    });
  }

  async createPairingCode(profileId: string, access: 'full' | 'use'): Promise<{ code: string; expiresAt: number }> {
    if (access === 'full') await this.requireProof();
    return this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const code = friendlyCode();
      const expiresAt = Date.now() + CODE_TTL;
      db.pairings = db.pairings.filter((p) => p.expiresAt > Date.now() && p.profileId !== profileId);
      db.pairings.push({ code, profileId, access, expiresAt });
      return { code, expiresAt };
    });
  }

  async redeemPairingCode(code: string, device: { id: string; name: string; platform: string }): Promise<string> {
    const deviceAccount = await this.tx((db, m) => {
      const typed = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pairing = db.pairings.find((p) => p.code === typed && p.expiresAt > Date.now());
      if (!pairing) throw new BackendError('code_invalid');
      db.pairings = db.pairings.filter((p) => p !== pairing);
      // The new device gets its own account, limited to this child's profile.
      const acc: StoredAccount = m ?? {
        id: uid('u'),
        role: 'parent',
        displayName: device.name,
        provider: 'device',
        verified: true,
        createdAt: Date.now(),
        prefs: { ...clone(DEFAULT_PREFS), activeProfileId: pairing.profileId },
        salt: uid(),
      };
      db.accounts[acc.id] = acc;
      const full = pairing.access === 'full';
      db.members.push({
        profileId: pairing.profileId,
        userId: acc.id,
        displayName: device.name,
        role: 'device',
        level: full ? 3 : 1,
        perms: full ? preset('parent').perms : preset('device').perms,
        status: 'active',
        createdAt: Date.now(),
      });
      db.devices.push({ ...device, profileId: pairing.profileId, userId: acc.id, kind: full ? 'primary' : 'secondary', pendingChanges: 0, revoked: false, createdAt: Date.now() });
      return { id: acc.id, profileId: pairing.profileId };
    });
    // A tablet signs in without a password: it can never give a fresh proof (as on the real server).
    await store.set(SESSION_KEY, deviceAccount.id);
    await store.set(SESSION_META_KEY, JSON.stringify({ aal: 'aal1', proofAt: 0 }));
    return deviceAccount.profileId;
  }

  // ── Verification ──

  async getVerification(): Promise<Verification | null> {
    return this.tx((db, m) => clone(db.verifications[LocalBackend.need(m).id] ?? null));
  }

  async saveVerification(v: Omit<Verification, 'userId' | 'status' | 'submittedAt' | 'decidedAt'>): Promise<Verification> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const cur = db.verifications[me.id];
      if (cur && (cur.status === 'pending' || cur.status === 'verified')) throw new BackendError('verification_locked');
      const next: Verification = { ...clone(v), userId: me.id, status: cur?.status === 'more_info' ? 'more_info' : 'draft' };
      db.verifications[me.id] = next;
      return clone(next);
    });
  }

  async uploadVerificationDocument(file: { uri: string; name: string; mimeType?: string }): Promise<string> {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    return saveMedia(file.uri, ext);
  }

  async submitVerification(): Promise<Verification> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const v = db.verifications[me.id];
      if (!v || !v.fullName || !v.country || !v.profession || !v.documents.length) throw new BackendError('incomplete');
      Object.assign(v, { status: 'pending', submittedAt: Date.now(), note: undefined });
      return clone(v);
    });
  }

  async demoSetVerificationStatus(status: VerificationStatus, note?: string): Promise<void> {
    await this.tx((db, m) => {
      const v = db.verifications[LocalBackend.need(m).id];
      if (v) Object.assign(v, { status, note, decidedAt: Date.now() });
    });
  }

  // ── Messages to the app's team ──

  async sendFeedback(input: { kind: FeedbackKind; text: string; platform: string; appVersion: string }): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (me.provider === 'device') throw new BackendError('forbidden');
      const text = input.text.trim();
      if (text.length < 3) throw new BackendError('incomplete');
      const mine = (db.feedback ?? []).filter((f) => f.userId === me.id && f.createdAt > Date.now() - 86400000);
      if (mine.length >= 10) throw new BackendError('too_many');
      (db.feedback ??= []).push({
        id: uid('f'),
        userId: me.id,
        kind: input.kind,
        text: text.slice(0, 4000),
        platform: input.platform,
        appVersion: input.appVersion,
        status: 'new',
        createdAt: Date.now(),
        fromName: memberName(me),
        fromRole: me.role,
        fromEmail: me.email,
      });
    });
  }

  async roadmapList(): Promise<RoadmapItem[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const votes = db.roadmapVotes ?? [];
      return LocalBackend.ideas(db)
        .filter((r) => r.status === 'open' || r.status === 'planned')
        .map((r) => ({
          id: r.id,
          title: clone(r.title),
          status: r.status as RoadmapItem['status'],
          votes: (r.base?.parents ?? 0) + (r.base?.pros ?? 0) + votes.filter((v) => v.itemId === r.id).length,
          mine: votes.some((v) => v.itemId === r.id && v.userId === me.id),
        }));
    });
  }

  async roadmapVote(id: string, on: boolean): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (me.provider === 'device') throw new BackendError('forbidden');
      const item = LocalBackend.ideas(db).find((r) => r.id === id && (r.status === 'open' || r.status === 'planned'));
      if (!item) throw new BackendError('not_found');
      db.roadmapVotes = (db.roadmapVotes ?? []).filter((v) => !(v.itemId === id && v.userId === me.id));
      if (on) db.roadmapVotes.push({ itemId: id, userId: me.id, role: me.role });
    });
  }

  /** The ideas to vote for; the demonstration starts with a few examples. */
  private static ideas(db: DB) {
    return (db.roadmap ??= exampleRoadmap(Date.now()));
  }

  // ── Figures for the app's team: only what the family agreed to, known names and numbers ──

  async saveFeatureDay(profileId: string, day: FeatureDay): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      if (!sharesProduct(db.profiles[profileId].data.settings)) throw new BackendError('forbidden');
      if (me.role === 'pro' || (db.admins ?? []).includes(me.id)) throw new BackendError('forbidden');
      const counts: FeatureDay['counts'] = {};
      for (const k of COUNTERS) {
        const v = (day.counts as Record<string, unknown>)[k];
        if (typeof v === 'number' && Number.isFinite(v)) counts[k] = Math.floor(Math.max(0, Math.min(v, k.endsWith('Ms') ? 86400000 : 100000)));
      }
      db.featureDays = (db.featureDays ?? []).filter((f) => !(f.profileId === profileId && f.data.deviceId === day.deviceId && f.data.day === day.day));
      db.featureDays.push({ profileId, data: { day: day.day, deviceId: day.deviceId, counts, platform: day.platform, form: day.form, appVersion: day.appVersion } });
    });
  }

  async reportProblems(profileId: string, items: (ProblemItem & { platform: string; form: string; version: string })[]): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      if (!sharesProduct(db.profiles[profileId].data.settings)) throw new BackendError('forbidden');
      const today = new Date().toISOString().slice(0, 10);
      for (const it of items.slice(0, 40)) {
        if (!PROBLEM_KINDS.includes(it.kind)) continue;
        // Known values only, and nothing that says who (same rules as the real server).
        const row = {
          kind: it.kind,
          name: /^[A-Za-z]{1,30}$/.test(it.name) ? it.name : 'Error',
          at: /^\d{1,7}:\d{1,7}$/.test(it.at) ? it.at : '',
          screen: SCREENS.includes(it.screen) ? it.screen : 'other',
          version: /^[0-9A-Za-z.+-]{1,20}$/.test(it.version) ? it.version : '',
          platform: ['ios', 'android', 'web'].includes(it.platform) ? it.platform : '?',
        };
        const key = Object.values(row).join('|');
        const had = (db.problems ??= {})[key];
        db.problems[key] = { ...row, n: (had?.n ?? 0) + Math.max(1, Math.min(50, Math.floor(it.n || 1))), last: today };
      }
    });
  }

  // ── Back office (the app's own team) ──

  async isAdmin(): Promise<boolean> {
    return this.tx((db, me) => !!me && (db.admins ?? []).includes(me.id));
  }

  async adminVerifications(): Promise<AdminVerification[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const list = Object.values(db.verifications)
        .filter((v) => v.status !== 'draft')
        .map((v): AdminVerification => {
          const a = db.accounts[v.userId];
          return {
            ...clone(v),
            email: a?.email,
            phone: a?.phone,
            accountName: a?.displayName ?? '',
            accountCreatedAt: a?.createdAt ?? 0,
            children: db.members.filter((x) => x.userId === v.userId && x.status === 'active').length,
          };
        });
      const waiting = (v: AdminVerification) => (v.status === 'pending' ? 0 : 1);
      return list.sort((a, b) => waiting(a) - waiting(b) || (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
    });
  }

  async adminDecideVerification(userId: string, status: 'verified' | 'more_info' | 'rejected', note?: string): Promise<void> {
    const gone = await this.tx((db, m) => {
      const me = LocalBackend.requireAdmin(db, m);
      const n = note?.trim() || undefined;
      if (status !== 'verified' && !n) throw new BackendError('note_required');
      const v = db.verifications[userId];
      if (!v || v.status === 'draft') throw new BackendError('not_found');
      // The identity document only served to check the certificate: forgotten once decided.
      const ids = status === 'more_info' ? [] : v.documents.filter((d) => d.kind === 'id');
      if (ids.length) v.documents = v.documents.filter((d) => d.kind !== 'id');
      Object.assign(v, { status, note: n, decidedAt: Date.now() });
      const lang = db.accounts[userId]?.prefs.uiLang ?? 'fr';
      const text = {
        verified: {
          fr: 'Votre certificat a été accepté : vous pouvez maintenant rejoindre l’équipe d’un enfant.',
          en: 'Your certificate was accepted: you can now join a child’s team.',
          ar: 'تم قبول شهادتك: يمكنك الآن الانضمام إلى فريق طفل.',
        },
        more_info: {
          fr: `Vérification : il nous manque une information. ${n}`,
          en: `Verification: we need one more thing. ${n}`,
          ar: `التحقق: نحتاج إلى معلومة إضافية. ${n}`,
        },
        rejected: {
          fr: `Votre demande de vérification n’a pas été acceptée. ${n}`,
          en: `Your verification request was not accepted. ${n}`,
          ar: `لم يتم قبول طلب التحقق. ${n}`,
        },
      }[status][lang];
      LocalBackend.notify(db, userId, 'verification', text);
      LocalBackend.adminNote(db, me, status, v.fullName, n);
      return ids.map((d) => d.ref);
    });
    for (const ref of gone) if (!ref.startsWith('example:')) await deleteMedia(ref).catch(() => {});
  }

  async adminDocumentUrl(userId: string, ref: string): Promise<string> {
    const doc = await this.tx((db, m) => {
      const me = LocalBackend.requireAdmin(db, m);
      const v = db.verifications[userId];
      const d = v?.documents.find((x) => x.ref === ref);
      if (!v || !d) throw new BackendError('not_found');
      LocalBackend.adminNote(db, me, 'open_document', v.fullName, `${d.kind} · ${d.name}`);
      return { ...d, owner: v.fullName };
    });
    if (ref.startsWith('example:')) return exampleDocument(doc.kind, doc.owner);
    const uri = await mediaUri(ref);
    if (!uri) throw new BackendError('not_found');
    return uri;
  }

  /** The demo has no real users: example figures, with this device's own requests and messages. */
  async adminOverview(): Promise<AdminOverview> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const o = exampleOverview(Date.now());
      const status: Record<string, number> = {};
      for (const v of Object.values(db.verifications)) status[v.status] = (status[v.status] ?? 0) + 1;
      o.pros.status = { ...o.pros.status, pending: status.pending ?? 0, more_info: status.more_info ?? 0 };
      const fb = db.feedback ?? [];
      o.feedback = { ...o.feedback, new: fb.filter((f) => f.status === 'new').length };
      return o;
    });
  }

  async adminLog(): Promise<AdminLogEntry[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      return clone((db.adminLog ?? []).slice(0, 200));
    });
  }

  async adminFeedback(): Promise<Feedback[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const list = clone(db.feedback ?? []).map(({ userId: _u, ...f }) => f);
      return list.sort((a, b) => (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || b.createdAt - a.createdAt);
    });
  }

  async adminSetFeedback(id: string, status: 'new' | 'done'): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const f = (db.feedback ?? []).find((x) => x.id === id);
      if (!f) throw new BackendError('not_found');
      f.status = status;
    });
  }

  /** The demo has no real families: example figures (the page says so). */
  async adminProduct(): Promise<AdminProduct> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      return exampleProduct(Date.now());
    });
  }

  /** Example figures, plus the problems really met on this device by a board whose family agreed. */
  async adminBugs(): Promise<AdminBugs> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const o = exampleBugs(Date.now());
      for (const p of Object.values(db.problems ?? {})) {
        o.total += p.n;
        o.kinds[p.kind] = (o.kinds[p.kind] ?? 0) + p.n;
        o.screens[p.screen] = (o.screens[p.screen] ?? 0) + p.n;
        o.platforms[p.platform] = (o.platforms[p.platform] ?? 0) + p.n;
        o.versions[p.version || '?'] = (o.versions[p.version || '?'] ?? 0) + p.n;
        o.daily[o.daily.length - 1].n += p.n;
        o.top.unshift(clone(p));
      }
      return o;
    });
  }

  async adminRetention(): Promise<AdminRetention> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const team = db.admins ?? [];
      return {
        inactiveAccounts: 0,
        inBin: Object.values(db.profiles).filter((p) => p.deletedAt).length,
        filesWaiting: 0,
        twoStepTeam: team.filter((id) => db.accounts[id]?.twoStep?.on).length,
        team: team.length,
        consents: (db.consents ?? []).filter((c) => Date.now() - c.at < 30 * 86_400_000).length,
      };
    });
  }

  async adminRoadmap(): Promise<AdminRoadmapItem[]> {
    return this.tx((db, m) => {
      LocalBackend.requireAdmin(db, m);
      const votes = db.roadmapVotes ?? [];
      const count = (id: string, role: string) => votes.filter((v) => v.itemId === id && v.role === role).length;
      return LocalBackend.ideas(db)
        .map((r) => {
          const parents = (r.base?.parents ?? 0) + count(r.id, 'parent');
          const pros = (r.base?.pros ?? 0) + count(r.id, 'pro');
          return { id: r.id, title: clone(r.title), status: r.status, votes: parents + pros, parents, pros, createdAt: r.createdAt };
        })
        .sort((a, b) => Number(a.status === 'hidden') - Number(b.status === 'hidden') || b.votes - a.votes || a.createdAt - b.createdAt);
    });
  }

  async adminRoadmapSave(input: { id?: string; title: Record<UiLang, string>; status: RoadmapStatus }): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.requireAdmin(db, m);
      const title = { fr: (input.title.fr ?? '').trim().slice(0, 120), en: (input.title.en ?? '').trim().slice(0, 120), ar: (input.title.ar ?? '').trim().slice(0, 120) };
      if (!title.fr && !title.en && !title.ar) throw new BackendError('incomplete');
      const list = LocalBackend.ideas(db);
      const had = input.id ? list.find((r) => r.id === input.id) : undefined;
      if (input.id && !had) throw new BackendError('not_found');
      if (had) Object.assign(had, { title, status: input.status });
      else list.push({ id: uid('r'), title, status: input.status, createdAt: Date.now() });
      LocalBackend.adminNote(db, me, 'roadmap', title.en || title.fr || title.ar, input.status);
    });
  }

  /**
   * Demonstration: signs in as a member of the app's team. The first time, a few example
   * professionals (invented people, example documents) are waiting, so the page is not empty.
   * A request really sent on this device by a professional account appears there too.
   */
  async demoOpenBackOffice(): Promise<Account> {
    const acc = await this.tx((db) => {
      const email = 'equipe@demo.local';
      let a = LocalBackend.findAccount(db, { email });
      if (!a) {
        a = { id: uid('u'), role: 'parent', displayName: 'Équipe (démo)', email, provider: 'email', verified: true, createdAt: Date.now(), prefs: clone(DEFAULT_PREFS), salt: uid() };
        db.accounts[a.id] = a;
      }
      db.admins = [...new Set([...(db.admins ?? []), a.id])];
      if (!db.backOfficeSeeded) {
        db.backOfficeSeeded = true;
        const ex = exampleRequests(Date.now());
        for (const r of ex.people) {
          const id = uid('u');
          db.accounts[id] = { id, role: 'pro', displayName: r.fullName, email: r.email, provider: 'email', verified: true, createdAt: r.createdAt, prefs: clone(DEFAULT_PREFS), salt: uid() };
          db.verifications[id] = { ...r.request, userId: id };
        }
        for (const f of ex.messages) (db.feedback ??= []).push({ ...f, id: uid('f'), userId: a.id });
      }
      return a;
    });
    // The demonstration's shortcut stands for a team member who signed in with the two-step code.
    await this.startSession(acc.id, 'aal2');
    return LocalBackend.public(acc);
  }

  // ── Notifications ──

  // ── Communication data (Suivi) ──

  /** People who may see a child's data: the family, and those given "see the progress data". */
  private static canViewData(db: DB, profileId: string, me: StoredAccount): boolean {
    const a = LocalBackend.access(db, profileId, me.id);
    return !!a && (a.owner || !!a.perms.manager || !!a.perms.viewData);
  }

  async saveUsageDay(profileId: string, data: UsageDay): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      const level = (db.profiles[profileId]?.data.settings as { dataCollection?: UsageDay['level'] | 'off' }).dataCollection ?? 'off';
      const kept = limitToConsent(data, level);
      if (!kept) throw new BackendError('forbidden');
      db.usage = (db.usage ?? []).filter((u) => !(u.profileId === profileId && u.data.deviceId === data.deviceId && u.data.day === data.day));
      db.usage.push({ profileId, data: kept });
    });
  }

  async listUsage(profileId: string, fromDay: string): Promise<UsageDay[]> {
    return this.tx((db, m) => {
      if (!LocalBackend.canViewData(db, profileId, LocalBackend.need(m))) throw new BackendError('forbidden');
      return clone((db.usage ?? []).filter((u) => u.profileId === profileId && u.data.day >= fromDay).map((u) => u.data));
    });
  }

  async deleteUsage(profileId: string): Promise<void> {
    await this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      db.usage = (db.usage ?? []).filter((u) => u.profileId !== profileId);
    });
  }

  async listObservations(profileId: string): Promise<Observation[]> {
    return this.tx((db, m) => {
      if (!LocalBackend.canViewData(db, profileId, LocalBackend.need(m))) throw new BackendError('forbidden');
      return clone((db.observations ?? []).filter((o) => o.profileId === profileId).sort((a, b) => b.at - a.at));
    });
  }

  async saveObservation(o: Omit<Observation, 'id' | 'createdBy' | 'authorName' | 'createdAt'> & { id?: string }): Promise<Observation> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (me.provider === 'device' || !LocalBackend.canViewData(db, o.profileId, me)) throw new BackendError('forbidden');
      db.observations ??= [];
      const old = o.id ? db.observations.find((x) => x.id === o.id && x.profileId === o.profileId) : undefined;
      const next: Observation = {
        ...(old ?? { createdBy: me.id, authorName: memberName(me), createdAt: Date.now() }),
        ...clone(o),
        id: old?.id ?? uid('o'),
      } as Observation;
      db.observations = db.observations.filter((x) => x.id !== next.id);
      db.observations.push(next);
      return clone(next);
    });
  }

  async deleteObservation(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const o = (db.observations ?? []).find((x) => x.id === id);
      if (!o) return;
      if (!LocalBackend.canViewData(db, o.profileId, me)) throw new BackendError('forbidden');
      db.observations = (db.observations ?? []).filter((x) => x.id !== id);
    });
  }

  async demoSeedUsage(profileId: string, label: (id: string) => string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireManager(db, profileId, me);
      const days = demoUsage('demo-tablet', 'ios · iPad');
      db.usage = [...(db.usage ?? []).filter((u) => !(u.profileId === profileId && u.data.deviceId === 'demo-tablet')), ...days.map((data) => ({ profileId, data }))];
      db.observations ??= [];
      for (const o of demoObservations(days, label)) {
        db.observations.push({ ...o, id: uid('o'), profileId, createdBy: me.id, authorName: memberName(me), createdAt: Date.now() } as Observation);
      }
    });
  }

  async listNotices(): Promise<Notice[]> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      return clone(db.notices.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100));
    });
  }

  async markNoticesRead(ids?: string[]): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      for (const n of db.notices) if (n.userId === me.id && (!ids || ids.includes(n.id))) n.read = true;
    });
  }

  // ── Library ──

  async listResources(): Promise<{ mine: Resource[]; sharedWithMe: Resource[] }> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const mine = db.resources.filter((r) => r.ownerId === me.id);
      const shared = db.resources.filter(
        (r) => r.ownerId !== me.id && r.shares.some((s) => s.userId === me.id || (s.profileId && LocalBackend.access(db, s.profileId, me.id))),
      );
      return { mine: clone(mine), sharedWithMe: clone(shared) };
    });
  }

  async saveResource(r: Omit<Resource, 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt' | 'shares'> & { shares?: ResourceShare[] }): Promise<Resource> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const existing = db.resources.find((x) => x.id === r.id);
      if (existing && existing.ownerId !== me.id && !existing.shares.some((s) => s.userId === me.id && s.mode === 'edit'))
        throw new BackendError('forbidden');
      if (r.profileId) LocalBackend.requireAccess(db, r.profileId, me);
      const next: Resource = {
        ...clone(r),
        ownerId: existing?.ownerId ?? me.id,
        ownerName: existing?.ownerName ?? memberName(me),
        shares: existing?.shares ?? r.shares ?? [],
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      db.resources = db.resources.filter((x) => x.id !== r.id);
      db.resources.push(next);
      return clone(next);
    });
  }

  async deleteResource(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      db.resources = db.resources.filter((x) => !(x.id === id && x.ownerId === me.id));
    });
  }

  async shareResource(id: string, target: { email?: string; profileId?: string; mode: 'view' | 'edit' }): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const r = db.resources.find((x) => x.id === id && x.ownerId === me.id);
      if (!r) throw new BackendError('not_found');
      const share: ResourceShare = { mode: target.mode, sharedBy: me.id, sharedAt: Date.now() };
      if (target.profileId) {
        LocalBackend.requireAccess(db, target.profileId, me);
        share.profileId = target.profileId;
        for (const uidm of LocalBackend.managers(db, target.profileId))
          LocalBackend.notify(db, uidm, 'share', `${memberName(me)} a partagé « ${r.title} ».`, { profileId: target.profileId, refId: r.id });
      } else {
        const to = LocalBackend.findAccount(db, { email: target.email });
        if (!to) throw new BackendError('no_account');
        share.userId = to.id;
        LocalBackend.notify(db, to.id, 'share', `${memberName(me)} a partagé « ${r.title} » avec vous.`, { refId: r.id });
      }
      r.shares.push(share);
    });
  }
}
