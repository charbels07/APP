/**
 * Pages of the back office that help decide what to build next:
 *  - Product: how each feature is used (regular / now and then / given up / never), and a few
 *    figures to look at before an update;
 *  - Requests: what parents and professionals wrote, and the ideas they vote for;
 *  - Bugs: technical problems counted by the app and the ones people wrote;
 *  - Content: what ships with the app (pictograms, words, languages, guide);
 *  - Security: what the families agreed to share, what is never collected, the team's history.
 * Everything that comes from the children is a sum over at least 5 children of 5 families who
 * agreed (the database decides that, not this page).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminBugs, AdminLogEntry, AdminOverview, AdminProduct, AdminRoadmapItem, FeatureAdoption, Feedback, RoadmapStatus } from '../../backend/types';
import { FEEDBACK_KINDS } from '../../backend/types';
import { BUILTIN_CONCEPTS } from '../../data/concepts';
import { DIALECT_ORDER, DIALECT_WORDS, dialectName } from '../../data/dialects';
import { GUIDE } from '../../data/guide';
import { PICTO_BUILT, PICTO_LIBRARIES, PICTO_TOTAL } from '../../data/pictoLibraries';
import { SETUP_HELP } from '../../data/setupHelp';
import { SYMBOL_DEFAULTS } from '../../data/symbolMap';
import { errorText } from '../../i18n/account';
import type { AdminStrings } from '../../i18n/admin';
import { dataStrings } from '../../i18n/data';
import { productStrings, type ProductStrings } from '../../i18n/product';
import { UI_LANG_NAMES } from '../../i18n/ui';
import { FEATURES } from '../../lib/product';
import type { UiLang } from '../../model/types';
import { useSession } from '../../state/Session';
import { selected } from '../a11y';
import { Btn, Field, Segmented, useNavRtl } from '../common';
import { AdoptionBar, AdoptionLegend, BarList, ChartCard, ColumnChart, DataTable, StatGrid, StatTile, compact, type BarItem } from '../data/Charts';
import { Note, ss } from '../settings/SettingsScreen';
import { day, when } from '../settings/TeamTab';
import { ErrorText } from '../start/StartLayout';
import { C, CLASS_NAMES, CLASS_ORDER, radius } from '../theme';

type Counts = Record<string, number>;
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const bars = (counts: Counts | undefined, name: (k: string) => string): BarItem[] =>
  Object.keys(counts ?? {})
    .sort((a, b) => counts![b] - counts![a])
    .map((k) => ({ key: k, label: name(k), value: counts![k] }));

/** One line at the top of a page: what it is for. */
export function PageIntro({ text }: { text: string }) {
  const rtl = useNavRtl();
  return <Text style={[st.intro, rtl && ss.rtl]}>{text}</Text>;
}

// ───────────────────────── Product ─────────────────────────

/** What one line of the adoption chart shows, for each shape the server can answer with. */
function adoptionLine(f: FeatureAdoption, x: ProductStrings): { end: string; parts: number[]; colors: number[]; labels: readonly string[] } | { text: string } {
  if ('regular' in f) {
    const total = f.regular + f.occasional + f.abandoned + f.never;
    return { end: x.neverUsed(pct(f.never, total)), parts: [f.regular, f.occasional, f.abandoned, f.never], colors: [0, 1, 2, 3], labels: x.groups };
  }
  if ('using' in f) return { end: x.usingNow(pct(f.using, f.using + f.notUsing)), parts: [f.using, f.notUsing], colors: [0, 3], labels: x.twoGroups };
  if ('few' in f) return { text: f.few === 'using' ? x.fewUsing : x.fewNot };
  return { text: x.hidden };
}

