/**
 * Who is using the app and which screen they are on.
 *
 * Journey: welcome → preview of the board → "who are you?" → sign-in →
 *   parent: the child's profile (questionnaire, set-up) → the board
 *   professional: verification → workspace
 *   the app's team: the back office (they can open the app as usual from there)
 * A tablet linked with a code goes straight to its child's board.
 *
 * What is remembered on this device (AsyncStorage): the interface language, the last account
 * (so a tablet without internet still opens the board) and which child was open.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../backend';
import type { Backend, SecurityState } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import type { Account, AccountPrefs, Role } from '../backend/types';
import { createDefaultProfile } from '../data/defaults';
import { accountStrings, type AccountStrings } from '../i18n/account';
import { adminStrings } from '../i18n/admin';
import { strings, type UiStrings } from '../i18n/ui';
import type { UiLang } from '../model/types';
import { forgetLocal } from './profileSync';
import { forgetEverything, forgetOthers } from '../lib/deviceData';
import { keepSignedIn, setKeepSignedIn } from '../lib/keepSignedIn';
import { CHILD_DATA_CONSENT } from '../lib/consent';
import { markVisit, sameVisit } from '../lib/visit';
import { refreshPush, shouldAskPush, turnPushOff } from '../lib/push';

export type Stage =
  | { name: 'loading' }
  | { name: 'welcome' }
  | { name: 'preview' }
  | { name: 'role' }
  | { name: 'auth'; mode: 'signUp' | 'signIn' | 'forgot'; role: Role }
  | { name: 'pair' }
  | { name: 'invitations' }
  /** `back`: the screen "Add a child" was opened from (a board, the invitations): where its first "Back" returns. */
  | { name: 'onboarding'; back?: { name: 'board'; profileId: string } | { name: 'invitations' } }
  | { name: 'board'; profileId: string }
  /** The professional workspace; `open`: the child to show first (a profile just created). */
  | { name: 'pro'; open?: string }
  /** The app's own team: certificates to accept, figures, messages (src/ui/admin). */
  | { name: 'admin' }
  /** Two-step sign-in is on: the authenticator code before anything else (src/ui/TwoStep.tsx). */
  | { name: 'twoStep'; then?: { profileId?: string; app?: boolean } }
  /** "Turn on notifications?", once per account on a device, then where the person was going. */
  | { name: 'notify'; then?: { profileId?: string; app?: boolean } };

interface DevicePrefs {
  uiLang: UiLang;
  /** A stable id for this device (tablets list). */
  deviceId: string;
  /** Last signed-in account: used when the app starts without internet. */
  account?: Account;
  /** Children whose copy is kept on this device (removed at sign-out). */
  localProfiles?: string[];
  /** The account these copies (and `lastProfile`) belong to: never opened for another account. */
  localOwner?: string;
  /** The child whose board was open last on this device: opened again when the server cannot answer. */
  lastProfile?: string;
}

/**
 * The board this device can open by itself (no internet, a server that cannot answer): the one
 * that was open last, else the account's, else the first child it keeps a copy of.
 */
export function localBoard(d: Pick<DevicePrefs, 'localProfiles' | 'lastProfile' | 'localOwner' | 'account'> | null, a: Account): string | undefined {
  // What this device keeps was left by one account: a copy that waits for another account
  // (its session ended with changes not sent) is never the board of the person signed in now.
  const mine = !!d && (d.localOwner ?? d.account?.id) === a.id;
  const kept = mine ? (d?.localProfiles ?? []) : [];
  const wanted = [mine ? d?.lastProfile : undefined, a.prefs.activeProfileId].filter((id): id is string => !!id);
  return wanted.find((id) => kept.includes(id)) ?? kept[0] ?? wanted[0];
}

/** How long the start waits for the server when this device already knows who is signed in. */
const START_WAIT = 2000;

/**
 * Who is signed in, at the start of the app. `account: null` with `unknown: false` is the only
 * answer that means "nobody" (the server said so clearly). When the server cannot be asked, or
 * is slow while this device remembers an account (without internet the login library alone
 * tries for some 25 seconds), the remembered account is used at once (`unknown`), and `later`
 * gives the server's answer when it comes.
 */
