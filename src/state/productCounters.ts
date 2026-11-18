/**
 * Counts, on this device, how the features are used and which technical problems are met, for
 * the app's team — only while the family agreed to it ("Help improve the app", `sharesProduct`),
 * and never on a professional's or the team's own account.
 *
 * What leaves the device: per day, a number for each name of a fixed list (`COUNTERS`: used,
 * seen, waiting times in fixed steps) with the app's version, and problems as known values
 * (`ProblemItem`). The server checks the agreement again and keeps nothing else. When the
 * family stops sharing, what this device kept is erased (`forget`), and the server erases its side.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import { isForgotten } from '../lib/deviceData';
import { COUNTERS, describeProblem, currentScreen, type Counter, type DeviceForm, type ProblemItem, type ProductSink } from '../lib/product';
import { dayOf } from './usageTracker';

const KEEP_DAYS = 35;
/** A device that keeps failing does not send hundreds of lines: 40 different problems a day at most. */
const MAX_PROBLEMS = 40;

interface Stored {
  days: Record<string, Partial<Record<Counter, number>>>;
  /** The app's version each day was counted with (a day sent after an update keeps its own). */
  versions: Record<string, string>;
  pending: string[];
  problems: ProblemItem[];
}

const empty = (): Stored => ({ days: {}, versions: {}, pending: [], problems: [] });
/** Most a counter can say in a day: 1 for "seen", a day in milliseconds for a `…Ms`, otherwise 100,000. */
const capOf = (key: Counter) => (key.startsWith('seen:') ? 1 : key.endsWith('Ms') ? 86400000 : 100000);

export class ProductCounter implements ProductSink {
  private store: Stored = empty();
  private saveTimer?: ReturnType<typeof setTimeout>;
  private uploadTimer?: ReturnType<typeof setTimeout>;
  private undoWatch?: () => void;

  private constructor(
    private api: Backend,
    readonly profileId: string,
    private deviceId: string,
    private device: { platform: string; form: DeviceForm; version: string },
    private agreed: () => boolean,
    private now: () => number,
  ) {}

  static async open(
    api: Backend,
    profileId: string,
    deviceId: string,
    device: { platform: string; form: DeviceForm; version: string },
    agreed: () => boolean,
    now: () => number = Date.now,
  ): Promise<ProductCounter> {
    const c = new ProductCounter(api, profileId, deviceId, device, agreed, now);
    try {
      const raw = await AsyncStorage.getItem(c.key);
      if (raw) c.store = { ...empty(), ...JSON.parse(raw) };
    } catch {
      /* start empty */
    }
    // Not agreed (or no longer): nothing stays on the device either.
    if (!agreed() && (Object.keys(c.store.days).length || c.store.problems.length)) await c.forget();
    c.undoWatch = watchProblems((kind, error) => c.problem(describeProblem(kind, error, currentScreen())));
    return c;
  }

  private get key() {
    return `caa.product.${this.profileId}`;
  }

  count = (key: Counter, n: number) => {
    if (!this.agreed() || !COUNTERS.includes(key) || !(n > 0)) return;
    const d = dayOf(this.now());
    const day = (this.store.days[d] ??= {});
    // "Seen" is a yes for the day: once it is there, nothing to write again.
    if (key.startsWith('seen:') && day[key]) return;
    day[key] = Math.min((day[key] ?? 0) + Math.round(n), capOf(key));
    this.store.versions[d] = this.device.version;
    if (!this.store.pending.includes(d)) this.store.pending.push(d);
    this.changed();
  };

  problem = (item: ProblemItem) => {
    if (!this.agreed()) return;
    const same = this.store.problems.find((p) => p.kind === item.kind && p.name === item.name && p.at === item.at && p.screen === item.screen);
    if (same) same.n = Math.min(50, same.n + 1);
    else if (this.store.problems.length < MAX_PROBLEMS) this.store.problems.push({ ...item });
    this.changed();
  };

