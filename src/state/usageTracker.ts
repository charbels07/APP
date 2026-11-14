/**
 * Records how the child uses the board, day by day, on this device — only when the family turned
 * it on (Settings → Suivi), and only up to the level they chose:
 *  - 'usage': sessions, times, number of touches and sentences, pages, places, device, offline;
 *  - 'vocabulary': + which words are touched and found with search;
 *  - 'language': + the sentences said (language samples).
 * Nothing is recorded while an adult edits the board or a demonstration plays (AppState filters).
 * Days are kept on the device (120 days) and sent to the server, which keeps only what the
 * consent allows.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import type { UsageDay, UsageSession } from '../backend/types';
import { limitToConsent, LEVEL_RANK, type CollectLevel } from '../lib/usageConsent';
import { isForgotten } from '../lib/deviceData';

export type UsageMode = UsageDay['modes'] extends Record<infer K, number> ? K : never;

export type UsageEvent =
  | { type: 'select'; concept: string; mode: UsageMode }
  | { type: 'speak'; tokens: { c?: string; text?: string }[] }
  | { type: 'page'; page: string }
  | { type: 'search'; concept?: string }
  | { type: 'keyboard' }
  | { type: 'tlaCreated' };

/** A new session starts after 5 minutes without any touch. */
export const SESSION_GAP = 5 * 60 * 1000;
/** Touches closer than 1 minute count as active time. */
const ACTIVE_GAP = 60 * 1000;
const KEEP_DAYS = 120;

const two = (n: number) => String(n).padStart(2, '0');
export const dayOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};
/** Short scrambled form of a word id: counts different words without keeping them ('usage' level). */
const scramble = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

interface Stored {
  days: Record<string, UsageDay & { seen?: string[] }>;
  pending: string[];
}

export function emptyDay(day: string, deviceId: string, platform: string, level: CollectLevel): UsageDay {
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    /* ignore */
  }
  return {
    day,
    deviceId,
    platform,
    level: level === 'off' ? 'usage' : level,
    sessions: [],
    hours: Array.from({ length: 24 }, () => 0),
    timeZone,
    selections: 0,
    utterances: 0,
    pages: {},
    modes: { core: 0, folder: 0, tla: 0, quick: 0, schedule: 0, keyboard: 0 },
    searches: 0,
    tlaCreated: 0,
    offlineMs: 0,
    errors: 0,
    stats: { distinctConcepts: 0, len1: 0, len2: 0, len3plus: 0, tokens: 0 },
  };
}

export class UsageTracker {
  private store: Stored = { days: {}, pending: [] };
  private session: UsageSession | null = null;
  private lastAt = 0;
  private page: string | null = null;
  private offlineSince: number | null = null;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private uploadTimer?: ReturnType<typeof setTimeout>;
  private undoErrors?: () => void;

  private constructor(
    private api: Backend,
    readonly profileId: string,
    private deviceId: string,
    private platform: string,
    private level: () => CollectLevel,
    private now: () => number,
  ) {}

  static async open(
    api: Backend,
    profileId: string,
    deviceId: string,
    platform: string,
    level: () => CollectLevel,
    now: () => number = Date.now,
  ): Promise<UsageTracker> {
    const t = new UsageTracker(api, profileId, deviceId, platform, level, now);
    try {
      const raw = await AsyncStorage.getItem(t.key);
      if (raw) t.store = JSON.parse(raw);
    } catch {
      /* start empty */
    }
    t.undoErrors = watchErrors(() => t.on() && (t.today().errors += 1));
    return t;
  }

  private get key() {
    return `caa.usage.${this.profileId}`;
  }
  private on() {
    return LEVEL_RANK[this.level()] > 0;
  }

  private today(): UsageDay & { seen?: string[] } {
    const d = dayOf(this.now());
    let day = this.store.days[d];
    if (!day) {
      // A new day: yesterday's last session ends where it stopped.
      this.closeSession();
      day = this.store.days[d] = emptyDay(d, this.deviceId, this.platform, this.level());
    }
    return day;
  }

  private closeSession() {
    if (!this.session) return;
    this.session = null;
  }

  /** Every recorded event: session, active time and time on the current page. */
  private touch(day: UsageDay) {
    const now = this.now();
    const gap = this.lastAt ? now - this.lastAt : Infinity;
    if (!this.session || gap > SESSION_GAP || dayOf(this.session.start) !== day.day) {
      this.session = { start: now, end: now, activeMs: 0, selections: 0, utterances: 0 };
      day.sessions.push(this.session);
    } else {
      if (gap <= ACTIVE_GAP) this.session.activeMs += gap;
      this.session.end = now;
      if (this.page && gap <= SESSION_GAP) {
        const p = (day.pages[this.page] ??= { opens: 0, ms: 0 });
        p.ms += Math.min(gap, ACTIVE_GAP);
      }
    }
    this.lastAt = now;
  }

