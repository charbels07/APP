/**
 * Copies a child's photos and recordings through the account, in the background, so that a lost
 * tablet loses nothing and a photo added on a parent's phone reaches the child's tablet.
 *
 * - Sends the files of this device that the profile uses and the account does not have yet
 *   (a photo is made small first: `src/lib/mediaUpload.ts`). Only for people who may change the
 *   board: a use-only tablet keeps its own files (the database refuses them anyway).
 * - Fetches the files the profile uses and this device does not have (made on another device),
 *   under the same name, from the private storage (an address valid a few minutes).
 * - On a manager's device, removes from the account, once in a while, the files nothing uses any
 *   more for 30 days: neither the board nor its earlier versions, recent history or waiting
 *   proposals (`afterList` in `mediaPlan.ts`; the database checks it again).
 *
 * Never blocks the board: offline or refused, what waits is tried again later, with growing
 * waits. What this device knows is kept with the device copy of the profile (`caa.media.<id>`)
 * and leaves with it (`src/lib/deviceData.ts`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import { isForgotten } from '../lib/deviceData';
import { written } from '../lib/deviceFull';
import { deleteMedia, hasMedia, saveMediaFrom } from '../lib/media';
import { mediaArrived } from '../lib/mediaArrivals';
import {
  afterList,
  afterRemoval,
  CHECK_EVERY,
  FULL_WAIT,
  failed,
  isSyncable,
  markRefused,
  markRemoved,
  markSent,
  mediaNamesIn,
  nextDue,
  planMedia,
  prune,
  readBook,
  removedNames,
  type MediaBook,
} from '../lib/mediaPlan';
import { uploadBody, type UploadBody } from '../lib/mediaUpload';

/** The device's media store, as the copying needs it (tests bring their own). */
export interface MediaFiles {
  has(name: string): Promise<boolean>;
  /** What is sent (a photo made small), or undefined when the file is not here. */
  body(name: string): Promise<UploadBody | undefined>;
  /** Downloads into the store under this name. */
  fetch(url: string, name: string): Promise<void>;
  erase(name: string): Promise<void>;
}

export const deviceFiles: MediaFiles = { has: hasMedia, body: uploadBody, fetch: saveMediaFrom, erase: deleteMedia };

/** What Settings → Account says about the copies. */
export interface MediaStatus {
  /** Photos and recordings the profile uses. */
  total: number;
  /** On this device, not in the account yet. */
  waiting: number;
  /** Missing on this device, still to arrive. */
  receiving: number;
  /** The child's space in the account is full. */
  full: boolean;
  /** Refused by the account for good (too big). */
  refused: number;
  /** This device may not send (use-only access): what it made stays here. */
  localOnly: boolean;
}

export interface MediaSyncOptions {
  files?: MediaFiles;
  /** This person may change the board (unknown yet: yes, the server decides). */
  canSend?: () => boolean;
  /** This person manages the child's team (may remove files from the account). */
  canRemove?: () => boolean;
  /**
   * Fetches the files made on other devices (default yes). A professional's draft of a child's board
   * only sends what she added: the family's photos are not copied onto her device.
   */
  fetch?: boolean;
  /** Wait before working after a change (ms). */
  delay?: number;
  now?: () => number;
}

const key = (id: string) => `caa.media.${id}`;
const codeOf = (e: unknown) => (e instanceof BackendError ? e.code : '');

/** After one file: go on, stop this kind of work for this round ('hold'), or no internet. */
type Step = 'next' | 'hold' | 'offline';

export class MediaSync {
  private profile: unknown = null;
  private usedFor: unknown = undefined;
  private usedNames: string[] = [];
  /** Which names this device has (asked once, then kept up to date). */
  private here = new Map<string, boolean>();
  private running: Promise<void> | null = null;
  private again = false;
  private closed = false;
  /** The account refused this person's files during this run of the app (use-only access). */
  private noSend = false;
  /** Signing out: only sending is worth the wait. */
  private leaving = false;
  private soonTimer?: ReturnType<typeof setTimeout>;
  private dueTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private snapshot: MediaStatus = { total: 0, waiting: 0, receiving: 0, full: false, refused: 0, localOnly: false };
  private files: MediaFiles;
  private now: () => number;

  private constructor(
    readonly id: string,
    private api: Backend,
    private book: MediaBook,
    private opts: MediaSyncOptions,
  ) {
    this.files = opts.files ?? deviceFiles;
    this.now = opts.now ?? Date.now;
  }

