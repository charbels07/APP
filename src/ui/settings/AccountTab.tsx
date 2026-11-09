/**
 * "Account" page: my account and security, my children, devices and sync (with pairing),
 * permissions summary, subscription (later), privacy and data, preferences, help.
 * Nothing here can interrupt the child's communication.
 */
import Constants from 'expo-constants';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Device, ProfileSummary } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { settingsStrings, type SettingsStrings } from '../../i18n/settings';
import { UI_LANG_NAMES } from '../../i18n/ui';
import { exportJson } from '../../lib/platform';
import type { UiLang } from '../../model/types';
import { useApp } from '../../state/AppState';
import type { BoardCtx } from '../../state/BoardContext';
import { forgetLocal } from '../../state/profileSync';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, Segmented, Toggle } from '../common';
import { C } from '../theme';
import { Note, ss } from './SettingsScreen';
import { Row, when } from './TeamTab';

export function AccountTab({ board, openTeam }: { board: BoardCtx; openTeam: () => void }) {
  const sess = useSession();
  const { account, uiLang } = sess;
  const x = settingsStrings(uiLang);
  if (account?.provider === 'device') {
    return (
      <>
        <Note text={`${x.deviceAccount} ${board.childName}.`} />
        <SyncSection board={board} x={x} />
        <Btn kind="danger" icon="logout" label={x.unlink} onPress={sess.signOut} />
      </>
    );
  }
  return (
    <>
      <MyAccount x={x} />
      <Children board={board} x={x} />
      <SyncSection board={board} x={x} />
      <Sharing board={board} x={x} openTeam={openTeam} />
      <Section title={x.subscription}>
        <Note text={x.subscriptionLater} />
      </Section>
      <Privacy board={board} x={x} />
      <Preferences x={x} />
      <Help x={x} />
    </>
  );
}

function Msg({ ok, text }: { ok?: boolean; text: string | null }) {
  if (!text) return null;
  return <Text style={{ color: ok ? C.success : C.help, fontWeight: '600' }}>{text}</Text>;
}

