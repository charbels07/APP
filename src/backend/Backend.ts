/**
 * Everything the app can ask "the server". Two implementations follow this contract:
 *  - LocalBackend: a server simulated on the device (demo, offline use);
 *  - SupabaseBackend: the real online server (database, logins, file storage).
 * Screens only talk to this interface, so switching to the real server changes no screen.
 */
import type { AiRequest } from '../../supabase/functions/_shared/aiPrompts';
import type { Profile } from '../model/types';
import type { Op } from '../lib/profileDiff';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';
import type {
  Observation,
  UsageDay,
  Account,
  AccountPrefs,
  AdminLogEntry,
  AdminOverview,
  AdminVerification,
  Feedback,
  FeedbackKind,
  ChildRecord,
  Device,
  HistoryEntry,
  Intake,
  Invitation,
  Membership,
  Notice,
  ProfileSummary,
  Proposal,
  ProposalStatus,
  Resource,
  ResourceShare,
  Role,
  SaveResult,
  Verification,
  VerificationStatus,
} from './types';

/** Thrown with a code the screens translate (wrong_password, code_invalid, conflict…). */
export class BackendError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export interface SignInMethods {
  google: boolean;
  apple: boolean;
  phone: boolean;
}

export interface SignUpInput {
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  password: string;
}

/** A code was sent; in the demo it is also returned so it can be shown on screen. */
export interface CodeSent {
  sentTo: string;
  demoCode?: string;
  /** No code needed: the server confirmed the account at once and it is signed in. */
  signedIn?: boolean;
}

export interface Backend {
  readonly kind: 'local' | 'supabase';

  // ── Accounts ──
  currentAccount(): Promise<Account | null>;
  signUp(input: SignUpInput): Promise<CodeSent>;
  /** Confirms the email or phone with the code received. */
  verifyCode(target: { email?: string; phone?: string }, code: string): Promise<Account>;
  resendCode(target: { email?: string; phone?: string }): Promise<CodeSent>;
  signIn(input: { email?: string; phone?: string; password: string }): Promise<Account>;
  /** Google or Apple. `role` is used when this creates the account. */
  signInWithProvider(provider: 'google' | 'apple', role: Role): Promise<Account>;
  /**
   * Which extra ways to sign in are turned on (e-mail + password always is). The screens only
   * offer these. Absent = all of them (the demo server plays them all).
   */
  signInMethods?(): Promise<SignInMethods>;
  signOut(): Promise<void>;
  requestPasswordReset(target: { email?: string; phone?: string }): Promise<CodeSent>;
  resetPassword(target: { email?: string; phone?: string }, code: string, password: string): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  updateAccount(patch: { displayName?: string; email?: string; phone?: string; prefs?: Partial<AccountPrefs> }): Promise<Account>;
  deleteAccount(): Promise<void>;

