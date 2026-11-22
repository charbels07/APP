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
import type { Counter, DeviceForm } from '../lib/product';

export type Role = 'parent' | 'pro';
/** 'device': a tablet linked with a pairing code (no email, no password). */
export type AuthProvider = 'email' | 'phone' | 'google' | 'apple' | 'device';

export interface AccountPrefs {
  uiLang?: UiLang;
  /**
   * Which news the person wants. `reminder` (parents: the 12:00 reminder when the child's board
   * was not opened) and `ideas` (a new idea to vote on) are on unless switched off.
   */
  notifications: { invitations: boolean; proposals: boolean; sync: boolean; billing: boolean; reminder?: boolean; ideas?: boolean };
  /** Text size of the parent / professional screens (not the child's board). */
  textSize: 'normal' | 'large';
  /** Professional workspace tour already shown. */
  tourDone?: boolean;
  /** Contextual guides already seen (ids). */
  tipsSeen?: string[];
  /** The child profile opened last. */
  activeProfileId?: string;
  /**
   * A professional's own caregiver code (4 digits), asked on every board she opens before the
   * adults' tools (caregiver mode, settings, lock). It is hers: a family's code belongs to the
   * family and stays in the child's profile. Empty or missing: not chosen yet.
   */
  pin?: string;
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
  /** Version of the app on this device (so the team knows which versions are still in use). */
  appVersion?: string;
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

/** A professional's request as the app's team sees it in the back office. */
export interface AdminVerification extends Verification {
  email?: string;
  phone?: string;
  accountName: string;
  accountCreatedAt: number;
  /** Children whose team this professional is in. */
  children: number;
}

/** What the app's team did in the back office (decisions, certificates opened). */
export interface AdminLogEntry {
  id: string;
  adminName: string;
  action: 'verified' | 'more_info' | 'rejected' | 'open_document' | string;
  targetName?: string;
  detail?: string;
  createdAt: number;
}

/** What a message to the team is about ("Help us improve"). */
export type FeedbackKind = 'feature' | 'vocabulary' | 'pictogram' | 'language' | 'access' | 'problem' | 'other';
export const FEEDBACK_KINDS: FeedbackKind[] = ['feature', 'vocabulary', 'pictogram', 'language', 'access', 'problem', 'other'];
/** A message someone sent to the app's team from the app. */
export interface Feedback {
  id: string;
  kind: FeedbackKind;
  text: string;
  platform: string;
  appVersion: string;
  status: 'new' | 'done';
  createdAt: number;
  fromName: string;
  fromRole: string;
  fromEmail?: string;
}

type Counts = Record<string, number>;

/** What one device counted in a day for the app's team: names from a fixed list, numbers only. */
export interface FeatureDay {
  day: string;
  deviceId: string;
  counts: Partial<Record<Counter, number>>;
  platform: string;
  form: DeviceForm;
  appVersion: string;
}

/**
 * How the children use one feature. A group of 1 to 4 children is never a number: the server
 * then only says which side is the small one (`few`), or nothing (`hidden`).
 */
export type FeatureAdoption =
  | { key: string; regular: number; occasional: number; abandoned: number; never: number }
  | { key: string; using: number; notUsing: number }
  | { key: string; few: 'using' | 'notUsing' }
  | { key: string; hidden: true };

/**
 * One feature, last 30 days: children who used it, who had its button or panel on screen without
 * using it, who never had it on screen. A group of 1 to 4 is never a number: two groups are then
 * given together (`notUsed`, or `seen`), or nothing (`hidden`).
 */
export type FeatureSeen =
  | { key: string; used: number; seenOnly: number; unseen: number }
  | { key: string; used: number; notUsed: number }
  | { key: string; seen: number; unseen: number }
  | { key: string; hidden: true };

/** The features on one version of the app ("other": the versions used by fewer than 5 children of 5 families, together). */
export interface VersionAdoption {
  version: string;
  children: number;
  features: ({ key: string; used: number } | { key: string; few: 'using' | 'notUsing' } | { key: string; hidden: true })[];
}

/** How long people waited for one thing (start, sync, voice): how many times in each step; "few": met by 1 to 4 children. */
export interface SpeedFigures {
  key: string;
  children: number;
  buckets: Record<string, number | 'few'>;
}

/** Product figures of the back office: sums over at least `minimum` children of as many families. */
/**
 * A figure about how the app is used: counted among the families who share figures only, and
 * given from 5 children of 5 families. `null`: between 1 and 4 (never shown as a number).
 */
export type Shown = number | null;

export interface AdminProduct {
  at: string;
  example?: boolean;
  /** Families who agreed to share the feature counters. */
  agreed: Shown;
  /** Children whose devices sent something in the last `days` days. */
  children: Shown;
  minimum: number;
  enough: boolean;
  days: number;
  features?: FeatureAdoption[];
  /** Seen and used, last 30 days (days counted by a version of the app that counts what is seen). */
  seen?: FeatureSeen[];
  /** The features by version of the app, last 30 days, the newest first. */
  byVersion?: VersionAdoption[];
  /** Waiting times of the last 30 days (a kind met by fewer than 5 children of 5 families is left out). */
  speed?: SpeedFigures[];
  children30?: Shown;
  /** Sums of the last 30 days (a sum is missing when fewer than `minimum` children took part). */
  tasks?: Counts;
  forms?: Counts;
}

/** Technical problems of the last `days` days: counters that belong to nobody. */
export interface AdminBugs {
  at: string;
  example?: boolean;
  days: number;
  total: number;
  kinds: Counts;
  versions: Counts;
  platforms: Counts;
  screens: Counts;
  daily: { day: string; n: number }[];
  top: { kind: string; name: string; at: string; screen: string; version: string; platform: string; n: number; last: string }[];
}

/** An idea the team puts to the vote. */
export interface RoadmapItem {
  id: string;
  title: Record<UiLang, string>;
  status: 'open' | 'planned';
  votes: number;
  mine: boolean;
}
export type RoadmapStatus = 'open' | 'planned' | 'done' | 'hidden';
/** Who an idea is asked to: everyone, the parents only, the professionals only. */
export type RoadmapAudience = 'all' | 'parent' | 'pro';
export interface AdminRoadmapItem {
  id: string;
  title: Record<UiLang, string>;
  status: RoadmapStatus;
  votes: number;
  parents: number;
  pros: number;
  createdAt: number;
  audience: RoadmapAudience;
}
/**
 * Every figure of the back office. Counts only: no name, no word, no sentence.
 * `usage` and `setup` come from the children's profiles: only the families who share anonymous
 * statistics, and only from `minimum` children up (below that, just the number of children).
 */
export interface AdminOverview {
  at: string;
  /** Demo server: example figures, not real ones. */
  example?: boolean;
  accounts: {
    parents: number;
    pros: number;
    unconfirmed: number;
    new7: number;
    new30: number;
    /** Language of the menus chosen by each adult. */
    languages: Counts;
    weeks: { week: string; parents: number; pros: number }[];
  };
  families: {
    parents: number;
    withChild: number;
    children: number;
    withTablet: number;
    withTeam: number;
    /** Boards used or edited lately: among the families who share figures (as everything about use). */
    used7: Shown;
    used30: Shown;
    edited30: Shown;
    /** What the families let the app record: off / usage / vocabulary / language. */
    collection: Counts;
    sharing: Shown;
  };
  /** `total`: every linked device. The rest: the devices of the families who share figures. */
  devices: { total: number; seen7: Shown; seen30: Shown; waiting: Shown; platforms: Counts; versions: Counts };
  pros: {
    accounts: number;
    status: Counts;
    professions: Counts;
    countries: Counts;
    hoursToDecide: number | null;
    oldestWaitingDays: number | null;
    working: number;
    childrenFollowed: number;
  };
  teamwork: {
    members: Counts;
    invitations: Counts;
    requests: Counts;
    proposals: Counts;
    materials: Counts;
    shares: number;
    observations: number;
    changes30: Shown;
  };
  ai: { calls30: number; users30: number; mostPerPersonDay: number; days: { day: string; calls: number; users: number }[] };
  feedback: { new: number; total: number; kinds: Counts };
  usage: {
    sharing: Shown;
    children: Shown;
    minimum: number;
    enough: boolean;
    days: number;
    childDays?: number;
    daysPerWeek?: number;
    /** Averages per child and per day of use. */
    minutes?: number;
    selections?: number;
    utterances?: number;
    words?: number;
    searches?: number;
    boardsMade?: number;
    errors?: number;
    offlineShare?: number | null;
    lengths?: { one: number; two: number; more: number };
    places?: Counts;
    hours?: number[];
    platforms?: Counts;
    weeks?: { week: string; children: Shown; minutes: number | null; selections: number | null }[];
    ages?: { band: string; children: number; minutes: number; selections: number; longer: number | null }[];
  };
  setup: {
    children: Shown;
    minimum: number;
    choices?: Record<string, Counts>;
    averages?: { activityBoards: number; ownWords: number; changedWords: number; schedules: number; demonstrations: number };
  };
}

export type NoticeKind = 'invitation' | 'request' | 'proposal' | 'decision' | 'revision' | 'access' | 'sync' | 'share' | 'verification' | 'idea';

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

/** A browser that accepted notifications: what `pushManager.subscribe` gives, plus the menus' language and the device's time zone. */
export interface PushDevice {
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: UiLang;
  tz: string;
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
