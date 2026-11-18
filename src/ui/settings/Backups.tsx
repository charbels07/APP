/**
 * Nothing about a child's board disappears by one mistake:
 *  - `ProfileBin`: children's profiles deleted in the last 30 days, put back in one touch
 *    (Settings → Account; the professional's account page; the set-up when no child is left);
 *  - `BoardVersions`: the copies of the board the server keeps (weekly, before a big change, by
 *    hand), put back in one touch (Settings → Account, for the family and the team's managers).
 * The database decides who may (supabase/migrations/20261118000200_bin_snapshots.sql).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { BinEntry, Snapshot } from '../../backend/Backend';
import { backupStrings } from '../../i18n/backup';
import type { BoardCtx } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Section } from '../common';
import { C } from '../theme';
import { Note, ss } from './SettingsScreen';
import { Row, day, when } from './TeamTab';

/** Hidden when the bin is empty. `onRestored`: e.g. open the child that came back. */
export function ProfileBin({ onRestored }: { onRestored?: (id: string) => void }) {
  const { api, uiLang } = useSession();
  const t = backupStrings(uiLang);
  const [items, setItems] = useState<BinEntry[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(() => {
    api.listBin().then(setItems).catch(() => {});
  }, [api]);
  useEffect(load, [load]);
  if (!items.length && !msg) return null;
  return (
    <Section title={t.binTitle}>
      <Note text={t.binNote} />
      {items.map((b) => (
        <Row
          key={b.id}
          icon="trash"
          title={b.name}
          sub={t.binUntil(day(b.deletedAt, uiLang), day(b.eraseAt, uiLang))}
          right={
            <Btn
              small
              icon="undo"
              label={t.putBack}
              accessibilityLabel={`${t.putBack} ${b.name}`}
              onPress={async () => {
                try {
                  await api.restoreProfile(b.id);
                  setMsg({ ok: true, text: t.backOk(b.name) });
                  load();
                  onRestored?.(b.id);
                } catch {
                  setMsg({ ok: false, text: t.failed });
                }
              }}
            />
          }
        />
      ))}
      {msg ? (
        <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '700' }} accessibilityLiveRegion="polite">
          {msg.text}
        </Text>
      ) : null}
    </Section>
  );
}

/** The copies of this child's board. Managers only (the family and those who manage the team). */
export function BoardVersions({ board }: { board: BoardCtx }) {
  const { api, uiLang } = useSession();
  const t = backupStrings(uiLang);
  const [list, setList] = useState<Snapshot[] | null>(null);
  const [asking, setAsking] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(() => {
    api.listSnapshots(board.profileId).then(setList).catch(() => setList(null));
  }, [api, board.profileId]);
  useEffect(() => {
    if (board.manager) load();
  }, [board.manager, load]);
  if (!board.manager || list === null) return null;
  return (
    <Section title={t.versions}>
      <Note text={t.versionsNote} />
      {list.length === 0 && <Note text={t.none} />}
      {list.map((v) => (
        <Row
          key={v.id}
          icon="calendar"
          title={when(v.createdAt, uiLang)}
          sub={`${t.reasons[v.reason]} · ${t.words(v.words)}`}
          right={<Btn small icon="undo" label={t.putBack} accessibilityLabel={`${t.putBack} · ${when(v.createdAt, uiLang)}`} onPress={() => (setMsg(null), setAsking(v))} />}
        />
      ))}
      {asking && (
        <View style={ss.card}>
          <Note text={t.confirmBack(when(asking.createdAt, uiLang))} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn
              small
              kind="primary"
              icon="undo"
              label={t.confirm}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  // Changes of this device not sent yet go first; then the copy comes back everywhere.
                  await board.sync.flush();
                  await api.restoreSnapshot(asking.id);
                  await board.sync.pull();
                  setMsg({ ok: true, text: t.backDone(when(asking.createdAt, uiLang)) });
                  setAsking(null);
                  load();
                } catch {
                  setMsg({ ok: false, text: t.failed });
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Btn small label={t.cancel} onPress={() => setAsking(null)} />
          </View>
        </View>
      )}
      <Btn
        small
        icon="download"
        label={t.keepNow}
        disabled={busy}
        onPress={async () => {
          try {
            await board.sync.flush();
            await api.takeSnapshot(board.profileId);
            setMsg({ ok: true, text: t.kept });
            load();
          } catch {
            setMsg({ ok: false, text: t.failed });
          }
        }}
      />
      {msg ? (
        <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '700' }} accessibilityLiveRegion="polite">
          {msg.text}
        </Text>
      ) : null}
    </Section>
  );
}
