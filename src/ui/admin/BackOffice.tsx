/**
 * Back office: the app's own team (the accounts listed in the server's "admins" table).
 *  - Certificates: look at what a professional sent, accept (she can start working), ask for
 *    something more or refuse;
 *  - Overview and Use of the app: figures that help improve the app (counts only; what comes from
 *    the children only for the families who share anonymous statistics);
 *  - Messages written from the app, and the history of what the team did here.
 * The server refuses every request of this page to anybody else: hiding the page is not the lock.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AdminLogEntry, AdminOverview, AdminVerification, Feedback, VerificationDoc } from '../../backend/types';
import { DIALECT_ORDER, dialectName } from '../../data/dialects';
import { errorText } from '../../i18n/account';
import { adminStrings, type AdminStrings } from '../../i18n/admin';
import { dataStrings } from '../../i18n/data';
import { proStrings, type ProStrings } from '../../i18n/pro';
import { settingsStrings } from '../../i18n/settings';
import { UI_LANG_NAMES } from '../../i18n/ui';
import type { ArabicDialect, UiLang } from '../../model/types';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, useNavRtl } from '../common';
import { BarList, ChartCard, ColumnChart, DataTable, SplitBar, StatGrid, StatTile, compact, type BarItem } from '../data/Charts';
import { Icon, type IconName } from '../Icon';
import { Note, ss } from '../settings/SettingsScreen';
import { Row, day, when } from '../settings/TeamTab';
import { ErrorText, LangSwitch, Logo } from '../start/StartLayout';
import { C, radius } from '../theme';

type Tab = 'requests' | 'numbers' | 'usage' | 'messages' | 'log';
const TABS: Tab[] = ['requests', 'numbers', 'usage', 'messages', 'log'];
const TAB_ICON: Record<Tab, IconName> = { requests: 'shield', numbers: 'grid', usage: 'target', messages: 'mail', log: 'list' };

type Counts = Record<string, number>;
/** Counts → bars, the largest first, with a readable name for each key. */
const bars = (counts: Counts | undefined, name: (k: string) => string, order?: string[]): BarItem[] => {
  const keys = Object.keys(counts ?? {});
  const sorted = order ? [...order.filter((k) => keys.includes(k)), ...keys.filter((k) => !order.includes(k))] : keys.sort((a, b) => counts![b] - counts![a]);
  return sorted.map((k) => ({ key: k, label: name(k), value: counts![k] }));
};
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
/** Keeps "356 · 86 %" in this order inside Arabic pages too. */
const LTR = '\u200E';
const isPicture = (d: VerificationDoc, url: string) => url.startsWith('data:image') || /\.(jpe?g|png|webp|gif|heic|bmp|svg)$/i.test(d.name);

