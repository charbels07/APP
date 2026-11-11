/**
 * The professional workspace: Dashboard · My AAC users · Create materials · My library ·
 * Collaborations · Learning center · Account & licence. One professional account, several
 * children, each reachable only after their family agreed, with the rights the family chose.
 * A short optional tour runs the first time (with "Maybe later").
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Invitation, Membership, Notice, ProfileSummary, Proposal, Resource, Verification } from '../../backend/types';
import { APP_NAME, errorText } from '../../i18n/account';
import { dataStrings } from '../../i18n/data';
import { proStrings, type ProSection, type ProStrings } from '../../i18n/pro';
import { settingsStrings } from '../../i18n/settings';
import { preset, type AccessLevel, type CollaboratorRole, type PermissionSet } from '../../lib/permissions';
import { EDITED_ON_BOARD } from '../../lib/resources';
import type { Profile } from '../../model/types';
import type { Overlay } from '../../state/AppState';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, Segmented } from '../common';
import { ArasaacCredit } from '../ArasaacCredit';
import { DataDashboard } from '../data/DataDashboard';
import { Icon, type IconName } from '../Icon';
import { DeleteAccount, MyAccount, Preferences } from '../settings/AccountTab';
import { Note, ss } from '../settings/SettingsScreen';
import { PermissionEditor, Row, when } from '../settings/TeamTab';
import { LangSwitch, Logo } from '../start/StartLayout';
import { C, radius } from '../theme';
import { CreateMaterials, KIND_ICON, Library, ResourceEditor, type Editing } from './Materials';
import { ChildDraftBoard, DemoBoard } from './SandboxBoard';

const SECTIONS: ProSection[] = ['dashboard', 'users', 'create', 'library', 'collab', 'learn', 'account'];
const SECTION_ICON: Record<ProSection, IconName> = {
  dashboard: 'home',
  users: 'users',
  create: 'plus',
  library: 'book',
  collab: 'mail',
  learn: 'star',
  account: 'shield',
};

type Full = { k: 'child'; id: string; resume?: Proposal } | { k: 'demo'; start?: Overlay | 'edit' } | { k: 'editor'; editing: Editing };

export function Workspace({ verification, onVerify }: { verification: Verification | null; onVerify: () => void }) {
  const sess = useSession();
  const { api, uiLang, account, updatePrefs } = sess;
  const p = proStrings(uiLang);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const rtl = uiLang === 'ar';
  const [section, setSection] = useState<ProSection>('dashboard');
  const [user, setUser] = useState<ProfileSummary | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [full, setFull] = useState<Full | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [users, setUsers] = useState<ProfileSummary[]>([]);
  const [invites, setInvites] = useState<{ received: Invitation[]; sent: Invitation[] }>({ received: [], sent: [] });
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [tour, setTour] = useState<'welcome' | number | null>(account?.prefs.tourDone ? null : 'welcome');

  const load = useCallback(async () => {
    const [u, i, pr, n] = await Promise.all([
      api.listProfiles().catch(() => [] as ProfileSummary[]),
      api.myInvitations().catch(() => ({ received: [], sent: [] })),
      api.listProposals({ mine: true }).catch(() => [] as Proposal[]),
      api.listNotices().catch(() => [] as Notice[]),
    ]);
    setUsers(u.filter((x) => x.access !== 'owner'));
    setInvites(i);
    setProposals(pr);
    setNotices(n);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load, full, section]);

  const go = (s_: ProSection) => {
    setSection(s_);
    setUser(null);
    setConnecting(false);
    setEditing(null);
  };
  const endTour = () => {
    setTour(null);
    go('dashboard');
    void updatePrefs({ tourDone: true });
  };

  if (full?.k === 'child') return <ChildDraftBoard profileId={full.id} resume={full.resume} onClose={() => setFull(null)} />;
  if (full?.k === 'demo') return <DemoBoard start={full.start} onClose={() => setFull(null)} />;
  if (full?.k === 'editor') return <ResourceEditor editing={full.editing} onClose={() => setFull(null)} />;
  const edit = (e: Editing) => {
    const kind = 'resource' in e ? e.resource.kind : e.kind;
    if (EDITED_ON_BOARD.includes(kind)) setFull({ k: 'editor', editing: e });
    else {
      setSection('create');
      setEditing(e);
    }
  };

  const pendingProps = proposals.filter((x) => x.status === 'pending' || x.status === 'revision');
  const receivedPending = invites.received.filter((i) => i.status === 'pending');
  const unread = notices.filter((n) => !n.read);
  const verified = verification?.status === 'verified';

  const nav = (
    <View style={[wide ? st.side : st.topNav, rtl && !wide && { flexDirection: 'row-reverse' }]}>
      {wide && (
        <View style={[st.brand, rtl && { flexDirection: 'row-reverse' }]}>
          <Logo size={34} />
          <Text style={st.brandText}>{APP_NAME}</Text>
        </View>
      )}
      <ScrollView horizontal={!wide} contentContainerStyle={wide ? { gap: 4 } : { gap: 4, paddingHorizontal: 8 }} showsHorizontalScrollIndicator={false}>
        {SECTIONS.map((x) => {
          const on = section === x;
          const badge = x === 'collab' ? receivedPending.length + unread.length : 0;
          return (
            <Pressable
              key={x}
              onPress={() => go(x)}
              style={[st.navItem, rtl && { flexDirection: 'row-reverse' }, on && st.navOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.nav[x]}
            >
              <Icon name={SECTION_ICON[x]} size={20} color={on ? '#fff' : C.railText} />
              <Text style={[st.navText, on && { color: '#fff' }]} numberOfLines={1}>
                {p.nav[x]}
              </Text>
              {badge > 0 && (
                <View style={st.badge}>
                  <Text style={st.badgeText}>{badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {wide && (
        <Pressable onPress={() => setTour(0)} style={[st.navItem, rtl && { flexDirection: 'row-reverse' }]} accessibilityRole="button" accessibilityLabel={p.help}>
          <Icon name="help" size={20} color={C.railText} />
          <Text style={st.navText}>{p.help}</Text>
        </Pressable>
      )}
    </View>
  );

  let content: React.ReactNode;
  if (section === 'dashboard') {
    content = (
      <>
        <H text={p.welcomeBack(account?.displayName ?? '')} />
        <Note text={p.todayQ} />
        {!verified && (
          <Pressable onPress={onVerify} style={[ss.row, { borderColor: '#FEC84B', backgroundColor: C.editSoft }]}>
            <Icon name="shield" size={22} color={C.edit} />
            <Text style={[ss.title, { flex: 1, color: C.edit }]}>{p.licencePending}</Text>
          </Pressable>
        )}
        <View style={st.stats}>
          <Stat n={users.length} label={p.connected} onPress={() => go('users')} />
          <Stat n={pendingProps.length} label={p.waitingProps} onPress={() => go('collab')} />
          <Stat n={receivedPending.length} label={p.invitesN} onPress={() => go('collab')} />
        </View>
        <View style={st.quick}>
          <Quick icon="users" label={p.nav.users} onPress={() => go('users')} />
          <Quick icon="plus" label={p.nav.create} onPress={() => go('create')} />
          <Quick icon="book" label={p.nav.library} onPress={() => go('library')} />
          <Quick
            icon="link"
            label={p.connectUser}
            onPress={() => {
              go('users');
              setConnecting(true);
            }}
          />
        </View>
        <Section title={p.recent}>
          {notices.length ? notices.slice(0, 6).map((n) => <Row key={n.id} icon="bell" title={n.text} sub={when(n.createdAt, uiLang)} muted={n.read} />) : <Note text={p.nothingYet} />}
        </Section>
      </>
    );
  } else if (section === 'users') {
    content = connecting ? (
      <ConnectUser
        p={p}
        received={receivedPending}
        onBack={() => {
          setConnecting(false);
          void load();
        }}
      />
    ) : user ? (
      <UserView
        user={user}
        p={p}
        proposals={proposals.filter((x) => x.profileId === user.id)}
        users={users}
        onBack={() => setUser(null)}
        onOpen={(resume) => setFull({ k: 'child', id: user.id, resume })}
        onEdit={edit}
        onChanged={load}
      />
    ) : (
      <UsersList p={p} users={users} sent={invites.sent.filter((i) => i.status === 'pending')} onOpen={setUser} onConnect={() => setConnecting(true)} />
    );
  } else if (section === 'create') {
    content = editing ? (
      <ResourceEditor editing={editing} onClose={() => setEditing(null)} />
    ) : (
      <>
        <H text={p.createTitle} />
        <Tip id="create" p={p} />
        <CreateMaterials users={users} onEdit={edit} />
      </>
    );
  } else if (section === 'library') {
    content = (
      <>
        <H text={p.nav.library} />
        <Tip id="library" p={p} />
        <Library users={users} onEdit={edit} />
      </>
    );
  } else if (section === 'collab') {
    content = (
      <Collaborations
        p={p}
        invites={invites}
        proposals={proposals}
        notices={notices}
        users={users}
        onChanged={load}
        onOpenUser={(u) => {
          go('users');
          setUser(u);
        }}
      />
    );
  } else if (section === 'learn') {
    content = <Learning p={p} onOpen={(start) => setFull({ k: 'demo', start })} />;
  } else {
    content = <ProAccount p={p} verification={verification} users={users.length} onVerify={onVerify} />;
  }

  return (
    <SafeAreaView style={[st.root, { flexDirection: wide ? (rtl ? 'row-reverse' : 'row') : 'column' }]} edges={['top', 'bottom', 'left', 'right']}>
      {nav}
      <View style={{ flex: 1 }}>
        <View style={[st.header, rtl && { flexDirection: 'row-reverse' }]}>
          {!wide && <Btn small kind="ghost" icon="help" label={p.help} onPress={() => setTour(0)} />}
          <View style={{ flex: 1 }} />
          <LangSwitch />
        </View>
        <ScrollView contentContainerStyle={st.main} keyboardShouldPersistTaps="handled">
          <View style={st.mainInner}>{content}</View>
        </ScrollView>
      </View>
      {tour === 'welcome' && (
        <View style={st.modalBack}>
          <View style={st.modal}>
            <Logo size={56} />
            <Text style={[st.modalText, rtl && { textAlign: 'right' }]}>{p.tourWelcome}</Text>
            <Btn kind="primary" icon="play" label={p.tourStart} onPress={() => { go('dashboard'); setTour(0); }} />
            <Btn label={p.tourLater} onPress={endTour} />
          </View>
        </View>
      )}
      {typeof tour === 'number' && (
        <TourCard
          p={p}
          index={tour}
          onSection={go}
          onNext={() => (tour + 1 < SECTIONS.length ? setTour(tour + 1) : endTour())}
          onSkip={endTour}
          rtl={rtl}
        />
      )}
    </SafeAreaView>
  );
}

function H({ text }: { text: string }) {
  const { uiLang } = useSession();
  return <Text style={[st.h, uiLang === 'ar' && { textAlign: 'right' }]}>{text}</Text>;
}

function Stat({ n, label, onPress }: { n: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.stat} accessibilityRole="button" accessibilityLabel={`${n} ${label}`}>
      <Text style={st.statN}>{n}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </Pressable>
  );
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.quickBtn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={st.quickIcon}>
        <Icon name={icon} size={26} color={C.accent} />
      </View>
      <Text style={st.quickText}>{label}</Text>
    </Pressable>
  );
}

/** A tip shown once per section. */
function Tip({ id, p }: { id: string; p: ProStrings }) {
  const { account, updatePrefs } = useSession();
  const seen = account?.prefs.tipsSeen ?? [];
  if (seen.includes(id) || !p.tips[id]) return null;
  return (
    <View style={[ss.row, { backgroundColor: C.accentSoft, borderColor: '#A4C2FF' }]}>
      <Icon name="sparkles" size={20} color={C.accent} />
      <Text style={[ss.title, { flex: 1, fontWeight: '600', fontSize: 15, color: C.accent }]}>{p.tips[id]}</Text>
      <Btn small label={p.gotIt} onPress={() => void updatePrefs({ tipsSeen: [...seen, id] })} />
    </View>
  );
}