  static async open(api: Backend, id: string, opts: MediaSyncOptions = {}): Promise<MediaSync> {
    let book = readBook(null);
    try {
      book = readBook(JSON.parse((await AsyncStorage.getItem(key(id))) ?? 'null'));
    } catch {
      /* unreadable: start again (the account's list tells what it has) */
    }
    return new MediaSync(id, api, book, opts);
  }

  /** For `useSyncExternalStore`: the same object until something changes. */
  status = (): MediaStatus => this.snapshot;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  /** What this device knows (tests). */
  get state(): MediaBook {
    return this.book;
  }

  private canSend() {
    return !this.noSend && (this.opts.canSend?.() ?? true);
  }
  private canRemove() {
    return this.opts.canRemove?.() ?? false;
  }

  private used(): string[] {
    if (this.usedFor !== this.profile) {
      this.usedFor = this.profile;
      this.usedNames = mediaNamesIn(this.profile).filter(isSyncable);
    }
    return this.usedNames;
  }

  /** The profile as it is now: opened, or changed by someone else. */
  see(profile: unknown) {
    this.profile = profile;
    const { book, eraseHere } = prune(this.book, this.used());
    this.book = book;
    this.erase(eraseHere);
    this.soon();
  }

  /**
   * A change made here: the copies received for names it stopped using leave this device (the
   * account keeps its copy 30 days at least: `afterList`).
   */
  changed(before: unknown, after: unknown) {
    const gone = removedNames(before, after);
    this.profile = after;
    if (gone.length) {
      const { book, eraseHere } = afterRemoval(this.book, gone);
      this.book = book;
      this.erase(eraseHere);
    }
    // A name used again (an undo) keeps its copy in the account.
    const used = new Set(this.used());
    if (this.book.remove.some((n) => used.has(n))) this.book = { ...this.book, remove: this.book.remove.filter((n) => !used.has(n)) };
    this.soon();
  }

  private erase(names: string[]) {
    for (const n of names) {
      this.here.set(n, false);
      void this.files.erase(n).catch(() => {});
    }
  }

  /** Works a moment later (several changes in a row make one round). */
  soon(ms = this.opts.delay ?? 2000) {
    if (this.closed) return;
    clearTimeout(this.soonTimer);
    this.soonTimer = setTimeout(() => void this.run(), ms);
  }

  /** One round: what is due is sent, fetched and removed (one round at a time). */
  run(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.round()
      .catch(() => {})
      .finally(() => {
        this.running = null;
        if (this.again && !this.closed) {
          this.again = false;
          void this.run();
        }
      });
    return this.running;
  }

  /** Before the account leaves this device: what waits is sent if possible (nothing more is fetched). */
  async flush() {
    clearTimeout(this.soonTimer);
    this.leaving = true;
    try {
      await this.run();
    } finally {
      this.leaving = false;
    }
  }

  close() {
    this.closed = true;
    clearTimeout(this.soonTimer);
    clearTimeout(this.dueTimer);
    this.listeners.clear();
  }

  private gone() {
    return this.closed || isForgotten(this.id);
  }

  private async round() {
    if (this.gone() || this.profile === null) return;
    clearTimeout(this.dueTimer);
    await this.look();
    if (this.gone()) return;
    // Now and then, the account's own list corrects what this device believes.
    if (!((this.book.checkedAt ?? 0) > this.now() - CHECK_EVERY)) {
      try {
        const files = await this.api.listMedia(this.id);
        // What the database still points to (earlier versions, recent history, proposals waiting):
        // asked only by those who may remove; not known means nothing is removed.
        const serverUsed = this.canRemove() ? await this.api.mediaInUse(this.id).catch(() => null) : null;
        this.book = afterList(this.book, files, this.used(), this.now(), this.canRemove(), serverUsed).book;
      } catch (e) {
        if (codeOf(e) === 'offline') return this.retryLater();
        if (codeOf(e) === 'forbidden') return this.publish();
      }
    }
    const plan = planMedia(this.book, this.used(), (n) => this.here.get(n) === true, this.now(), {
      canSend: this.canSend(),
      canRemove: this.canRemove(),
    });
    this.publish();
    let offline = false;
    // A few at a time: the database checks each file against everything that may still use it.
    plan.remove = plan.remove.slice(0, 20);
    if (plan.remove.length) {
      try {
        await this.api.removeMedia(this.id, plan.remove);
        for (const n of plan.remove) this.book = markRemoved(this.book, n);
        // Room was made: what waited for space is tried again.
        this.book = { ...this.book, fullUntil: undefined };
      } catch (e) {
        if (codeOf(e) === 'offline') offline = true;
        else for (const n of plan.remove) this.book = failed(this.book, n, this.now());
      }
    }
    for (const name of plan.send) {
      if (offline || this.gone()) break;
      const step = await this.sendOne(name);
      this.publish();
      if (step === 'offline') offline = true;
      if (step !== 'next') break;
    }
    for (const name of this.opts.fetch === false ? [] : plan.fetch) {
      if (offline || this.leaving || this.gone()) break;
      const step = await this.fetchOne(name);
      this.publish();
      if (step === 'offline') offline = true;
      if (step !== 'next') break;
    }
    await this.save();
    if (offline) return this.retryLater();
    this.publish();
    // What failed is tried again when its wait is over (and at the next change, pull or opening).
    const at = nextDue(this.book, this.now());
    if (at !== undefined && !this.gone()) this.dueTimer = setTimeout(() => void this.run(), Math.max(1000, at - this.now()));
  }