export function BackOffice() {
  const { api, uiLang, s, enter, signOut, account } = useSession();
  const a = adminStrings(uiLang);
  const p = proStrings(uiLang);
  const rtl = useNavRtl();
  const [tab, setTab] = useState<Tab>('requests');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [requests, setRequests] = useState<AdminVerification[] | null>(null);
  const [messages, setMessages] = useState<Feedback[]>([]);
  const [log, setLog] = useState<AdminLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [r, o, m, l] = await Promise.all([api.adminVerifications(), api.adminOverview(), api.adminFeedback(), api.adminLog()]);
      setRequests(r);
      setOverview(o);
      setMessages(m);
      setLog(l);
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  }, [api, s]);
  useEffect(() => {
    void load();
  }, [load]);

  const waiting = (requests ?? []).filter((r) => r.status === 'pending').length;
  const unread = messages.filter((m) => m.status === 'new').length;
  const badge: Partial<Record<Tab, number>> = { requests: waiting, messages: unread };

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[st.header, rtl && st.rev]}>
        <Logo size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.h, rtl && ss.rtl]} accessibilityRole="header" numberOfLines={1}>
            {a.title}
          </Text>
          <Text style={[ss.sub, rtl && ss.rtl]} numberOfLines={1}>
            {account?.displayName || account?.email || a.subtitle}
          </Text>
        </View>
      </View>
      <View style={[st.tools, rtl && st.rev]}>
        <Btn small icon="refresh" label={a.refresh} onPress={() => void load()} disabled={busy} />
        <View style={{ flex: 1 }} />
        <LangSwitch />
        <Btn small icon="home" label={a.openApp} onPress={() => void enter({ app: true })} />
        <Btn small kind="ghost" icon="logout" label={s.signOut} onPress={() => void signOut()} />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[st.tabs, rtl && st.rev]}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, rtl && st.rev, on && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={a.tabs[t]}>
                <Icon name={TAB_ICON[t]} size={18} color={on ? '#fff' : C.text} />
                <Text style={[st.tabText, on && { color: '#fff' }]}>{a.tabs[t]}</Text>
                {badge[t] ? (
                  <View style={st.badge}>
                    <Text style={st.badgeText}>{badge[t]}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {/* Each page starts at its top. */}
      <ScrollView key={tab} contentContainerStyle={st.main} keyboardShouldPersistTaps="handled">
        <View style={st.inner}>
          {overview?.example && (
            <View style={[st.demo, rtl && st.rev]}>
              <Icon name="eye" size={20} color={C.edit} />
              <Text style={[st.demoText, rtl && ss.rtl]}>{a.demoBanner}</Text>
            </View>
          )}
          <ErrorText text={error} />
          {!requests && !error ? (
            <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
          ) : tab === 'requests' ? (
            <Requests a={a} p={p} list={requests ?? []} onChanged={load} />
          ) : tab === 'numbers' ? (
            overview && <Numbers a={a} p={p} o={overview} />
          ) : tab === 'usage' ? (
            overview && <Usage a={a} o={overview} />
          ) : tab === 'messages' ? (
            <Messages a={a} list={messages} onChanged={load} />
          ) : (
            <History a={a} list={log} />
          )}
          {overview && <Note text={a.updated(when(Date.parse(overview.at), uiLang))} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────────────────────── Certificates ─────────────────────────

const STATUS_COLOR: Record<string, string> = { pending: C.edit, verified: C.success, more_info: C.edit, rejected: C.help, draft: C.textMuted };

function StatusChip({ status, p }: { status: AdminVerification['status']; p: ProStrings }) {
  return (
    <View style={[ss.chip, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: STATUS_COLOR[status] }]}>
      <Text style={[ss.chipText, { color: STATUS_COLOR[status] }]}>{p.status[status]}</Text>
    </View>
  );
}

function Requests({ a, p, list, onChanged }: { a: AdminStrings; p: ProStrings; list: AdminVerification[]; onChanged: () => Promise<void> }) {
  const { uiLang } = useSession();
  const rtl = useNavRtl();
  const [filter, setFilter] = useState<'waiting' | 'all'>('waiting');
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const waiting = list.filter((r) => r.status === 'pending');
  const shown = filter === 'waiting' ? waiting : list;
  const current = list.find((r) => r.userId === open);
  if (current)
    return (
      <RequestView
        a={a}
        p={p}
        r={current}
        onBack={() => setOpen(null)}
        onDecided={async (text) => {
          await onChanged();
          setFlash(text);
          setOpen(null);
        }}
      />
    );
  return (
    <>
      <View style={[st.filters, rtl && st.rev]}>
        {(['waiting', 'all'] as const).map((f) => (
          <Btn key={f} small kind={filter === f ? 'primary' : 'secondary'} label={`${f === 'waiting' ? a.waiting : a.all} (${f === 'waiting' ? waiting.length : list.length})`} onPress={() => setFilter(f)} />
        ))}
      </View>
      {flash && (
        <View style={[st.flash, rtl && st.rev]}>
          <Icon name="check" size={20} color={C.success} />
          <Text style={[st.flashText, rtl && ss.rtl]}>{flash}</Text>
        </View>
      )}
      {shown.length === 0 && <Note text={filter === 'waiting' ? a.noneWaiting : a.noRequests} />}
      {shown.map((r) => (
        <Row
          key={r.userId}
          icon="shield"
          title={r.fullName}
          sub={`${p.professions[r.profession] ?? r.profession} · ${r.country}${r.submittedAt ? ` · ${a.sent(when(r.submittedAt, uiLang))}` : ''}`}
          right={<StatusChip status={r.status} p={p} />}
          onPress={() => {
            setFlash(null);
            setOpen(r.userId);
          }}
        />
      ))}
    </>
  );
}

function RequestView({ a, p, r, onBack, onDecided }: { a: AdminStrings; p: ProStrings; r: AdminVerification; onBack: () => void; onDecided: (text: string) => Promise<void> }) {
  const { api, uiLang, s } = useSession();
  const rtl = useNavRtl();
  const [mode, setMode] = useState<'more_info' | 'rejected' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ doc: VerificationDoc; url: string } | null>(null);

  const decide = async (status: 'verified' | 'more_info' | 'rejected') => {
    if (status !== 'verified' && !note.trim()) return setError(a.noteRequired);
    setBusy(true);
    setError(null);
    try {
      await api.adminDecideVerification(r.userId, status, status === 'verified' ? undefined : note.trim());
      await onDecided(a.done[status]);
    } catch (e) {
      setError(errorText(s, e));
      setBusy(false);
    }
  };
  const look = async (doc: VerificationDoc) => {
    setError(null);
    try {
      setViewer({ doc, url: await api.adminDocumentUrl(r.userId, doc.ref) });
    } catch (e) {
      setError(errorText(s, e));
    }
  };
  const lines: [string, string | undefined][] = [
    [a.profession, p.professions[r.profession] ?? r.profession],
    [a.country, r.country],
    [a.organization, r.organization],
    [a.email, r.email],
    [a.phone, r.phone],
    [a.accountSince, r.accountCreatedAt ? day(r.accountCreatedAt, uiLang) : undefined],
  ];
  const hasId = r.documents.some((d) => d.kind === 'id');

  return (
    <>
      <View style={[st.filters, rtl && st.rev]}>
        <Btn small icon={rtl ? 'chevronRight' : 'chevronLeft'} label={a.back} onPress={onBack} />
      </View>
      <View style={ss.card}>
        <View style={[st.line, rtl && st.rev]}>
          <Text style={[st.name, rtl && ss.rtl]}>{r.fullName}</Text>
          <StatusChip status={r.status} p={p} />
        </View>
        {lines.map(([k, v]) =>
          v ? (
            <View key={k} style={[st.line, rtl && st.rev]}>
              <Text style={st.key}>{k}</Text>
              <Text style={[st.val, rtl && ss.rtl]} selectable>
                {v}
              </Text>
            </View>
          ) : null,
        )}
        <Note text={[a.follows(r.children), r.submittedAt ? a.sent(when(r.submittedAt, uiLang)) : '', r.decidedAt ? a.decidedOn(when(r.decidedAt, uiLang)) : ''].filter(Boolean).join(' · ')} />
        {r.note ? <Note text={`${a.lastNote} : ${r.note}`} /> : null}
      </View>

      <Section title={a.documents}>
        {r.documents.length === 0 && <Note text={a.noDocuments} />}
        {r.documents.map((d) => (
          <Row key={d.ref} icon="image" title={p.docKinds[d.kind] ?? d.kind} sub={d.name} right={<Btn small icon="eye" label={a.look} onPress={() => void look(d)} />} />
        ))}
        <Note text={hasId ? `${a.openNote} ${a.idNote}` : a.openNote} />
      </Section>

      {viewer && (
        <View style={st.viewer}>
          <View style={[st.line, rtl && st.rev]}>
            <Text style={[ss.title, { flex: 1 }, rtl && ss.rtl]}>
              {p.docKinds[viewer.doc.kind] ?? viewer.doc.kind} · {viewer.doc.name}
            </Text>
            <Btn small icon="x" label={a.close} onPress={() => setViewer(null)} />
          </View>
          {isPicture(viewer.doc, viewer.url) ? (
            <Image source={{ uri: viewer.url }} style={st.picture} resizeMode="contain" accessibilityLabel={viewer.doc.name} />
          ) : (
            <Note text={a.notPicture} />
          )}
          {!viewer.url.startsWith('data:') && <Btn small icon="external" label={a.openTab} onPress={() => void Linking.openURL(viewer.url).catch(() => {})} />}
        </View>
      )}

      <Section title={a.decision}>
        <ErrorText text={error} />
        {mode ? (
          <>
            {mode === 'rejected' && r.status === 'verified' && <Note text={a.withdrawNote} />}
            <Field label={a.noteLabel} value={note} onChangeText={setNote} placeholder={mode === 'more_info' ? a.noteMore : a.noteRefuse} multiline autoFocus />
            <View style={[st.actions, rtl && st.rev]}>
              <Btn kind={mode === 'rejected' ? 'danger' : 'primary'} label={`${mode === 'more_info' ? a.askMore : r.status === 'verified' ? a.withdraw : a.refuse} · ${a.send}`} onPress={() => void decide(mode)} disabled={busy} />
              <Btn label={a.cancel} onPress={() => { setMode(null); setError(null); }} disabled={busy} />
            </View>
          </>
        ) : (
          <>
            {r.status !== 'verified' && (
              <>
                <Btn kind="success" icon="check" label={a.accept} onPress={() => void decide('verified')} disabled={busy} />
                <Note text={a.acceptNote(r.fullName)} />
              </>
            )}
            <View style={[st.actions, rtl && st.rev]}>
              {r.status !== 'verified' && <Btn icon="mail" label={a.askMore} onPress={() => setMode('more_info')} disabled={busy} />}
              {r.status !== 'rejected' && <Btn kind="danger" icon="x" label={r.status === 'verified' ? a.withdraw : a.refuse} onPress={() => setMode('rejected')} disabled={busy} />}
            </View>
          </>
        )}
      </Section>
    </>
  );
}

// ───────────────────────── Overview ─────────────────────────

function Numbers({ a, p, o }: { a: AdminStrings; p: ProStrings; o: AdminOverview }) {
  const { uiLang } = useSession();
  const x = settingsStrings(uiLang);
  const d = dataStrings(uiLang);
  const f = o.families;
  const weekLabel = (w: string) => day(Date.parse(w), uiLang);
  const unknown = (k: string) => (k === '?' ? a.unknown : k);
  const recording = Object.entries(f.collection).reduce((n, [k, v]) => (k === 'off' ? n : n + v), 0);
  const steps: BarItem[] = [
    { key: 'parents', label: a.steps.parents, value: f.parents },
    { key: 'withChild', label: a.steps.withChild, value: f.withChild },
    { key: 'withTablet', label: a.steps.withTablet, value: f.withTablet },
    { key: 'used30', label: a.steps.used30, value: f.used30 },
    { key: 'used7', label: a.steps.used7, value: f.used7 },
    { key: 'withTeam', label: a.steps.withTeam, value: f.withTeam },
    { key: 'recording', label: a.steps.recording, value: recording },
    { key: 'sharing', label: a.steps.sharing, value: f.sharing },
  ].map((i) => ({ ...i, valueText: `${LTR}${compact(i.value)} · ${pct(i.value, f.parents)} %` }));
  return (
    <>
      <StatGrid>
        <StatTile label={a.families} value={compact(f.parents)} sub={a.plusWeek(o.accounts.new7)} />
        <StatTile label={a.children} value={compact(f.children)} />
        <StatTile label={a.prosAccepted} value={compact(o.pros.status.verified ?? 0)} sub={a.waitingNow(o.pros.status.pending ?? 0)} />
        <StatTile label={a.devicesWeek} value={compact(o.devices.seen7)} sub={a.ofTotal(o.devices.total)} />
      </StatGrid>

      <ChartCard title={a.signups} note={a.signupsNote}>
        <ColumnChart columns={o.accounts.weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: w.parents + w.pros }))} unit={a.accountsUnit} />
        <DataTable head={[a.week, a.parents, a.pros]} rows={o.accounts.weeks.slice(-4).map((w) => [weekLabel(w.week), w.parents, w.pros])} />
        {o.accounts.unconfirmed > 0 && <Note text={a.unconfirmed(o.accounts.unconfirmed)} />}
      </ChartCard>

      <ChartCard title={a.funnel} note={a.funnelNote}>
        <BarList items={steps} max={Math.max(1, f.parents)} labelWidth="50%" />
      </ChartCard>

      <ChartCard title={a.consent} note={a.sharingLine(f.sharing, f.children)}>
        <BarList items={bars(f.collection, (k) => d.levels[k as keyof typeof d.levels] ?? k, ['off', 'usage', 'vocabulary', 'language'])} />
      </ChartCard>

      <ChartCard title={a.devices} note={o.devices.waiting > 0 ? a.waitingSync(o.devices.waiting) : undefined}>
        <Text style={st.sub}>{a.system}</Text>
        <BarList items={bars(o.devices.platforms, (k) => ({ ios: 'iPad / iPhone', android: 'Android', web: 'Web' })[k] ?? unknown(k))} />
        <Text style={st.sub}>{a.versions}</Text>
        <BarList items={bars(o.devices.versions, unknown)} />
        <Note text={a.versionsNote} />
      </ChartCard>

      <ChartCard title={a.menuLanguages}>
        <BarList items={bars(o.accounts.languages, (k) => UI_LANG_NAMES[k as UiLang] ?? unknown(k))} />
      </ChartCard>

      <ChartCard
        title={a.prosTitle}
        note={[a.working(o.pros.working, o.pros.childrenFollowed), o.pros.hoursToDecide != null ? a.decideTime(o.pros.hoursToDecide) : '', o.pros.oldestWaitingDays != null ? a.oldest(o.pros.oldestWaitingDays) : '']
          .filter(Boolean)
          .join(' ')}
      >
        <Text style={st.sub}>{a.byStatus}</Text>
        <BarList items={bars(o.pros.status, (k) => p.status[k as keyof typeof p.status] ?? k, ['pending', 'more_info', 'verified', 'rejected', 'draft'])} />
        <Text style={st.sub}>{a.byProfession}</Text>
        <BarList items={bars(o.pros.professions, (k) => p.professions[k] ?? k)} />
        <Text style={st.sub}>{a.byCountry}</Text>
        <BarList items={bars(o.pros.countries, (k) => k)} />
      </ChartCard>

      <ChartCard title={a.teamwork} note={a.teamLines(o.teamwork.shares, o.teamwork.observations, o.teamwork.changes30)}>
        <Text style={st.sub}>{a.teamMembers}</Text>
        <BarList items={bars(o.teamwork.members, (k) => x.roles[k as keyof typeof x.roles] ?? k)} />
        <Text style={st.sub}>{a.invitations}</Text>
        <BarList items={bars(o.teamwork.invitations, (k) => a.invStatus[k] ?? k)} />
        <Text style={st.sub}>{a.requests}</Text>
        <BarList items={bars(o.teamwork.requests, (k) => a.invStatus[k] ?? k)} />
        <Text style={st.sub}>{a.proposals}</Text>
        <BarList items={bars(o.teamwork.proposals, (k) => a.propStatus[k] ?? k)} />
        <Text style={st.sub}>{a.materials}</Text>
        <BarList items={bars(o.teamwork.materials, (k) => p.kinds[k as keyof typeof p.kinds] ?? k)} />
      </ChartCard>

      <ChartCard title={a.ai} note={a.aiNote(o.ai.calls30, o.ai.users30, o.ai.mostPerPersonDay)}>
        {o.ai.days.length > 0 && <ColumnChart columns={o.ai.days.map((x2) => ({ key: x2.day, label: day(Date.parse(x2.day), uiLang), value: x2.calls }))} unit={a.aiUnit} height={110} />}
      </ChartCard>
    </>
  );
}

