/**
 * What the server stores: accounts, the children's AAC profiles, who may work on them,
 * invitations, proposals, change history, devices, professional verification,
 * notifications and the professionals' libraries.
 *
 * Both backends (the local demo server and Supabase) use exactly these shapes.
 */
import type { Board, Concept, ConceptOverride, Profile, Schedule, UiLang } from '../model/types';
import type { Op } from '../lib/profileDiff';
import type { AccessLevel, CollaboratorRole, PermissionSet } from '../lib/permissions';

export type Role = 'parent' | 'pro';
/** 'device': a tablet linked with a pairing code (no email, no password). */
export type AuthProvider = 'email' | 'phone' | 'google' | 'apple' | 'device';

export interface AccountPrefs {
  uiLang?: UiLang;
  notifications: { invitations: boolean; proposals: boolean; sync: boolean; billing: boolean };
  /** Text size of the parent / professional screens (not the child's board). */
  textSize: 'normal' | 'large';
  /** Professional workspace tour already shown. */
  tourDone?: boolean;
  /** Contextual guides already seen (ids). */
  tipsSeen?: string[];
  /** The child profile opened last. */
  activeProfileId?: string;
}

export interface Account {
  id: string;
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  provider: AuthProvider;
  /** Email or phone confirmed with a code (always true for Google / Apple). */
  verified: boolean;
  createdAt: number;
  prefs: AccountPrefs;
}

export const DEFAULT_PREFS: AccountPrefs = {
  notifications: { invitations: true, proposals: true, sync: true, billing: true },
  textSize: 'normal',
};

/** Answers of the child's profile questionnaire ("Communication today"). */
export interface Intake {
  speech: 'none' | 'some_words' | 'speech_support' | 'varies' | 'unsure';
  otherWays: ('gestures' | 'pictures' | 'other_aac' | 'typing' | 'expressions' | 'other')[];
  aacBefore: 'new' | 'cards' | 'app' | 'unsure';
  activities: string[];
}

/** A child's AAC profile as stored on the server. */
export interface ChildRecord {
  id: string;
  ownerId: string;
  name: string;
  age?: number;
  intake?: Intake;
  /** The AAC profile itself (boards, words, settings…), the same document the app uses. */
  data: Profile;
  /** Increases at every saved change: used to detect two people changing at the same time. */
  version: number;
  updatedAt: number;
  updatedBy: string;
}

/** A profile as listed for the current account, with that account's access. */
export interface ProfileSummary {
  id: string;
  name: string;
  age?: number;
  ownerId: string;
  /** 'owner' for the parent who created it. */
  access: 'owner' | CollaboratorRole;
  level: AccessLevel;
  updatedAt: number;
}

export interface Membership {
  profileId: string;
  userId: string;
  displayName: string;
  email?: string;
  role: CollaboratorRole;
  level: AccessLevel;
  perms: PermissionSet;
  status: 'active' | 'revoked';
  /** Access ends automatically after this date (optional). */
  expiresAt?: number;
  createdAt: number;
}

/**
 * 'invite': the family invites someone (by email or with a link / code).
 * 'request': a professional asks to connect, using the family's connection code.
 */
export interface Invitation {
  id: string;
  direction: 'invite' | 'request';
  profileId: string;
  childName: string;
  fromUserId: string;
  fromName: string;
  /** Who is invited (email) — or, for a request, the professional who asks. */
  email?: string;
  toUserId?: string;
  name?: string;
  code: string;
  role: CollaboratorRole;
  level: AccessLevel;
  perms: PermissionSet;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
}

export type ProposalStatus = 'pending' | 'approved' | 'declined' | 'revision' | 'withdrawn';

export interface Proposal {
  id: string;
  profileId: string;
  childName: string;
  authorId: string;
  authorName: string;
  authorRole: CollaboratorRole;
  title: string;
  reason?: string;
  /** The changes, as differences against the profile version they were made on. */
  ops: Op[];
  baseVersion: number;
  status: ProposalStatus;
  decisionNote?: string;
  createdAt: number;
  decidedAt?: number;
  decidedBy?: string;
}

export interface HistoryEntry {
  id: string;
  profileId: string;
  actorId: string;
  actorName: string;
  summary: string;
  ops: Op[];
  /** The opposite changes: applying them undoes this entry. */
  inverse: Op[];
  proposalId?: string;
  createdAt: number;
  undoneAt?: number;
}

export interface Device {
  id: string;
  profileId: string;
  userId: string;
  name: string;
  kind: 'primary' | 'secondary' | 'companion';
  platform: string;
  lastSyncedAt?: number;
  lastBackupAt?: number;
  /** Local changes not sent to the server yet. */
  pendingChanges: number;
  revoked: boolean;
  createdAt: number;
}

export type VerificationStatus = 'draft' | 'pending' | 'verified' | 'more_info' | 'rejected';

export interface VerificationDoc {
  name: string;
  kind: 'licence' | 'diploma' | 'id';
  uploadedAt: number;
  /** Where the file is stored (server storage path, or local media name in the demo). */
  ref: string;
}