  /** No internet: one more round in a minute (or sooner, at the next change or when the app comes back). */
  private retryLater() {
    this.publish();
    if (this.gone()) return;
    clearTimeout(this.dueTimer);
    this.dueTimer = setTimeout(() => void this.run(), 60_000);
  }

  /** Asks the store about the names not asked yet. */
  private async look() {
    for (const n of this.used()) {
      if (this.here.has(n)) continue;
      this.here.set(n, await this.files.has(n).catch(() => false));
    }
  }

  private async sendOne(name: string): Promise<Step> {
    let body: UploadBody | undefined;
    try {
      body = await this.files.body(name);
    } catch {
      body = undefined;
    }
    if (!body) {
      // Not here after all (erased meanwhile): it will be fetched if the profile still uses it.
      this.here.set(name, false);
      return 'next';
    }
    try {
      await this.api.uploadMedia(this.id, name, body.body, body.type);
      this.book = markSent(this.book, name);
      return 'next';
    } catch (e) {
      switch (codeOf(e)) {
        case 'exists':
          this.book = markSent(this.book, name);
          return 'next';
        case 'offline':
          return 'offline';
        case 'forbidden':
          // A use-only tablet, or someone no longer allowed to change the board: its files stay here.
          this.noSend = true;
          return 'hold';
        case 'too_large':
        case 'media_type':
        case 'invalid':
          this.book = markRefused(this.book, name);
          return 'next';
        case 'media_quota':
          this.book = { ...this.book, fullUntil: this.now() + FULL_WAIT };
          return 'hold';
        case 'too_many':
          this.book = { ...this.book, pauseUntil: this.now() + FULL_WAIT };
          return 'hold';
        default:
          this.book = failed(this.book, name, this.now());
          return 'next';
      }
    }
  }

  private async fetchOne(name: string): Promise<Step> {
    try {
      const url = await this.api.mediaUrl(this.id, name);
      await this.files.fetch(url, name);
      if (this.gone()) {
        // The child left this device while the file was on its way.
        await this.files.erase(name).catch(() => {});
        return 'hold';
      }
      this.here.set(name, true);
      this.book = markSent(this.book, name, true);
      mediaArrived(name);
      return 'next';
    } catch (e) {
      const code = codeOf(e);
      if (code === 'offline') return 'offline';
      if (code === 'forbidden') return 'hold';
      // Not in the account yet (the device that made it has not sent it): tried again later.
      this.book = failed(this.book, name, this.now());
      return 'next';
    }
  }

  private async save() {
    if (this.gone()) return;
    await written('files', () => AsyncStorage.setItem(key(this.id), JSON.stringify(this.book)));
  }

  private publish() {
    if (this.closed) return;
    const used = this.used();
    const now = this.now();
    const plan = planMedia(this.book, used, (n) => this.here.get(n) === true, now, { canSend: false, canRemove: false });
    const refused = new Set(this.book.refused);
    const next: MediaStatus = {
      total: used.length,
      waiting: plan.waitingSend,
      receiving: plan.waitingFetch,
      full: (this.book.fullUntil ?? 0) > now,
      refused: used.filter((n) => refused.has(n)).length,
      localOnly: !this.canSend(),
    };
    const was = this.snapshot;
    if ((Object.keys(next) as (keyof MediaStatus)[]).some((k) => next[k] !== was[k])) {
      this.snapshot = next;
      for (const fn of [...this.listeners]) fn();
    }
  }
}