export function ProductView({ o, product }: { o: AdminOverview; product: AdminProduct }) {
  const { uiLang } = useSession();
  const x = productStrings(uiLang);
  const rtl = useNavRtl();
  const t = product.tasks ?? {};
  const has = (...keys: string[]) => keys.every((k) => t[k] != null);
  const share = (a: number, b: number) => `${pct(a, b)} %  (${x.ofN(a, b)})`;
  // The aunt's list of "what to look at": each line is shown only when enough children are behind it.
  const rows: (string | number)[][] = [];
  if (has('search', 'searchNone')) rows.push([x.ind.searchNone, share(t.searchNone, t.search), x.ind.searchNoneHint]);
  if (has('tlaStart', 'tlaDone')) rows.push([x.ind.tlaDone, share(Math.min(t.tlaDone, t.tlaStart), t.tlaStart), x.ind.tlaDoneHint]);
  if (has('tlaMs', 'tlaDone') && t.tlaDone > 0) {
    const sec = Math.round(t.tlaMs / t.tlaDone / 1000);
    rows.push([x.ind.tlaTime, x.minutes(Math.floor(sec / 60), sec % 60), x.ind.tlaTimeHint]);
  }
  if (has('tlaKept', 'tlaChanged')) rows.push([x.ind.tlaKept, share(t.tlaKept, t.tlaKept + t.tlaChanged), x.ind.tlaKeptHint]);
  if (has('seqStart', 'seqDone')) rows.push([x.ind.seqDone, share(Math.min(t.seqDone, t.seqStart), t.seqStart), x.ind.seqDoneHint]);
  if (has('pictoSwap')) rows.push([x.ind.pictoSwap, x.times(t.pictoSwap), x.ind.pictoSwapHint]);
  if (has('print', 'printSchedule')) rows.push([x.ind.printSchedule, share(t.printSchedule, t.print), x.ind.printScheduleHint]);
  if (has('edit')) rows.push([x.ind.edits, x.times(t.edit), x.ind.editsHint]);

  return (
    <>
      <PageIntro text={x.intro.product} />
      {!product.enough ? (
        <View style={ss.card}>
          <Text style={[ss.title, rtl && ss.rtl]}>{x.notEnough(product.children, product.minimum)}</Text>
          <Note text={x.agreed(product.agreed)} />
        </View>
      ) : (
        <>
          <ChartCard title={x.adoption} note={x.adoptionNote(product.children, product.days)}>
            <AdoptionLegend labels={x.groups} />
            <View style={{ gap: 14, marginTop: 4 }}>
              {(product.features ?? [])
                .filter((f) => (FEATURES as readonly string[]).includes(f.key))
                .map((f) => {
                  const line = adoptionLine(f, x);
                  const name = x.features[f.key] ?? f.key;
                  return 'text' in line ? (
                    <View key={f.key} style={{ gap: 2 }}>
                      <Text style={[st.featureName, rtl && ss.rtl]}>{name}</Text>
                      <Text style={[st.small, rtl && ss.rtl]}>{line.text}</Text>
                    </View>
                  ) : (
                    <AdoptionBar key={f.key} label={name} end={line.end} parts={line.parts} colors={line.colors} labels={line.labels} />
                  );
                })}
            </View>
            <Note text={x.smallGroups} />
          </ChartCard>

          {rows.length > 0 && (
            <ChartCard title={x.decide} note={x.decideNote(product.children30 ?? product.children)}>
              <DataTable head={[x.indicator, x.figure, x.meaning]} rows={rows} />
            </ChartCard>
          )}

          {product.forms && Object.keys(product.forms).length > 0 && (
            <ChartCard title={x.byDevice}>
              <BarList items={bars(product.forms, (k) => x.forms[k] ?? k)} />
            </ChartCard>
          )}
        </>
      )}
    </>
  );
}

// ───────────────────────── Requests ─────────────────────────

