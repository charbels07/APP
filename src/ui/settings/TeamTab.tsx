/**
 * "Team" page: everyone working with the child, what each can do, invitations and requests,
 * proposals to review (before / after), the change history with undo, and the code
 * professionals use to ask to join.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';
import type { HistoryEntry, Invitation, Membership, Notice, Proposal } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { settingsStrings, type SettingsStrings } from '../../i18n/settings';
import { describeOps, type ChangeItem } from '../../lib/describeOps';
import { symbolOf } from '../../lib/lexicon';
import { preset, type AccessLevel, type CollaboratorRole, type PermissionSet } from '../../lib/permissions';
import { applyOps, foreignOps } from '../../lib/profileDiff';
import type { Profile } from '../../model/types';
import { useApp } from '../../state/AppState';
import type { BoardCtx } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, Segmented, Toggle, useNavRtl } from '../common';
import { Icon, type IconName } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C } from '../theme';
import { Note, ss } from './SettingsScreen';
import { checked } from '../a11y';
import { noticeText } from '../../lib/notices';

type View_ =
  | { k: 'main' }
  | { k: 'invite' }
  | { k: 'invited'; inv: Invitation }
  | { k: 'member'; m: Membership }
  | { k: 'proposal'; p: Proposal }
  | { k: 'request'; inv: Invitation };

const INVITE_ROLES: CollaboratorRole[] = ['therapist', 'teacher', 'caregiver', 'family', 'other'];
const PERMS: (keyof Omit<PermissionSet, 'manager'>)[] = ['createMaterials', 'proposeVocabulary', 'changeAccess', 'invite', 'manageDevices', 'viewData'];

export function TeamTab({ board, onChanged }: { board: BoardCtx; onChanged: () => void }) {
  const { api, uiLang, account } = useSession();
  const x = settingsStrings(uiLang);
  const [view, setView] = useState<View_>({ k: 'main' });
  const [members, setMembers] = useState<Membership[] | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, i, p, h, n] = await Promise.all([
        api.listMembers(board.profileId),
        board.manager ? api.profileInvitations(board.profileId) : Promise.resolve([] as Invitation[]),
        api.listProposals({ profileId: board.profileId }),
        api.listHistory(board.profileId),
        api.listNotices(),
      ]);
      setMembers(m.filter((x_) => x_.status === 'active' && x_.role !== 'device'));
      setInvites(i.filter((x_) => x_.status === 'pending'));
      setProposals(p);
      setHistory(h);
      const kinds = account?.prefs.notifications;
      setNotices(
        n.filter((x_) => (!x_.profileId || x_.profileId === board.profileId) && (
          x_.kind === 'invitation' || x_.kind === 'request' ? kinds?.invitations !== false
            : x_.kind === 'sync' ? kinds?.sync !== false
              : kinds?.proposals !== false)),
      );
      setOffline(false);
    } catch {
      setOffline(true);
    }
    onChanged();
  }, [api, board.profileId, board.manager, account?.prefs.notifications, onChanged]);
  useEffect(() => {
    void load();
  }, [load]);
  const back = () => {
    setView({ k: 'main' });
    void load();
  };

  if (offline && !members) return <Note text={x.offlineTeam} />;
  if (view.k === 'invite') return <InviteView board={board} x={x} onBack={back} onDone={(inv) => setView({ k: 'invited', inv })} />;
  if (view.k === 'invited') return <InvitedView inv={view.inv} x={x} onBack={back} />;
  if (view.k === 'member') return <MemberView board={board} m={view.m} x={x} onBack={back} />;
  if (view.k === 'proposal') return <ProposalView board={board} p={view.p} x={x} onBack={back} />;
  if (view.k === 'request') return <RequestView inv={view.inv} x={x} onBack={back} />;

  const pendingProps = proposals.filter((p) => p.status === 'pending');
  const requests = invites.filter((i) => i.direction === 'request');
  const invited = invites.filter((i) => i.direction === 'invite');
  const unread = notices.filter((n) => !n.read);
  const canInvite = board.manager || !!board.access?.perms.invite;

  return (
    <>
      <Header text={`${x.teamOf} ${board.childName}`} />
      {canInvite && <Btn kind="primary" icon="plus" label={x.invite} onPress={() => setView({ k: 'invite' })} />}
      {!board.manager && <Note text={x.notManager} />}

      {unread.length > 0 && (
        <Section title={x.news}>
          {unread.slice(0, 6).map((n) => (
            <Row key={n.id} icon="bell" title={noticeText(n.text, uiLang)} sub={when(n.createdAt, uiLang)} />
          ))}
          <Btn
            small
            kind="ghost"
            icon="check"
            label={x.markRead}
            onPress={async () => {
              await api.markNoticesRead(unread.map((n) => n.id)).catch(() => {});
              void load();
            }}
          />
        </Section>
      )}

      {board.manager && (
        <Section title={x.proposals}>
          {pendingProps.length ? (
            pendingProps.map((p) => (
              <Row
                key={p.id}
                icon="sparkles"
                title={p.title}
                sub={`${x.by} ${p.authorName} · ${when(p.createdAt, uiLang)}`}
                onPress={() => setView({ k: 'proposal', p })}
              />
            ))
          ) : (
            <Note text={x.noneWaiting} />
          )}
        </Section>
      )}

      {board.manager && requests.length > 0 && (
        <Section title={x.requests}>
          {requests.map((i) => (
            <Row
              key={i.id}
              icon="briefcase"
              title={i.fromName}
              sub={`${x.roles[i.role]}${i.message ? ` · « ${i.message} »` : ''}`}
              onPress={() => setView({ k: 'request', inv: i })}
            />
          ))}
        </Section>
      )}

      <Section title={x.people}>
        <Row icon="heart" title={board.access?.owner ? `${account?.displayName ?? ''} (${x.you})` : x.ownerRole} sub={x.ownerRole} />
        {(members ?? []).map((m) => (
          <Row
            key={m.userId}
            icon="user"
            title={m.userId === account?.id ? `${m.displayName} (${x.you})` : m.displayName}
            sub={`${x.roles[m.role]} · ${x.levels[m.level]}${m.expiresAt ? ` · ${x.until} ${day(m.expiresAt, uiLang)}` : ''}`}
            onPress={board.manager && m.userId !== account?.id ? () => setView({ k: 'member', m }) : undefined}
          />
        ))}
        {invited.map((i) => (
          <Row
            key={i.id}
            icon="mail"
            title={i.name || i.email || i.code}
            sub={`${x.pending} · ${x.roles[i.role]}`}
            muted
            onPress={() => setView({ k: 'invited', inv: i })}
          />
        ))}
      </Section>

      {board.manager && <ConnectionCode board={board} x={x} />}

      <HistoryList board={board} entries={history} x={x} onChanged={load} />
    </>
  );
}

// ── Small building blocks ──

function Header({ text }: { text: string }) {
  const rtl = useNavRtl();
  return <Text style={[{ fontSize: 22, fontWeight: '800', color: C.text }, rtl && ss.rtl]}>{text}</Text>;
}

export function Row({
  icon,
  title,
  sub,
  onPress,
  muted,
  right,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  onPress?: () => void;
  muted?: boolean;
  right?: React.ReactNode;
}) {
  const rtl = useNavRtl();
  const content = (
    <>
      <Icon name={icon} size={22} color={muted ? C.textMuted : C.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[ss.title, muted && { color: C.textMuted }, rtl && ss.rtl]} numberOfLines={2}>
          {title}
        </Text>
        {sub ? <Text style={[ss.sub, rtl && ss.rtl]}>{sub}</Text> : null}
      </View>
      {right}
      {onPress && <Icon name={rtl ? 'chevronLeft' : 'chevronRight'} size={20} color={C.textMuted} />}
    </>
  );
  if (!onPress) return <View style={[ss.row, rtl && ss.rowRev]}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ss.row, rtl && ss.rowRev, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

export function when(t: number, ui: string): string {
  try {
    return new Date(t).toLocaleString(ui === 'ar' ? 'ar-LB' : ui === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(t).toISOString().slice(0, 16).replace('T', ' ');
  }
}
export function day(t: number, ui: string): string {
  try {
    return new Date(t).toLocaleDateString(ui === 'ar' ? 'ar-LB' : ui === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(t).toISOString().slice(0, 10);
  }
}

/** Role, level (1 Use / 2 Contribute / 3 Edit) and each permission, before inviting or later. */
export function PermissionEditor({
  x,
  role,
  level,
  perms,
  onChange,
  showRole = true,
}: {
  x: SettingsStrings;
  role: CollaboratorRole;
  level: AccessLevel;
  perms: PermissionSet;
  onChange: (v: { role: CollaboratorRole; level: AccessLevel; perms: PermissionSet }) => void;
  showRole?: boolean;
}) {
  return (
    <>
      {showRole && (
        <>
          <Note text={x.inviteRole} />
          <View style={{ gap: 6 }}>
            {INVITE_ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => onChange({ role: r, ...preset(r) })}
                style={[ss.row, { minHeight: 46 }, role === r && { borderColor: C.accent, backgroundColor: '#F3F7FF' }]}
                accessibilityRole="radio"
                {...checked(role === r)}
              >
                <Icon name={role === r ? 'check' : 'user'} size={18} color={role === r ? C.accent : C.textMuted} />
                <Text style={[ss.title, { fontSize: 15 }]}>{x.roles[r]}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Note text={x.inviteLevel} />
      <Segmented<number>
        value={level}
        onChange={(l) => onChange({ role, level: l as AccessLevel, perms })}
        options={([1, 2, 3] as AccessLevel[]).map((l) => ({ value: l, label: `${l} · ${x.levels[l]}` }))}
      />
      <Note text={x.levelNotes[level]} />
      {/* Seeing the progress data does not need editing rights (a teacher can follow progress). */}
      {PERMS.filter((k) => level > 1 || k === 'viewData').map((k) => (
        <Toggle key={k} label={x.perms[k]} value={!!perms[k]} onChange={(v) => onChange({ role, level, perms: { ...perms, [k]: v } })} />
      ))}
    </>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={{ color: C.help, fontWeight: '600' }}>{text}</Text>;
}

// ── Invite ──

function InviteView({ board, x, onBack, onDone }: { board: BoardCtx; x: SettingsStrings; onBack: () => void; onDone: (inv: Invitation) => void }) {
  const { api, s } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [v, setV] = useState<{ role: CollaboratorRole; level: AccessLevel; perms: PermissionSet }>({ role: 'therapist', ...preset('therapist') });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={x.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Header text={x.inviteTitle} />
      <Field label={x.inviteName} value={name} onChangeText={setName} />
      <Field label={x.inviteEmail} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ textAlign: 'left' }} />
      <PermissionEditor x={x} {...v} onChange={setV} />
      <Note text={x.inviteNote} />
      <ErrorLine text={error} />
      <Btn
        kind="primary"
        icon="mail"
        label={x.inviteSend}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            onDone(await api.invite(board.profileId, { email: email.trim() || undefined, name: name.trim() || undefined, ...v }));
          } catch (e) {
            setError(errorText(s, e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}

function InvitedView({ inv, x, onBack }: { inv: Invitation; x: SettingsStrings; onBack: () => void }) {
  const { api } = useSession();
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const message = x.inviteMessage(inv.fromName, inv.childName, inv.code);
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={x.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Header text={x.inviteReady} />
      <Note text={`${inv.name || inv.email || ''} · ${x.roles[inv.role]} · ${x.levels[inv.level]}`} />
      <View style={ss.card}>
        <Text style={ss.code} selectable>
          {inv.code}
        </Text>
        <Note text={x.inviteShare} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Btn
            icon="external"
            label={x.share}
            onPress={() => {
              Share.share({ message }).catch(() => {});
            }}
          />
          <Btn
            icon="clipboard"
            label={copied ? x.copied : x.copy}
            onPress={async () => {
              await Clipboard.setStringAsync(message).catch(() => {});
              setCopied(true);
            }}
          />
        </View>
      </View>
      {inv.email ? <Btn icon="refresh" label={x.resend} onPress={() => void api.resendInvitation(inv.id).catch(() => {})} /> : null}
      <Btn
        kind="danger"
        icon="x"
        label={confirm ? `${x.cancelInvite} ?` : x.cancelInvite}
        onPress={async () => {
          if (!confirm) return setConfirm(true);
          await api.cancelInvitation(inv.id).catch(() => {});
          onBack();
        }}
      />
      <Btn kind="primary" icon="check" label={x.done} onPress={onBack} />
    </>
  );
}

// ── A member's access ──

const DAY = 24 * 3600 * 1000;

function MemberView({ board, m, x, onBack }: { board: BoardCtx; m: Membership; x: SettingsStrings; onBack: () => void }) {
  const { api, s, uiLang } = useSession();
  const [v, setV] = useState({ role: m.role, level: m.level, perms: m.perms });
  const [expiry, setExpiry] = useState<number | null>(m.expiresAt ?? null);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const choices: { value: string; label: string; at: number | null }[] = [
    { value: 'none', label: x.expiryNone, at: null },
    { value: '1w', label: x.expiry1w, at: Date.now() + 7 * DAY },
    { value: '1m', label: x.expiry1m, at: Date.now() + 30 * DAY },
    { value: '3m', label: x.expiry3m, at: Date.now() + 91 * DAY },
  ];
  const [expiryChoice, setExpiryChoice] = useState(expiry ? 'keep' : 'none');
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={x.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Header text={`${x.memberTitle} ${m.displayName}`} />
      {m.email ? <Note text={m.email} /> : null}
      <PermissionEditor x={x} {...v} onChange={setV} />
      <Note text={`${x.expiry}${expiry ? ` · ${x.until} ${day(expiry, uiLang)}` : ''}`} />
      <Segmented<string>
        value={expiryChoice}
        onChange={(c) => {
          setExpiryChoice(c);
          setExpiry(choices.find((o) => o.value === c)?.at ?? null);
        }}
        options={choices.map(({ value, label }) => ({ value, label }))}
      />
      <ErrorLine text={error} />
      {msg ? <Text style={{ color: C.success, fontWeight: '600' }}>{msg}</Text> : null}
      <Btn
        kind="primary"
        icon="check"
        label={x.save}
        onPress={async () => {
          setError(null);
          try {
            await api.updateMember(board.profileId, m.userId, { ...v, expiresAt: expiry });
            setMsg(x.saved);
          } catch (e) {
            setError(errorText(s, e));
          }
        }}
      />
      <Note text={x.revokeNote} />
      <Btn
        kind="danger"
        icon="logout"
        label={confirm ? x.revokeConfirm : x.revoke}
        onPress={async () => {
          if (!confirm) return setConfirm(true);
          await api.revokeMember(board.profileId, m.userId).catch(() => {});
          onBack();
        }}
      />
    </>
  );
}

// ── A professional's request (option B: the family code) ──

function RequestView({ inv, x, onBack }: { inv: Invitation; x: SettingsStrings; onBack: () => void }) {
  const { api, s } = useSession();
  // Only the switches this screen shows are passed on: a request cannot carry "acts as a parent"
  // or any right the family does not see here (the database refuses them too).
  const [v, setV] = useState({ role: inv.role, level: inv.level, perms: { ...inv.perms, manager: false, invite: false, manageDevices: false, changeAccess: false } });
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={x.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Header text={inv.fromName} />
      <Note text={`${x.roles[inv.role]}${inv.message ? ` · « ${inv.message} »` : ''}`} />
      <PermissionEditor x={x} {...v} onChange={setV} showRole={false} />
      <ErrorLine text={error} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn
          kind="danger"
          icon="x"
          label={x.decline}
          style={{ flex: 1 }}
          onPress={async () => {
            await api.respondInvitation(inv.id, false).catch(() => {});
            onBack();
          }}
        />
        <Btn
          kind="success"
          icon="check"
          label={x.approve}
          style={{ flex: 2 }}
          onPress={async () => {
            try {
              await api.approveRequest(inv.id, { level: v.level, perms: v.perms });
              onBack();
            } catch (e) {
              setError(errorText(s, e));
            }
          }}
        />
      </View>
    </>
  );
}

// ── Proposals: before / after, approve / ask for a change / decline ──

export function ChangeList({ items, profileBefore, profileAfter, x }: { items: ChangeItem[]; profileBefore: Profile; profileAfter: Profile; x: SettingsStrings }) {
  const rtl = useNavRtl();
  return (
    <View style={{ gap: 8 }}>
      {items.map((it, i) => (
        <View key={i} style={[ss.row, rtl && ss.rowRev, it.core && { borderColor: '#FEC84B', backgroundColor: C.editSoft }]}>
          <Icon name={it.icon} size={20} color={it.core ? C.edit : C.accent} />
          <Text style={[ss.title, { flex: 1, fontSize: 15, fontWeight: '600' }, rtl && ss.rtl]}>{it.text}</Text>
          {(it.before || it.after) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {it.before && <SymbolView symbol={symbolOf(profileBefore, it.before)} size={36} />}
              {it.before && it.after && <Icon name="chevronRight" size={16} color={C.textMuted} />}
              {it.after && <SymbolView symbol={symbolOf(profileAfter, it.after)} size={36} />}
            </View>
          )}
        </View>
      ))}
      {items.some((it) => it.core) && <Text style={{ color: C.edit, fontWeight: '700' }}>{x.coreWarn}</Text>}
    </View>
  );
}

function ProposalView({ board, p, x, onBack }: { board: BoardCtx; p: Proposal; x: SettingsStrings; onBack: () => void }) {
  const app = useApp();
  const { api, s, uiLang } = useSession();
  const [note, setNote] = useState('');
  const [coreOk, setCoreOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Never applied from a proposal: recording / sharing choices, the caregiver code, links to apps or sites.
  const safe = useMemo(() => foreignOps(p.ops), [p.ops]);
  const preview = useMemo(() => applyOps(app.profile, safe.ops), [app.profile, safe]);
  const items = useMemo(() => describeOps(safe.ops, app.profile, uiLang, app.lang), [safe, app.profile, uiLang, app.lang]);
  const touchesCore = items.some((i) => i.core);
  const decide = async (status: 'approved' | 'declined' | 'revision') => {
    setError(null);
    try {
      if (status === 'approved') {
        board.sync.reason = x.approvedReason(p.title, p.authorName);
        app.replaceProfile(preview.profile);
      }
      await api.setProposalStatus(p.id, status, note.trim() || undefined);
      onBack();
    } catch (e) {
      setError(errorText(s, e));
    }
  };
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={x.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <Header text={p.title} />
      <Note text={`${x.by} ${p.authorName} (${x.roles[p.authorRole]}) · ${when(p.createdAt, uiLang)}`} />
      {p.reason ? <Note text={`${x.why} : ${p.reason}`} /> : null}
      <Section title={x.changes}>
        <ChangeList items={items} profileBefore={app.profile} profileAfter={preview.profile} x={x} />
      </Section>
      {preview.conflicts.length > 0 && <Text style={{ color: C.edit, fontWeight: '700' }}>{x.conflictWarn(preview.conflicts.length)}</Text>}
      {safe.leftOut > 0 && <Note text={x.leftOut(safe.leftOut)} />}
      {touchesCore && <Toggle label={x.coreConfirm} value={coreOk} onChange={setCoreOk} />}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={x.notePlaceholder}
        placeholderTextColor={C.placeholder}
        multiline
        style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 10, minHeight: 60, fontSize: 16, color: C.text }}
      />
      <ErrorLine text={error} />
      <Btn kind="success" icon="check" label={x.approveApply} disabled={touchesCore && !coreOk} onPress={() => decide('approved')} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn icon="pencil" label={x.askRevision} style={{ flex: 1 }} onPress={() => decide('revision')} />
        <Btn kind="danger" icon="x" label={x.decline} style={{ flex: 1 }} onPress={() => decide('declined')} />
      </View>
    </>
  );
}

// ── Family code for professionals ──

function ConnectionCode({ board, x }: { board: BoardCtx; x: SettingsStrings }) {
  const { api } = useSession();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    api.connectionCode(board.profileId).then(setCode).catch(() => {});
  }, [api, board.profileId]);
  if (!code) return null;
  return (
    <Section title={x.connectionCode}>
      <View style={ss.card}>
        <Text style={ss.code} selectable>
          {code}
        </Text>
        <Note text={x.codeNote} />
        <Btn small icon="refresh" label={x.renewCode} onPress={() => api.connectionCode(board.profileId, true).then(setCode).catch(() => {})} />
      </View>
    </Section>
  );
}

