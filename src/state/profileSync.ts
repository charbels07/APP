/**
 * Keeps a child's profile on this device and in step with the server.
 *
 * - The board always works from the copy saved on the device (no internet needed): it opens from
 *   that copy at once, and the server is asked behind when it is slow to answer.
 * - Each change is written on the device at once, then sent to the server a moment later.
 * - The server only accepts a save made from its latest version. If someone else saved in
 *   between, our changes are re-applied on top of theirs (a "merge"); where both changed the
 *   very same thing, their newer change is kept and we are told.
 * - When the server refuses a save (a use-only tablet, a board too big…), the changes stay on
 *   this device and are tried again each time the board opens. A refused save never stops this
 *   device from receiving the others' changes: theirs are taken, ours are put back on top.
 * - This device's own small things (last activity board, ticked steps, guide progress) never
 *   travel: see src/lib/deviceOnly.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import type { ChildRecord, SaveResult } from '../backend/types';
import { travelKey, travelling, withDeviceThings } from '../lib/deviceOnly';
import { mergeOps } from '../lib/merge';
import { diffProfiles, same, type Op } from '../lib/profileDiff';
import { countSpeed } from '../lib/product';
import { migrate } from '../lib/storage';
import type { Profile } from '../model/types';
import { forgetChild, isForgotten, remember } from '../lib/deviceData';
import { written } from '../lib/deviceFull';

export interface LocalCopy {
  data: Profile;
  /** Server version this copy is based on. */
  version: number;
  /** The profile as the server last had it: what our own changes are compared with. */
  base: Profile;
  /** Changes not on the server yet. */
  dirty: boolean;
  name: string;
  /** The server refused our last save: the changes stay on this device (tried again at each opening). */
  localOnly?: boolean;
  /** Why it refused (the server's short code; 'forbidden' = this device may only use the board). */
  refused?: string;
}

/** 'local': a use-only device keeps its changes; 'refused': the server could not take them. */
export type SyncState = 'saved' | 'saving' | 'offline' | 'local' | 'refused';

const key = (id: string) => `caa.child.${id}`;
/** A device copy that could not be read is kept aside here instead of being lost. */
export const badKey = (id: string) => `caa.child.${id}.bad`;

export async function readLocal(id: string): Promise<LocalCopy | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key(id));
    if (!raw) return null;
    const c = JSON.parse(raw) as LocalCopy;
    if (!c || typeof c !== 'object' || !c.data || typeof c.data !== 'object' || typeof c.version !== 'number') throw new Error('unreadable');
    return { ...c, data: migrate(c.data), base: migrate(c.base ?? c.data), dirty: c.dirty === true };
  } catch {
    // Unreadable (damaged storage, a format this version cannot open): the board opens from the
    // account's version, and what was here is put aside rather than written over.
    if (raw) await AsyncStorage.setItem(badKey(id), raw).catch(() => {});
    return null;
  }
}

