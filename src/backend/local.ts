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
import type { Profile } from '../model/types';
import type { Op } from '../lib/profileDiff';
import { type AccessLevel, type CollaboratorRole, type PermissionSet, preset } from '../lib/permissions';
import { saveMedia } from '../lib/media';
import { BackendError, type Backend, type CodeSent, type SignUpInput } from './Backend';
import {
  DEFAULT_PREFS,
  type Account,
  type AccountPrefs,
  type ChildRecord,
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
const CODE_TTL = 10 * 60 * 1000;

interface StoredAccount extends Account {
  salt: string;
  hash?: string;
}
interface PendingCode {
  target: string;
  code: string;
  purpose: 'verify' | 'reset';
  expiresAt: number;
}
interface StoredProfile extends ChildRecord {
  connectionCode?: string;
}
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
      const raw = await AsyncStorage.getItem(DB_KEY);
      const db: DB = raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb();
      const sid = (await AsyncStorage.getItem(SESSION_KEY)) ?? '';
      const me = db.accounts[sid] ?? null;
      const out = await fn(db, me);
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
      return out;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  private static need(me: StoredAccount | null): StoredAccount {
    if (!me) throw new BackendError('not_signed_in');
    return me;
  }

  private static notify(db: DB, userId: string | undefined, kind: NoticeKind, text: string, extra: { profileId?: string; refId?: string } = {}) {
    if (!userId) return;
    db.notices.push({ id: uid('n'), userId, kind, text, createdAt: Date.now(), read: false, ...extra });
  }

  /** Owner, or an active, non-expired member. */
  private static access(db: DB, profileId: string, userId: string) {
    const p = db.profiles[profileId];
    if (!p) return null;
    if (p.ownerId === userId) return { owner: true, role: 'owner' as const, level: 3 as AccessLevel, perms: preset('parent').perms };
    const m = db.members.find((x) => x.profileId === profileId && x.userId === userId && x.status === 'active');
    if (!m || (m.expiresAt && m.expiresAt < Date.now())) return null;
    return { owner: false, role: m.role, level: m.level, perms: m.perms };
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
    await AsyncStorage.setItem(SESSION_KEY, acc.id);
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
    await AsyncStorage.setItem(SESSION_KEY, acc.id);
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
    await AsyncStorage.setItem(SESSION_KEY, acc.id);
    return LocalBackend.public(acc);
  }

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
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
      delete db.verifications[me.id];
      delete db.accounts[me.id];
    });
    await AsyncStorage.removeItem(SESSION_KEY);
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

  async createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile }): Promise<ChildRecord> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      const rec: StoredProfile = {
        id: uid('p'),
        ownerId: me.id,
        name: input.name.trim(),
        age: input.age,
        intake: input.intake,
        data: clone(input.data),
        version: 1,
        updatedAt: Date.now(),
        updatedBy: me.id,
      };
      db.profiles[rec.id] = rec;
      return clone(rec);
    });
  }

  async getProfile(id: string): Promise<ChildRecord> {
    return this.tx((db, m) => {
      LocalBackend.requireAccess(db, id, LocalBackend.need(m));
      const { connectionCode: _c, ...rec } = db.profiles[id];
      return clone(rec);
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
      Object.assign(p, { data: clone(data), version: p.version + 1, updatedAt: Date.now(), updatedBy: me.id });
      return { ok: true, version: p.version };
    });
  }

  async deleteProfile(id: string): Promise<void> {
    await this.tx((db, m) => {
      const me = LocalBackend.need(m);
      if (db.profiles[id]?.ownerId !== me.id) throw new BackendError('forbidden');
      delete db.profiles[id];
      const other = <T extends { profileId?: string }>(x: T) => x.profileId !== id;
      db.members = db.members.filter(other);
      db.invitations = db.invitations.filter(other);
      db.proposals = db.proposals.filter(other);
      db.history = db.history.filter(other);
      db.devices = db.devices.filter(other);
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
      LocalBackend.requireAccess(db, profileId, LocalBackend.need(m));
      return clone(db.members.filter((x) => x.profileId === profileId));
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
        level: input.level,
        perms: input.perms,
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
    const acc = db.accounts[userId];
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
        if (accept) LocalBackend.join(db, inv, inv.fromUserId);
        else inv.status = 'declined';
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
      const inv = db.invitations.find((i) => i.direction === 'invite' && i.status === 'pending' && i.code === code.trim().toUpperCase());
      if (!inv) throw new BackendError('code_invalid');
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
        perms: input.perms,
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
      LocalBackend.join(db, inv, inv.fromUserId, grant);
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

  async registerDevice(profileId: string, input: { id: string; name: string; kind: Device['kind']; platform: string }): Promise<Device> {
    return this.tx((db, m) => {
      const me = LocalBackend.need(m);
      LocalBackend.requireAccess(db, profileId, me);
      let d = db.devices.find((x) => x.id === input.id && x.profileId === profileId);
      if (d?.revoked) throw new BackendError('device_revoked');
      if (!d) {
        d = { ...input, profileId, userId: me.id, pendingChanges: 0, revoked: false, createdAt: Date.now() };
        db.devices.push(d);
      } else Object.assign(d, { name: input.name, kind: input.kind, platform: input.platform });
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
    return this.tx((db, m) => {
      LocalBackend.requireManager(db, profileId, LocalBackend.need(m));
      const code = digits(6);
      const expiresAt = Date.now() + CODE_TTL;
      db.pairings = db.pairings.filter((p) => p.expiresAt > Date.now());
      db.pairings.push({ code, profileId, access, expiresAt });
      return { code, expiresAt };
    });
  }

  async redeemPairingCode(code: string, device: { id: string; name: string; platform: string }): Promise<string> {
    const deviceAccount = await this.tx((db, m) => {
      const pairing = db.pairings.find((p) => p.code === code.trim() && p.expiresAt > Date.now());
      if (!pairing) throw new BackendError('code_invalid');
      db.pairings = db.pairings.filter((p) => p !== pairing);
      // The new device gets its own account, limited to this child's profile.
      const acc: StoredAccount = m ?? {
        id: uid('u'),
        role: 'parent',
        displayName: device.name,
        provider: 'email',
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
    await AsyncStorage.setItem(SESSION_KEY, deviceAccount.id);
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

  // ── Notifications ──

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
