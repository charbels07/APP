/** Shows the screen of the current step of the journey (see src/state/Session.tsx). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState as RNAppState, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { BackendError } from '../backend/Backend';
import { createDefaultProfile } from '../data/defaults';
import { errorText } from '../i18n/account';
import { APP_VERSION } from '../lib/appVersion';
import { guardLeaving } from '../lib/childLock';
import { invertOps } from '../lib/profileDiff';
import type { Profile } from '../model/types';
import { AppProvider, useApp } from '../state/AppState';
import { BoardContext, useBoard, type MyAccess } from '../state/BoardContext';
import { MediaSync } from '../state/mediaSync';
import { ProfileSync } from '../state/profileSync';
import { ProductCounter } from '../state/productCounters';
import { UsageTracker } from '../state/usageTracker';
import { deviceForm, firstBoardShown, holdProduct, setProductSink, sharesProduct, startupWaited } from '../lib/product';
import { useSession } from '../state/Session';
import { Btn } from './common';
import { Icon } from './Icon';
import { BackOffice } from './admin/BackOffice';
import { TwoStepScreen } from './TwoStep';
import { Onboarding } from './onboarding/Onboarding';
import { ProHome } from './pro/ProHome';
import { BoardRescue } from './BoardRescue';
import { Root } from './Root';
import { AuthScreen } from './start/AuthScreen';
import { InvitationsScreen } from './start/InvitationsScreen';
import { NotifyScreen } from './start/NotifyScreen';
import { PairScreen } from './start/PairScreen';
import { RoleChoice } from './start/RoleChoice';
import { StartLayout, T } from './start/StartLayout';
import { Welcome } from './start/Welcome';
import { C, radius } from './theme';
import { pendingSaves } from '../lib/deviceData';
import { familyCodeUnset, mustChooseFirst } from '../lib/caregiverCode';

export function Stages() {
  const { stage } = useSession();
  // The board has a dark side bar; the other screens are light.
  const dark = stage.name === 'board' || stage.name === 'preview';
  // The opening time is only measured when the app goes straight to a board: a screen that
  // waits for a person (welcome, sign-in, set-up…) would count the person's own time.
  useEffect(() => {
    if (stage.name !== 'loading' && stage.name !== 'board') startupWaited();
  }, [stage.name]);
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Current />
    </>
  );
}

function Current() {
  const { stage } = useSession();
  switch (stage.name) {
    case 'loading':
      return <Splash />;
    case 'welcome':
      return <Welcome />;
    case 'preview':
      return <PreviewStage />;
    case 'role':
      return <RoleChoice />;
    case 'auth':
      return <AuthScreen key={`${stage.mode}-${stage.role}`} mode={stage.mode} role={stage.role} />;
    case 'pair':
      return <PairScreen />;
    case 'invitations':
      return <InvitationsScreen />;
    case 'onboarding':
      return <Onboarding />;
    case 'board':
      return <BoardStage key={stage.profileId} profileId={stage.profileId} />;
    case 'pro':
      return <ProHome open={stage.open} />;
    case 'admin':
      return <BackOffice />;
    case 'twoStep':
      return <TwoStepScreen then={stage.then} />;
    case 'notify':
      return <NotifyScreen then={stage.then} />;
  }
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );
}

/** The full board, before any account: try everything, nothing is saved. */
function PreviewStage() {
  const { s, go, uiLang, setUiLang } = useSession();
  const initial = useMemo(() => createDefaultProfile(), []);
  const banner = (
    <View style={[styles.banner, uiLang === 'ar' && { flexDirection: 'row-reverse' }]}>
      <Icon name="eye" size={22} color={C.accent} />
      <Text style={[styles.bannerText, uiLang === 'ar' && { textAlign: 'right' }]} numberOfLines={2}>
        {s.previewBanner}
      </Text>
      <Btn small label={s.back} onPress={() => go({ name: 'welcome' })} />
      <Btn small kind="primary" label={s.previewNext} onPress={() => go({ name: 'role' })} />
    </View>
  );
  return (
    <AppProvider initial={initial} onChange={() => {}} uiLang={uiLang} setUiLang={setUiLang} preview>
      <Root banner={banner} />
    </AppProvider>
  );
}

