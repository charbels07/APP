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
import type { ProblemItem } from '../lib/product';
import type { UiLang } from '../model/types';
import type {
  Observation,
  UsageDay,
  Account,
  AccountPrefs,
  AdminBugs,
  AdminLogEntry,
  AdminOverview,
  AdminProduct,
  AdminRoadmapItem,
  AdminVerification,
  FeatureDay,
  RoadmapItem,
  RoadmapStatus,
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

/** Security page of the back office: counts only. */
export interface AdminRetention {
  inactiveAccounts: number;
  inBin: number;
  filesWaiting: number;
  twoStepTeam: number;
  team: number;
  consents: number;
}

/** Where the signed-in account stands for two-step sign-in (src/ui/TwoStep.tsx). */
export interface SecurityState {
  /** On the app's team: the back office is shown, and opens once the code was typed. */
  team: boolean;
  /** Two-step sign-in (a code from an authenticator app) is on for this account. */
  twoStep: boolean;
  /** 'aal2': the authenticator code was typed in this session. */
  level: 'aal1' | 'aal2';
}

/** A child's profile in the family's bin: put back until `eraseAt`, then erased for good. */
export interface BinEntry {
  id: string;
  name: string;
  deletedAt: number;
  eraseAt: number;
}

/** A copy of the board kept by the server (the content is not listed, only when and why). */
export interface Snapshot {
  id: string;
  createdAt: number;
  reason: 'weekly' | 'big_change' | 'before_restore' | 'manual';
  version: number;
  /** Cards with a word on them, all boards together. */
  words: number;
}

/** Turning two-step sign-in on: what the authenticator app needs. */
export interface TwoStepSetup {
  factorId: string;
  /** The key to type by hand, in groups of letters and digits. */
  secret: string;
  /** otpauth:// link (what the QR code holds). */
  uri: string;
  /** The QR code as SVG text (the real server makes one). */
  qrSvg?: string;
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
  /**
   * Checks a code sent by `requestPasswordReset` without changing the password: proves that the
   * person holds the account's mailbox or phone (e.g. to choose a new caregiver code they forgot).
   */
  checkResetCode(target: { email?: string; phone?: string }, code: string): Promise<void>;
  /**
   * Checks the signed-in account's own password without changing anything: the other way to prove
   * it is the account's owner (forgotten caregiver code). A tablet linked with a code has none.
   */
  checkPassword(password: string): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  updateAccount(patch: { displayName?: string; email?: string; phone?: string; prefs?: Partial<AccountPrefs> }): Promise<Account>;
  deleteAccount(): Promise<void>;

  // ── Two-step sign-in and fresh proofs ──
  /** Team or not, two-step on or not, code typed in this session or not (the database decides). */
  security(): Promise<SecurityState>;
  /** Starts turning two-step sign-in on: a new authenticator key (not active until confirmed). */
  twoStepStart(): Promise<TwoStepSetup>;
  /** The first code from the authenticator app: two-step sign-in is now on. */
  twoStepConfirm(factorId: string, code: string): Promise<void>;
  /** The code at sign-in (or as a fresh proof): this session may now read the children's data. */
  twoStepCode(code: string): Promise<void>;
  /** Turns it off (a current code is asked first). */
  twoStepOff(code: string): Promise<void>;
  /** Demonstration only: the code an authenticator app would show now. */
  demoTwoStepCode?(): Promise<string | undefined>;

  // ── Children's AAC profiles ──
  listProfiles(): Promise<ProfileSummary[]>;
  /** `consent`: the version of the parent's consent the person ticked (src/lib/consent.ts); a family needs it. */
  createProfile(input: { name: string; age?: number; intake?: Intake; data: Profile; consent?: number }): Promise<ChildRecord>;
  /** The parent's consent, kept with its date and text version (before taking over a profile a professional prepared). */
  giveConsent(version: number): Promise<void>;
  /** Everything the server holds about this account and the children whose profile it owns (one JSON document). Needs a fresh proof. */
  exportMyData(): Promise<unknown>;
  getProfile(id: string): Promise<ChildRecord>;
  /** Only the server's version number of a profile (a few bytes): an open board asks it often, the whole profile only when newer. */
  profileVersion(id: string): Promise<number>;
  /** Saves only if nobody saved a newer version meanwhile (otherwise returns that version). */
  saveProfile(id: string, data: Profile, baseVersion: number): Promise<SaveResult>;
  /** Moves the profile to the family's bin (kept 30 days, then erased). Needs a fresh proof (`proof_needed`). */
  deleteProfile(id: string): Promise<void>;
  /** The family's bin: profiles deleted in the last 30 days. */
  listBin(): Promise<BinEntry[]>;
  restoreProfile(id: string): Promise<void>;
  /** Copies of the board kept by the server (weekly, before a big change, by hand): the family and managers. */
  listSnapshots(profileId: string): Promise<Snapshot[]>;
  takeSnapshot(profileId: string): Promise<void>;
  /** Puts a copy back (the board as it is now is kept first); returns the new version. */
  restoreSnapshot(snapshotId: string): Promise<number>;
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

  // ── A child's photos and recordings, copied through the account (src/state/mediaSync.ts) ──
  // Private: `profile-media/<profile id>/<name>`, for the child's team only. The name is the one
  // the profile uses (`isSyncable` in src/lib/mediaPlan.ts); anything else is refused.
  /**
   * Sends one file. Refused ('forbidden'): this person may not change the board (a use-only tablet,
   * someone removed from the team); 'too_large', 'media_type', 'media_quota' (the child's space is
   * full), 'too_many' (too many today); 'exists': the account already has it.
   */
  uploadMedia(profileId: string, name: string, body: ArrayBuffer | Blob, contentType: string): Promise<void>;
  /** An address that downloads one file for a few minutes ('not_found' when the account does not have it). */
  mediaUrl(profileId: string, name: string): Promise<string>;
  /** The files the account keeps for this child. */
  listMedia(profileId: string): Promise<{ name: string; size: number; createdAt: number }[]>;
  /** Removes files from the account (the child's managers; a missing file, or someone else's refusal, is silent). */
  removeMedia(profileId: string, names: string[]): Promise<void>;

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
  /** Is the AI helper installed on the server? (When it is not, the app shows nothing about AI.) */
  aiReady?(): Promise<boolean>;
  /** Demonstration only (local backend): fills the progress pages with an example. */
  demoSeedUsage?(profileId: string, label: (id: string) => string): Promise<void>;

  // ── Figures for the app's team, only from the families who agreed (src/lib/product.ts) ──
  /** What this device counted today: feature names from a fixed list and numbers. Refused without the family's agreement. */
  saveFeatureDay(profileId: string, day: FeatureDay): Promise<void>;
  /** Technical problems met on this device (kind, screen, place in the code): stored without any link to the child. */
  reportProblems(profileId: string, items: (ProblemItem & { platform: string; form: string; version: string })[]): Promise<void>;

  // ── Messages to the app's team ("Help us improve") ──
  /** A request or a problem, written from the app (never about a child by name). */
  sendFeedback(input: { kind: FeedbackKind; text: string; platform: string; appVersion: string }): Promise<void>;
  /** The ideas the team puts to the vote, with the number of votes and whether I voted. */
  roadmapList(): Promise<RoadmapItem[]>;
  roadmapVote(id: string, on: boolean): Promise<void>;

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
  /** Feature adoption and task figures: sums over at least 5 children of 5 families who agreed. */
  adminProduct(): Promise<AdminProduct>;
  /** Technical problems of the last 30 days. */
  adminBugs(): Promise<AdminBugs>;
  adminRoadmap(): Promise<AdminRoadmapItem[]>;
  /** Counts for the Security page: accounts without a sign-in for 24 months, profiles in the bin, files waiting to be deleted… */
  adminRetention(): Promise<AdminRetention>;
  /** Adds an idea to vote for (no `id`) or changes its title or status. */
  adminRoadmapSave(input: { id?: string; title: Record<UiLang, string>; status: RoadmapStatus }): Promise<void>;
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