export async function forgetLocal(id: string) {
  await forgetChild(id);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const PULL_TIMING_EVERY = 5 * 60 * 1000;
const SEEN_EVERY = 30 * 60 * 1000;
/** How long a board that has a device copy waits for the server before opening without it. */
const OPEN_WAIT = 2500;
/**
 * A save the server refused is tried again now and then while the board stays open (a tablet is
 * rarely closed): a refusal can pass (a session that was renewed, rights that were given).
 */
const RETRY_REFUSED_EVERY = 30 * 60 * 1000;
/**
 * An open board the server refuses (access removed while it is on screen): whether the removal is
 * certain is asked at most this often (a board in the bin or a two-step code not typed refuses too).
 */
const GONE_CHECK_EVERY = 5 * 60 * 1000;
const codeOf = (e: unknown) => (e instanceof BackendError ? e.code : 'unknown');
/** The server says this board is not ours (access removed, profile deleted). */
const isGone = (e: unknown) => codeOf(e) === 'forbidden' || codeOf(e) === 'not_found';
/** What only the family decides: a save that changes them from here is refused by the server. */
const FAMILY_CHOICES = ['dataCollection', 'shareStats', 'shareTerms', 'pin'] as const;

export class ProfileSync {
  copy: LocalCopy;
  state: SyncState = 'saved';
  private writeTimer?: ReturnType<typeof setTimeout>;
  private pushTimer?: ReturnType<typeof setTimeout>;
  private pushing: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  /** Called when the profile changed because of someone else (the board redraws). */
  onRemote?: (p: Profile) => void;
  /**
   * Called when some of our changes collided with someone else's (theirs kept): what was not kept,
   * and the version those changes were made on (to name them).
   */
  onConflict?: (dropped: Op[], base: Profile) => void;
  /** Called after our changes reached the server (for the change history). */
  onSaved?: (ops: Op[], reason?: string) => void;
  /**
   * The board opened from the device copy and the server then answered that it is no longer
   * ours: set (and `onGone` called) so that the screen closes the board.
   */
  gone?: unknown;
  onGone?: (e: unknown) => void;
  /** Why the next changes are made ("Proposal …", "Undo …"): goes into the history. */
  reason?: string;
  /** Last time this device was in step with the server. */
  lastSyncedAt?: number;
  /** When a look for changes was last timed (for the app's team). */
  private pullTimedAt = 0;
  /** When this board last told the server it is open (the 12:00 reminder). */
  private seenSaidAt = 0;
  private sayingSeen = false;
  /** When the server last refused a save. */
  private refusedAt = 0;
  /** When an open board last asked whether a refusal means it is no longer ours. */
  private goneCheckedAt = 0;
  /** What travels of `copy.data`, to tell a real change from this device's own small things. */
  private sentKey: string;

  private constructor(readonly id: string, private api: Backend, copy: LocalCopy, readonly pushDelay: number) {
    this.copy = copy;
    this.sentKey = travelKey(copy.data);
  }

  /**
   * Opens a profile. With a copy on the device the board opens from it: the server is asked, and
   * when it has not answered after a moment the board opens all the same and the answer is
   * handled behind. Without a copy the server's version is needed.
   */
  static async open(api: Backend, id: string, opts: { pushDelay?: number; wait?: number } = {}): Promise<ProfileSync> {
    remember(id);
    const local = await readLocal(id);
    const pushDelay = opts.pushDelay ?? 1500;
    if (!local) {
      let server: ChildRecord;
      try {
        server = await api.getProfile(id);
      } catch (e) {
        // Access removed or profile deleted: what this device kept about the child goes too.
        if (isGone(e)) await forgetLocal(id);
        throw e;
      }
      const theirs = migrate(server.data);
      const sync = new ProfileSync(id, api, { data: withDeviceThings(theirs), version: server.version, base: clone(theirs), dirty: false, name: server.name }, pushDelay);
      await sync.writeNow();
      sync.saySeen();
      return sync;
    }
    const sync = new ProfileSync(id, api, local, pushDelay);
    // A copy that waited "to send" for things that no longer travel has nothing to send.
    if (!local.dirty || same(travelling(local.data), travelling(local.base))) sync.put({ dirty: false, localOnly: false, refused: undefined });
    const asked = sync.refresh().then(
      () => null,
      (e: unknown) => ({ e }),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<'late'>((res) => {
      timer = setTimeout(() => res('late'), opts.wait ?? OPEN_WAIT);
    });
    const first = await Promise.race([asked, late]);
    clearTimeout(timer);
    if (first === 'late') {
      // The server is slow or out of reach: the board opens now, the answer comes when it comes.
      if (sync.state === 'saved') sync.setState('offline');
      void asked.then((r) => {
        if (!r) return;
        sync.gone = r.e;
        sync.onGone?.(r.e);
      });
    } else if (first) throw first.e;
    return sync;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private setState(s: SyncState) {
    if (this.state === s) return;
    this.state = s;
    this.listeners.forEach((f) => f());
  }
  private put(patch: Partial<LocalCopy>) {
    this.copy = { ...this.copy, ...patch };
    if (patch.data) this.sentKey = travelKey(patch.data);
  }
  /** The state once nothing is being sent: up to date, or changes kept here. */
  private settle() {
    if (!this.copy.dirty) this.setState('saved');
    else if (this.copy.localOnly) this.setState(this.copy.refused && this.copy.refused !== 'forbidden' ? 'refused' : 'local');
  }

  /** The board changed here: keep it on the device, send it soon. */
  change = (p: Profile) => {
    const k = travelKey(p);
    const moved = k !== this.sentKey;
    this.copy = { ...this.copy, data: p, dirty: this.copy.dirty || moved };
    this.sentKey = k;
    clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => void this.writeNow(), 300);
    // Only this device's own small things (last activity board, a ticked step…): nothing to send.
    if (!moved) return;
    if (this.copy.localOnly) return this.settle();
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), this.pushDelay);
  };

  async writeNow() {
    clearTimeout(this.writeTimer);
    // The child left this device (sign-out, access removed): an open board must not write it back.
    if (isForgotten(this.id)) return;
    // A device that is full: said on the board; the changes still go to the account.
    await written('board', () => AsyncStorage.setItem(key(this.id), JSON.stringify(this.copy)));
  }

  /** Sends unsent changes (one at a time). Never fails: what cannot be sent waits on the device. */
  push(): Promise<void> {
    if (this.pushing) return this.pushing.then(() => (this.copy.dirty && !this.copy.localOnly && this.state !== 'offline' ? this.push() : undefined));
    this.pushing = this.doPush()
      .catch(() => this.setState('offline'))
      .finally(() => {
        this.pushing = null;
      });
    return this.pushing;
  }

  private async doPush(): Promise<void> {
    clearTimeout(this.pushTimer);
    let collisions = 0;
    let givenBack = false;
    let triedAgain = false;
    for (;;) {
      if (!this.copy.dirty) return this.setState('saved');
      if (this.copy.localOnly) return this.settle();
      const sent = this.copy.data;
      const body = travelling(sent);
      const bodyKey = this.sentKey;
      this.setState('saving');
      let r: SaveResult;
      try {
        const askedAt = Date.now();
        r = await this.api.saveProfile(this.id, body, this.copy.version);
        // For the app's team (families who agreed): how long the server took to answer, in fixed steps.
        countSpeed('sync', Date.now() - askedAt);
      } catch (e) {
        const code = codeOf(e);
        // No answer, or "too many requests": sent again at the next look for changes.
        if (code === 'offline' || code === 'too_many') return this.setState('offline');
        // What only the family decides was changed here: put back as the server has it, the rest is sent.
        if (code === 'consent_protected' && !givenBack && this.familyChoicesBack()) {
          givenBack = true;
          continue;
        }
        // Refused: the changes stay on this device…
        this.refusedAt = Date.now();
        this.put({ localOnly: true, refused: code });
        await this.writeNow();
        this.settle();
        // …and that never keeps the others' changes away: their newer version is taken with ours
        // on top, and ours is tried once more on it (a main board that had changed, for example).
        if (triedAgain) return;
        triedAgain = true;
        const moved = await this.look().catch(() => false);
        if (!moved || !this.copy.dirty) return this.settle();
        this.put({ localOnly: false, refused: undefined });
        continue;
      }
      if (r.ok) {
        const ops = diffProfiles(travelling(this.copy.base), body);
        const reason = this.reason;
        this.reason = undefined;
        this.lastSyncedAt = Date.now();
        // Changes made while saving stay "dirty" and go with the next save.
        this.put({ version: r.version, base: clone(body), dirty: this.sentKey !== bodyKey, localOnly: false, refused: undefined });
        if (ops.length) this.onSaved?.(ops, reason);
        await this.writeNow();
        continue;
      }
      // Someone saved in between: put our changes on top of their version.
      await this.take(r.conflict);
      // Still colliding after several tries (a busy team): the next look for changes goes on.
      if (++collisions > 3) return this.setState('offline');
    }
  }

  /** The family's own choices as the server has them (true when something was put back). */
  private familyChoicesBack(): boolean {
    const was = this.copy.base.settings as unknown as Record<string, unknown>;
    const now = this.copy.data.settings as unknown as Record<string, unknown>;
    if (FAMILY_CHOICES.every((k) => same(now[k], was[k]))) return false;
    const settings = { ...now };
    for (const k of FAMILY_CHOICES) {
      if (was[k] === undefined) delete settings[k];
      else settings[k] = was[k];
    }
    const data = { ...this.copy.data, settings: settings as unknown as Profile['settings'] };
    this.put({ data, dirty: !same(travelling(data), travelling(this.copy.base)) });
    this.onRemote?.(data);
    return true;
  }

  /**
   * A newer version from the server becomes this device's. Unsent changes are put back on top
   * of it (theirs kept where both changed the same thing); the device's own small things stay.
   */
  private async take(r: ChildRecord): Promise<void> {
    const theirs = migrate(r.data);
    let data: Profile;
    let dirty = false;
    let collided: Op[] = [];
    const ourBase = this.copy.base;
    if (this.copy.dirty) {
      const ours = diffProfiles(travelling(this.copy.base), travelling(this.copy.data));
      // (compared without the things that stay on each device, on both sides; src/lib/merge.ts)
      const { profile: merged, dropped } = mergeOps(travelling(theirs), ours);
      data = withDeviceThings(merged, this.copy.data);
      dirty = !same(travelling(data), travelling(theirs));
      collided = dropped;
    } else data = withDeviceThings(theirs, this.copy.data);
    this.put({ data, base: clone(theirs), version: r.version, name: r.name, dirty, ...(dirty ? {} : { localOnly: false, refused: undefined }) });
    // The board is told before anything else can happen: a touch made now is made on this version.
    this.onRemote?.(data);
    if (collided.length) this.onConflict?.(collided, ourBase);
    await this.writeNow();
  }

  /** Takes the server's version when it is newer (true when it did). Only the number is read otherwise. */
  private async look(): Promise<boolean> {
    if ((await this.api.profileVersion(this.id)) <= this.copy.version) return false;
    const r = await this.api.getProfile(this.id);
    if (r.version <= this.copy.version) return false;
    await this.take(r);
    return true;
  }

  /** At opening: ours is sent if something waits, theirs is taken if it is newer. */
  private async refresh(): Promise<void> {
    let server: ChildRecord;
    try {
      server = await this.api.getProfile(this.id);
    } catch (e) {
      if (isGone(e)) {
        // "Forbidden" is what the server answers when access was removed or the profile deleted,
        // but also for a board in the family's bin, an account whose two-step code is not typed,
        // or a session the login server could not renew just now. The device copy goes, and the
        // board closes, only when the removal is certain; otherwise the copy stays the board.
        if (await this.removed()) {
          await forgetLocal(this.id);
          throw e;
        }
      }
      // No answer: the device copy is the board.
      if (!this.copy.dirty || !this.copy.localOnly) this.setState('offline');
      else this.settle();
      return;
    }
    if (server.name !== this.copy.name) this.put({ name: server.name });
    if (this.copy.dirty) {
      // A save that was refused is tried once more each time the board opens.
      this.put({ localOnly: false, refused: undefined });
      if (!this.pushing && server.version > this.copy.version) await this.take(server);
      await this.push();
    } else if (server.version > this.copy.version) await this.take(server);
    if (!this.copy.dirty) this.lastSyncedAt = Date.now();
    this.settle();
    this.saySeen();
  }

  /**
   * Certain that this account no longer opens this child: the server answers, the two-step code
   * is not what is missing, and the child is neither among the account's children nor in its bin.
   */
  private async removed(): Promise<boolean> {
    try {
      // Someone must be signed in for the answer to mean anything.
      if (!(await this.api.currentAccount())) return false;
      const sec = await this.api.security();
      if (sec.twoStep && sec.level !== 'aal2') return false;
      if ((await this.api.listProfiles()).some((p) => p.id === this.id)) return false;
      return !(await this.api.listBin()).some((b) => b.id === this.id);
    } catch {
      return false;
    }
  }

  /**
   * "The board was opened today" (what the parents' 12:00 reminder looks at): said when the
   * board opens, then every half hour while it stays open. Never blocks the board, and never
   * depends on whether this device has something to send.
   */
  private saySeen() {
    const now = Date.now();
    if (this.sayingSeen || now - this.seenSaidAt < SEEN_EVERY) return;
    this.sayingSeen = true;
    void this.api
      .boardSeen(this.id)
      .then(
        () => {
          this.seenSaidAt = now;
        },
        () => {},
      )
      .finally(() => {
        this.sayingSeen = false;
      });
  }

  /**
   * Looks for a newer version on the server (someone else's change). Asked every 30 s while a
   * board is open: only the version number is read, the whole profile only when it is newer.
   */
  async pull(): Promise<void> {
    this.saySeen();
    // Unsent changes go first; a save the server refused does not stop the look that follows
    // (and is tried again now and then).
    if (this.copy.dirty && this.copy.localOnly && Date.now() - this.refusedAt >= RETRY_REFUSED_EVERY) this.put({ localOnly: false, refused: undefined });
    if (this.copy.dirty && !this.copy.localOnly) return this.push();
    try {
      const askedAt = Date.now();
      const r = (await this.api.profileVersion(this.id)) > this.copy.version ? await this.api.getProfile(this.id) : null;
      // For the app's team (families who agreed): how long the look for changes took, in fixed
      // steps — once every 5 minutes at most (a board looks every 30 s).
      if (askedAt - this.pullTimedAt >= PULL_TIMING_EVERY) {
        this.pullTimedAt = askedAt;
        countSpeed('sync', Date.now() - askedAt);
      }
      // Changed here while it downloaded: the save that follows puts ours on top of theirs instead.
      if (r && r.version > this.copy.version && !this.pushing && (!this.copy.dirty || this.copy.localOnly)) {
        await this.take(r);
        // Changes that were refused: tried once more now that the board moved.
        if (this.copy.dirty && this.copy.localOnly) {
          this.put({ localOnly: false, refused: undefined });
          await this.push();
        }
      }
      this.lastSyncedAt = Date.now();
      this.settle();
    } catch (e) {
      if (codeOf(e) === 'offline') this.setState('offline');
      else if (isGone(e)) await this.goneWhileOpen(e);
    }
  }

  /**
   * The server refuses a board that is on screen: when the removal is certain (access removed,
   * profile deleted for good), the device copy goes and the screen closes the board, as at opening.
   * Not certain (the bin, a two-step code, a session being renewed): the board stays as it is.
   */
  private async goneWhileOpen(e: unknown): Promise<void> {
    const now = Date.now();
    if (this.gone || now - this.goneCheckedAt < GONE_CHECK_EVERY) return;
    this.goneCheckedAt = now;
    if (!(await this.removed())) return;
    clearTimeout(this.pushTimer);
    clearTimeout(this.writeTimer);
    await forgetLocal(this.id);
    this.gone = e;
    this.onGone?.(e);
  }

  /** Before leaving (sign out, other child): last changes written and sent if possible. */
  async flush() {
    await this.writeNow();
    await this.push().catch(() => {});
  }
}