// ── History with undo ──

function HistoryList({ board, entries, x, onChanged }: { board: BoardCtx; entries: HistoryEntry[]; x: SettingsStrings; onChanged: () => void }) {
  const app = useApp();
  const { api, uiLang } = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const summary = (e: HistoryEntry) => {
    if (e.summary) return e.summary;
    const items = describeOps(e.ops, app.profile, uiLang, app.lang);
    return items.length > 2 ? `${items[0].text}, ${items[1].text} ${x.more(items.length - 2)}` : items.map((i) => i.text).join(', ');
  };
  const undo = async (e: HistoryEntry) => {
    const { profile, conflicts } = applyOps(app.profile, e.inverse);
    board.sync.reason = x.undoReason(summary(e));
    app.replaceProfile(profile);
    setMsg(conflicts.length ? x.undoPartly : null);
    await api.markUndone(e.id).catch(() => {});
    onChanged();
  };
  return (
    <Section title={x.history}>
      <Note text={x.historyNote} />
      {msg ? <Text style={{ color: C.edit, fontWeight: '600' }}>{msg}</Text> : null}
      {entries.length === 0 && <Note text={x.noHistory} />}
      {entries.slice(0, 30).map((e) => (
        <Row
          key={e.id}
          icon={e.undoneAt ? 'undo' : 'pencil'}
          muted={!!e.undoneAt}
          title={summary(e)}
          sub={`${e.actorName} · ${when(e.createdAt, uiLang)}${e.undoneAt ? ` · ${x.undone}` : ''}`}
          right={!e.undoneAt && board.manager ? <Btn small icon="undo" label={x.undo} onPress={() => undo(e)} /> : undefined}
        />
      ))}
    </Section>
  );
}
