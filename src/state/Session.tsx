/**
 * Who is using the app and which screen they are on.
 *
 * Journey: welcome → preview of the board → "who are you?" → sign-in →
 *   parent: the child's profile (questionnaire, set-up) → the board
 *   professional: verification → workspace
 * A tablet linked with a code goes straight to its child's board.
 *
 * What is remembered on this device (AsyncStorage): the interface language, the last account
 * (so a tablet without internet still opens the board) and which child was open.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../backend';
import type { Backend } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import type { Account, AccountPrefs, Role } from '../backend/types';
import { accountStrings, type AccountStrings } from '../i18n/account';
import { strings, type UiStrings } from '../i18n/ui';
import type { UiLang } from '../model/types';
import { forgetLocal } from './profileSync';

export type Stage =
  | { name: 'loading' }
  | { name: 'welcome' }
  | { name: 'preview' }
  | { name: 'role' }
  | { name: 'auth'; mode: 'signUp' | 'signIn' | 'forgot'; role: Role }
  | { name: 'pair' }
  | { name: 'invitations' }
  | { name: 'onboarding' }
  | { name: 'board'; profileId: string }
  | { name: 'pro' };

interface DevicePrefs {
  uiLang: UiLang;
  /** A stable id for this device (tablets list). */
  deviceId: string;
  /** Last signed-in account: used when the app starts without internet. */
  account?: Account;
  /** Children whose copy is kept on this device (removed at sign-out). */
  localProfiles?: string[];
}

interface SessionCtx {
  api: Backend;
  stage: Stage;
  go: (s: Stage) => void;
  account: Account | null;
  /** Navigation language of this person (not the child's communication language). */
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
  /** Texts of the account / journey screens. */
  s: AccountStrings;
  /** General interface texts. */
  ui: UiStrings;
  deviceId: string;
  /** Started without internet: working from what this device remembers. */
  offline: boolean;
  /** After signing in, signing up or linking a tablet: go to the right place. */
  enter: (opts?: { profileId?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reads the account again (after changing the name, for example). */
  refreshAccount: () => Promise<void>;
  updatePrefs: (p: Partial<AccountPrefs>) => Promise<void>;
  openProfile: (id: string) => void;
  /** The device keeps a copy of this child's profile (forgotten at sign-out). */
  rememberLocal: (id: string) => void;
}

const Ctx = createContext<SessionCtx | null>(null);
export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** Navigation language for components that may sit outside the session (tests, preview). */
export const NavLangContext = createContext<UiLang>('fr');

const DEVICE_KEY = 'caa.device.v1';

function deviceLanguage(): UiLang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (loc.startsWith('ar')) return 'ar';
    if (loc.startsWith('en')) return 'en';
  } catch {
    /* ignore */
  }
  return 'fr';
}

async function readDevice(): Promise<DevicePrefs> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const fresh = { uiLang: deviceLanguage(), deviceId: `dev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` };
  await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(fresh)).catch(() => {});
  return fresh;
}

