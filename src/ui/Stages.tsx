/** Shows the screen of the current step of the journey (see src/state/Session.tsx). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState as RNAppState, Platform, StyleSheet, Text, View } from 'react-native';
import { BackendError } from '../backend/Backend';
import { createDefaultProfile } from '../data/defaults';
import { errorText } from '../i18n/account';
import { invertOps } from '../lib/profileDiff';
import type { Profile } from '../model/types';
import { AppProvider, useApp } from '../state/AppState';
import { BoardContext, type MyAccess } from '../state/BoardContext';
import { ProfileSync } from '../state/profileSync';
import { useSession } from '../state/Session';
import { Btn } from './common';
import { Icon } from './Icon';
import { Onboarding } from './onboarding/Onboarding';
import { ProHome } from './pro/ProHome';
import { Root } from './Root';
import { AuthScreen } from './start/AuthScreen';
import { InvitationsScreen } from './start/InvitationsScreen';
import { PairScreen } from './start/PairScreen';
import { RoleChoice } from './start/RoleChoice';
import { StartLayout, T } from './start/StartLayout';
import { Welcome } from './start/Welcome';
import { C, radius } from './theme';

export function Stages() {
  const { stage } = useSession();
  // The board has a dark side bar; the other screens are light.
  const dark = stage.name === 'board' || stage.name === 'preview';
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
      return <ProHome />;
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

  useEffect(() => {
    let alive = true;
    let opened: ProfileSync | null = null;
    ProfileSync.open(api, profileId).then(
      (sy) => {
        if (!alive) return;
        opened = sy;
        rememberLocal(profileId);
        sy.onConflict = () => setNote(s.conflictNote);
        // Every change that reaches the server goes into the change history (with undo).
        sy.onSaved = (ops, reason) => {
          void api.addHistory({ profileId, summary: reason ?? '', ops, inverse: invertOps(ops) }).catch(() => {});
          void api.reportSync(profileId, sess.deviceId, { synced: true, backedUp: true, pendingChanges: 0 }).catch(() => {});
        };
        setSync(sy);
        void api.myAccess(profileId).then((a) => alive && setAccess(a)).catch(() => {});
        // This device appears in "Devices and sync"; a removed device is signed out.
        void api
          .registerDevice(profileId, { id: sess.deviceId, name: deviceName(), kind: 'companion', platform: Platform.OS })
          .catch((e) => {
            if (e instanceof BackendError && e.code === 'device_revoked') void sess.signOut();
          });
      },
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
      void opened?.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profileId]);

  // Someone else's changes: looked for every 30 s and when the app comes back to the front.
  useEffect(() => {
    if (!sync) return;
    const id = setInterval(() => void sync.pull(), 30000);
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') void sync.pull();
      else void sync.flush();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [sync]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 7000);
    return () => clearTimeout(id);
  }, [note]);

  const subscribe = useCallback(
    (apply: (p: Profile) => void) => {
      if (!sync) return () => {};
      sync.onRemote = apply;
      return () => {
        sync.onRemote = undefined;
      };
    },
    [sync],
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
    <BoardContext.Provider value={{ profileId, childName: sync.copy.name, sync, access, manager }}>
      <AppProvider initial={sync.copy.data} onChange={sync.change} uiLang={uiLang} setUiLang={setUiLang} subscribe={subscribe}>
        <Root />
        <OpenGuideOnStart />
        {note && (
          <View style={styles.toast} accessibilityRole="alert">
            <Icon name="users" size={20} color={C.edit} />
            <T style={{ flex: 1, color: C.edit, fontWeight: '600' }}>{note}</T>
          </View>
        )}
      </AppProvider>
    </BoardContext.Provider>
  );
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
  useEffect(() => {
    if (!app.profile.guide?.openOnStart) return;
    app.update((d) => void (d.guide = { ...d.guide, openOnStart: false }));
    app.setOverlay({ kind: 'guide' });
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