/** A child's board: the device copy at once, kept in step with the server. */
function BoardStage({ profileId }: { profileId: string }) {
  const sess = useSession();
  const { api, s, uiLang, setUiLang, rememberLocal } = sess;
  const [sync, setSync] = useState<ProfileSync | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [note, setNote] = useState<string | null>(null);
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [tracker, setTracker] = useState<UsageTracker | null>(null);
  const [media, setMedia] = useState<MediaSync | null>(null);
  const accessRef = useRef<MyAccess | null>(null);
  accessRef.current = access;
  // Feature counters for the app's team: the family's own devices and the child's tablets only
  // (not a professional's account, not the team's test accounts), and only if the family agreed.
  const product = useRef<ProductCounter | null>(null);
  const outsider = useRef(false);
  outsider.current = sess.account?.role === 'pro' || sess.isAdmin;

  useEffect(() => {
    let alive = true;
    let opened: ProfileSync | null = null;
    let usage: UsageTracker | null = null;
    // What is counted while the board opens (its bar, the opening time) waits for its counter.
    holdProduct();
    let files: MediaSync | null = null;
    const sendNow = async () => {
      await opened?.flush();
      await usage?.flush();
      await product.current?.flush();
      await files?.flush();
    };
    // Started without the server: the device copy opens at once (the server is asked behind).
    ProfileSync.open(api, profileId, sess.offline ? { wait: 300 } : {}).then(
      (sy) => {
        if (!alive) return;
        opened = sy;
        // Opened from the device copy, and the server then said this board is no longer ours.
        sy.onGone = (e) => alive && setError(e);
        if (sy.gone) setError(sy.gone);
        // Called before a sign-out: what is not sent yet goes first.
        pendingSaves.add(sendNow);
        rememberLocal(profileId);
        sy.onConflict = () => setNote(s.conflictNote);
        // Every change that reaches the server goes into the change history (with undo).
        sy.onSaved = (ops, reason) => {
          void api.addHistory({ profileId, summary: reason ?? '', ops, inverse: invertOps(ops) }).catch(() => {});
          void api.reportSync(profileId, sess.deviceId, { synced: true, backedUp: true, pendingChanges: 0 }).catch(() => {});
        };
        setSync(sy);
        // Communication data, recorded only at the level the family chose (off by default).
        void UsageTracker.open(api, profileId, sess.deviceId, `${Platform.OS} · ${deviceName()}`, () => sy.copy.data.settings.dataCollection ?? 'off').then((t) => {
          if (!alive) return t.close();
          usage = t;
          sy.subscribe(() => t.setOnline(sy.state !== 'offline'));
          setTracker(t);
        });
        const size = Dimensions.get('window');
        const touch = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
        void ProductCounter.open(
          api,
          profileId,
          sess.deviceId,
          { platform: Platform.OS, form: deviceForm(Platform.OS, size.width, size.height, touch), version: APP_VERSION },
          () => !outsider.current && sharesProduct(sy.copy.data.settings),
        ).then((c) => {
          if (!alive) return c.close();
          product.current = c;
          setProductSink(c);
        });
        // Photos and recordings: copied through the account in the background (src/state/mediaSync.ts).
        void MediaSync.open(api, profileId, {
          // Sent by those who may change the board (unknown yet: the server decides); a use-only tablet keeps its own.
          canSend: () => {
            const a = accessRef.current;
            return !sy.copy.localOnly && (!a || a.owner || !!a.perms.manager || a.level >= 3);
          },
          canRemove: () => {
            const a = accessRef.current;
            return !!a && (a.owner || !!a.perms.manager);
          },
        }).then((m) => {
          if (!alive) return m.close();
          files = m;
          m.see(sy.copy.data);
          setMedia(m);
        });
        // This person's rights (who may choose the caregiver code, among others). Asked again
        // until they are known: `askAccess` below.
        void api.myAccess(profileId).then((a) => alive && setAccess(a)).catch(() => {});
        // This device appears in "Devices and sync"; a removed device is signed out.
        void api
          .registerDevice(profileId, { id: sess.deviceId, name: deviceName(), kind: 'companion', platform: Platform.OS, appVersion: APP_VERSION })
          .catch((e) => {
            if (e instanceof BackendError && e.code === 'device_revoked') void sess.signOut();
          });
      },
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
      pendingSaves.delete(sendNow);
      void opened?.flush();
      if (usage) {
        void usage.flush();
        usage.close();
      }
      setProductSink(null);
      if (product.current) {
        void product.current.flush();
        product.current.close();
        product.current = null;
      }
      files?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profileId]);

  // The board's changes: new activity boards are counted; turning collection off erases this device's data.
  const onChange = useCallback(
    (p: Profile) => {
      if (!sync) return;
      const before = sync.copy.data;
      if (tracker) {
        const added = p.tlaOrder.filter((id) => !before.tlaOrder.includes(id)).length;
        for (let i = 0; i < added; i++) tracker.record({ type: 'tlaCreated' });
        if (p.settings.dataCollection === 'off' && before.settings.dataCollection !== 'off') void tracker.forget();
      }
      // The family stopped sharing with the app's team: what this device counted is erased (the server erases its side).
      if (sharesProduct(before.settings) && !sharesProduct(p.settings)) void product.current?.forget();
      // A new photo or recording is sent; one that was replaced or removed leaves the account.
      media?.changed(before, p);
      sync.change(p);
    },
    [sync, tracker, media],
  );

  // Someone else's changes: looked for every 30 s and when the app comes back to the front. Only the
  // version number travels each time (`pull`); the whole profile only when someone saved a newer one.
  // The rights did not arrive (no internet when the board opened): asked again after a few
  // seconds, with each look at the server and when the app comes back to the front. Without
  // them nobody may choose the caregiver code, and the first keypad waits.
  const askAccess = useCallback(() => {
    if (accessRef.current) return;
    void api
      .myAccess(profileId)
      .then((a) => setAccess((cur) => cur ?? a))
      .catch(() => {});
  }, [api, profileId]);
  useEffect(() => {
    if (!sync || access) return;
    const ids = [4000, 12000].map((ms) => setTimeout(askAccess, ms));
    return () => ids.forEach(clearTimeout);
  }, [sync, access, askAccess]);

  useEffect(() => {
    if (!sync) return;
    const id = setInterval(() => {
      void sync.pull();
      askAccess();
    }, 30000);
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') {
        void sync.pull();
        askAccess();
        media?.soon();
      } else {
        void sync.flush();
        void tracker?.flush();
        void product.current?.flush();
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [sync, tracker, media, askAccess]);

  // The board is on screen: for the app's team (families who agreed), how long the app took to open.
  useEffect(() => {
    if (sync) firstBoardShown();
  }, [sync]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 7000);
    return () => clearTimeout(id);
  }, [note]);

  const subscribe = useCallback(
    (apply: (p: Profile) => void) => {
      if (!sync) return () => {};
      sync.onRemote = (p) => {
        apply(p);
        // Someone else's change: the photos and recordings it brings are fetched.
        media?.see(p);
      };
      // A newer version taken before the board was listening (the server answered between the
      // opening and this moment) is shown now.
      apply(sync.copy.data);
      return () => {
        sync.onRemote = undefined;
      };
    },
    [sync, media],
  );

  if (error) {
    const gone = error instanceof BackendError && (error.code === 'forbidden' || error.code === 'not_found');
    return (
      <StartLayout title={gone ? s.profileGone : errorText(s, error)}>
        <Btn kind="primary" label={s.continue} onPress={() => (gone ? sess.enter() : sess.go({ name: 'welcome' }))} />
        <Btn label={s.signOut} icon="logout" onPress={sess.signOut} />
      </StartLayout>
    );
  }
  if (!sync) return <Splash />;
  const manager = !!access && (access.owner || !!access.perms.manager);
  return (
    <BoardContext.Provider value={{ profileId, childName: sync.copy.name, sync, access, manager, tracker, media }}>
      <BoardRescue>
        <AppProvider
          initial={sync.copy.data}
          onChange={onChange}
          uiLang={uiLang}
          setUiLang={setUiLang}
          subscribe={subscribe}
          locked={sess.childLock}
          onUsage={tracker?.record}
          // The accounts of the app's own team are never asked the caregiver code (the owner's
          // choice): caregiver mode, the settings and the lock open at once for them.
          freeEdit={sess.isAdmin}
        >
          <Root />
          <OpenGuideOnStart />
          {sess.childLock && <LockEffects />}
          {note && (
            <View style={styles.toast} accessibilityRole="alert">
              <Icon name="users" size={20} color={C.edit} />
              <T style={{ flex: 1, color: C.edit, fontWeight: '600' }}>{note}</T>
            </View>
          )}
        </AppProvider>
      </BoardRescue>
    </BoardContext.Provider>
  );
}

