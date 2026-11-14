/**
 * Caregiver mode:
 *  - double tap on a card → its actions (edit, picture, pronunciation, favourites, duplicate,
 *    select several, delete); on an activity board tab → edit, duplicate, share, print;
 *  - multi-selection bar: copy / paste, size, send to an activity board, print, delete;
 * Use mode:
 *  - long press on a folder → its most requested words (from the recorded use, if the family
 *    allowed it; otherwise its first words), to say one without opening the folder.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Resource, ResourceData } from '../../backend/types';
import { editStrings, type EditStrings } from '../../i18n/edit';
import { topInFolder } from '../../lib/analytics';
import {
  addFavourite,
  duplicateCell,
  duplicateTla,
  FAVOURITES_BOARD,
  importTla,
  moveCellsTo,
  parseTlaFile,
  placeCells,
  removeCells,
  resizeCells,
  tlaData,
  tlaFile,
  type FavouriteResult,
} from '../../lib/cellActions';
import { label, symbolOf } from '../../lib/lexicon';
import { pickTextFile } from '../../lib/pickTextFile';
import { exportText } from '../../lib/platform';
import { newResourceId } from '../../lib/resources';
import type { Cell } from '../../model/types';
import { useApp } from '../../state/AppState';
import { useBoard } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Field, Panel, useNavRtl } from '../common';
import { Icon, type IconName } from '../Icon';
import { SymbolView } from '../SymbolView';
import { resourceName } from '../../lib/resourceNames';
import { C, radius } from '../theme';

const RIGHT = { textAlign: 'right' as const, writingDirection: 'rtl' as const };

function useE(): EditStrings {
  return editStrings(useApp().profile.settings.uiLang);
}

/** Board on screen (for paste / select all). */
export function useCurrentBoard(): string | null {
  const { view, path, tlaId, profile } = useApp();
  if (view === 'tla') return tlaId && profile.boards[tlaId] ? tlaId : profile.tlaOrder[0] ?? null;
  if (view === 'board') return path[path.length - 1] ?? 'core';
  return null;
}

