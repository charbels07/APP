/**
 * Keeps a child's profile on this device and in step with the server.
 *
 * - The board always works from the copy saved on the device (no internet needed).
 * - Each change is written on the device at once, then sent to the server a moment later.
 * - The server only accepts a save made from its latest version. If someone else saved in
 *   between, our changes are re-applied on top of theirs (a "merge"); where both changed the
 *   very same thing, their newer change is kept and we are told.
 * - When the server refuses (a use-only tablet), changes simply stay on this device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import type { ChildRecord } from '../backend/types';
import { applyOps, diffProfiles } from '../lib/profileDiff';
import { migrate } from '../lib/storage';
import type { Profile } from '../model/types';

export interface LocalCopy {
  data: Profile;
  /** Server version this copy is based on. */
  version: number;
  /** The profile as the server last had it: what our own changes are compared with. */
  base: Profile;
  /** Changes not on the server yet. */
  dirty: boolean;
  name: string;
  /** The server refuses our saves (use-only access): changes stay on this device. */
  localOnly?: boolean;
}

export type SyncState = 'saved' | 'saving' | 'offline' | 'local';

const key = (id: string) => `caa.child.${id}`;

export async function readLocal(id: string): Promise<LocalCopy | null> {
  try {
    const raw = await AsyncStorage.getItem(key(id));
    if (!raw) return null;
    const c = JSON.parse(raw) as LocalCopy;
    return { ...c, data: migrate(c.data), base: migrate(c.base) };
  } catch {
    return null;
  }
}

export async function forgetLocal(id: string) {
  await AsyncStorage.removeItem(key(id)).catch(() => {});
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const isOffline = (e: unknown) => e instanceof BackendError && e.code === 'offline';

export class ProfileSync {
  copy: LocalCopy;
  state: SyncState = 'saved';
  private writeTimer?: ReturnType<typeof setTimeout>;
  private pushTimer?: ReturnType<typeof setTimeout>;
  private pushing: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  /** Called when the profile changed because of someone else (the board redraws). */
  onRemote?: (p: Profile) => void;
  /** Called when some of our changes collided with someone else's (theirs kept). */
  onConflict?: (count: number) => void;

  private constructor(readonly id: string, private api: Backend, copy: LocalCopy, readonly pushDelay: number) {
    this.copy = copy;
  }

  /** Opens a profile: the device copy at once if there is one, refreshed from the server when online. */
  static async open(api: Backend, id: string, opts: { pushDelay?: number } = {}): Promise<ProfileSync> {
    const local = await readLocal(id);
    let server: ChildRecord | null = null;
    try {
      server = await api.getProfile(id);
    } catch (e) {
      // Access removed or profile deleted: the device copy goes too.
      if (e instanceof BackendError && (e.code === 'forbidden' || e.code === 'not_found')) {
        await forgetLocal(id);
        throw e;
      }
      if (!local) throw e;
    }
    const fromServer = (r: ChildRecord): LocalCopy => {
      const data = migrate(r.data);
      return { data, version: r.version, base: clone(data), dirty: false, name: r.name };
    };
    const copy = local ?? fromServer(server!);
    const sync = new ProfileSync(id, api, copy, opts.pushDelay ?? 1500);
    if (!local) {
      await sync.writeNow();
    } else if (server) {
      if (server.name !== copy.name) copy.name = server.name;
      if (copy.dirty) await sync.push();
      else if (server.version > copy.version) {
        sync.copy = { ...fromServer(server), localOnly: copy.localOnly };
        await sync.writeNow();
      }
    } else {
      sync.setState('offline');
    }
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

  /** The board changed here: keep it on the device, send it soon. */
  change = (p: Profile) => {
    this.copy = { ...this.copy, data: p, dirty: true };
    clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => void this.writeNow(), 300);
    if (this.copy.localOnly) return this.setState('local');
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), this.pushDelay);
  };

  async writeNow() {
    clearTimeout(this.writeTimer);
    await AsyncStorage.setItem(key(this.id), JSON.stringify(this.copy)).catch(() => {});
  }

  /** Sends unsent changes (one at a time). */
  push(): Promise<void> {
    if (this.pushing) return this.pushing.then(() => (this.copy.dirty ? this.push() : undefined));
    this.pushing = this.doPush().finally(() => {
      this.pushing = null;
    });
    return this.pushing;
  }

  private async doPush(attempt = 0): Promise<void> {
    clearTimeout(this.pushTimer);
    if (!this.copy.dirty || this.copy.localOnly) return;
    const sent = this.copy.data;
    this.setState('saving');
    let r;
    try {
      r = await this.api.saveProfile(this.id, sent, this.copy.version);
    } catch (e) {
      if (isOffline(e)) return this.setState('offline');
      if (e instanceof BackendError && (e.code === 'forbidden' || e.code === 'core_protected')) {
        this.copy = { ...this.copy, localOnly: true };
        await this.writeNow();
        return this.setState('local');
      }
      throw e;
    }
    if (r.ok) {
      // Changes made while saving stay "dirty" and go with the next save.
      this.copy = { ...this.copy, version: r.version, base: clone(sent), dirty: this.copy.data !== sent };
      await this.writeNow();
      if (this.copy.dirty) return this.doPush();
      return this.setState('saved');
    }
    // Someone saved in between: put our changes on top of their version.
    const theirs = migrate(r.conflict.data);
    const ours = diffProfiles(this.copy.base, this.copy.data);
    const { profile: merged, conflicts } = applyOps(theirs, ours);
    this.copy = { ...this.copy, data: merged, base: clone(theirs), version: r.conflict.version, dirty: true, name: r.conflict.name };
    await this.writeNow();
    this.onRemote?.(merged);
    if (conflicts.length) this.onConflict?.(conflicts.length);
    if (attempt < 3) return this.doPush(attempt + 1);
  }

  /** Looks for a newer version on the server (someone else's change). */
  async pull(): Promise<void> {
    if (this.copy.dirty) return this.push().catch(() => {});
    try {
      const r = await this.api.getProfile(this.id);
      if (r.version > this.copy.version) {
        const data = migrate(r.data);
        this.copy = { ...this.copy, data, base: clone(data), version: r.version, name: r.name };
        await this.writeNow();
        this.onRemote?.(data);
      }
      if (this.state === 'offline') this.setState('saved');
    } catch (e) {
      if (isOffline(e)) this.setState('offline');
    }
  }

  /** Before leaving (sign out, other child): last changes written and sent if possible. */
  async flush() {
    await this.writeNow();
    await this.push().catch(() => {});
  }
}