export function MyAccount({ x }: { x: SettingsStrings }) {
  const sess = useSession();
  const { api, account, s } = sess;
  const [name, setName] = useState(account?.displayName ?? '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasPassword = account?.provider === 'email' || account?.provider === 'phone';
  return (
    <Section title={x.myAccount}>
      <Field label={x.displayName} value={name} onChangeText={setName} />
      <Note text={`${x.signInWith} : ${x.providers[account?.provider ?? 'email'] ?? ''}${account?.email ? ` · ${account.email}` : ''}${account?.phone ? ` · ${account.phone}` : ''}`} />
      <Btn
        small
        icon="check"
        label={x.save}
        disabled={!name.trim() || name.trim() === account?.displayName}
        onPress={async () => {
          try {
            await api.updateAccount({ displayName: name.trim() });
            await sess.refreshAccount();
            setMsg({ ok: true, text: x.saved });
          } catch (e) {
            setMsg({ ok: false, text: errorText(s, e) });
          }
        }}
      />
      {hasPassword && (
        <>
          <Note text={x.changePassword} />
          <TextInput value={cur} onChangeText={setCur} secureTextEntry placeholder={x.currentPassword} placeholderTextColor="#98A2B3" style={input} accessibilityLabel={x.currentPassword} />
          <TextInput value={next} onChangeText={setNext} secureTextEntry placeholder={x.newPassword} placeholderTextColor="#98A2B3" style={input} accessibilityLabel={x.newPassword} />
          <Btn
            small
            icon="lock"
            label={x.changePassword}
            disabled={!cur || next.length < 8}
            onPress={async () => {
              try {
                await api.changePassword(cur, next);
                setCur('');
                setNext('');
                setMsg({ ok: true, text: x.passwordChanged });
              } catch (e) {
                setMsg({ ok: false, text: errorText(s, e) });
              }
            }}
          />
        </>
      )}
      <Msg ok={msg?.ok} text={msg?.text ?? null} />
      <Btn icon="logout" label={x.signOut} onPress={sess.signOut} />
    </Section>
  );
}

const input = { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, fontSize: 17, color: C.text } as const;

function Children({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const sess = useSession();
  const [list, setList] = useState<ProfileSummary[]>([]);
  useEffect(() => {
    sess.api.listProfiles().then(setList).catch(() => {});
  }, [sess.api]);
  return (
    <Section title={x.children}>
      {list.map((p) => (
        <Row
          key={p.id}
          icon={p.access === 'owner' ? 'heart' : 'user'}
          title={p.name}
          sub={p.id === board.profileId ? x.openNow : p.access === 'owner' ? x.ownerRole : x.roles[p.access]}
          onPress={p.id === board.profileId ? undefined : () => sess.openProfile(p.id)}
        />
      ))}
      {sess.account?.role === 'parent' && <Btn small icon="plus" label={x.addChild} onPress={() => sess.go({ name: 'onboarding' })} />}
    </Section>
  );
}

function SyncSection({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const { api, uiLang, deviceId, account } = useSession();
  const state = useSyncExternalStore(
    (cb) => board.sync.subscribe(cb),
    () => board.sync.state,
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [backup, setBackup] = useState<number | undefined>();
  const [pair, setPair] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = board.manager || !!board.access?.perms.manageDevices;
  const load = () => {
    if (canManage) api.listDevices(board.profileId).then(setDevices).catch(() => {});
    api.getProfile(board.profileId).then((r) => setBackup(r.updatedAt)).catch(() => {});
  };
  useEffect(load, [api, board.profileId, canManage]);
  const color = state === 'saved' ? C.success : state === 'saving' ? C.accent : C.edit;
  return (
    <Section title={x.devices}>
      <View style={ss.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[ss.dot, { backgroundColor: color }]} />
          <Text style={[ss.title, { flex: 1 }]}>
            {x.thisDevice} · {x.syncStates[state]}
          </Text>
        </View>
        <Note text={`${x.lastSynced} : ${board.sync.lastSyncedAt ? when(board.sync.lastSyncedAt, uiLang) : x.never} · ${x.lastBackup} : ${backup ? when(backup, uiLang) : x.never}`} />
        <Btn
          small
          icon="refresh"
          label={x.syncNow}
          onPress={async () => {
            await board.sync.flush();
            await board.sync.pull();
            load();
          }}
        />
      </View>
      {canManage &&
        devices.map((d) => (
          <Row
            key={d.id}
            icon={d.platform === 'web' ? 'globe' : 'tablet'}
            muted={d.revoked}
            title={`${d.name}${d.id === deviceId ? ` (${x.thisDevice.toLowerCase()})` : ''}`}
            sub={[
              x.kinds[d.kind],
              d.revoked ? x.revoked : `${x.lastSynced} : ${d.lastSyncedAt ? when(d.lastSyncedAt, uiLang) : x.never}`,
              d.pendingChanges ? x.pendingN(d.pendingChanges) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              !d.revoked && d.id !== deviceId ? (
                <Btn
                  small
                  kind="danger"
                  label={x.revokeDevice}
                  onPress={async () => {
                    await api.revokeDevice(board.profileId, d.id).catch(() => {});
                    load();
                  }}
                />
              ) : undefined
            }
          />
        ))}
      {canManage && account?.provider !== 'device' && (
        <View style={{ gap: 8 }}>
          <Note text={x.linkDevice} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['full', 'use'] as const).map((a) => (
              <Btn
                key={a}
                small
                icon="link"
                label={a === 'full' ? x.linkFull : x.linkUse}
                onPress={async () => {
                  setError(null);
                  try {
                    setPair(await api.createPairingCode(board.profileId, a));
                  } catch (e) {
                    setError(String((e as Error).message));
                  }
                }}
              />
            ))}
          </View>
          {pair && (
            <View style={ss.card}>
              <Text style={ss.code} selectable>
                {pair.code}
              </Text>
              <Note text={`${x.codeValid} ${new Date(pair.expiresAt).toLocaleTimeString()}. ${x.linkSteps}`} />
            </View>
          )}
          <Msg text={error} />
        </View>
      )}
    </Section>
  );
}

function Sharing({ board, x, openTeam }: { board: BoardCtx; x: SettingsStrings; openTeam: () => void }) {
  const { api } = useSession();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    api
      .listMembers(board.profileId)
      .then((m) => setN(1 + m.filter((y) => y.status === 'active' && y.role !== 'device').length))
      .catch(() => {});
  }, [api, board.profileId]);
  return (
    <Section title={x.sharing}>
      {n !== null && <Note text={x.sharingN(n)} />}
      <Btn small icon="users" label={x.seeTeam} onPress={openTeam} />
    </Section>
  );
}

function Privacy({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const app = useApp();
  const sess = useSession();
  const { api, s } = sess;
  const [typing, setTyping] = useState<'profile' | 'account' | null>(null);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const owner = !!board.access?.owner;
  const expected = typing === 'profile' ? board.childName.trim() : x.deleteWord;
  return (
    <Section title={x.privacy}>
      {x.privacyPoints.map((p) => (
        <Note key={p} text={`• ${p}`} />
      ))}
      <Btn small icon="download" label={x.exportProfile} onPress={() => exportJson(`profil-${board.childName || 'caa'}.json`, app.profile)} />
      {owner && <Btn small kind="danger" icon="trash" label={`${x.deleteProfile} ${board.childName}`} onPress={() => setTyping('profile')} />}
      <Btn small kind="danger" icon="trash" label={x.deleteAccount} onPress={() => setTyping('account')} />
      {typing && (
        <View style={ss.card}>
          <Note text={typing === 'profile' ? x.deleteProfileNote : x.deleteAccountNote} />
          <TextInput value={word} onChangeText={setWord} autoCapitalize="none" style={input} accessibilityLabel={expected} placeholder={expected} placeholderTextColor="#C0C6CF" />
          <Msg text={error} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn
              small
              label={x.back}
              onPress={() => {
                setTyping(null);
                setWord('');
              }}
            />
            <Btn
              small
              kind="danger"
              icon="trash"
              label={x.deleteForever}
              disabled={word.trim().toLocaleLowerCase() !== expected.toLocaleLowerCase()}
              onPress={async () => {
                setError(null);
                try {
                  if (typing === 'profile') {
                    await api.deleteProfile(board.profileId);
                    await forgetLocal(board.profileId);
                    await sess.updatePrefs({ activeProfileId: undefined });
                    await sess.enter();
                  } else {
                    await api.deleteAccount();
                    await sess.signOut();
                  }
                } catch (e) {
                  setError(errorText(s, e));
                }
              }}
            />
          </View>
        </View>
      )}
    </Section>
  );
}

export function Preferences({ x }: { x: SettingsStrings }) {
  const { uiLang, setUiLang, account, updatePrefs } = useSession();
  const n = account?.prefs.notifications ?? { invitations: true, proposals: true, sync: true, billing: true };
  return (
    <Section title={x.prefs}>
      <Note text={x.interfaceLang} />
      <Segmented<UiLang> value={uiLang} onChange={setUiLang} options={(['fr', 'en', 'ar'] as UiLang[]).map((l) => ({ value: l, label: UI_LANG_NAMES[l] }))} />
      <Note text={x.notifications} />
      {(['invitations', 'proposals', 'sync'] as const).map((k) => (
        <Toggle key={k} label={x.notif[k]} value={n[k] !== false} onChange={(v) => void updatePrefs({ notifications: { ...n, [k]: v } })} />
      ))}
    </Section>
  );
}

function Help({ x }: { x: SettingsStrings }) {
  const app = useApp();
  return (
    <Section title={x.help}>
      <Btn small icon="book" label={x.openGuide} onPress={() => app.setOverlay({ kind: 'guide' })} />
      <Note text={`${x.version} ${Constants.expoConfig?.version ?? ''}`} />
    </Section>
  );
}

/** Account deletion on its own (professional account page). */
export function DeleteAccount({ x }: { x: SettingsStrings }) {
  const sess = useSession();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 8 }}>
      <Btn small kind="danger" icon="trash" label={x.deleteAccount} onPress={() => setOpen(true)} />
      {open && (
        <View style={ss.card}>
          <Note text={x.deleteAccountNote} />
          <TextInput value={word} onChangeText={setWord} autoCapitalize="none" style={input} accessibilityLabel={x.deleteWord} placeholder={x.deleteWord} placeholderTextColor="#C0C6CF" />
          <Msg text={error} />
          <Btn
            small
            kind="danger"
            icon="trash"
            label={x.deleteForever}
            disabled={word.trim().toLocaleLowerCase() !== x.deleteWord.toLocaleLowerCase()}
            onPress={async () => {
              try {
                await sess.api.deleteAccount();
                await sess.signOut();
              } catch (e) {
                setError(errorText(sess.s, e));
              }
            }}
          />
        </View>
      )}
    </View>
  );
}