function TourCard({ p, index, onSection, onNext, onSkip, rtl }: { p: ProStrings; index: number; onSection: (s: ProSection) => void; onNext: () => void; onSkip: () => void; rtl: boolean }) {
  const sec = SECTIONS[index];
  useEffect(() => onSection(sec), [sec]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = index === SECTIONS.length - 1;
  return (
    <View style={st.tour} accessibilityRole="alert">
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
        <Icon name={SECTION_ICON[sec]} size={22} color={C.accent} />
        <Text style={[ss.title, { flex: 1 }]}>{p.nav[sec]}</Text>
        <Text style={{ color: C.textMuted, fontWeight: '700' }}>{`${index + 1} / ${SECTIONS.length}`}</Text>
      </View>
      <Text style={[{ fontSize: 16, color: C.text, lineHeight: 22 }, rtl && { textAlign: 'right' }]}>{p.tourSteps[sec]}</Text>
      <View style={[{ flexDirection: 'row', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
        <Btn small label={p.tourSkip} onPress={onSkip} />
        <Btn small kind="primary" label={last ? p.tourDone : p.tourNext} onPress={onNext} />
      </View>
    </View>
  );
}

// ── My AAC users ──

function UsersList({
  p,
  users,
  sent,
  onOpen,
  onConnect,
}: {
  p: ProStrings;
  users: ProfileSummary[];
  sent: Invitation[];
  onOpen: (u: ProfileSummary) => void;
  onConnect: () => void;
}) {
  const { uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [q, setQ] = useState('');
  const match = (name: string) => !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
  return (
    <>
      <H text={p.nav.users} />
      <Tip id="users" p={p} />
      <Btn kind="primary" icon="link" label={p.connectUser} onPress={onConnect} />
      <Segmented<'all' | 'active' | 'pending'>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: p.usersAll },
          { value: 'active', label: p.usersActive },
          { value: 'pending', label: p.usersPending },
        ]}
      />
      <TextInput value={q} onChangeText={setQ} placeholder={p.search} placeholderTextColor="#98A2B3" style={st.input} accessibilityLabel={p.search} />
      {filter !== 'pending' &&
        users
          .filter((u) => match(u.name))
          .map((u) => (
            <Row
              key={u.id}
              icon="user"
              title={u.name}
              sub={[u.age ? p.ageYears(u.age) : '', u.access !== 'owner' ? x.roles[u.access] : '', p.levelShort[u.level]].filter(Boolean).join(' · ')}
              onPress={() => onOpen(u)}
            />
          ))}
      {filter !== 'active' &&
        sent
          .filter((i) => match(i.childName))
          .map((i) => <Row key={i.id} icon="mail" muted title={i.childName} sub={`${p.pendingReq} · ${when(i.createdAt, uiLang)}`} />)}
      {users.length === 0 && sent.length === 0 && <Note text={p.noUsers} />}
    </>
  );
}

function ConnectUser({ p, received, onBack }: { p: ProStrings; received: Invitation[]; onBack: () => void }) {
  const { api, uiLang, s } = useSession();
  const x = settingsStrings(uiLang);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [v, setV] = useState<{ role: CollaboratorRole; level: AccessLevel; perms: PermissionSet }>({ role: 'therapist', ...preset('therapist') });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={p.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <H text={p.connectTitle} />
      {received.length > 0 && (
        <Section title={p.received}>
          {received.map((i) => (
            <View key={i.id} style={ss.card}>
              <Text style={ss.title}>{`${i.fromName} → ${i.childName}`}</Text>
              <Note text={`${x.roles[i.role]} · ${x.levels[i.level]} — ${x.levelNotes[i.level]}`} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small label={x.decline} onPress={() => api.respondInvitation(i.id, false).then(onBack).catch(() => {})} />
                <Btn small kind="primary" label={x.approve} onPress={() => api.respondInvitation(i.id, true).then(onBack).catch(() => {})} />
              </View>
            </View>
          ))}
        </Section>
      )}
      <Note text={p.connectIntro} />
      <Field label={p.familyCode} value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} />
      <PermissionEditor x={x} {...v} onChange={setV} />
      <Field label={p.message} value={message} onChangeText={setMessage} />
      {msg ? <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '600' }}>{msg.text}</Text> : null}
      <Btn
        kind="primary"
        icon="mail"
        label={p.sendRequest}
        disabled={code.trim().length < 6}
        onPress={async () => {
          setMsg(null);
          try {
            await api.requestConnection(code.trim(), { ...v, message: message.trim() || undefined });
            setMsg({ ok: true, text: p.requestSent });
            setCode('');
          } catch (e) {
            setMsg({ ok: false, text: errorText(s, e) });
          }
        }}
      />
    </>
  );
}