export interface Verification {
  userId: string;
  fullName: string;
  country: string;
  profession: string;
  organization?: string;
  documents: VerificationDoc[];
  status: VerificationStatus;
  note?: string;
  submittedAt?: number;
  decidedAt?: number;
}

export type NoticeKind = 'invitation' | 'request' | 'proposal' | 'decision' | 'revision' | 'access' | 'sync' | 'share';

/** An in-app notification. Never contains what the child said. */
export interface Notice {
  id: string;
  userId: string;
  kind: NoticeKind;
  text: string;
  profileId?: string;
  refId?: string;
  createdAt: number;
  read: boolean;
}

export type ResourceKind = 'tla' | 'schedule' | 'firstThen' | 'timer' | 'cards';

/** The content of a resource: a small piece of a profile (boards, schedules, words…). */
export interface ResourceData {
  boards: Board[];
  schedules: Schedule[];
  customConcepts: Record<string, Concept>;
  overrides: Record<string, ConceptOverride>;
  firstThen?: { first?: string; then?: string };
  timer?: { minutes: number; display: ('circle' | 'bar' | 'digits')[] };
  /** Picture cards: concept ids. */
  cards?: string[];
}

export interface ResourceShare {
  /** Shared with a person… */
  userId?: string;
  /** …or with a child's profile (everyone working on it). */
  profileId?: string;
  mode: 'view' | 'edit';
  sharedBy: string;
  sharedAt: number;
}

export interface Resource {
  id: string;
  ownerId: string;
  ownerName: string;
  kind: ResourceKind;
  title: string;
  /** Set for materials made for one child (kept apart from generic templates). */
  profileId?: string;
  data: ResourceData;
  shares: ResourceShare[];
  createdAt: number;
  updatedAt: number;
}

/** Result of saving a profile: either the new version, or the newer copy someone else saved. */
export type SaveResult = { ok: true; version: number } | { ok: false; conflict: ChildRecord };

// ── Communication data (Suivi), collected only with the family's consent ──

/** One session: from the first touch to the last, ended by 5 minutes without any touch. */
export interface UsageSession {
  start: number;
  end: number;
  /** Time with interactions close together (gaps under 1 minute). */
  activeMs: number;
  selections: number;
  utterances: number;
}

/** A sentence said by the child (language samples, 'language' consent only). */
export interface UtteranceSample {
  t: number;
  /** Words in order: a word id (concept) or typed text. */
  tokens: { c?: string; text?: string }[];
}

/** What one device recorded in one day, for one child. Never the content of conversations
 *  unless the family chose 'language', and never while an adult models or edits. */
export interface UsageDay {
  day: string;
  deviceId: string;
  platform: string;
  /** Consent level when recorded (the server removes anything beyond it). */
  level: 'usage' | 'vocabulary' | 'language';
  sessions: UsageSession[];
  /** Selections per hour of the day (0–23, device's local time) and the time zone. */
  hours: number[];
  timeZone: string;
  selections: number;
  utterances: number;
  /** Boards, folders, activity boards, planning, keyboard: how often opened and for how long. */
  pages: Record<string, { opens: number; ms: number }>;
  /** Selections by place: main board, folders, activity boards, quick zone, planning, keyboard. */
  modes: Record<'core' | 'folder' | 'tla' | 'quick' | 'schedule' | 'keyboard', number>;
  searches: number;
  tlaCreated: number;
  offlineMs: number;
  errors: number;
  /** Numbers without words, for anonymous statistics. */
  stats: { distinctConcepts: number; len1: number; len2: number; len3plus: number; tokens: number };
  /** 'vocabulary' and above: selections per word, words found with search. */
  concepts?: Record<string, number>;
  searched?: Record<string, number>;
  /** 'language' only. */
  samples?: UtteranceSample[];
}

export type CommFunction =
  | 'request_object'
  | 'request_action'
  | 'request_help'
  | 'request_break'
  | 'request_info'
  | 'refuse'
  | 'preference'
  | 'comment'
  | 'share_info'
  | 'answer'
  | 'greet'
  | 'attention'
  | 'emotion'
  | 'pain'
  | 'opinion'
  | 'narrate'
  | 'repair'
  | 'humour'
  | 'self_determination';

/** An adult's note about a communication moment (from a language sample or observed directly). */
export interface Observation {
  id: string;
  profileId: string;
  /** When it happened. */
  at: number;
  /** The language sample it describes (its time), if any. */
  sampleT?: number;
  /** What was said or done, in words. */
  utterance?: string;
  function?: CommFunction;
  /** Situation: meal, school, play… */
  context?: string;
  /** Who was with the child: parent, therapist, teacher… */
  partner?: string;
  /** spontaneous / prompted / modelled */
  autonomy?: 'spontaneous' | 'prompted' | 'modelled';
  /** Understood, respected, answered… */
  result?: string;
  note?: string;
  createdBy: string;
  authorName: string;
  createdAt: number;
}
