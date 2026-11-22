/**
 * "Account" page: my account and security, my children, devices and sync (with pairing),
 * permissions summary, subscription (later), privacy and data, preferences, help.
 * Nothing here can interrupt the child's communication.
 */
import Constants from 'expo-constants';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Device, Invitation, OwnedProfile, ProfileSummary } from '../../backend/types';
import { peopleStrings } from '../../i18n/people';
import { CHILD_DATA_CONSENT } from '../../lib/consent';
import { ConsentBox } from '../ConsentBox';
import { errorText } from '../../i18n/account';
import { pushStrings } from '../../i18n/push';
import { pushIsOn, pushRefused, pushSupport, turnPushOff, turnPushOn } from '../../lib/push';
import { settingsStrings, type SettingsStrings } from '../../i18n/settings';
import { UI_LANG_NAMES } from '../../i18n/ui';
import { exportJson } from '../../lib/platform';
import type { UiLang } from '../../model/types';
import { useApp } from '../../state/AppState';
import type { BoardCtx } from '../../state/BoardContext';
import type { MediaSync } from '../../state/mediaSync';
import { forgetLocal } from '../../state/profileSync';
import { useSession } from '../../state/Session';
import { WriteTeam } from '../admin/WriteTeam';
import { Btn, Field, Section, Segmented, Toggle } from '../common';
import { groupCode } from '../start/PairScreen';
import { C } from '../theme';
import { ObzExportButton } from './ObzExport';
import { Note, ss } from './SettingsScreen';
import { Row, when } from './TeamTab';
import { eraseMediaOf } from '../../lib/deviceData';
import { useProof } from '../ProveItsYou';
import { TwoStepCard } from '../TwoStep';
import { BoardVersions, ProfileBin } from './Backups';
import { DownloadMyData } from './DownloadMyData';
import { backupStrings } from '../../i18n/backup';

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
      <ProfileBin onRestored={(id) => sess.openProfile(id)} />
      <SyncSection board={board} x={x} />
      <BoardVersions board={board} />
      <Sharing board={board} x={x} openTeam={openTeam} />
      <Section title={x.subscription}>
        <Note text={x.subscriptionLater} />
      </Section>
      <Privacy board={board} x={x} />
      <Preferences x={x} noLang />
      <WriteTeam />
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
  const [leaving, setLeaving] = useState(false);
  const [erase, setErase] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasPassword = account?.provider === 'email' || account?.provider === 'phone';
  // With two-step sign-in on, the authenticator code proves it: signing in again with the password
  // would start a session without the second step (the children's data hidden until the code).
  const twoStep = !!sess.security?.twoStep;
  const who = peopleStrings(sess.uiLang);
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
          {twoStep ? (
            <TextInput
              value={cur}
              onChangeText={setCur}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              placeholder={who.twoStepCode}
              placeholderTextColor={C.placeholder}
              style={input}
              accessibilityLabel={who.twoStepCode}
            />
          ) : (
            <TextInput value={cur} onChangeText={setCur} secureTextEntry placeholder={x.currentPassword} placeholderTextColor={C.placeholder} style={input} accessibilityLabel={x.currentPassword} />
          )}
          <TextInput value={next} onChangeText={setNext} secureTextEntry placeholder={x.newPassword} placeholderTextColor={C.placeholder} style={input} accessibilityLabel={x.newPassword} />
          <Btn
            small
            icon="lock"
            label={x.changePassword}
            disabled={!cur || next.length < 8}
            onPress={async () => {
              try {
                await api.changePassword(cur, next, twoStep ? 'twoStep' : 'password');
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
      <TwoStepCard />
      {leaving ? (
        <View style={ss.card}>
          <Note text={x.signOutNote} />
          <Toggle label={x.signOutErase} value={erase} onChange={setErase} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small label={x.back} onPress={() => setLeaving(false)} />
            <Btn small kind="danger" icon="logout" label={x.signOut} onPress={() => void sess.signOut({ eraseMedia: erase })} />
          </View>
        </View>
      ) : (
        <Btn icon="logout" label={x.signOut} onPress={() => setLeaving(true)} />
      )}
    </Section>
  );
}

const input = { borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, fontSize: 17, color: C.text } as const;

function Children({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const sess = useSession();
  const who = peopleStrings(sess.uiLang);
  const [list, setList] = useState<ProfileSummary[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  // The other parent offered this account a child's profile ("Acts as a parent" → hand over).
  const [offers, setOffers] = useState<Invitation[]>([]);
  const load = () => {
    sess.api.listProfiles().then(setList).catch(() => {});
    sess.api
      .myInvitations()
      .then((r) => setOffers(r.received.filter((i) => i.status === 'pending' && i.role === 'parent' && Date.now() - i.createdAt < 30 * 86_400_000)))
      .catch(() => {});
  };
  useEffect(load, [sess.api]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Section title={x.children}>
      {offers.map((i) => (
        <Offer key={i.id} inv={i} onDone={load} />
      ))}
      {list.map((p) =>
        editing === p.id ? (
          <ChildEdit
            key={p.id}
            child={p}
            onDone={(changed) => {
              setEditing(null);
              if (changed) {
                load();
                if (p.id === board.profileId) void board.sync.pull();
              }
            }}
          />
        ) : (
          <Row
            key={p.id}
            icon={p.access === 'owner' ? 'heart' : 'user'}
            title={p.age ? `${p.name} · ${p.age}` : p.name}
            sub={p.id === board.profileId ? x.openNow : p.access === 'owner' ? x.ownerRole : x.roles[p.access]}
            onPress={p.id === board.profileId ? undefined : () => sess.openProfile(p.id)}
            right={p.access === 'owner' && sess.account?.provider !== 'device' ? <Btn small icon="pencil" label={who.nameAge} onPress={() => setEditing(p.id)} /> : undefined}
          />
        ),
      )}
      {sess.account?.role === 'parent' && <Btn small icon="plus" label={x.addChild} onPress={() => sess.go({ name: 'onboarding', back: { name: 'board', profileId: board.profileId } })} />}
    </Section>
  );
}

/** A child's first name and age, changed by the account that owns the profile. */
function ChildEdit({ child, onDone }: { child: ProfileSummary; onDone: (changed: boolean) => void }) {
  const sess = useSession();
  const who = peopleStrings(sess.uiLang);
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState(child.age ? String(child.age) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(age);
  const ageOk = age.trim() === '' || (/^\d{1,2}$/.test(age.trim()) && n <= 30);
  return (
    <View style={ss.card}>
      <Field label={who.childName} value={name} onChangeText={setName} maxLength={60} />
      <Field label={who.childAge} value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} />
      <Msg text={error} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small label={settingsStrings(sess.uiLang).back} onPress={() => onDone(false)} />
        <Btn
          small
          kind="primary"
          icon="check"
          label={settingsStrings(sess.uiLang).save}
          disabled={busy || !name.trim() || !ageOk}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await sess.api.updateChild(child.id, { name: name.trim(), age: age.trim() ? n : null });
              onDone(true);
            } catch (e) {
              setError(errorText(sess.s, e));
              setBusy(false);
            }
          }}
        />
      </View>
    </View>
  );
}