function UserView({
  user,
  p,
  proposals,
  users,
  onBack,
  onOpen,
  onEdit,
  onChanged,
}: {
  user: ProfileSummary;
  p: ProStrings;
  proposals: Proposal[];
  users: ProfileSummary[];
  onBack: () => void;
  onOpen: (resume?: Proposal) => void;
  onEdit: (e: Editing) => void;
  onChanged: () => void;
}) {
  const { api, uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const d = dataStrings(uiLang);
  const [team, setTeam] = useState<Membership[]>([]);
  // The child's communication data (only if the family allowed it: "See the progress data").
  const [data, setData] = useState<Profile | 'loading' | 'offline' | null>(null);
  useEffect(() => {
    api.listMembers(user.id).then((m) => setTeam(m.filter((y) => y.status === 'active' && y.role !== 'device'))).catch(() => {});
  }, [api, user.id]);
  if (data && typeof data === 'object') {
    return (
      <>
        <Btn small kind="ghost" icon="chevronLeft" label={p.back} onPress={() => setData(null)} style={{ alignSelf: 'flex-start' }} />
        <H text={`${d.title} · ${user.name}`} />
        <DataDashboard profileId={user.id} childName={user.name} profile={data} manager={false} />
      </>
    );
  }
  return (
    <>
      <Btn small kind="ghost" icon="chevronLeft" label={p.back} onPress={onBack} style={{ alignSelf: 'flex-start' }} />
      <H text={user.name} />
      <Note text={`${p.yourLevel} : ${user.access !== 'owner' ? x.roles[user.access] : ''} · ${user.level} · ${x.levels[user.level]} — ${x.levelNotes[user.level]}`} />
      <Note text={p.noPrivate} />
      <View style={ss.card}>
        <Text style={ss.title}>{p.openBoard}</Text>
        <Note text={p.openBoardNote} />
        <Btn kind="primary" icon="grid" label={p.openBoard} onPress={() => onOpen()} />
      </View>
      <View style={ss.card}>
        <Text style={ss.title}>{d.title}</Text>
        <Note text={data === 'offline' ? d.offline : p.dataNote} />
        <Btn
          icon="list"
          label={data === 'loading' ? d.loading : p.openData}
          disabled={data === 'loading'}
          onPress={() => {
            setData('loading');
            api.getProfile(user.id).then((r) => setData(r.data)).catch(() => setData('offline'));
          }}
        />
      </View>
      <Section title={p.myProposals}>
        {proposals.length ? (
          proposals.map((pr) => (
            <View key={pr.id} style={{ gap: 6 }}>
              <Row
                icon={pr.status === 'approved' ? 'check' : pr.status === 'declined' ? 'x' : 'sparkles'}
                title={pr.title}
                sub={`${p.propStatus[pr.status]} · ${when(pr.decidedAt ?? pr.createdAt, uiLang)}${pr.decisionNote ? ` · « ${pr.decisionNote} »` : ''}`}
                muted={pr.status === 'withdrawn' || pr.status === 'declined'}
              />
              {(pr.status === 'revision' || pr.status === 'pending') && (
                <View style={{ flexDirection: 'row', gap: 6, marginLeft: 12 }}>
                  {pr.status === 'revision' && <Btn small icon="pencil" label={p.resume} onPress={() => onOpen(pr)} />}
                  <Btn small kind="ghost" label={p.withdraw} onPress={() => api.setProposalStatus(pr.id, 'withdrawn').then(onChanged).catch(() => {})} />
                </View>
              )}
            </View>
          ))
        ) : (
          <Note text={p.nothingYet} />
        )}
      </Section>
      <Section title={p.materialsFor}>
        <Library users={users} onEdit={onEdit} onlyUser={user.id} />
        <Btn small icon="plus" label={p.createTitle} onPress={() => onEdit({ kind: 'tla', title: p.untitled, profileId: user.id })} />
      </Section>
      <Section title={p.team}>
        <Row icon="heart" title={x.ownerRole} />
        {team.map((m) => (
          <Row key={m.userId} icon="user" title={m.displayName} sub={`${x.roles[m.role]} · ${x.levels[m.level]}`} />
        ))}
      </Section>
    </>
  );
}

// ── Collaborations ──

function Collaborations({
  p,
  invites,
  proposals,
  notices,
  users,
  onChanged,
  onOpenUser,
}: {
  p: ProStrings;
  invites: { received: Invitation[]; sent: Invitation[] };
  proposals: Proposal[];
  notices: Notice[];
  users: ProfileSummary[];
  onChanged: () => void;
  onOpenUser: (u: ProfileSummary) => void;
}) {
  const { api, uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const received = invites.received.filter((i) => i.status === 'pending');
  const unread = notices.filter((n) => !n.read);
  return (
    <>
      <H text={p.nav.collab} />
      <Section title={p.received}>
        {received.length ? (
          received.map((i) => (
            <View key={i.id} style={ss.card}>
              <Text style={ss.title}>{`${i.fromName} → ${i.childName}`}</Text>
              <Note text={`${x.roles[i.role]} · ${x.levels[i.level]}`} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small label={x.decline} onPress={() => api.respondInvitation(i.id, false).then(onChanged).catch(() => {})} />
                <Btn small kind="primary" label={x.approve} onPress={() => api.respondInvitation(i.id, true).then(onChanged).catch(() => {})} />
              </View>
            </View>
          ))
        ) : (
          <Note text={p.nothingYet} />
        )}
      </Section>
      <Section title={p.collabConnections}>
        {users.length ? users.map((u) => <Row key={u.id} icon="user" title={u.name} sub={`${u.access !== 'owner' ? x.roles[u.access] : ''} · ${x.levels[u.level]}`} onPress={() => onOpenUser(u)} />) : <Note text={p.noUsers} />}
      </Section>
      <Section title={p.collabSent}>
        {invites.sent.length ? (
          invites.sent.map((i) => <Row key={i.id} icon="mail" title={i.childName} sub={`${p.propStatus[i.status === 'accepted' ? 'approved' : i.status === 'cancelled' ? 'withdrawn' : i.status] ?? i.status} · ${when(i.createdAt, uiLang)}`} muted={i.status !== 'pending'} />)
        ) : (
          <Note text={p.nothingYet} />
        )}
      </Section>
      <Section title={p.myProposals}>
        {proposals.length ? (
          proposals.map((pr) => (
            <Row key={pr.id} icon="sparkles" title={`${pr.title} · ${pr.childName}`} sub={`${p.propStatus[pr.status]}${pr.decisionNote ? ` · « ${pr.decisionNote} »` : ''}`} muted={pr.status !== 'pending' && pr.status !== 'revision'} />
          ))
        ) : (
          <Note text={p.nothingYet} />
        )}
      </Section>
      <Section title={p.collabShared}>
        <SharedList p={p} />
      </Section>
      <Section title={p.collabActivity}>
        {notices.length ? notices.slice(0, 15).map((n) => <Row key={n.id} icon="bell" title={n.text} sub={when(n.createdAt, uiLang)} muted={n.read} />) : <Note text={p.nothingYet} />}
        {unread.length > 0 && <Btn small kind="ghost" icon="check" label={x.markRead} onPress={() => api.markNoticesRead(unread.map((n) => n.id)).then(onChanged).catch(() => {})} />}
      </Section>
    </>
  );
}

function SharedList({ p }: { p: ProStrings }) {
  const { api } = useSession();
  const [lib, setLib] = useState<{ mine: Resource[]; shared: Resource[] }>({ mine: [], shared: [] });
  useEffect(() => {
    api
      .listResources()
      .then((r) => setLib({ mine: r.mine.filter((x) => x.shares.length), shared: r.sharedWithMe }))
      .catch(() => {});
  }, [api]);
  return (
    <>
      {lib.shared.map((r) => (
        <Row key={r.id} icon={KIND_ICON[r.kind]} title={r.title} sub={p.sharedBy(r.ownerName)} />
      ))}
      {lib.mine.map((r) => (
        <Row key={r.id} icon={KIND_ICON[r.kind]} title={r.title} sub={`${p.share} · ${r.shares.length}`} />
      ))}
      {!lib.mine.length && !lib.shared.length && <Note text={p.libEmpty} />}
    </>
  );
}

// ── Learning center ──

function Learning({ p, onOpen }: { p: ProStrings; onOpen: (start?: Overlay | 'edit') => void }) {
  const { uiLang } = useSession();
  const items: { id: string; icon: IconName; start?: Overlay | 'edit' }[] = [
    { id: 'demo', icon: 'grid' },
    { id: 'showMe', icon: 'search', start: { kind: 'search' } },
    { id: 'guide', icon: 'book', start: { kind: 'guide' } },
    { id: 'modelling', icon: 'pointer', start: { kind: 'model' } },
    { id: 'tla', icon: 'plus', start: { kind: 'newTla' } },
    { id: 'access', icon: 'settings', start: 'edit' },
    { id: 'languages', icon: 'globe', start: { kind: 'lang' } },
  ];
  return (
    <>
      <H text={p.nav.learn} />
      <Note text={p.learnIntro} />
      {items.map((it) => (
        <Row key={it.id} icon={it.icon} title={p.learnItems[it.id]} sub={p.learnNotes[it.id]} onPress={() => onOpen(it.start)} />
      ))}
      <ArasaacCredit lang={uiLang} />
    </>
  );
}

// ── Account & licence ──

function ProAccount({ p, verification, users, onVerify }: { p: ProStrings; verification: Verification | null; users: number; onVerify: () => void }) {
  const { uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const status = verification?.status ?? 'draft';
  const docs = useMemo(() => verification?.documents ?? [], [verification]);
  return (
    <>
      <H text={p.nav.account} />
      <Section title={p.licence}>
        <View style={ss.card}>
          <Text style={[ss.title, { color: status === 'verified' ? C.success : C.edit }]}>{status === 'verified' ? p.licenceVerified : p.licencePending}</Text>
          <Note text={`${p.status[status]} · ${p.connections(users)}`} />
          {verification && <Note text={`${verification.fullName} · ${p.professions[verification.profession] ?? verification.profession} · ${verification.country}`} />}
        </View>
      </Section>
      <Section title={p.credentials}>
        {docs.map((d) => (
          <Row key={d.ref} icon="check" title={d.name} sub={p.docKinds[d.kind]} />
        ))}
        <Btn small icon="shield" label={status === 'draft' || status === 'more_info' ? p.editRequest : p.s4Title} onPress={onVerify} />
      </Section>
      <MyAccount x={x} />
      <Preferences x={x} />
      <Section title={x.subscription}>
        <Note text={x.subscriptionLater} />
      </Section>
      <DeleteAccount x={x} />
      <ArasaacCredit lang={uiLang} />
    </>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  side: { width: 250, backgroundColor: C.rail, padding: 14, gap: 16, justifyContent: 'space-between' },
  topNav: { backgroundColor: C.rail, paddingVertical: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, minHeight: 46, borderRadius: radius.md },
  navOn: { backgroundColor: C.railActive },
  navText: { color: C.railText, fontSize: 15, fontWeight: '700' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.help, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, minHeight: 52 },
  main: { padding: 16, paddingTop: 4 },
  mainInner: { width: '100%', maxWidth: 820, alignSelf: 'center', gap: 14 },
  h: { fontSize: 26, fontWeight: '800', color: C.text },
  stats: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 150, padding: 14, borderRadius: radius.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  statN: { fontSize: 32, fontWeight: '800', color: C.accent },
  statLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  quick: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  quickBtn: { flex: 1, minWidth: 150, alignItems: 'center', gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  quickIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },
  input: { borderWidth: 1.5, borderColor: C.border, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 46, fontSize: 16, color: C.text, backgroundColor: C.surface },
  modalBack: { ...StyleSheet.absoluteFill, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 460, backgroundColor: C.surface, borderRadius: radius.lg, padding: 24, gap: 12, alignItems: 'stretch' },
  modalText: { fontSize: 18, lineHeight: 26, color: C.text, fontWeight: '600' },
  tour: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: '92%',
    maxWidth: 520,
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: C.accent,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
});
