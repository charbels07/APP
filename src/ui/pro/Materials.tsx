/**
 * Professionals' materials, all in "My library": a search bar (by name), the tiles that start
 * a new material in one tap (TLA, schedule, First–Then, picture cards, from a photo), the lists
 * (created items / shared with me / each user's materials) and what can be done with a material
 * (open, duplicate, personalise for a child, share, propose to a profile, export, delete).
 * No name is asked: a material is called by what it contains (see materialTitle).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackendError } from '../../backend/Backend';
import type { ProfileSummary, Resource, ResourceKind } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { proStrings, type ProStrings } from '../../i18n/pro';
import { label, symbolOf } from '../../lib/lexicon';
import { pickPhoto } from '../../lib/photos';
import { exportJson, printDocument } from '../../lib/platform';
import { buildPrintHtml, conceptCell } from '../../lib/printHtml';
import {
  duplicateData,
  EDITED_ON_BOARD,
  emptyResource,
  newResourceId,
  resourceFromSandbox,
  resourceToOps,
  RESOURCE_KINDS,
  sandboxFor,
  withConcepts,
} from '../../lib/resources';
import { applyOps } from '../../lib/profileDiff';
import { followsContent, isRealName, materialTitle, resourceName } from '../../lib/resourceNames';
import { search } from '../../lib/search';
import { migrate } from '../../lib/storage';
import type { ResourceData } from '../../backend/types';
import type { Lang, Profile } from '../../model/types';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, Segmented } from '../common';
import { Icon, type IconName } from '../Icon';
import { Note, ss } from '../settings/SettingsScreen';
import { Row, when } from '../settings/TeamTab';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';
import { MaterialBoard } from './SandboxBoard';
import { checked } from '../a11y';

export const KIND_ICON: Record<ResourceKind, IconName> = { tla: 'grid', schedule: 'calendar', firstThen: 'chevronRight', timer: 'timer', cards: 'image' };

export type Editing = { resource: Resource } | { kind: ResourceKind; title: string; profileId?: string; photo?: boolean };

const langOf = (ui: string): Lang => (ui === 'en' ? 'en' : ui === 'ar' ? 'ar' : 'fr');

// ── Create ──

/**
 * One tile per kind of material: a tap starts it. A visual timer is not offered: on its own it
 * could be saved but not used with a child (timers live in the child's board and in the steps of
 * a sequence); timers saved before still open.
 */