function Item({ icon, text, onPress, danger, disabled }: { icon: IconName; text: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const rtl = useNavRtl();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => [st.item, rtl && { flexDirection: 'row-reverse' }, pressed && { backgroundColor: C.surfaceAlt }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={22} color={danger ? C.help : C.text} />
      <Text style={[st.itemText, danger && { color: C.help }, rtl && RIGHT]}>{text}</Text>
    </Pressable>
  );
}

function Header({ concept }: { concept: string }) {
  const { profile, lang } = useApp();
  const rtl = useNavRtl();
  return (
    <View style={[st.header, rtl && { flexDirection: 'row-reverse' }]}>
      <SymbolView symbol={symbolOf(profile, concept)} size={56} />
      <Text style={st.headerText}>{label(profile, concept, lang)}</Text>
    </View>
  );
}

// ── Card menu ──

export function CellMenu({ board, index }: { board: string; index: number }) {
  const app = useApp();
  const e = useE();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const b = app.profile.boards[board];
  const cell = b?.cells[index];
  if (!b || !cell) return null;
  const close = () => app.setOverlay(null);
  const favText: Record<FavouriteResult, string> = { added: e.favAdded, already: e.favAlready, full: e.favFull, missing: e.favMissing };
  return (
    <Panel title={e.cardMenu} onClose={close} tone="edit" maxWidth={460}>
      <Header concept={cell.concept} />
      {cell.folder ? (
        <Item
          icon="grid"
          text={e.openFolder}
          onPress={() => {
            close();
            app.openFolder(cell.folder!);
          }}
        />
      ) : null}
      <Item icon="pencil" text={e.edit} onPress={() => app.setOverlay({ kind: 'editor', board, index })} />
      <Item icon="image" text={e.replaceImage} onPress={() => app.setOverlay({ kind: 'editor', board, index, only: 'image' })} />
      {!cell.folder && <Item icon="mic" text={e.recordVoice} onPress={() => app.setOverlay({ kind: 'editor', board, index, only: 'voice' })} />}
      {!cell.folder && board !== FAVOURITES_BOARD && (
        <Item
          icon="star"
          text={e.addFavourite}
          onPress={() => {
            let r: FavouriteResult = 'missing';
            app.update((d) => {
              r = addFavourite(d, cell.concept);
            });
            setMsg(favText[r]);
          }}
        />
      )}
      {!cell.folder && (
        <Item
          icon="clipboard"
          text={e.duplicate}
          onPress={() => {
            let at = -1;
            app.update((d) => {
              at = duplicateCell(d, board, index);
            });
            setMsg(at >= 0 ? e.duplicated : e.noRoom);
          }}
        />
      )}
      <Item
        icon="check"
        text={e.selectSeveral}
        onPress={() => {
          app.setSelection({ board, indexes: [index] });
          close();
        }}
      />
      {!cell.folder &&
        (confirm ? (
          <View style={st.confirm}>
            <Text style={st.confirmText}>{e.confirmDelete}</Text>
            {b.kind === 'core' && <Text style={st.note}>{e.coreNote}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn
                small
                kind="danger"
                icon="trash"
                label={e.delete}
                onPress={() => {
                  app.update((d) => removeCells(d, board, [index]));
                  close();
                }}
              />
              <Btn small kind="ghost" label={app.t.cancel} onPress={() => setConfirm(false)} />
            </View>
          </View>
        ) : (
          <Item icon="trash" text={e.delete} danger onPress={() => setConfirm(true)} />
        ))}
      {msg && (
        <Text style={st.msg} accessibilityLiveRegion="polite">
          {msg}
        </Text>
      )}
    </Panel>
  );
}

// ── Activity board menu ──

export function TlaMenu({ id }: { id: string }) {
  const app = useApp();
  const e = useE();
  const [msg, setMsg] = useState<string | null>(null);
  const b = app.profile.boards[id];
  if (!b) return null;
  return (
    <Panel title={e.tlaMenu} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={460}>
      <Header concept={b.concept} />
      <Item icon="pencil" text={e.rename} onPress={() => app.setOverlay({ kind: 'conceptEditor', concept: b.concept })} />
      <Item
        icon="clipboard"
        text={e.duplicate}
        onPress={() => {
          let copy: string | null = null;
          app.update((d) => {
            copy = duplicateTla(d, id);
          });
          setMsg(e.tlaDuplicated);
          if (copy) app.openTla(copy);
        }}
      />
      <Item icon="link" text={e.share} onPress={() => app.setOverlay({ kind: 'shareTla', id })} />
      <Item
        icon="printer"
        text={e.print}
        onPress={() => {
          app.openTla(id);
          app.setOverlay({ kind: 'print' });
        }}
      />
      {msg && <Text style={st.msg}>{msg}</Text>}
    </Panel>
  );
}

// ── Share an activity board ──

export function ShareTlaPanel({ id }: { id: string }) {
  const app = useApp();
  const e = useE();
  const { api, account } = useSession();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const b = app.profile.boards[id];
  if (!b) return null;
  const title = label(app.profile, b.concept, app.lang);
  const canSend = !!account && account.provider !== 'device';
  return (
    <Panel title={e.shareTitle(title)} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={520}>
      <Header concept={b.concept} />
      {canSend && (
        <View style={st.card}>
          <Text style={st.cardTitle}>{e.shareSend}</Text>
          <Text style={st.note}>{e.shareSendNote}</Text>
          <Field label={e.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Btn
            kind="primary"
            icon="mail"
            label={e.send}
            disabled={busy || !/.+@.+\..+/.test(email.trim())}
            onPress={async () => {
              setBusy(true);
              setMsg(null);
              try {
                const data = tlaData(app.profile, id)!;
                const r = await api.saveResource({ id: newResourceId(), kind: 'tla', title, data });
                await api.shareResource(r.id, { email: email.trim(), mode: 'view' });
                setMsg({ ok: true, text: e.sent });
                setEmail('');
              } catch (err) {
                setMsg({ ok: false, text: (err as { code?: string }).code === 'no_account' ? e.noAccount : e.failed });
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      )}
      <View style={st.card}>
        <Text style={st.cardTitle}>{e.shareFile}</Text>
        <Text style={st.note}>{e.shareFileNote}</Text>
        <Btn
          icon="download"
          label={e.shareFile}
          onPress={async () => {
            const f = tlaFile(app.profile, id, title);
            if (!f) return;
            const safe = title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'tla';
            await exportText(`${safe}.caa-tla.json`, JSON.stringify(f, null, 2), 'application/json');
            setMsg({ ok: true, text: e.fileSaved });
          }}
        />
      </View>
      {msg && <Text style={[st.msg, !msg.ok && { color: C.help }]}>{msg.text}</Text>}
    </Panel>
  );
}

// ── Multi-selection ──

export function SelectionBar() {
  const app = useApp();
  const e = useE();
  const rtl = useNavRtl();
  const current = useCurrentBoard();
  const [msg, setMsg] = useState<string | null>(null);
  // Removing words from the main board is asked twice (it is the child's everyday vocabulary).
  const [sure, setSure] = useState(false);
  const sel = app.selection;
  const count = sel && sel.board === current ? sel.indexes.length : 0;
  useEffect(() => setSure(false), [count, current]);
  if (!sel) return null;
  const onThisBoard = sel.board === current ? sel.indexes : [];
  const b = current ? app.profile.boards[current] : undefined;
  const cells = (): Cell[] => onThisBoard.map((i) => b?.cells[i]).filter((c): c is Cell => !!c);
  const n = onThisBoard.length;
  const done = () => {
    app.setSelection(null);
    setMsg(null);
  };
  return (
    <View style={[st.selBar, rtl && { flexDirection: 'row-reverse' }]} accessibilityRole="toolbar">
      <View style={{ flexGrow: 1, flexBasis: 200, gap: 2 }}>
        <Text style={[st.selText, rtl && RIGHT]}>{e.selecting(n)}</Text>
        {msg && <Text style={[st.selMsg, rtl && RIGHT]}>{msg}</Text>}
      </View>
      <View style={[st.selActions, rtl && { flexDirection: 'row-reverse' }]}>
        {b && (
          <Btn
            small
            kind="ghost"
            label={e.selectAll}
            onPress={() => app.setSelection({ board: b.id, indexes: b.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0) })}
          />
        )}
        {b && (
          <Btn
            small
            kind="ghost"
            label={e.selectNone}
            disabled={!n}
            onPress={() => {
              app.setSelection({ board: b.id, indexes: [] });
              setMsg(null);
            }}
          />
        )}
        <Btn
          small
          icon="clipboard"
          label={e.copy}
          disabled={!n}
          onPress={() => {
            app.setClipboard(structuredClone(cells()));
            setMsg(e.copied(n));
          }}
        />
        {app.clipboard.length > 0 && current && (
          <Btn
            small
            icon="plus"
            label={e.paste(app.clipboard.length)}
            onPress={() => {
              let k = 0;
              app.update((d) => {
                k = placeCells(d, current, app.clipboard);
              });
              setMsg(e.pasted(k, app.clipboard.length));
            }}
          />
        )}
        <View style={[st.sizes, rtl && { flexDirection: 'row-reverse' }]} accessibilityLabel={e.size}>
          <Text style={st.sizeLabel}>{e.size}</Text>
          {[0.6, 0.8, 1].map((k) => (
            <Pressable
              key={k}
              disabled={!n}
              onPress={() => current && app.update((d) => resizeCells(d, current, onThisBoard, k))}
              style={({ pressed }) => [st.sizeBtn, pressed && { opacity: 0.6 }, !n && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel={`${e.size} ${Math.round(k * 100)} %`}
            >
              <Text style={st.sizeText}>{Math.round(k * 100)} %</Text>
            </Pressable>
          ))}
        </View>
        <Btn small icon="grid" label={e.moveToTla} disabled={!n} onPress={() => app.setOverlay({ kind: 'moveToTla' })} />
        <Btn small icon="printer" label={e.printCards} disabled={!n} onPress={() => app.setOverlay({ kind: 'print', cards: cells().map((c) => c.concept) })} />
        <Btn
          small
          kind="danger"
          icon="trash"
          label={sure ? e.confirmRemove : undefined}
          accessibilityLabel={sure ? e.confirmRemove : e.delete}
          disabled={!n}
          onPress={() => {
            if (!current) return;
            if (b?.kind === 'core' && !sure) {
              setSure(true);
              setMsg(e.removeFromMain(n));
              return;
            }
            app.update((d) => removeCells(d, current, onThisBoard));
            app.setSelection({ board: current, indexes: [] });
            setMsg(null);
          }}
        />
        <Btn small kind="primary" icon="check" label={e.done} onPress={done} />
      </View>
    </View>
  );
}

export function MoveToTlaPanel() {
  const app = useApp();
  const e = useE();
  const current = useCurrentBoard();
  const [msg, setMsg] = useState<string | null>(null);
  const sel = app.selection;
  const from = sel?.board ?? current;
  return (
    <Panel title={e.moveTitle} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={520}>
      <Text style={st.note}>{e.moveNote}</Text>
      {app.profile.tlaOrder
        .filter((id) => id !== from && app.profile.boards[id])
        .map((id) => {
          const b = app.profile.boards[id];
          return (
            <Pressable
              key={id}
              onPress={() => {
                if (!sel || !from) return;
                let k = 0;
                app.update((d) => {
                  k = moveCellsTo(d, from, sel.indexes, id);
                });
                setMsg(e.moved(k, sel.indexes.length));
                // Cards that left their board are no longer selected (main board cards stay: copied).
                if (k && app.profile.boards[from]?.kind !== 'core') app.setSelection({ board: from, indexes: [] });
              }}
              style={({ pressed }) => [st.tlaRow, pressed && { backgroundColor: C.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel={label(app.profile, b.concept, app.lang)}
            >
              <SymbolView symbol={symbolOf(app.profile, b.concept)} size={40} />
              <Text style={st.itemText}>{label(app.profile, b.concept, app.lang)}</Text>
            </Pressable>
          );
        })}
      {msg && <Text style={st.msg}>{msg}</Text>}
      <Btn kind="primary" icon="check" label={e.done} onPress={() => app.setOverlay(null)} />
    </Panel>
  );
}

// ── Use mode: peek into a folder ──

const PEEK = 6;

export function FolderPeek({ folder }: { folder: string }) {
  const app = useApp();
  const board = useBoard();
  const e = useE();
  const b = app.profile.boards[folder];
  const [top, setTop] = useState<string[] | null>(null);
  useEffect(() => {
    if (!b) return;
    const inFolder = b.cells.filter((c): c is Cell => !!c && !c.folder).map((c) => c.concept);
    const ranked = board?.tracker ? topInFolder(board.tracker.localDays(), inFolder, PEEK) : [];
    setTop(ranked);
  }, [b, board?.tracker]);
  if (!b || top === null) return null;
  const inFolder = b.cells.filter((c): c is Cell => !!c && !c.folder).map((c) => c.concept);
  const words = [...top, ...inFolder.filter((c) => !top.includes(c))].slice(0, PEEK);
  const title = label(app.profile, b.concept, app.lang);
  const close = () => app.setOverlay(null);
  return (
    <Panel title={top.length ? e.peekTitle(title) : e.peekFirst(title)} onClose={close} maxWidth={620}>
      <View style={st.peekGrid}>
        {words.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              const index = b.cells.findIndex((x) => x?.concept === c);
              close();
              app.touchConcept(c, { board: folder, index, path: ['core', folder] });
            }}
            style={({ pressed }) => [st.peekCell, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={label(app.profile, c, app.lang)}
          >
            <SymbolView symbol={symbolOf(app.profile, c)} size={72} />
            <Text style={st.peekText} numberOfLines={2}>
              {label(app.profile, c, app.lang)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn
          icon="grid"
          label={e.peekOpen}
          onPress={() => {
            close();
            app.openFolder(folder);
          }}
          style={{ flexGrow: 1 }}
        />
        <Btn kind="ghost" label={e.close} onPress={close} style={{ flexGrow: 1 }} />
      </View>
    </Panel>
  );
}

// ── Import (new activity board panel) ──

/** "New activity board" panel: add one from a shared file or from what was shared with me. */
export function ImportTla() {
  const app = useApp();
  const e = useE();
  const shared = useSharedTlas();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const add = (data: ResourceData, title: string) => {
    let id: string | null = null;
    app.update((d) => {
      const r = importTla(d, data);
      Object.assign(d, r.profile);
      id = r.id;
    });
    setMsg({ ok: true, text: e.imported(title) });
    if (id) app.openTla(id);
    app.setOverlay(null);
  };
  return (
    <View style={st.card}>
      <Btn
        icon="download"
        label={e.importFile}
        onPress={async () => {
          setMsg(null);
          const f = await pickTextFile().catch(() => null);
          if (!f) return;
          const parsed = parseTlaFile(f.text);
          if (!parsed) return setMsg({ ok: false, text: e.importBad });
          add(parsed.data, parsed.title);
        }}
        style={{ alignSelf: 'flex-start' }}
      />
      {shared.length > 0 && (
        <>
          <Text style={st.cardTitle}>{e.importShared}</Text>
          {shared.map((r) => (
            <View key={r.id} style={[st.tlaRow, { backgroundColor: C.surface }]}>
              {r.data.boards[0] && <SymbolView symbol={symbolOf({ ...app.profile, customConcepts: { ...app.profile.customConcepts, ...r.data.customConcepts }, overrides: { ...r.data.overrides, ...app.profile.overrides } }, r.data.boards[0].concept)} size={36} />}
              <View style={{ flex: 1 }}>
                <Text style={st.itemText}>{resourceName(r, app.profile.settings.uiLang)}</Text>
                <Text style={st.note}>{e.from(r.ownerName)}</Text>
              </View>
              <Btn small icon="plus" label={e.add} onPress={() => add(r.data, resourceName(r, app.profile.settings.uiLang))} />
            </View>
          ))}
        </>
      )}
      {msg && <Text style={[st.msg, !msg.ok && { color: C.help }]}>{msg.text}</Text>}
    </View>
  );
}

export function useSharedTlas(): Resource[] {
  const { api, account } = useSession();
  const [list, setList] = useState<Resource[]>([]);
  useEffect(() => {
    if (!account || account.provider === 'device') return;
    api
      .listResources()
      .then((r) => setList(r.sharedWithMe.filter((x) => x.kind === 'tla' && x.data.boards.length)))
      .catch(() => {});
  }, [api, account]);
  return list;
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  headerText: { fontSize: 20, fontWeight: '700', color: C.text, flexShrink: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  itemText: { fontSize: 16, fontWeight: '600', color: C.text, flexShrink: 1 },
  msg: { fontSize: 14, fontWeight: '600', color: C.success },
  note: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  confirm: { gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: '#F4B4AE', backgroundColor: C.helpSoft },
  confirmText: { fontSize: 15, fontWeight: '700', color: C.text },
  card: { gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  selBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
  },
  selText: { fontSize: 15, fontWeight: '700', color: C.accent },
  selMsg: { fontSize: 13, color: C.text },
  // On a phone the buttons go on several lines (never wider than the screen).
  selActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '100%' },
  sizes: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  sizeLabel: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  sizeBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  sizeText: { fontSize: 13, fontWeight: '600', color: C.text },
  tlaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: C.border },
  peekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  peekCell: {
    width: 150,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  peekText: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
});
