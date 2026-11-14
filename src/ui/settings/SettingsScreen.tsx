/**
 * Settings in four pages:
 *  - Board: the child's AAC settings (words, voice, presentation, access…);
 *  - Team: who works with the child, invitations, permissions, proposals, history;
 *  - Account: my account, children, devices and sync, privacy, preferences;
 *  - Suivi: the communication data the family chose to record, and observations
 *    (owner, managers and members allowed to see the data).
 * In the preview and the set-up trial (no account yet) every page is shown, but Team, Suivi and
 * Account only say what they will hold: they open once the account is created.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Invitation, Proposal } from '../../backend/types';
import { dataStrings } from '../../i18n/data';
import { settingsStrings } from '../../i18n/settings';
import { useApp } from '../../state/AppState';
import { useBoard } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Panel, Segmented, useNavRtl } from '../common';
import { BoardSettingsBody, useSettingsDraft } from '../panels/CaregiverPanels';
import { DataDashboard } from '../data/DataDashboard';
import { C } from '../theme';
import { AccountTab } from './AccountTab';
import { TeamTab } from './TeamTab';

type Tab = 'board' | 'team' | 'data' | 'account';

export function SettingsScreen() {
  const app = useApp();
  const board = useBoard();
  const { uiLang, account, api, s, go } = useSession();
  const x = settingsStrings(uiLang);
  const [tab, setTab] = useState<Tab>('board');
  // Changes of the Board page wait here until "Save".
  const draft = useSettingsDraft();
  // Where the person was going when changes were still waiting (close, another page).
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const go2 = (next: () => void) => (tab === 'board' && draft.dirty ? setLeaving(() => next) : next());
  const t = app.t;
  const isDevice = account?.provider === 'device';
  const seesData = !!board && !isDevice && (board.manager || !!board.access?.perms.viewData);
  const tabs: Tab[] = board ? (isDevice ? ['board', 'account'] : ['board', 'team', ...(seesData ? (['data'] as Tab[]) : []), 'account']) : ['board', 'team', 'data', 'account'];

  // Things waiting for the parent: shown as a number on the Team page.
  const [waiting, setWaiting] = useState(0);
  const refreshWaiting = useCallback(async () => {
    if (!board?.manager) return;
    const [props, invs] = await Promise.all([
      api.listProposals({ profileId: board.profileId }).catch(() => [] as Proposal[]),
      api.profileInvitations(board.profileId).catch(() => [] as Invitation[]),
    ]);
    setWaiting(props.filter((p) => p.status === 'pending').length + invs.filter((i) => i.direction === 'request' && i.status === 'pending').length);
  }, [api, board?.manager, board?.profileId]);
  useEffect(() => {
    void refreshWaiting();
  }, [refreshWaiting, tab]);

  const label = (t: Tab) =>
    t === 'board' ? x.tabBoard : t === 'team' ? (waiting ? `${x.tabTeam} (${waiting})` : x.tabTeam) : t === 'data' ? dataStrings(uiLang).tab : x.tabAccount;

  return (
    <Panel
      title={app.t.settings}
      onClose={() => go2(() => app.setOverlay(null))}
      tone="edit"
      maxWidth={820}
      footer={
        tab === 'board' ? (
          <View style={ss.saveBar}>
            <Text style={[ss.saveText, (draft.dirty || leaving) && { color: C.edit }]} accessibilityLiveRegion="polite">
              {leaving ? t.sLeaveAsk : draft.dirty ? t.sUnsaved : t.sSaved}
            </Text>
            {leaving ? (
              <Btn
                small
                label={t.sLeaveDiscard}
                onPress={() => {
                  draft.cancel();
                  const next = leaving;
                  setLeaving(null);
                  next();
                }}
              />
            ) : (
              <Btn small label={t.sDiscard} disabled={!draft.dirty} onPress={draft.cancel} />
            )}
            <Btn
              small
              kind="primary"
              icon="check"
              label={t.save}
              disabled={!draft.dirty}
              onPress={() => {
                draft.save();
                const next = leaving;
                setLeaving(null);
                next?.();
              }}
            />
          </View>
        ) : undefined
      }
    >
      <Segmented<Tab> value={tab} onChange={(next) => go2(() => setTab(next))} options={tabs.map((t) => ({ value: t, label: label(t) }))} />
      {tab === 'board' && <BoardSettingsBody draft={draft} />}
      {!board && tab !== 'board' && (
        <View style={{ gap: 12 }}>
          <Note text={tab === 'team' ? x.previewTeam : tab === 'data' ? x.previewData : x.previewAccount} />
          <Note text={x.previewOnly} />
          {app.preview && <Btn kind="primary" icon="user" label={s.createAccount} onPress={() => go({ name: 'role' })} />}
        </View>
      )}
      {tab === 'team' && board && <TeamTab board={board} onChanged={refreshWaiting} />}
      {tab === 'data' && board && (
        <DataDashboard
          profileId={board.profileId}
          childName={board.childName}
          profile={app.profile}
          manager={board.manager}
          tracker={board.tracker}
          onConsent={
            board.manager
              ? (patch) =>
                  app.update((d) => {
                    Object.assign(d.settings, patch);
                  })
              : undefined
          }
        />
      )}
      {tab === 'account' && board && <AccountTab board={board} openTeam={() => setTab('team')} />}
    </Panel>
  );
}

/** A grey explanation line. */
export function Note({ text }: { text: string }) {
  const rtl = useNavRtl();
  return <Text style={[ss.note, rtl && ss.rtl]}>{text}</Text>;
}

export const ss = StyleSheet.create({
  saveBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  saveText: { flex: 1, minWidth: 140, fontSize: 14, fontWeight: '700', color: C.textMuted },
  note: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    minHeight: 56,
  },
  rowRev: { flexDirection: 'row-reverse' },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  chip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.surfaceAlt },
  chipText: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 4, color: C.text, textAlign: 'center', paddingVertical: 6 },
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