export function SessionProvider({ children, api = backend() }: { children: React.ReactNode; api?: Backend }) {
  const [device, setDevice] = useState<DevicePrefs | null>(null);
  const deviceRef = useRef<DevicePrefs | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [offline, setOffline] = useState(false);

  const saveDevice = useCallback((patch: Partial<DevicePrefs>) => {
    const next = { ...(deviceRef.current as DevicePrefs), ...patch };
    deviceRef.current = next;
    setDevice(next);
    AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /** Where a signed-in person lands. */
  const route = useCallback(
    async (a: Account, opts: { profileId?: string } = {}) => {
      if (a.role === 'pro') return setStage({ name: 'pro' });
      if (opts.profileId) return setStage({ name: 'board', profileId: opts.profileId });
      try {
        const list = await api.listProfiles();
        const active = list.find((p) => p.id === a.prefs.activeProfileId) ?? list[0];
        if (active) return setStage({ name: 'board', profileId: active.id });
        // Invited before having a child of their own (grandparent, nanny…): the invitations first.
        const { received } = await api.myInvitations().catch(() => ({ received: [] as { status: string }[] }));
        setStage(received.some((i) => i.status === 'pending') ? { name: 'invitations' } : { name: 'onboarding' });
      } catch (e) {
        // Without internet: the child that was open last time, from this device's copy.
        if (e instanceof BackendError && e.code === 'offline' && a.prefs.activeProfileId) {
          setOffline(true);
          setStage({ name: 'board', profileId: a.prefs.activeProfileId });
        } else throw e;
      }
    },
    [api],
  );

  // Start: what this device remembers, then who is signed in.
  useEffect(() => {
    (async () => {
      const d = await readDevice();
      deviceRef.current = d;
      setDevice(d);
      let a: Account | null = null;
      try {
        a = await api.currentAccount();
      } catch (e) {
        if (e instanceof BackendError && e.code === 'offline' && d.account) {
          setOffline(true);
          a = d.account;
        }
      }
      if (!a) return setStage({ name: 'welcome' });
      setAccount(a);
      saveDevice({ account: a });
      await route(a).catch(() => setStage({ name: 'welcome' }));
    })();
  }, [api, route, saveDevice]);

  const enter = useCallback(
    async (opts: { profileId?: string } = {}) => {
      const a = await api.currentAccount();
      if (!a) throw new BackendError('not_signed_in');
      // The language chosen before signing in becomes the account's, unless it already had one.
      let acc = a;
      const lang = deviceRef.current?.uiLang;
      if (lang && a.prefs.uiLang !== lang) {
        if (!a.prefs.uiLang || Date.now() - a.createdAt < 10 * 60 * 1000) {
          acc = await api.updateAccount({ prefs: { uiLang: lang } }).catch(() => a);
        } else saveDevice({ uiLang: a.prefs.uiLang });
      }
      setOffline(false);
      setAccount(acc);
      saveDevice({ account: acc });
      await route(acc, opts);
    },
    [api, route, saveDevice],
  );

  const signOut = useCallback(async () => {
    await api.signOut().catch(() => {});
    // The children's copies leave this device with the account.
    for (const id of deviceRef.current?.localProfiles ?? []) await forgetLocal(id);
    saveDevice({ account: undefined, localProfiles: [] });
    setAccount(null);
    setStage({ name: 'welcome' });
  }, [api, saveDevice]);

  const refreshAccount = useCallback(async () => {
    const a = await api.currentAccount().catch(() => null);
    if (a) {
      setAccount(a);
      saveDevice({ account: a });
    }
  }, [api, saveDevice]);

  const updatePrefs = useCallback(
    async (p: Partial<AccountPrefs>) => {
      setAccount((a) => (a ? { ...a, prefs: { ...a.prefs, ...p } } : a));
      const updated = await api.updateAccount({ prefs: p }).catch(() => null);
      if (updated) {
        setAccount(updated);
        saveDevice({ account: updated });
      }
    },
    [api, saveDevice],
  );

  const uiLang: UiLang = account?.prefs.uiLang ?? device?.uiLang ?? 'fr';
  const setUiLang = useCallback(
    (l: UiLang) => {
      saveDevice({ uiLang: l });
      if (account) void updatePrefs({ uiLang: l });
    },
    [account, saveDevice, updatePrefs],
  );

  const openProfile = useCallback(
    (id: string) => {
      setStage({ name: 'board', profileId: id });
      if (account && account.prefs.activeProfileId !== id) void updatePrefs({ activeProfileId: id });
    },
    [account, updatePrefs],
  );

  const rememberLocal = useCallback(
    (id: string) => {
      const list = deviceRef.current?.localProfiles ?? [];
      if (!list.includes(id)) saveDevice({ localProfiles: [...list, id] });
    },
    [saveDevice],
  );

  const value = useMemo<SessionCtx>(
    () => ({
      api,
      stage,
      go: setStage,
      account,
      uiLang,
      setUiLang,
      s: accountStrings(uiLang),
      ui: strings(uiLang),
      deviceId: device?.deviceId ?? 'dev',
      offline,
      enter,
      signOut,
      refreshAccount,
      updatePrefs,
      openProfile,
      rememberLocal,
    }),
    [api, stage, account, uiLang, setUiLang, device?.deviceId, offline, enter, signOut, refreshAccount, updatePrefs, openProfile, rememberLocal],
  );

  return (
    <Ctx.Provider value={value}>
      <NavLangContext.Provider value={uiLang}>{children}</NavLangContext.Provider>
    </Ctx.Provider>
  );
}