export function CreateTiles({ users, onEdit }: { users: ProfileSummary[]; onEdit: (e: Editing) => void }) {
  const { uiLang } = useSession();
  const p = proStrings(uiLang);
  const rtl = uiLang === 'ar';
  // Optional: made for one child (kept with that child's materials). Nothing chosen: a created item.
  const [forUser, setForUser] = useState<string | null>(null);
  const choices: (ResourceKind | 'photo')[] = [...RESOURCE_KINDS.filter((k) => k !== 'timer'), 'photo'];
  return (
    <>
      {users.length > 0 && (
        <View style={[st.forRow, rtl && { flexDirection: 'row-reverse' }]}>
          <Text style={ss.sub}>{p.forUser}</Text>
          {users.map((u) => {
            const on = forUser === u.id;
            return (
              <Pressable key={u.id} onPress={() => setForUser(on ? null : u.id)} style={[st.forChip, on && st.forChipOn]} accessibilityRole="checkbox" {...checked(on)} accessibilityLabel={u.name}>
                <Icon name="user" size={16} color={on ? '#fff' : C.accent} />
                <Text style={[st.forText, on && { color: '#fff' }]}>{u.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={[st.tiles, rtl && { flexDirection: 'row-reverse' }]}>
        {choices.map((k) => (
          <Pressable
            key={k}
            onPress={() => onEdit({ kind: k === 'photo' ? 'cards' : k, title: '', profileId: forUser ?? undefined, photo: k === 'photo' })}
            style={({ pressed }) => [st.tile, rtl && { flexDirection: 'row-reverse' }, pressed && { backgroundColor: '#F3F7FF', borderColor: C.accent }]}
            accessibilityRole="button"
            accessibilityLabel={`${p.createTitle} : ${k === 'photo' ? p.fromPhoto : p.kinds[k]}`}
          >
            <View style={st.tileIcon}>
              <Icon name={k === 'photo' ? 'camera' : KIND_ICON[k]} size={24} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.title, rtl && { textAlign: 'right' }]}>{k === 'photo' ? p.fromPhoto : p.kinds[k]}</Text>
              <Text style={[ss.sub, rtl && { textAlign: 'right' }]}>{k === 'photo' ? p.photoNote : p.kindNotes[k]}</Text>
            </View>
            <Icon name="plus" size={20} color={C.accent} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

// ── Editing a material ──

export function ResourceEditor({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { api, uiLang } = useSession();
  const p = proStrings(uiLang);
  const existing = 'resource' in editing ? editing.resource : undefined;
  const kind = existing?.kind ?? (editing as { kind: ResourceKind }).kind;
  // A name typed in an older version is kept; otherwise the name follows the material itself
  // (rename the board inside, and its name in the library follows).
  const given = (existing?.title ?? '').trim();
  const typed = !!existing && !followsContent(existing);
  const profileId = existing ? existing.profileId : (editing as { profileId?: string }).profileId;
  const [id] = useState(existing?.id ?? newResourceId());
  const [data, setData] = useState<ResourceData>(existing?.data ?? emptyResource(kind));
  const [msg, setMsg] = useState<string | null>(null);
  const [title, setTitle] = useState(existing ? resourceName(existing, uiLang) : p.kinds[kind]);
  const save = async (d: ResourceData, sandbox?: Profile) => {
    setData(d);
    const name = typed ? given : materialTitle(kind, d, sandbox, uiLang) || p.kinds[kind];
    setTitle(name);
    await api.saveResource({ id, kind, title: name, profileId, data: d });
    setMsg(p.savedLib);
  };
  if (EDITED_ON_BOARD.includes(kind)) {
    return (
      <MaterialBoard
        initial={sandboxFor(kind, data)}
        view={kind === 'tla' ? 'tla' : 'schedule'}
        openNew={!existing}
        onSave={(sb) => save(resourceFromSandbox(kind, sb, data), sb)}
        onClose={onClose}
      />
    );
  }
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={p.back} onPress={onClose} style={{ alignSelf: 'flex-start' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name={KIND_ICON[kind]} size={26} color={C.accent} />
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, flex: 1 }}>{title}</Text>
      </View>
      {kind === 'timer' && <TimerForm data={data} onChange={setData} p={p} />}
      {kind === 'firstThen' && <FirstThenForm data={data} onChange={setData} p={p} />}
      {kind === 'cards' && <CardsForm data={data} onChange={setData} p={p} startWithPhoto={'photo' in editing && !!editing.photo} title={title} />}
      {msg ? <Text style={{ color: C.success, fontWeight: '600' }}>{msg}</Text> : null}
      <Btn kind="primary" icon="check" label={p.saveLib} onPress={() => save(data)} />
    </>
  );
}

function TimerForm({ data, onChange, p }: { data: ResourceData; onChange: (d: ResourceData) => void; p: ProStrings }) {
  const t = data.timer ?? { minutes: 5, display: ['circle', 'digits'] as ('circle' | 'bar' | 'digits')[] };
  return (
    <>
      <Note text={p.minutes} />
      <Segmented<number> value={t.minutes} onChange={(minutes) => onChange({ ...data, timer: { ...t, minutes } })} options={[1, 2, 5, 10, 15, 20, 30].map((m) => ({ value: m, label: String(m) }))} />
      <Note text={p.display} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['circle', 'bar', 'digits'] as const).map((d) => {
          const on = t.display.includes(d);
          return (
            <Btn
              key={d}
              small
              kind={on ? 'primary' : 'secondary'}
              icon={on ? 'check' : undefined}
              label={p.displays[d]}
              onPress={() => onChange({ ...data, timer: { ...t, display: on ? t.display.filter((x) => x !== d) : [...t.display, d] } })}
            />
          );
        })}
      </View>
      <View style={styles.timerPreview} accessibilityElementsHidden>
        <Text style={{ fontSize: 40, fontWeight: '800', color: C.accent }}>{`${t.minutes}:00`}</Text>
      </View>
    </>
  );
}

/** Search a word and tap it. */
function WordPicker({ profile, onPick, lang }: { profile: Profile; onPick: (id: string) => void; lang: Lang }) {
  const { uiLang } = useSession();
  const p = proStrings(uiLang);
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? search(profile, q, 18).map((r) => r.concept) : []), [q, profile]);
  return (
    <View style={{ gap: 8 }}>
      <TextInput value={q} onChangeText={setQ} placeholder={p.search} placeholderTextColor={C.placeholder} style={styles.input} accessibilityLabel={p.search} />
      <View style={styles.grid}>
        {results.map((id) => (
          <Pressable key={id} onPress={() => onPick(id)} style={styles.word} accessibilityRole="button" accessibilityLabel={label(profile, id, lang)}>
            <SymbolView symbol={symbolOf(profile, id)} size={44} />
            <Text style={styles.wordText} numberOfLines={1}>
              {label(profile, id, lang)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FirstThenForm({ data, onChange, p }: { data: ResourceData; onChange: (d: ResourceData) => void; p: ProStrings }) {
  const { uiLang, ui } = useSession();
  const lang = langOf(uiLang);
  const profile = useMemo(() => sandboxFor('firstThen', data), [data]);
  const [slot, setSlot] = useState<'first' | 'then'>('first');
  const ft = data.firstThen ?? {};
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
        {(['first', 'then'] as const).map((k) => (
          <Pressable key={k} onPress={() => setSlot(k)} style={[styles.ftCard, slot === k && { borderColor: C.accent }]} accessibilityRole="button">
            <Text style={{ fontWeight: '800', color: C.textMuted }}>{k === 'first' ? ui.first : ui.then}</Text>
            {ft[k] ? <SymbolView symbol={symbolOf(profile, ft[k]!)} size={80} /> : <Icon name="plus" size={40} color={C.textMuted} />}
            <Text style={ss.title}>{ft[k] ? label(profile, ft[k]!, lang) : ''}</Text>
          </Pressable>
        ))}
      </View>
      <WordPicker profile={profile} lang={lang} onPick={(id) => onChange({ ...data, firstThen: { ...ft, [slot]: id } })} />
    </>
  );
}

function CardsForm({ data, onChange, p, startWithPhoto, title }: { data: ResourceData; onChange: (d: ResourceData) => void; p: ProStrings; startWithPhoto: boolean; title: string }) {
  const { uiLang } = useSession();
  const lang = langOf(uiLang);
  const profile = useMemo(() => {
    const base = migrate({});
    return { ...base, customConcepts: { ...base.customConcepts, ...data.customConcepts }, overrides: { ...base.overrides, ...data.overrides } };
  }, [data]);
  const cards = data.cards ?? [];
  const [photoName, setPhotoName] = useState('');
  const addPhoto = async () => {
    const media = await pickPhoto('library').catch(() => undefined);
    if (!media) return;
    const id = `c_${Date.now().toString(36)}`;
    const name = photoName.trim() || p.untitled;
    const next: ResourceData = {
      ...data,
      cards: [...cards, id],
      customConcepts: { ...data.customConcepts, [id]: { id, cls: 'noun', labels: { fr: name, en: name, ar: name }, emoji: '📷', custom: true } },
      overrides: { ...data.overrides, [id]: { symbol: { kind: 'media', name: media } } },
    };
    onChange(next);
    setPhotoName('');
  };
  const print = async () => {
    const cells = await Promise.all(cards.map((id) => conceptCell(profile, id, lang)));
    const cols = 4;
    const html = buildPrintHtml(title, Math.max(1, Math.ceil(cells.length / cols)), cols, cells, { paper: 'A4', landscape: false, blackWhite: false, labels: true, cutCards: true }, lang);
    await printDocument(html, false);
  };
  return (
    <>
      <View style={styles.grid}>
        {cards.map((id) => (
          <Pressable
            key={id}
            onPress={() => onChange(withConcepts({ ...data, cards: cards.filter((x) => x !== id) }, data))}
            style={styles.word}
            accessibilityRole="button"
            accessibilityLabel={`${label(profile, id, lang)} ×`}
          >
            <SymbolView symbol={symbolOf(profile, id)} size={56} />
            <Text style={styles.wordText} numberOfLines={1}>
              {label(profile, id, lang)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Section title={p.addPhoto}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={photoName} onChangeText={setPhotoName} placeholder={p.photoName} placeholderTextColor={C.placeholder} style={[styles.input, { flex: 1 }]} />
          <Btn icon="camera" label={p.addPhoto} onPress={addPhoto} />
        </View>
      </Section>
      {!startWithPhoto || cards.length ? (
        <Section title={p.addWords}>
          <WordPicker profile={profile} lang={lang} onPick={(id) => !cards.includes(id) && onChange({ ...data, cards: [...cards, id] })} />
        </Section>
      ) : null}
      {cards.length > 0 && <Btn icon="printer" label={p.print} onPress={print} />}
    </>
  );
}

// ── Library ──

export function Library({ users, onEdit, onlyUser }: { users: ProfileSummary[]; onEdit: (e: Editing) => void; onlyUser?: string }) {
  const { api, uiLang } = useSession();
  const p = proStrings(uiLang);
  const [lib, setLib] = useState<{ mine: Resource[]; sharedWithMe: Resource[] }>({ mine: [], sharedWithMe: [] });
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const load = () =>
    api
      .listResources()
      .then((l) => {
        setLib(l);
        // Materials saved as "Untitled" by an older version take the name of what they contain.
        for (const r of l.mine) {
          const name = isRealName(r.title) ? '' : materialTitle(r.kind, r.data, undefined, uiLang);
          if (name) void api.saveResource({ id: r.id, kind: r.kind, title: name, profileId: r.profileId, data: r.data }).catch(() => {});
        }
      })
      .catch(() => {});
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const needle = q.trim().toLocaleLowerCase();
  const match = (r: Resource) => !needle || resourceName(r, uiLang).toLocaleLowerCase().includes(needle);
  const templates = lib.mine.filter((r) => !r.profileId && match(r));
  const forUsers = lib.mine.filter((r) => r.profileId && (!onlyUser || r.profileId === onlyUser) && match(r));
  const sharedWithMe = lib.sharedWithMe.filter(match);
  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? '';
  const list = (rs: Resource[], shared = false) =>
    rs.length ? (
      rs.map((r) => (
        <View key={r.id} style={{ gap: 6 }}>
          <Row
            icon={KIND_ICON[r.kind]}
            title={resourceName(r, uiLang)}
            sub={[p.kinds[r.kind], r.profileId ? userName(r.profileId) : '', shared ? p.sharedBy(r.ownerName) : '', when(r.updatedAt, uiLang)].filter(Boolean).join(' · ')}
            onPress={() => setOpen(open === r.id ? null : r.id)}
          />
          {open === r.id && <ResourceActions r={r} users={users} p={p} onEdit={onEdit} onChanged={load} shared={shared} />}
        </View>
      ))
    ) : (
      <Note text={p.libEmpty} />
    );
  if (onlyUser) return <>{list(forUsers)}</>;
  const found = templates.length + forUsers.length + sharedWithMe.length;
  return (
    <>
      <View style={[st.search, uiLang === 'ar' && { flexDirection: 'row-reverse' }]}>
        <Icon name="search" size={20} color={C.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={p.searchItems}
          placeholderTextColor={C.placeholder}
          style={[st.searchInput, uiLang === 'ar' && { textAlign: 'right' }]}
          accessibilityLabel={p.searchItems}
          autoCorrect={false}
        />
        {q ? <Btn small kind="ghost" icon="x" label={p.clearSearch} onPress={() => setQ('')} /> : null}
      </View>
      {needle ? (
        // Searching: only what matches, wherever it is kept.
        found ? (
          <>
            {templates.length > 0 && <Section title={p.libTemplates}>{list(templates)}</Section>}
            {sharedWithMe.length > 0 && <Section title={p.libShared}>{list(sharedWithMe, true)}</Section>}
            {forUsers.length > 0 && <Section title={p.libUsers}>{list(forUsers)}</Section>}
          </>
        ) : (
          <Note text={p.noMatch(q.trim())} />
        )
      ) : (
        <>
          <Section title={p.createTitle}>
            <CreateTiles users={users} onEdit={onEdit} />
          </Section>
          <Section title={p.libTemplates}>{list(templates)}</Section>
          <Section title={p.libShared}>{list(sharedWithMe, true)}</Section>
          {(users.length > 0 || forUsers.length > 0) && <Section title={p.libUsers}>{list(forUsers)}</Section>}
        </>
      )}
    </>
  );
}

function ResourceActions({
  r,
  users,
  p,
  onEdit,
  onChanged,
  shared,
}: {
  r: Resource;
  users: ProfileSummary[];
  p: ProStrings;
  onEdit: (e: Editing) => void;
  onChanged: () => void;
  shared: boolean;
}) {
  const { api, s, uiLang } = useSession();
  const name = resourceName(r, uiLang);
  const [mode, setMode] = useState<null | 'personalise' | 'share' | 'propose' | 'delete'>(null);
  const [email, setEmail] = useState('');
  const [shareMode, setShareMode] = useState<'view' | 'edit'>('view');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const canEdit = !shared || r.shares.some((x) => x.mode === 'edit');
  const proposable = r.kind === 'tla' || r.kind === 'schedule' || r.kind === 'firstThen';
  const run = async (fn: () => Promise<string>) => {
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errorText(s, e) });
    }
  };
  const copyTo = (profileId?: string) =>
    run(async () => {
      await api.saveResource({ id: newResourceId(), kind: r.kind, title: p.copyOf(name), profileId, data: duplicateData(r.data) });
      return p.savedLib;
    });
  const userPicker = (onPick: (id: string) => void) => (
    <View style={{ gap: 6 }}>
      <Note text={p.pickUser} />
      {users.map((u) => (
        <Btn key={u.id} small icon="user" label={u.name} onPress={() => onPick(u.id)} />
      ))}
    </View>
  );
  return (
    <View style={[ss.card, { marginLeft: 12 }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {canEdit && <Btn small icon="pencil" label={p.open} onPress={() => onEdit({ resource: r })} />}
        <Btn small icon="clipboard" label={p.duplicate} onPress={() => copyTo(undefined)} />
        {users.length > 0 && <Btn small icon="user" label={p.personalise} onPress={() => setMode('personalise')} />}
        {!shared && <Btn small icon="users" label={p.share} onPress={() => setMode('share')} />}
        {proposable && users.length > 0 && <Btn small icon="mail" label={p.propose} onPress={() => setMode('propose')} />}
        <Btn small icon="download" label={p.exportFile} onPress={() => exportJson(`${name}.json`, { kind: r.kind, title: name, data: r.data })} />
        {!shared && <Btn small kind="danger" icon="trash" label={p.delete} onPress={() => setMode('delete')} />}
      </View>
      {mode === 'personalise' && userPicker((id) => copyTo(id))}
      {mode === 'propose' &&
        userPicker((id) =>
          run(async () => {
            const child = await api.getProfile(id);
            const ops = resourceToOps(migrate(child.data), r.kind, r.data);
            // A profile this professional created (no family yet): added directly, nobody to ask.
            if (users.find((u) => u.id === id)?.access === 'owner') {
              const saved = await api.saveProfile(id, applyOps(migrate(child.data), ops).profile, child.version);
              if (!saved.ok) throw new BackendError('generic');
              return p.addedToProfile;
            }
            await api.createProposal(id, { title: `${p.kinds[r.kind]} « ${name} »`, ops, baseVersion: child.version });
            return p.proposed;
          }),
        )}
      {mode === 'propose' && <Note text={p.proposeNote} />}
      {mode === 'share' && (
        <View style={{ gap: 8 }}>
          <Note text={p.shareWith} />
          <Field label={p.shareEmail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ textAlign: 'left' }} />
          <Segmented<'view' | 'edit'> value={shareMode} onChange={setShareMode} options={[{ value: 'view', label: p.shareView }, { value: 'edit', label: p.shareEdit }]} />
          <Btn
            small
            kind="primary"
            icon="mail"
            label={p.share}
            disabled={!email.trim()}
            onPress={() =>
              run(async () => {
                await api.shareResource(r.id, { email: email.trim(), mode: shareMode });
                return p.shareDone;
              })
            }
          />
          {users.map((u) => (
            <Btn
              key={u.id}
              small
              icon="users"
              label={`${p.team} · ${u.name}`}
              onPress={() =>
                run(async () => {
                  await api.shareResource(r.id, { profileId: u.id, mode: 'view' });
                  return p.shareDone;
                })
              }
            />
          ))}
        </View>
      )}
      {mode === 'delete' && (
        <Btn
          small
          kind="danger"
          icon="trash"
          label={p.confirmDelete}
          onPress={() =>
            run(async () => {
              await api.deleteResource(r.id);
              return '';
            })
          }
        />
      )}
      {msg?.text ? <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '600' }}>{msg.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46, fontSize: 16, color: C.text, backgroundColor: C.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: { width: 96, alignItems: 'center', gap: 4, padding: 6, borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  wordText: { fontSize: 13, fontWeight: '600', color: C.text },
  ftCard: { width: 160, minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.lg, borderWidth: 2.5, borderColor: C.border, backgroundColor: C.surface, padding: 10 },
  timerPreview: { alignSelf: 'center', width: 160, height: 160, borderRadius: 80, borderWidth: 10, borderColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
});

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 50, backgroundColor: C.surface },
  searchInput: { flex: 1, minHeight: 46, fontSize: 16, color: C.text },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentSoft },
  forRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  forChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1.5, borderColor: C.accent, backgroundColor: C.surface },
  forChipOn: { backgroundColor: C.accent },
  forText: { fontSize: 15, fontWeight: '700', color: C.accent },
});