// ───────────────────────── Use of the app (anonymous) ─────────────────────────

function Usage({ a, o }: { a: AdminStrings; o: AdminOverview }) {
  const { uiLang } = useSession();
  const d = dataStrings(uiLang);
  const u = o.usage;
  const setup = o.setup;
  const label = (key: string) => (k: string) => {
    if (k === '?') return a.unknown;
    if (key === 'arabic') return dialectName(k as ArabicDialect, uiLang);
    if (key === 'lang') return UI_LANG_NAMES[k as UiLang] ?? k;
    if (key === 'langs') return k.split('+').map((l) => UI_LANG_NAMES[l as UiLang] ?? l).join(' + ');
    if (key === 'recording') return d.levels[k as keyof typeof d.levels] ?? k;
    return a.values[k] ?? k;
  };
  const switches: BarItem[] = useMemo(
    () =>
      Object.keys(a.switchNames)
        .filter((k) => setup.choices?.[k])
        .map((k) => {
          const on = setup.choices![k].true ?? 0;
          return { key: k, label: a.switchNames[k], value: on, valueText: `${pct(on, setup.children)} %` };
        }),
    [a, setup],
  );
  return (
    <>
      <View style={ss.card}>
        <Note text={a.usageIntro} />
      </View>
      {!u.enough ? (
        <View style={ss.card}>
          <Text style={ss.title}>{a.notEnough(u.children, u.minimum)}</Text>
        </View>
      ) : (
        <>
          <StatGrid>
            <StatTile label={a.childrenSharing} value={compact(u.children)} sub={a.period(u.days)} />
            <StatTile label={a.minutesDay} value={String(u.minutes ?? 0)} />
            <StatTile label={a.touchesDay} value={String(u.selections ?? 0)} />
            <StatTile label={a.sentencesDay} value={String(u.utterances ?? 0)} />
            <StatTile label={a.daysWeek} value={String(u.daysPerWeek ?? 0)} />
            <StatTile label={a.wordsDay} value={String(u.words ?? 0)} />
          </StatGrid>
          {u.weeks && (
            <ChartCard title={a.trend}>
              <ColumnChart columns={u.weeks.map((w) => ({ key: w.week, label: day(Date.parse(w.week), uiLang), value: w.minutes ?? 0 }))} unit={a.minutesUnit} />
            </ChartCard>
          )}
          {u.lengths && (
            <ChartCard title={a.lengths}>
              <SplitBar
                parts={[
                  { key: 'one', label: a.one, value: u.lengths.one },
                  { key: 'more', label: a.twoPlus, value: u.lengths.two + u.lengths.more },
                ]}
              />
            </ChartCard>
          )}
          {u.places && (
            <ChartCard title={a.places}>
              <BarList items={bars(u.places, (k) => a.placeNames[k] ?? k)} />
            </ChartCard>
          )}
          {u.hours && (
            <ChartCard title={a.hours} note={a.hoursNote}>
              <ColumnChart columns={u.hours.map((v, h) => ({ key: String(h), label: `${h} h`, value: v }))} unit={a.touchesUnit} height={110} />
            </ChartCard>
          )}
          {u.ages && u.ages.length > 0 && (
            <ChartCard title={a.ages} note={a.agesNote}>
              <DataTable
                head={a.ageCols}
                rows={u.ages.map((g) => [g.band === '?' ? a.unknown : `${g.band} ${a.years}`, g.children, g.minutes, g.selections, g.longer == null ? '—' : `${Math.round(g.longer * 100)} %`])}
              />
            </ChartCard>
          )}
          <ChartCard title={a.otherSigns}>
            <Note
              text={[
                a.searches(u.searches ?? 0),
                a.boardsMade(u.boardsMade ?? 0),
                a.errorsMet(u.errors ?? 0),
                u.offlineShare != null ? a.offline(Math.round(u.offlineShare * 100)) : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </ChartCard>
        </>
      )}
      {setup.choices ? (
        <ChartCard title={a.setup} note={a.setupNote(setup.children)}>
          {Object.keys(a.choices)
            .filter((k) => setup.choices![k])
            .map((k) => (
              <View key={k} style={{ gap: 6 }}>
                <Text style={st.sub}>{a.choices[k]}</Text>
                <BarList items={bars(setup.choices![k], label(k), k === 'arabic' ? [...DIALECT_ORDER, 'none'] : undefined)} />
              </View>
            ))}
          {switches.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={st.sub}>{a.switches}</Text>
              <BarList items={switches} max={Math.max(1, setup.children)} />
            </View>
          )}
          {setup.averages && (
            <DataTable head={[a.averages, '']} rows={Object.entries(setup.averages).map(([k, v]) => [a.avgNames[k] ?? k, v])} />
          )}
        </ChartCard>
      ) : null}
    </>
  );
}

// ───────────────────────── Messages and history ─────────────────────────

function Messages({ a, list, onChanged }: { a: AdminStrings; list: Feedback[]; onChanged: () => Promise<void> }) {
  const { api, uiLang } = useSession();
  const rtl = useNavRtl();
  return (
    <>
      <Note text={a.messagesIntro} />
      {list.length === 0 && <Note text={a.noMessages} />}
      {list.map((m) => (
        <View key={m.id} style={[ss.card, m.status === 'done' && { opacity: 0.7 }]}>
          <View style={[st.line, rtl && st.rev]}>
            <View style={ss.chip}>
              <Text style={ss.chipText}>{a.kinds[m.kind] ?? m.kind}</Text>
            </View>
            <Text style={[ss.sub, { flex: 1 }, rtl && ss.rtl]}>
              {m.fromName} · {when(m.createdAt, uiLang)} · {[m.platform, m.appVersion].filter(Boolean).join(' ')}
            </Text>
          </View>
          <Text style={[st.message, rtl && ss.rtl]} selectable>
            {m.text}
          </Text>
          <View style={[st.line, rtl && st.rev]}>
            {m.fromEmail ? (
              <Text style={[ss.sub, { flex: 1 }, rtl && ss.rtl]} selectable>
                {a.answerTo} {m.fromEmail}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Btn
              small
              icon={m.status === 'new' ? 'check' : 'undo'}
              label={m.status === 'new' ? a.markDone : a.reopen}
              onPress={() => void api.adminSetFeedback(m.id, m.status === 'new' ? 'done' : 'new').then(onChanged, () => {})}
            />
          </View>
        </View>
      ))}
    </>
  );
}

function History({ a, list }: { a: AdminStrings; list: AdminLogEntry[] }) {
  const { uiLang } = useSession();
  return (
    <>
      <Note text={a.logIntro} />
      {list.length === 0 && <Note text={a.noLog} />}
      {list.map((e) => (
        <Row
          key={e.id}
          icon={e.action === 'open_document' ? 'eye' : e.action === 'verified' ? 'check' : e.action === 'rejected' ? 'x' : 'mail'}
          muted={e.action === 'open_document'}
          title={`${e.adminName} ${a.actions[e.action] ?? e.action} ${e.targetName ?? ''}`}
          sub={[when(e.createdAt, uiLang), e.detail].filter(Boolean).join(' · ')}
        />
      ))}
    </>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rev: { flexDirection: 'row-reverse' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  h: { fontSize: 22, fontWeight: '800', color: C.text },
  tools: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tabs: { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 44, borderRadius: radius.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { fontSize: 15, fontWeight: '700', color: C.text },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.help, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  main: { padding: 16, paddingTop: 4 },
  inner: { width: '100%', maxWidth: 860, alignSelf: 'center', gap: 14 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.editSoft, borderWidth: 1, borderColor: '#FEC84B' },
  demoText: { flex: 1, color: C.edit, fontWeight: '700', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flash: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.success, backgroundColor: C.surface },
  flashText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  name: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text },
  key: { width: 130, fontSize: 14, color: C.textMuted, fontWeight: '600' },
  val: { flex: 1, minWidth: 140, fontSize: 15, color: C.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  viewer: { gap: 10, padding: 12, borderRadius: 14, borderWidth: 2, borderColor: C.accent, backgroundColor: C.surface },
  picture: { width: '100%', aspectRatio: 1.45, backgroundColor: C.surfaceAlt, borderRadius: 8 },
  sub: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 },
  message: { fontSize: 16, lineHeight: 23, color: C.text },
});