  record = (e: UsageEvent) => {
    if (!this.on()) return;
    const level = this.level();
    const day = this.today();
    day.level = level === 'off' ? day.level : level;
    this.touch(day);
    const s = this.session!;
    switch (e.type) {
      case 'select': {
        day.selections++;
        s.selections++;
        day.hours[new Date(this.now()).getHours()]++;
        day.modes[e.mode] = (day.modes[e.mode] ?? 0) + 1;
        const seen = new Set(day.seen ?? []);
        seen.add(scramble(e.concept));
        day.seen = [...seen];
        day.stats.distinctConcepts = seen.size;
        if (LEVEL_RANK[level] >= 2) {
          day.concepts ??= {};
          day.concepts[e.concept] = (day.concepts[e.concept] ?? 0) + 1;
        }
        break;
      }
      case 'speak': {
        const n = e.tokens.length;
        if (!n) break;
        day.utterances++;
        s.utterances++;
        day.stats.tokens += n;
        if (n === 1) day.stats.len1++;
        else if (n === 2) day.stats.len2++;
        else day.stats.len3plus++;
        if (LEVEL_RANK[level] >= 3) (day.samples ??= []).push({ t: this.now(), tokens: e.tokens });
        break;
      }
      case 'page': {
        this.page = e.page;
        const p = (day.pages[e.page] ??= { opens: 0, ms: 0 });
        p.opens++;
        break;
      }
      case 'search':
        day.searches++;
        if (e.concept && LEVEL_RANK[level] >= 2) {
          day.searched ??= {};
          day.searched[e.concept] = (day.searched[e.concept] ?? 0) + 1;
        }
        break;
      case 'keyboard':
        day.modes.keyboard++;
        break;
      case 'tlaCreated':
        day.tlaCreated++;
        break;
    }
    this.changed(day.day);
  };

  /** No internet: the time is counted as offline use. */
  setOnline(online: boolean) {
    const now = this.now();
    if (!online && this.offlineSince === null) this.offlineSince = now;
    if (online && this.offlineSince !== null) {
      if (this.on()) {
        this.today().offlineMs += now - this.offlineSince;
        this.changed(this.today().day);
      }
      this.offlineSince = null;
    }
  }

  private changed(day: string) {
    if (!this.store.pending.includes(day)) this.store.pending.push(day);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.writeLocal(), 1000);
    if (!this.uploadTimer) this.uploadTimer = setTimeout(() => void this.upload(), 60 * 1000);
  }

  private async writeLocal() {
    if (isForgotten(this.profileId)) return;
    const keys = Object.keys(this.store.days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete this.store.days[k];
    await AsyncStorage.setItem(this.key, JSON.stringify(this.store)).catch(() => {});
  }

  /** Sends the days not on the server yet (what the consent allows; the server checks again). */
  async upload(): Promise<void> {
    this.uploadTimer = undefined;
    const level = this.level();
    for (const d of [...this.store.pending]) {
      const day = this.store.days[d];
      const kept = day && limitToConsent(stripLocal(day), level);
      if (!kept) {
        this.store.pending = this.store.pending.filter((x) => x !== d);
        continue;
      }
      try {
        await this.api.saveUsageDay(this.profileId, kept);
        if (d !== dayOf(this.now())) this.store.pending = this.store.pending.filter((x) => x !== d);
      } catch {
        return; // offline or refused: tried again later
      }
    }
    await this.writeLocal();
  }

  /** This device's days (for the dashboard while offline). */
  localDays(): UsageDay[] {
    return Object.values(this.store.days).map(stripLocal);
  }

  async flush() {
    clearTimeout(this.saveTimer);
    await this.writeLocal();
    await this.upload();
  }

  /** The family turned collection off: what this device kept is erased too. */
  async forget() {
    this.store = { days: {}, pending: [] };
    this.session = null;
    await AsyncStorage.removeItem(this.key).catch(() => {});
  }

  close() {
    clearTimeout(this.saveTimer);
    clearTimeout(this.uploadTimer);
    this.undoErrors?.();
  }
}

function stripLocal(d: UsageDay & { seen?: string[] }): UsageDay {
  const { seen: _seen, ...rest } = d;
  return rest;
}

/** Counts app errors (for "technical availability"), without changing how they are handled. */
function watchErrors(onError: () => void): () => void {
  const g = globalThis as {
    ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void };
    addEventListener?: (t: string, f: () => void) => void;
    removeEventListener?: (t: string, f: () => void) => void;
  };
  if (g.ErrorUtils) {
    const prev = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((e, fatal) => {
      onError();
      prev(e, fatal);
    });
    return () => g.ErrorUtils?.setGlobalHandler(prev);
  }
  if (g.addEventListener) {
    g.addEventListener('error', onError);
    return () => g.removeEventListener?.('error', onError);
  }
  return () => {};
}