/** The other parent asks this account to become the parent in charge: accepted with the parent's consent. */
function Offer({ inv, onDone }: { inv: Invitation; onDone: () => void }) {
  const sess = useSession();
  const who = peopleStrings(sess.uiLang);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answer = async (accept: boolean) => {
    setBusy(true);
    setError(null);
    try {
      // The consent is recorded only when the person accepts.
      if (accept) await sess.api.giveConsent(CHILD_DATA_CONSENT);
      await sess.api.respondInvitation(inv.id, accept);
      onDone();
    } catch (e) {
      setError(errorText(sess.s, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={ss.card}>
      <Text style={ss.title}>{who.offer(inv.fromName, inv.childName)}</Text>
      <ConsentBox value={consent} onChange={setConsent} lang={sess.uiLang} />
      <Msg text={error} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small label={who.offerDecline} disabled={busy} onPress={() => void answer(false)} />
        <Btn small kind="primary" icon="check" label={who.offerAccept} disabled={busy || !consent} onPress={() => void answer(true)} />
      </View>
    </View>
  );
}

/**
 * Before an account is deleted: the children whose profile it owns, who loses the board with
 * them, the other parent it can be handed to first, and a tick per child to agree to erase it.
 */
function useOwnedChildren(open: boolean) {
  const sess = useSession();
  const who = peopleStrings(sess.uiLang);
  const [list, setList] = useState<OwnedProfile[] | null>(null);
  const [erase, setErase] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const proof = useProof('handOver');
  const load = () => {
    sess.api
      .ownedProfiles()
      .then(setList)
      .catch(() => setList(null));
  };
  useEffect(() => {
    if (open) load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = (list ?? []).filter((p) => !p.inBin);
  const ready = list !== null && live.every((p) => erase.includes(p.id));
  const view =
    list && list.length ? (
      <View style={{ gap: 6 }}>
        <Note text={who.deleteWho} />
        {list.map((p) => (
          <View key={p.id} style={{ gap: 6 }}>
            <Row icon="heart" title={who.profileLine(p.inBin ? who.inBin(p.name) : p.name, p.people, p.tablets)} />
            {!p.inBin &&
              (p.offeredTo ? (
                <Note text={who.offered(p.parents.find((q) => q.userId === p.offeredTo)?.name ?? '—')} />
              ) : (
                p.parents.map((q) => (
                  <Btn
                    key={q.userId}
                    small
                    icon="heart"
                    label={who.handFirst(q.name)}
                    onPress={async () => {
                      setError(null);
                      try {
                        await proof.run(async () => {
                          await sess.api.offerProfile(p.id, q.userId);
                          load();
                        });
                      } catch (e) {
                        setError(errorText(sess.s, e));
                      }
                    }}
                  />
                ))
              ))}
            {!p.inBin && (
              <Toggle label={who.eraseTick(p.name)} value={erase.includes(p.id)} onChange={(v) => setErase((cur) => (v ? [...cur, p.id] : cur.filter((y) => y !== p.id)))} />
            )}
          </View>
        ))}
        {sess.account?.role === 'parent' && live.some((p) => !p.parents.length) && <Note text={who.noParent} />}
        <Msg text={error} />
        {proof.gate}
      </View>
    ) : null;
  return { view, ready, ids: (list ?? []).map((p) => p.id) };
}

function SyncSection({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const { api, uiLang, deviceId, account, s } = useSession();
  const state = useSyncExternalStore(
    (cb) => board.sync.subscribe(cb),
    () => board.sync.state,
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [backup, setBackup] = useState<number | undefined>();
  const [pair, setPair] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A device with full access: the database asks for a fresh proof first.
  const proof = useProof('linkFull');
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
        {board.media && <MediaLine media={board.media} x={x} />}
        <Btn
          small
          icon="refresh"
          label={x.syncNow}
          onPress={async () => {
            await board.sync.flush();
            await board.sync.pull();
            void board.media?.run();
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
      {board.manager && account?.provider !== 'device' && (
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
                  setPair(null);
                  try {
                    await proof.run(async () => setPair(await api.createPairingCode(board.profileId, a)));
                  } catch (e) {
                    setError(errorText(s, e));
                  }
                }}
              />
            ))}
          </View>
          {proof.gate}
          {pair && (
            <View style={ss.card}>
              <Text style={ss.code} selectable>
                {groupCode(pair.code)}
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

/** Where the child's photos and recordings are: copied to the account, or how many still wait. */
function MediaLine({ media, x }: { media: MediaSync; x: SettingsStrings }) {
  const st = useSyncExternalStore(media.subscribe, media.status);
  if (!st.total) return null;
  const m = x.mediaStates;
  const parts: string[] = [];
  if (st.waiting) parts.push(st.localOnly ? m.here : m.waiting(st.waiting));
  if (st.full) parts.push(m.full);
  if (st.refused) parts.push(m.refused(st.refused));
  if (st.receiving) parts.push(m.receiving(st.receiving));
  return <Note text={`${x.media} : ${parts.length ? parts.join(' · ') : m.copied}`} />;
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
  const proofProfile = useProof('deleteProfile');
  const proofAccount = useProof('deleteAccount');
  const owned = useOwnedChildren(typing === 'account');
  return (
    <Section title={x.privacy}>
      {x.privacyPoints.map((p) => (
        <Note key={p} text={`• ${p}`} />
      ))}
      <Btn small icon="download" label={x.exportProfile} onPress={() => exportJson(`profil-${board.childName || 'caa'}.json`, app.profile)} />
      <ObzExportButton small profile={app.profile} childName={board.childName} label={x.exportObz} busy={x.exportObzBusy} failed={x.exportObzFailed} />
      <DownloadMyData />
      {owner && <Btn small kind="danger" icon="trash" label={`${x.deleteProfile} ${board.childName}`} onPress={() => setTyping('profile')} />}
      <Btn small kind="danger" icon="trash" label={x.deleteAccount} onPress={() => setTyping('account')} />
      {typing && (
        <View style={ss.card}>
          {typing === 'account' && owned.view}
          <Note text={typing === 'profile' ? backupStrings(sess.uiLang).deleteProfileNote : x.deleteAccountNote} />
          <TextInput value={word} onChangeText={setWord} autoCapitalize="none" style={input} accessibilityLabel={expected} placeholder={expected} placeholderTextColor={C.placeholder} />
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
              label={typing === 'profile' ? backupStrings(sess.uiLang).deleteToBin : x.deleteForever}
              disabled={word.trim().toLocaleLowerCase() !== expected.toLocaleLowerCase() || (typing === 'account' && !owned.ready)}
              onPress={async () => {
                setError(null);
                try {
                  if (typing === 'profile') {
                    await proofProfile.run(async () => {
                      await api.deleteProfile(board.profileId);
                      await forgetLocal(board.profileId);
                      await eraseMediaOf(app.profile);
                      await sess.updatePrefs({ activeProfileId: undefined });
                      await sess.enter();
                    });
                  } else {
                    await proofAccount.run(async () => {
                      await api.deleteAccount(owned.ids);
                      await sess.signOut({ eraseMedia: true });
                    });
                  }
                } catch (e) {
                  setError(errorText(s, e));
                }
              }}
            />
          </View>
          {proofProfile.gate}
          {proofAccount.gate}
        </View>
      )}
    </Section>
  );
}

/** `noLang`: on a child's board the menus' language is already in Settings → Board → Languages. */
export function Preferences({ x, noLang }: { x: SettingsStrings; noLang?: boolean }) {
  const { api, uiLang, setUiLang, account, updatePrefs } = useSession();
  const n = account?.prefs.notifications ?? { invitations: true, proposals: true, sync: true, billing: true };
  const t = pushStrings(uiLang);
  // Notifications outside the app: only where they can work (this browser, and a server that sends).
  const support = pushSupport();
  const [canSend, setCanSend] = useState(false);
  const [on, setOn] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (support === 'no' || account?.provider === 'device') return;
    let alive = true;
    void Promise.all([api.pushKey().catch(() => null), pushIsOn()]).then(([key, isOn]) => {
      if (!alive) return;
      setCanSend(!!key);
      setOn(isOn);
    });
    return () => {
      alive = false;
    };
  }, [api, support, account?.provider]);
  const setDevice = async (v: boolean) => {
    setProblem(null);
    if (!v) {
      setOn(false);
      return turnPushOff(api);
    }
    const r = await turnPushOn(api, uiLang);
    setOn(r === 'on');
    if (r !== 'on') setProblem(r === 'refused' ? t.refused : t.failed);
  };
  return (
    <Section title={x.prefs}>
      {!noLang && <Note text={x.interfaceLang} />}
      {!noLang && <Segmented<UiLang> value={uiLang} onChange={setUiLang} options={(['fr', 'en', 'ar'] as UiLang[]).map((l) => ({ value: l, label: UI_LANG_NAMES[l] }))} />}
      <Note text={x.notifications} />
      {(['invitations', 'proposals', 'sync'] as const).map((k) => (
        <Toggle key={k} label={x.notif[k]} value={n[k] !== false} onChange={(v) => void updatePrefs({ notifications: { ...n, [k]: v } })} />
      ))}
      {canSend && support === 'ok' && <Toggle label={t.device} value={on} onChange={(v) => void setDevice(v)} />}
      {canSend && support === 'ok' && (problem || (!on && pushRefused())) ? <Note text={problem ?? t.refused} /> : null}
      {canSend && support === 'homeScreen' && <Note text={t.homeScreen} />}
      {canSend && on && account?.role === 'parent' && (
        <Toggle label={t.reminder} value={n.reminder !== false} onChange={(v) => void updatePrefs({ notifications: { ...n, reminder: v } })} />
      )}
      {canSend && on && <Toggle label={t.ideas} value={n.ideas !== false} onChange={(v) => void updatePrefs({ notifications: { ...n, ideas: v } })} />}
    </Section>
  );
}

function Help({ x }: { x: SettingsStrings }) {
  const app = useApp();
  return (
    <Section title={x.help}>
      <Btn small icon="book" label={x.openGuide} onPress={() => app.setOverlay({ kind: 'guide', back: { kind: 'settings' } })} />
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
  const proof = useProof('deleteAccount');
  const owned = useOwnedChildren(open);
  return (
    <View style={{ gap: 8 }}>
      <Btn small kind="danger" icon="trash" label={x.deleteAccount} onPress={() => setOpen(true)} />
      {open && (
        <View style={ss.card}>
          {owned.view}
          <Note text={x.deleteAccountNote} />
          <TextInput value={word} onChangeText={setWord} autoCapitalize="none" style={input} accessibilityLabel={x.deleteWord} placeholder={x.deleteWord} placeholderTextColor={C.placeholder} />
          <Msg text={error} />
          <Btn
            small
            kind="danger"
            icon="trash"
            label={x.deleteForever}
            disabled={word.trim().toLocaleLowerCase() !== x.deleteWord.toLocaleLowerCase() || !owned.ready}
            onPress={async () => {
              try {
                await proof.run(async () => {
                  await sess.api.deleteAccount(owned.ids);
                  await sess.signOut({ eraseMedia: true });
                });
              } catch (e) {
                setError(errorText(sess.s, e));
              }
            }}
          />
          {proof.gate}
        </View>
      )}
    </View>
  );
}