export function RequestsView({
  a,
  messages,
  ideas,
  onChanged,
}: {
  a: AdminStrings;
  messages: Feedback[];
  ideas: AdminRoadmapItem[];
  onChanged: () => Promise<void>;
}) {
  const { api, uiLang, s } = useSession();
  const x = productStrings(uiLang);
  const rtl = useNavRtl();
  const [filter, setFilter] = useState<string>('all');
  const [title, setTitle] = useState<Record<UiLang, string>>({ fr: '', en: '', ar: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byKind = useMemo(() => {
    const c: Counts = {};
    for (const m of messages) c[m.kind] = (c[m.kind] ?? 0) + 1;
    return c;
  }, [messages]);
  const fresh = messages.filter((m) => m.status === 'new');
  const shown = filter === 'all' ? messages : messages.filter((m) => m.kind === filter);
  const kinds = FEEDBACK_KINDS.filter((k) => byKind[k]);

  const save = async (input: { id?: string; title: Record<UiLang, string>; status: RoadmapStatus }) => {
    setBusy(true);
    setError(null);
    try {
      await api.adminRoadmapSave(input);
      await onChanged();
      return true;
    } catch (e) {
      setError(errorText(s, e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageIntro text={x.intro.feedback} />
      <StatGrid>
        <StatTile label={x.newMessages} value={compact(fresh.length)} />
        <StatTile label={x.fromParents} value={compact(messages.filter((m) => m.fromRole === 'parent').length)} />
        <StatTile label={x.fromPros} value={compact(messages.filter((m) => m.fromRole === 'pro').length)} />
      </StatGrid>

      {messages.length > 0 && (
        <ChartCard title={x.asked} note={x.askedNote}>
          <BarList items={FEEDBACK_KINDS.filter((k) => byKind[k]).map((k) => ({ key: k, label: x.kindShort[k] ?? k, value: byKind[k] }))} />
        </ChartCard>
      )}

      <ChartCard title={x.ideas} note={x.ideasNote}>
        {/* One block per idea, the most voted first: its votes, and where it stands. */}
        {ideas.map((i) => (
          <View key={i.id} style={[st.idea, i.status === 'hidden' && { opacity: 0.6 }]}>
            <Text style={[st.featureName, rtl && ss.rtl]}>{i.title[uiLang] || i.title.en || i.title.fr || i.title.ar}</Text>
            <Text style={[st.small, rtl && ss.rtl]}>{x.ideaVotes(i.votes, i.parents, i.pros)}</Text>
            <Segmented<RoadmapStatus>
              value={i.status}
              onChange={(status) => void save({ id: i.id, title: i.title, status })}
              options={(['open', 'planned', 'done', 'hidden'] as RoadmapStatus[]).map((v) => ({ value: v, label: x.status[v] }))}
            />
          </View>
        ))}
        <Text style={[st.sub, rtl && ss.rtl]}>{x.addIdea}</Text>
        {(['fr', 'en', 'ar'] as UiLang[]).map((l) => (
          <Field key={l} label={x.ideaTitle(UI_LANG_NAMES[l])} value={title[l]} onChangeText={(v) => setTitle({ ...title, [l]: v })} maxLength={120} style={l === 'ar' ? { textAlign: 'right' } : undefined} />
        ))}
        <ErrorText text={error} />
        <Btn
          small
          kind="primary"
          icon="plus"
          label={x.add}
          disabled={busy || !(title.fr.trim() || title.en.trim() || title.ar.trim())}
          onPress={() => void save({ title, status: 'open' }).then((ok) => ok && setTitle({ fr: '', en: '', ar: '' }))}
          style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }}
        />
      </ChartCard>

      <Text style={[st.h2, rtl && ss.rtl]} accessibilityRole="header">
        {x.messages}
      </Text>
      {kinds.length > 1 && (
        <View style={[st.chips, rtl && st.rev]} accessibilityRole="tablist">
          {['all', ...kinds].map((k) => {
            const on = filter === k;
            const name = k === 'all' ? x.all : x.kindShort[k] ?? k;
            return (
              <Pressable key={k} onPress={() => setFilter(k)} style={[st.chip, on && st.chipOn]} accessibilityRole="tab" accessibilityLabel={name} {...selected(on)}>
                <Text style={[st.chipText, on && { color: '#fff' }]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <MessageList a={a} list={shown} onChanged={onChanged} />
    </>
  );
}

/** Messages people wrote, the new ones first; "Dealt with" puts one aside. */
export function MessageList({ a, list, onChanged }: { a: AdminStrings; list: Feedback[]; onChanged: () => Promise<void> }) {
  const { api, uiLang } = useSession();
  const x = productStrings(uiLang);
  const rtl = useNavRtl();
  return (
    <>
      {list.length === 0 && <Note text={a.noMessages} />}
      {list.map((m) => (
        <View key={m.id} style={[ss.card, m.status === 'done' && { opacity: 0.7 }]}>
          <View style={[st.line, rtl && st.rev]}>
            <View style={ss.chip}>
              <Text style={ss.chipText}>{x.kindShort[m.kind] ?? m.kind}</Text>
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

// ───────────────────────── Bugs ─────────────────────────

export function BugsView({ a, o, bugs, messages, onChanged }: { a: AdminStrings; o: AdminOverview; bugs: AdminBugs; messages: Feedback[]; onChanged: () => Promise<void> }) {
  const { uiLang } = useSession();
  const x = productStrings(uiLang);
  const rtl = useNavRtl();
  const [table, setTable] = useState(false);
  const d = dataStrings(uiLang);
  const written = messages.filter((m) => m.kind === 'problem' || m.kind === 'access');
  const system = (k: string) => ({ ios: 'iPad / iPhone', android: 'Android', web: 'Web' })[k] ?? a.unknown;
  const kind = (k: string) => x.problemKinds[k] ?? k;
  const screen = (k: string) => x.screens[k] ?? k;
  return (
    <>
      <PageIntro text={x.intro.bugs} />
      <StatGrid>
        <StatTile label={x.problems30} value={compact(bugs.total)} />
        <StatTile label={x.written} value={compact(written.filter((m) => m.status === 'new').length)} sub={a.ofTotal(written.length)} />
        <StatTile label={x.waitingSync} value={compact(o.devices.waiting)} sub={a.ofTotal(o.devices.total)} />
      </StatGrid>
      <View style={ss.card}>
        <Note text={x.bugsWho} />
      </View>
      {bugs.total === 0 ? (
        <View style={ss.card}>
          <Text style={[ss.title, rtl && ss.rtl]}>{x.noBugs}</Text>
        </View>
      ) : (
        <>
          <ChartCard
            title={x.perDay}
            right={<Btn small kind="ghost" icon={table ? 'grid' : 'list'} label={table ? d.chartView : d.tableView} onPress={() => setTable(!table)} />}
          >
            <ColumnChart table={table} columns={bugs.daily.map((p) => ({ key: p.day, label: day(Date.parse(p.day), uiLang), value: p.n }))} unit={x.problemsUnit} height={120} />
          </ChartCard>
          <ChartCard title={x.byKind}>
            <BarList items={bars(bugs.kinds, kind)} />
          </ChartCard>
          <ChartCard title={x.byScreen}>
            <BarList items={bars(bugs.screens, screen)} />
          </ChartCard>
          <ChartCard title={x.byVersion} note={x.versionNote}>
            <BarList items={bars(bugs.versions, (k) => (k === '?' ? a.unknown : k))} />
            <Text style={[st.sub, rtl && ss.rtl]}>{x.devicesByVersion}</Text>
            <BarList items={bars(o.devices.versions, (k) => (k === '?' ? a.unknown : k))} />
          </ChartCard>
          <ChartCard title={x.bySystem}>
            <BarList items={bars(bugs.platforms, system)} />
          </ChartCard>
          <ChartCard title={x.top}>
            <DataTable
              head={x.topCols}
              rows={bugs.top.map((p) => [kind(p.kind), p.name, p.at || '—', screen(p.screen), p.version || '—', system(p.platform), p.n, day(Date.parse(p.last), uiLang)])}
            />
          </ChartCard>
        </>
      )}
      <Text style={[st.h2, rtl && ss.rtl]} accessibilityRole="header">
        {x.writtenTitle}
      </Text>
      <MessageList a={a} list={written} onChanged={onChanged} />
    </>
  );
}

// ───────────────────────── Content ─────────────────────────

/** What ships inside the app, counted from the app's own files (no server needed). */
export function ContentView() {
  const { uiLang } = useSession();
  const x = productStrings(uiLang);
  const content = useMemo(() => {
    const all = Object.values(BUILTIN_CONCEPTS);
    const words = all.filter((c) => c.cls !== 'folder');
    const byClass: Counts = {};
    for (const c of words) byClass[c.cls] = (byClass[c.cls] ?? 0) + 1;
    const withPicture = words.filter((c) => SYMBOL_DEFAULTS[c.id]).length;
    const missing = (l: 'fr' | 'en' | 'ar') => all.filter((c) => !c.labels[l]?.trim()).length;
    return { total: words.length, folders: all.length - words.length, byClass, withPicture, missing: { fr: missing('fr'), en: missing('en'), ar: missing('ar') } };
  }, []);
  const lang = (l: 'fr' | 'en' | 'ar') => [UI_LANG_NAMES[l], content.missing[l] ? x.missing(content.missing[l]) : `${content.total + content.folders} · ${x.complete}`];
  return (
    <>
      <PageIntro text={x.intro.content} />
      <View style={ss.card}>
        <Note text={x.contentHow} />
      </View>
      <ChartCard title={x.pictos} note={x.pictosNote(PICTO_TOTAL, PICTO_BUILT)}>
        <DataTable head={x.pictoCols} rows={PICTO_LIBRARIES.map((l) => [l.name, l.count, l.license])} />
      </ChartCard>
      <ChartCard title={x.words} note={x.wordsNote(content.total, content.folders)}>
        <DataTable head={x.wordCols} rows={CLASS_ORDER.filter((c) => content.byClass[c]).map((c) => [CLASS_NAMES[c][uiLang], content.byClass[c]])} />
        <DataTable
          head={['', '']}
          rows={[
            [x.withPicture, content.withPicture],
            [x.withoutPicture, content.total - content.withPicture],
          ]}
        />
      </ChartCard>
      <ChartCard title={x.languages} note={x.toReview}>
        <DataTable
          head={x.langCols}
          rows={[lang('fr'), lang('en'), lang('ar'), ...DIALECT_ORDER.filter((dl) => dl !== 'lb').map((dl) => [dialectName(dl, uiLang), x.dialectDiff(Object.keys(DIALECT_WORDS[dl]).length)])]}
        />
      </ChartCard>
      <ChartCard title={x.guideTitle}>
        <DataTable
          head={x.guideCols}
          rows={[
            [x.guideStart, GUIDE.filter((c) => c.track === 'start').length],
            [x.guidePro, GUIDE.filter((c) => c.track === 'pro').length],
            [x.setupHelp, Object.keys(SETUP_HELP).length],
          ]}
        />
      </ChartCard>
    </>
  );
}

// ───────────────────────── Security ─────────────────────────

export function SecurityView({ a, o, product, log }: { a: AdminStrings; o: AdminOverview; product: AdminProduct; log: React.ReactNode }) {
  const { uiLang } = useSession();
  const x = productStrings(uiLang);
  const d = dataStrings(uiLang);
  const rtl = useNavRtl();
  const order = ['off', 'usage', 'vocabulary', 'language'];
  const collection = order.filter((k) => o.families.collection[k] != null).map((k) => ({ key: k, label: d.levels[k as keyof typeof d.levels] ?? k, value: o.families.collection[k] }));
  return (
    <>
      <PageIntro text={x.intro.security} />
      <ChartCard title={x.consentTitle} note={x.sharingLine(o.families.sharing, product.agreed, o.families.children)}>
        <Text style={[st.sub, rtl && ss.rtl]}>{a.consent}</Text>
        <BarList items={collection} />
      </ChartCard>
      <ChartCard title={x.rulesTitle}>
        {x.rules.map((r) => (
          <Text key={r} style={[st.rule, rtl && ss.rtl]}>
            • {r}
          </Text>
        ))}
      </ChartCard>
      <ChartCard title={x.keptTitle}>
        {x.kept.map((r) => (
          <Text key={r} style={[st.rule, rtl && ss.rtl]}>
            • {r}
          </Text>
        ))}
      </ChartCard>
      <Text style={[st.h2, rtl && ss.rtl]} accessibilityRole="header">
        {x.logTitle}
      </Text>
      {log}
    </>
  );
}

const st = StyleSheet.create({
  rev: { flexDirection: 'row-reverse' },
  intro: { fontSize: 15, lineHeight: 21, color: C.textMuted },
  h2: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 6 },
  sub: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 },
  small: { fontSize: 13, color: C.textMuted },
  featureName: { fontSize: 15, fontWeight: '700', color: C.text },
  idea: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 14, fontWeight: '700', color: C.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  message: { fontSize: 16, lineHeight: 23, color: C.text },
  rule: { fontSize: 15, lineHeight: 22, color: C.text },
});