  // ── Children's AAC profiles ──
  listProfiles(): Promise<ProfileSummary[]>;
  createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile }): Promise<ChildRecord>;
  getProfile(id: string): Promise<ChildRecord>;
  /** Saves only if nobody saved a newer version meanwhile (otherwise returns that version). */
  saveProfile(id: string, data: Profile, baseVersion: number): Promise<SaveResult>;
  deleteProfile(id: string): Promise<void>;
  /** This account's access to a profile. */
  myAccess(profileId: string): Promise<{ owner: boolean; role: CollaboratorRole | 'owner'; level: AccessLevel; perms: PermissionSet } | null>;

  // ── Team ──
  listMembers(profileId: string): Promise<Membership[]>;
  updateMember(profileId: string, userId: string, patch: { level?: AccessLevel; perms?: PermissionSet; role?: CollaboratorRole; expiresAt?: number | null }): Promise<void>;
  revokeMember(profileId: string, userId: string): Promise<void>;
  invite(
    profileId: string,
    input: { email?: string; name?: string; role: CollaboratorRole; level: AccessLevel; perms: PermissionSet },
  ): Promise<Invitation>;
  /** Invitations sent for a profile (family side). */
  profileInvitations(profileId: string): Promise<Invitation[]>;
  /** Invitations received and connection requests sent (this account). */
  myInvitations(): Promise<{ received: Invitation[]; sent: Invitation[] }>;
  respondInvitation(id: string, accept: boolean): Promise<void>;
  /** Accept an invitation from its link / code. */
  acceptInvitationCode(code: string): Promise<Invitation>;
  cancelInvitation(id: string): Promise<void>;
  resendInvitation(id: string): Promise<Invitation>;
  /** The family's code a professional enters to ask for a connection (option B). */
  connectionCode(profileId: string, renew?: boolean): Promise<string>;
  requestConnection(code: string, input: { role: CollaboratorRole; level: AccessLevel; perms: PermissionSet; message?: string }): Promise<Invitation>;
  /** Family approves a professional's request, possibly with other permissions. */
  approveRequest(id: string, grant: { level: AccessLevel; perms: PermissionSet }): Promise<void>;

  // ── Proposals ──
  listProposals(filter: { profileId: string } | { mine: true }): Promise<Proposal[]>;
  createProposal(profileId: string, input: { title: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal>;
  /** Revision: the author updates a proposal that was sent back. */
  updateProposal(id: string, input: { title?: string; reason?: string; ops: Op[]; baseVersion: number }): Promise<Proposal>;
  setProposalStatus(id: string, status: ProposalStatus, note?: string): Promise<void>;

  // ── Change history (settings and vocabulary only, never messages) ──
  listHistory(profileId: string): Promise<HistoryEntry[]>;
  addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'actorId' | 'actorName'>): Promise<HistoryEntry>;
  markUndone(id: string): Promise<void>;

  // ── Devices ──
  listDevices(profileId: string): Promise<Device[]>;
  registerDevice(profileId: string, input: { id: string; name: string; kind: Device['kind']; platform: string; appVersion?: string }): Promise<Device>;
  reportSync(profileId: string, deviceId: string, info: { synced?: boolean; backedUp?: boolean; pendingChanges?: number }): Promise<void>;
  revokeDevice(profileId: string, deviceId: string): Promise<void>;
  createPairingCode(profileId: string, access: 'full' | 'use'): Promise<{ code: string; expiresAt: number }>;
  /** On a new device: links it to the child's profile. */
  redeemPairingCode(code: string, device: { id: string; name: string; platform: string }): Promise<string>;

  // ── Professional verification ──
  getVerification(): Promise<Verification | null>;
  saveVerification(v: Omit<Verification, 'userId' | 'status' | 'submittedAt' | 'decidedAt'>): Promise<Verification>;
  uploadVerificationDocument(file: { uri: string; name: string; mimeType?: string }): Promise<string>;
  submitVerification(): Promise<Verification>;
  /** Demo only (the real decision is made in the back-office). */
  demoSetVerificationStatus?(status: VerificationStatus, note?: string): Promise<void>;

  // ── Communication data (Suivi), with the family's consent ──
  /** Stores what this device recorded today (refused if the family turned collection off). */
  saveUsageDay(profileId: string, data: UsageDay): Promise<void>;
  /** Every device's days from `fromDay` (YYYY-MM-DD): family and people allowed to see the data. */
  listUsage(profileId: string, fromDay: string): Promise<UsageDay[]>;
  /** Erases every recorded day of this child (family or team manager). */
  deleteUsage(profileId: string): Promise<void>;
  listObservations(profileId: string): Promise<Observation[]>;
  saveObservation(o: Omit<Observation, 'id' | 'createdBy' | 'authorName' | 'createdAt'> & { id?: string }): Promise<Observation>;
  deleteObservation(id: string): Promise<void>;
  /** AI helper (server function "caa-ai", Claude): words for an activity board from a topic or a
   *  photo, or what a drawing shows. Absent when no server is configured. */
  askAi?(req: AiRequest, signal?: AbortSignal): Promise<unknown>;
  /** Demonstration only (local backend): fills the progress pages with an example. */
  demoSeedUsage?(profileId: string, label: (id: string) => string): Promise<void>;

  // ── Messages to the app's team ──
  /** An idea or a problem, written from the app (never about a child by name). */
  sendFeedback(input: { kind: FeedbackKind; text: string; platform: string; appVersion: string }): Promise<void>;

  // ── Back office: the app's own team only (the server refuses everybody else) ──
  isAdmin(): Promise<boolean>;
  /** Every request that was sent, the ones waiting first. */
  adminVerifications(): Promise<AdminVerification[]>;
  /**
   * Accept ('verified': the professional can start working), ask for something more or refuse.
   * A note for the professional is required unless accepted. The identity document is deleted
   * as soon as the request is accepted or refused.
   */
  adminDecideVerification(userId: string, status: 'verified' | 'more_info' | 'rejected', note?: string): Promise<void>;
  /** An address to look at a certificate for a few minutes; who opened it is written in the log. */
  adminDocumentUrl(userId: string, ref: string): Promise<string>;
  adminOverview(): Promise<AdminOverview>;
  adminLog(): Promise<AdminLogEntry[]>;
  adminFeedback(): Promise<Feedback[]>;
  adminSetFeedback(id: string, status: 'new' | 'done'): Promise<void>;
  /** Demonstration only (local backend): signs in as the app's team, with example requests and figures. */
  demoOpenBackOffice?(): Promise<Account>;

  // ── Notifications ──
  listNotices(): Promise<Notice[]>;
  markNoticesRead(ids?: string[]): Promise<void>;

  // ── Professional library ──
  listResources(): Promise<{ mine: Resource[]; sharedWithMe: Resource[] }>;
  saveResource(r: Omit<Resource, 'ownerId' | 'ownerName' | 'createdAt' | 'updatedAt' | 'shares'> & { shares?: ResourceShare[] }): Promise<Resource>;
  deleteResource(id: string): Promise<void>;
  shareResource(id: string, target: { email?: string; profileId?: string; mode: 'view' | 'edit' }): Promise<void>;
}