export async function whoIsSignedIn(
  api: Pick<Backend, 'currentAccount'>,
  remembered: Account | undefined,
  wait = START_WAIT,
): Promise<{ account: Account | null; unknown: boolean; later?: Promise<Account | null> }> {
  const asking = api.currentAccount();
  if (!remembered) {
    try {
      return { account: await asking, unknown: false };
    } catch {
      return { account: null, unknown: true };
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<'slow'>((yes) => {
    timer = setTimeout(() => yes('slow'), wait);
  });
  try {
    const first = await Promise.race([asking, slow]);
    if (first === 'slow') return { account: remembered, unknown: true, later: asking };
    return { account: first, unknown: false };
  } catch {
    return { account: remembered, unknown: true };
  } finally {
    clearTimeout(timer);
  }
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
  /** After signing in, signing up or linking a tablet: go to the right place.
   *  `app`: a member of the app's team opens the app itself instead of the back office. */
  enter: (opts?: { profileId?: string; app?: boolean }) => Promise<void>;
  /** This account belongs to the app's team (the server decides; this only shows the way in). */
  isAdmin: boolean;
  /** Two-step sign-in of this account (null: not known, e.g. without internet or a linked tablet). */
  security: SecurityState | null;
  refreshSecurity: () => Promise<void>;
  /** `eraseMedia`: also erase the photos and recordings made on this device (those received from the account always leave). */
  signOut: (opts?: { eraseMedia?: boolean }) => Promise<void>;
  /** Reads the account again (after changing the name, for example). */
  refreshAccount: () => Promise<void>;
  updatePrefs: (p: Partial<AccountPrefs>) => Promise<void>;
  openProfile: (id: string) => void;
  /** The device keeps a copy of this child's profile (forgotten at sign-out). */
  rememberLocal: (id: string) => void;
  /** "Keep me logged in" on this device (ticked unless someone chose otherwise). */
  keep: boolean;
  setKeep: (keep: boolean) => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);
export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
/** The session, or null for a component that may sit outside it (tests, previews). */
export const useSessionMaybe = (): SessionCtx | null => useContext(Ctx);

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [keep, setKeepState] = useState(true);

  const saveDevice = useCallback((patch: Partial<DevicePrefs>) => {
    const next = { ...(deviceRef.current as DevicePrefs), ...patch };
    deviceRef.current = next;
    setDevice(next);
    AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /** Where a signed-in person lands. */
  const route = useCallback(
    async (a: Account, opts: { profileId?: string; app?: boolean } = {}) => {
      // Two-step sign-in on and its code not typed yet: nothing else before it (the database would
      // show no child, which must never look like "no child yet").
      const sec = a.provider === 'device' ? null : await api.security().catch(() => null);
      setSecurity(sec);
      if (sec?.twoStep && sec.level !== 'aal2') return setStage({ name: 'twoStep', then: opts });
      // Notifications: asked once at the beginning (never on a child's tablet); a device that
      // already accepted them says it is still there.
      if (a.provider !== 'device') {
        if (await shouldAskPush(api, a.id).catch(() => false)) return setStage({ name: 'notify', then: opts });
        void refreshPush(api, a.prefs.uiLang ?? deviceRef.current?.uiLang ?? 'fr');
      }
      // The app's team lands in the back office (a tablet linked with a code is never in the team).
      const admin = a.provider !== 'device' && (sec ? sec.team : await api.isAdmin().catch(() => false));
      setIsAdmin(admin);
      if (admin && !opts.app && !opts.profileId) return setStage({ name: 'admin' });
      if (a.role === 'pro') return setStage({ name: 'pro' });
      if (opts.profileId) return setStage({ name: 'board', profileId: opts.profileId });
      try {
        const list = await api.listProfiles();
        // Copies of children this account no longer opens (removed elsewhere, another account's
        // left here) leave the device, with their photos; never one with changes not sent.
        // Only when the list can be trusted: the two-step state is known (an account whose code is
        // missing sees no child) and the list is not empty (an empty answer is never a reason to erase).
        if ((a.provider === 'device' || sec) && list.length) void forgetOthers(list.map((p) => p.id))
          .then((gone) => {
            const d = deviceRef.current;
            if (gone.length && d?.localProfiles?.some((id) => gone.includes(id))) saveDevice({ localProfiles: d.localProfiles.filter((id) => !gone.includes(id)) });
          })
          .catch(() => {});
        const active = list.find((p) => p.id === a.prefs.activeProfileId) ?? list[0];
        if (active) {
          // Remembered with the account (someone who joined by invitation never chose a child
          // herself): the same board opens next time, with or without internet.
          if (a.prefs.activeProfileId !== active.id) {
            void api
              .updateAccount({ prefs: { activeProfileId: active.id } })
              .then((u) => {
                setAccount(u);
                saveDevice({ account: u });
              })
              .catch(() => {});
          }
          return setStage({ name: 'board', profileId: active.id });
        }
        // A member of the app's team opening the app: no questions, a ready-made test profile is
        // created once (it can be renamed or deleted in Settings → Account like any other).
        if (admin) {
          const lang = a.prefs.uiLang ?? deviceRef.current?.uiLang ?? 'fr';
          const data = createDefaultProfile();
          data.settings.uiLang = lang;
          data.settings.lang = lang;
          data.settings.langs = [lang, ...(['fr', 'en', 'ar'] as const).filter((l) => l !== lang)];
          // The team member's own test profile: their consent, as for any family.
          const rec = await api.createProfile({ name: adminStrings(lang).testChild, data, consent: CHILD_DATA_CONSENT });
          return setStage({ name: 'board', profileId: rec.id });
        }
        // Invited before having a child of their own (grandparent, nanny…): the invitations first.
        const { received } = await api.myInvitations().catch(() => ({ received: [] as { status: string }[] }));
        setStage(received.some((i) => i.status === 'pending') ? { name: 'invitations' } : { name: 'onboarding' });
      } catch (e) {
        // The server did not answer (no internet, a server error, anything else): the child's
        // board from this device's copy, never the welcome page while a board is kept here.
        const id = localBoard(deviceRef.current, a);
        if (!id) throw e;
        setOffline(true);
        setStage({ name: 'board', profileId: id });
      }
    },
    [api, saveDevice],
  );

  // The board on screen is the one this device opens again by itself.
  useEffect(() => {
    const d = deviceRef.current;
    if (stage.name !== 'board' || !d || !account) return;
    if (d.lastProfile !== stage.profileId || d.localOwner !== account.id)
      saveDevice({ lastProfile: stage.profileId, localOwner: account.id, ...(d.localOwner && d.localOwner !== account.id ? { localProfiles: [] } : {}) });
  }, [stage, account, saveDevice]);

  // Start: what this device remembers, then who is signed in.
  useEffect(() => {
    (async () => {
      const d = await readDevice();
      deviceRef.current = d;
      setDevice(d);
      /** Nobody is signed in any more, and no sign-out happened here (ended elsewhere, account deleted). */
      const ended = async () => {
        // What the last account left on this device goes, except a board whose changes were never sent.
        await forgetEverything({ keepUnsent: true });
        // The browser stops receiving that person's notifications (the server forgets a dead address by itself).
        await turnPushOff(api).catch(() => {});
        const was = deviceRef.current;
        if (was?.account) saveDevice({ account: undefined, lastProfile: undefined, localOwner: was.localOwner ?? was.account.id });
        setAccount(null);
        setStage({ name: 'welcome' });
      };
      // `null` only when the server said clearly that nobody is signed in. Any failure to ask
      // (no internet, server down, a server that is slow) keeps the last account: the child's
      // board must stay on the device, and must not wait.
      const { account: a, unknown, later } = await whoIsSignedIn(api, d.account);
      if (unknown && a) setOffline(true);
      // Nothing known and nothing remembered: the welcome page, without erasing anything.
      if (!a && unknown) return setStage({ name: 'welcome' });
      const kept = await keepSignedIn();
      setKeepState(kept);
      // Signed in without "Keep me logged in", and the app was closed since: the visit is over.
      // (A tablet linked with a code always stays connected.)
      if (a && a.provider !== 'device' && !kept && !sameVisit()) {
        await forgetEverything({ beforeSignOut: true });
        await turnPushOff(api).catch(() => {});
        await api.signOut().catch(() => {});
        saveDevice({ account: undefined, localProfiles: [], lastProfile: undefined });
        return setStage({ name: 'welcome' });
      }
      if (!a) return ended();
      markVisit();
      setAccount(a);
      saveDevice({ account: a });
      if (!unknown) return route(a).catch(() => setStage({ name: 'welcome' }));
      // The server has not answered: straight to what this device keeps, without the questions
      // that would each wait for it.
      const id = a.role === 'pro' ? undefined : localBoard(d, a);
      if (a.role === 'pro') setStage({ name: 'pro' });
      else if (id) setStage({ name: 'board', profileId: id });
      else await route(a).catch(() => setStage({ name: 'welcome' }));
      // Its answer, when it comes: the account as it is now, or the end of a session that is no more.
      if (later) {
        void later.then(
          async (real) => {
            if (!real) return ended();
            setAccount(real);
            saveDevice({ account: real });
            setOffline(false);
            if (real.provider === 'device') return;
            const sec = await api.security().catch(() => null);
            setSecurity(sec);
            setIsAdmin(sec ? sec.team : await api.isAdmin().catch(() => false));
          },
          () => {},
        );
      }
    })();
  }, [api, route, saveDevice]);

  const enter = useCallback(
    async (opts: { profileId?: string; app?: boolean } = {}) => {
      const a = await api.currentAccount();
      if (!a) throw new BackendError('not_signed_in');
      markVisit();
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

  const signOut = useCallback(async (opts?: { eraseMedia?: boolean }) => {
    // Changes not sent yet go first (the session still works); then everything about the
    // children leaves this device with the account, and no open board can write it back.
    await forgetEverything({ beforeSignOut: true, media: opts?.eraseMedia === true });
    // This device stops receiving this person's notifications.
    await turnPushOff(api).catch(() => {});
    await api.signOut().catch(() => {});
    saveDevice({ account: undefined, localProfiles: [], lastProfile: undefined });
    setAccount(null);
    setIsAdmin(false);
    setSecurity(null);
    setStage({ name: 'welcome' });
  }, [api, saveDevice]);

  const refreshSecurity = useCallback(async () => {
    const sec = await api.security().catch(() => null);
    if (sec) setSecurity(sec);
  }, [api]);

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
  // In a browser: the page says which language it is in (a screen reader then pronounces it
  // properly) and carries the app's name as its title.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = uiLang;
    document.title = 'Daleth AAC';
  }, [uiLang]);
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
      const d = deviceRef.current;
      const owner = account?.id ?? d?.localOwner;
      // Copies left by another account are not this account's.
      const list = d?.localOwner && owner && d.localOwner !== owner ? [] : (d?.localProfiles ?? []);
      if (!list.includes(id) || d?.localOwner !== owner) saveDevice({ localProfiles: list.includes(id) ? list : [...list, id], localOwner: owner });
    },
    [saveDevice, account],
  );

  const setKeep = useCallback(async (v: boolean) => {
    setKeepState(v);
    await setKeepSignedIn(v);
  }, []);

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
      isAdmin,
      security,
      refreshSecurity,
      signOut,
      refreshAccount,
      updatePrefs,
      openProfile,
      rememberLocal,
      keep,
      setKeep,
    }),
    [api, stage, account, uiLang, setUiLang, device?.deviceId, offline, enter, isAdmin, security, refreshSecurity, signOut, refreshAccount, updatePrefs, openProfile, rememberLocal, keep, setKeep],
  );

  return (
    <Ctx.Provider value={value}>
      <NavLangContext.Provider value={uiLang}>{children}</NavLangContext.Provider>
    </Ctx.Provider>
  );
}