  private changed() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.writeLocal(), 1000);
    if (!this.uploadTimer) this.uploadTimer = setTimeout(() => void this.upload(), 60 * 1000);
  }

  private async writeLocal() {
    if (isForgotten(this.profileId)) return;
    const keys = Object.keys(this.store.days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete this.store.days[k];
    for (const k of Object.keys(this.store.versions)) if (!this.store.days[k]) delete this.store.versions[k];
    await AsyncStorage.setItem(this.key, JSON.stringify(this.store)).catch(() => {});
  }

  /** Sends what is not on the server yet (the server checks the family's agreement again). */
  async upload(): Promise<void> {
    clearTimeout(this.uploadTimer);
    this.uploadTimer = undefined;
    if (!this.agreed()) return;
    const today = dayOf(this.now());
    for (const d of [...this.store.pending]) {
      const counts = this.store.days[d];
      if (!counts) {
        this.store.pending = this.store.pending.filter((x) => x !== d);
        continue;
      }
      try {
        await this.api.saveFeatureDay(this.profileId, {
          day: d,
          deviceId: this.deviceId,
          counts,
          platform: this.device.platform,
          form: this.device.form,
          appVersion: this.store.versions[d] ?? this.device.version,
        });
        // Today's count can still grow: it is sent again later.
        if (d !== today) this.store.pending = this.store.pending.filter((x) => x !== d);
      } catch {
        break; // offline or refused: tried again later
      }
    }
    if (this.store.problems.length) {
      const items = this.store.problems.map((p) => ({ ...p, platform: this.device.platform, form: this.device.form, version: this.device.version }));
      try {
        await this.api.reportProblems(this.profileId, items);
        this.store.problems = [];
      } catch {
        /* tried again later; the list stays short (MAX_PROBLEMS) */
      }
    }
    await this.writeLocal();
  }

  async flush() {
    clearTimeout(this.saveTimer);
    await this.writeLocal();
    await this.upload();
  }

  /** The family stopped sharing: what this device kept is erased too. */
  async forget() {
    this.store = empty();
    clearTimeout(this.saveTimer);
    await AsyncStorage.removeItem(this.key).catch(() => {});
  }

  /** For tests and the settings page: what is waiting on this device. */
  local(): Stored {
    return JSON.parse(JSON.stringify(this.store));
  }

  close() {
    clearTimeout(this.saveTimer);
    clearTimeout(this.uploadTimer);
    this.undoWatch?.();
  }
}

/**
 * Listens for the errors nobody caught (the app's own handling is not changed). In a browser:
 * the page's `error` and `unhandledrejection` events; on a tablet: the global error handler.
 */
export function watchProblems(report: (kind: 'crash' | 'promise', error: unknown) => void): () => void {
  const g = globalThis as {
    ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void };
    addEventListener?: (t: string, f: (ev: unknown) => void) => void;
    removeEventListener?: (t: string, f: (ev: unknown) => void) => void;
  };
  if (g.ErrorUtils) {
    const prev = g.ErrorUtils.getGlobalHandler();
    const mine = (e: unknown, fatal?: boolean) => {
      report('crash', e);
      prev(e, fatal);
    };
    g.ErrorUtils.setGlobalHandler(mine);
    return () => {
      // Someone else may have wrapped the handler since: only put the old one back if ours is still there.
      if (g.ErrorUtils?.getGlobalHandler() === mine) g.ErrorUtils.setGlobalHandler(prev);
    };
  }
  if (g.addEventListener) {
    const onError = (ev: unknown) => report('crash', (ev as { error?: unknown })?.error);
    const onReject = (ev: unknown) => report('promise', (ev as { reason?: unknown })?.reason);
    g.addEventListener('error', onError);
    g.addEventListener('unhandledrejection', onReject);
    return () => {
      g.removeEventListener?.('error', onError);
      g.removeEventListener?.('unhandledrejection', onReject);
    };
  }
  return () => {};
}