/** Child lock: back button ignored (Android), leaving the page asks first (web), screen stays on, no status bar. */
function LockEffects() {
  useEffect(() => {
    const undo = guardLeaving();
    activateKeepAwakeAsync('child-lock').catch(() => {});
    return () => {
      undo();
      void deactivateKeepAwake('child-lock').catch(() => {});
    };
  }, []);
  return <StatusBar hidden />;
}

/** A readable name for this device in "Devices and sync". */
function deviceName(): string {
  if (Platform.OS === 'ios') return (Platform as { isPad?: boolean }).isPad ? 'iPad' : 'iPhone';
  if (Platform.OS === 'android') return 'Android';
  return 'Web';
}

/** End of the set-up journey: the guide (tailored to the choices) opens on the new board. */
function OpenGuideOnStart() {
  const app = useApp();
  const board = useBoard();
  const sess = useSession();
  const latest = useRef(app);
  latest.current = app;
  const started = useRef(false);
  const device = sess.account?.provider === 'device';
  const start = () => {
    const now = latest.current;
    if (started.current || !now.profile.guide?.openOnStart) return;
    // A tablet linked with a code is the child's: the guide of a set-up never opens there.
    if (device) return;
    started.current = true;
    now.update((d) => void (d.guide = { ...d.guide, openOnStart: false }));
    now.setOverlay({ kind: 'guide' });
  };
  // The family first chooses its caregiver code, with an explanation of what it is; the guide
  // opens after (the keypad of `Root`, which cannot be closed, opens it: `PinPanel first`).
  // Otherwise the keypad appeared in the middle of the guide, at the first "Try it" that needs
  // caregiver mode, with nothing to say why. Who may choose the code is only known once the
  // rights of this person have arrived, a moment after the board opens.
  const access = board?.access;
  const manager = !!board?.manager;
  useEffect(() => {
    if (!access) return;
    const p = latest.current;
    if (mustChooseFirst({ family: true, manager, own: !!p.ownCode, team: p.freeEdit, device, fresh: !!p.profile.guide?.openOnStart, pin: p.profile.settings.pin })) return;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, manager]);
  // Without internet the rights do not arrive. A board that already has its code opens the guide
  // on its own; one without a code waits for the rights (they are asked again), so that the
  // first keypad is never skipped.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!familyCodeUnset(latest.current.profile.settings.pin)) start();
    }, 4000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderColor: '#A4C2FF',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
  },
  bannerText: { flex: 1, fontWeight: '700', fontSize: 15, color: C.accent },
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    maxWidth: 560,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: C.editSoft,
    borderColor: '#FEC84B',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 12,
    zIndex: 100,
  },
});
