/**
 * "Suivi" page: the family's consent, then the four domains (use, vocabulary, language,
 * communicative functions) and the adults' observations. Used by the parents (Settings → Suivi)
 * and by professionals the family allowed ("See the progress data"), in their workspace.
 * Numbers come from src/lib/analytics.ts; this file only shows them.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackendError } from '../../backend/Backend';
import type { CommFunction, Observation, UsageDay } from '../../backend/types';
import { dataStrings, type DataStrings } from '../../i18n/data';
import {
  classifyUtterance,
  dayKey,
  FUNCTIONS,
  functionsSummary,
  languageSummary,
  lastDays,
  sentenceText,
  toCsv,
  usageSummary,
  vocabularySummary,
  type Period,
} from '../../lib/analytics';
import { label as wordLabel, symbolOf } from '../../lib/lexicon';
import { exportText } from '../../lib/platform';
import { LEVEL_RANK, type CollectLevel } from '../../lib/usageConsent';
import type { Profile, UiLang } from '../../model/types';
import { useSession } from '../../state/Session';
import type { UsageTracker } from '../../state/usageTracker';
import { Btn, Field, Segmented, Toggle, useNavRtl } from '../common';
import { Icon } from '../Icon';
import { Note, ss } from '../settings/SettingsScreen';
import { when } from '../settings/TeamTab';
import { SymbolView } from '../SymbolView';
import { C, CLASS_NAMES, CLASS_ORDER } from '../theme';
import { BarList, ChartCard, ColumnChart, DataTable, PairBarList, SplitBar, StatGrid, StatTile } from './Charts';
import { checked } from '../a11y';

type Section = 'usage' | 'vocabulary' | 'language' | 'functions' | 'observations';
type Draft = Partial<Omit<Observation, 'createdBy' | 'authorName' | 'createdAt'>>;
const LEVELS: CollectLevel[] = ['off', 'usage', 'vocabulary', 'language'];
const RIGHT = { textAlign: 'right' as const, writingDirection: 'rtl' as const };
const HISTORY_DAYS = 200;

export interface DataDashboardProps {
  profileId: string;
  childName: string;
  profile: Profile;
  /** Owner or team manager: may change the consent and erase the data. */
  manager: boolean;
  /** Changes the consent (only given where the profile can be saved). */
  onConsent?: (patch: { dataCollection?: CollectLevel; shareStats?: 'none' | 'anonymous' }) => void;
  /** This device's recorder (its days are shown even offline). */
  tracker?: UsageTracker | null;
}

export function DataDashboard({ profileId, childName, profile, manager, onConsent, tracker }: DataDashboardProps) {
  const { api, uiLang, account } = useSession();
  const x = dataStrings(uiLang);
  const rtl = useNavRtl();
  const level = profile.settings.dataCollection ?? 'off';
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [section, setSection] = useState<Section>('usage');
  const [days, setDays] = useState<UsageDay[] | null>(null);
  const [obs, setObs] = useState<Observation[]>([]);
  const [status, setStatus] = useState<'ok' | 'offline' | 'forbidden'>('ok');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const canObserve = account?.provider !== 'device';
  const wl = useCallback((id: string) => wordLabel(profile, id, profile.settings.lang), [profile]);

  const load = useCallback(async () => {
    const from = dayKey(new Date(Date.now() - HISTORY_DAYS * 86400000));
    let server: UsageDay[] = [];
    let st: typeof status = 'ok';
    try {
      server = await api.listUsage(profileId, from);
    } catch (e) {
      st = e instanceof BackendError && e.code === 'forbidden' ? 'forbidden' : 'offline';
    }
    // This device's own days are the freshest copy of its data.
    const local = tracker && tracker.profileId === profileId && st !== 'forbidden' ? tracker.localDays() : [];
    const merged = new Map<string, UsageDay>();
    for (const d of [...server, ...local]) if (d.day >= from) merged.set(`${d.deviceId}|${d.day}`, d);
    setDays([...merged.values()].sort((a, b) => a.day.localeCompare(b.day)));
    setStatus(st);
    if (st !== 'forbidden') setObs(await api.listObservations(profileId).catch(() => [] as Observation[]));
  }, [api, profileId, tracker]);
  useEffect(() => {
    void load();
  }, [load]);

  const p: Period = useMemo(() => lastDays(period), [period]);
  const usage = useMemo(() => (days ? usageSummary(days, profile, p) : null), [days, profile, p]);
  const vocab = useMemo(() => (days ? vocabularySummary(days, profile, p) : null), [days, profile, p]);
  const lang = useMemo(() => (days ? languageSummary(days, profile, p) : null), [days, profile, p]);
  const funcs = useMemo(() => (days ? functionsSummary(days, obs, profile, p, wl) : null), [days, obs, profile, p, wl]);
  const recent = useMemo(
    () => (days ?? []).filter((d) => d.day >= p.from).flatMap((d) => d.samples ?? []).sort((a, b) => b.t - a.t).slice(0, 12),
    [days, p],
  );

  if (status === 'forbidden') {
    return (
      <View style={ss.card}>
        <Text style={[ss.title, rtl && RIGHT]}>{x.title}</Text>
        <Note text={x.noAccess} />
      </View>
    );
  }

  if (draft) {
    return (
      <ObservationForm
        x={x}
        draft={draft}
        previous={obs}
        onCancel={() => setDraft(null)}
        onSave={async (d) => {
          await api.saveObservation({ ...d, profileId, at: d.at ?? Date.now() } as Parameters<typeof api.saveObservation>[0]);
          setDraft(null);
          await load();
        }}
        onDelete={
          draft.id
            ? async () => {
                await api.deleteObservation(draft.id!);
                setDraft(null);
                await load();
              }
            : undefined
        }
      />
    );
  }

  const exportSummary = async () => {
    if (!usage || !vocab || !lang || !funcs) return;
    const D = x.sections;
    const rows: (string | number)[][] = [[x.csv.domain, x.csv.item, x.csv.value]];
    const add = (d: string, k: string, v: string | number) => rows.push([d, k, v]);
    add('', `${childName} · ${p.from} → ${p.to}`, x.levels[level]);
    add(D.usage, x.daysUsed, `${usage.daysUsed}/${usage.periodDays}`);
    add(D.usage, x.sessions, usage.sessions);
    add(D.usage, `${x.avgSession} (min)`, usage.avgSessionMinutes);
    add(D.usage, `${x.activeTime} (min)`, usage.activeMinutes);
    add(D.usage, x.selections, usage.selections);
    add(D.usage, x.utterances, usage.utterances);
    for (const [k, v] of Object.entries(usage.timeOfDay)) add(D.usage, x.moments[k as keyof typeof x.moments], v);
    for (const [k, v] of Object.entries(usage.modes)) add(D.usage, x.modes[k as keyof typeof x.modes], v);
    for (const pg of usage.pages) add(D.usage, `${x.pagesTitle}: ${pageName(profile, pg.page, wl, x)}`, `${pg.opens} / ${pg.minutes} min`);
    add(D.usage, `${x.tlaTitle}: ${x.tlaCreated}`, usage.tla.created);
    for (const d of usage.devices) add(D.usage, `${x.devicesTitle}: ${d.platform}`, `${d.days} / ${d.selections}`);
    add(D.usage, x.daysWithout, usage.inactivity.daysWithout);
    add(D.usage, x.longestBreak, usage.inactivity.longestBreakDays);
    add(D.usage, `${x.avgPause} (min)`, usage.inactivity.avgPauseMinutes);
    add(D.usage, `${x.offlineTime} (min)`, usage.offlineMinutes);
    add(D.usage, x.errors, usage.errors);
    for (const d of usage.perDay) add(D.usage, `${x.day} ${d.day}`, `${d.selections} / ${d.utterances} / ${d.activeMinutes} min`);
    add(D.vocabulary, x.distinct, vocab.distinct);
    for (const w of vocab.top) add(D.vocabulary, wl(w.concept), w.count);
    for (const w of vocab.newWords) add(D.vocabulary, `${x.newWords}: ${wl(w.concept)}`, w.day);
    for (const w of vocab.reused) add(D.vocabulary, `${x.reused}: ${wl(w.concept)}`, w.days);
    add(D.vocabulary, x.core, vocab.core);
    add(D.vocabulary, x.specific, vocab.specific);
    for (const [k, v] of Object.entries(vocab.byClass)) add(D.vocabulary, CLASS_NAMES[k as keyof typeof CLASS_NAMES][uiLang], v ?? 0);
    for (const w of vocab.searched) add(D.vocabulary, `${x.searchesTitle}: ${wl(w.concept)}`, w.count);
    add(D.language, x.mlu, lang.mlu);
    add(D.language, x.lengths.one, lang.len1);
    add(D.language, x.lengths.two, lang.len2);
    add(D.language, x.lengths.three, lang.len3plus);
    add(D.language, x.combinations, lang.combinations);
    for (const [k, v] of Object.entries(lang.relations)) add(D.language, x.relations[k as keyof typeof x.relations], v);
    for (const [k, v] of Object.entries(lang.structures)) add(D.language, x.structures[k as keyof typeof x.structures], v);
    for (const [k, v] of Object.entries(lang.features)) add(D.language, x.features[k as keyof typeof x.features], `${v.count} (${v.words.map((w) => wl(w.concept)).join(', ')})`);
    for (const r of funcs.rows) {
      add(D.functions, x.functions[r.fn], `${x.detected} ${r.detected} / ${x.observed} ${r.observed}`);
    }
    await exportText(`suivi_${p.from}_${p.to}.csv`, toCsv(rows), 'text/csv');
    setMsg(x.exported);
  };

  const anyData = !!days?.length;

  return (
    <View style={{ gap: 14 }}>
      <Note text={x.intro} />
      <ConsentCard
        x={x}
        level={level}
        share={profile.settings.shareStats ?? 'none'}
        manager={manager}
        onConsent={onConsent}
        onErase={
          manager && anyData
            ? async () => {
                await api.deleteUsage(profileId);
                await tracker?.forget();
                setMsg(x.erased);
                await load();
              }
            : undefined
        }
      />
      {status === 'offline' && <Note text={x.offline} />}
      {api.demoSeedUsage && manager && !days?.some((d) => d.deviceId === 'demo-tablet') && (
        <View style={[ss.card, { borderStyle: 'dashed' }]}>
          <Note text={x.demoNote} />
          <Btn
            small
            icon="sparkles"
            label={x.demoSeed}
            onPress={async () => {
              await api.demoSeedUsage?.(profileId, wl);
              await load();
            }}
            style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }}
          />
        </View>
      )}
      {msg && <Text style={[st.msg, rtl && RIGHT]}>{msg}</Text>}

      <View style={[st.toolbar, rtl && { flexDirection: 'row-reverse' }]}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Segmented<7 | 30 | 90> value={period} onChange={setPeriod} options={([7, 30, 90] as const).map((n) => ({ value: n, label: x.periods[n] }))} />
        </View>
        {anyData && <Btn small icon="download" label={x.exportCsv} onPress={() => void exportSummary()} />}
      </View>
      <Segmented<Section>
        value={section}
        onChange={setSection}
        options={(['usage', 'vocabulary', 'language', 'functions', 'observations'] as Section[]).map((s) => ({ value: s, label: x.sections[s] }))}
      />

      {!days ? (
        <Note text={x.loading} />
      ) : section === 'observations' ? (
        <Observations x={x} obs={obs} canObserve={canObserve} onEdit={(o) => setDraft(o)} onNew={() => setDraft({ at: Date.now() })} reload={load} childName={childName} />
      ) : !anyData && level === 'off' ? (
        <View style={ss.card}>
          <Text style={[ss.title, rtl && RIGHT]}>{x.offTitle}</Text>
          <Note text={manager ? x.offNote : x.offNoteMember} />
        </View>
      ) : section === 'usage' && usage ? (
        <UsageView x={x} u={usage} profile={profile} wl={wl} uiLang={uiLang} />
      ) : section === 'vocabulary' && vocab ? (
        <VocabularyView x={x} v={vocab} profile={profile} wl={wl} level={level} uiLang={uiLang} />
      ) : section === 'language' && lang ? (
        <LanguageView
          x={x}
          l={lang}
          wl={wl}
          level={level}
          recent={recent}
          uiLang={uiLang}
          onAnnotate={
            canObserve
              ? (s) => {
                  setDraft({ at: s.t, sampleT: s.t, utterance: sentenceText(s.tokens, wl), function: classifyUtterance(profile, s.tokens) ?? undefined });
                }
              : undefined
          }
        />
      ) : funcs ? (
        <FunctionsView x={x} f={funcs} level={level} />
      ) : null}
    </View>
  );
}

const pageName = (profile: Profile, page: string, wl: (id: string) => string, x: DataStrings) =>
  page === 'keyboard' ? x.modes.keyboard : page === 'schedule' ? x.modes.schedule : profile.boards[page] ? wl(profile.boards[page].concept) : page;

// ── Consent ──

function ConsentCard({
  x,
  level,
  share,
  manager,
  onConsent,
  onErase,
}: {
  x: DataStrings;
  level: CollectLevel;
  share: 'none' | 'anonymous';
  manager: boolean;
  onConsent?: DataDashboardProps['onConsent'];
  onErase?: () => Promise<void>;
}) {
  const rtl = useNavRtl();
  const editable = manager && !!onConsent;
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<'stop' | 'erase' | null>(null);
  const pick = (l: CollectLevel) => {
    if (l === 'off' && level !== 'off') return setConfirm('stop');
    onConsent?.({ dataCollection: l });
    setOpen(false);
  };
  return (
    <View style={ss.card}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, rtl && { flexDirection: 'row-reverse' }]}>
        <Icon name="shield" size={22} color={C.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[ss.title, rtl && RIGHT]}>{x.consentTitle}</Text>
          <Text style={[ss.sub, rtl && RIGHT]}>
            {x.levelNow} : {x.levels[level]}
          </Text>
        </View>
        {editable && !open && <Btn small label={x.change} onPress={() => setOpen(true)} />}
      </View>
      <Note text={editable ? x.consentOwnerNote : x.consentReadOnly} />
      {open &&
        LEVELS.map((l) => (
          <Pressable
            key={l}
            onPress={() => pick(l)}
            style={[st.option, l === level && st.optionOn, rtl && { flexDirection: 'row-reverse' }]}
            accessibilityRole="radio"
            {...checked(l === level)}
          >
            <View style={[st.radio, l === level && st.radioOn]}>{l === level && <View style={st.radioDot} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.title, rtl && RIGHT]}>{x.levels[l]}</Text>
              <Text style={[ss.sub, rtl && RIGHT]}>{x.levelNotes[l]}</Text>
            </View>
          </Pressable>
        ))}
      {open && <Btn small kind="ghost" label={x.cancel} onPress={() => setOpen(false)} style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }} />}
      {!open && level !== 'off' && <Note text={x.levelNotes[level]} />}
      {editable && level !== 'off' && (
        <Toggle label={x.shareTitle} note={x.shareNote} value={share === 'anonymous'} onChange={(v) => onConsent?.({ shareStats: v ? 'anonymous' : 'none' })} />
      )}
      {onErase && !confirm && <Btn small kind="danger" icon="trash" label={x.erase} onPress={() => setConfirm('erase')} style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }} />}
      {confirm && (
        <View style={st.confirm}>
          <Text style={[ss.title, rtl && RIGHT]}>{confirm === 'stop' ? x.stopTitle : x.erase}</Text>
          <Note text={confirm === 'stop' ? x.stopNote : x.eraseConfirm} />
          <View style={[{ flexDirection: 'row', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
            <Btn
              small
              kind="danger"
              label={x.confirm}
              onPress={() => {
                if (confirm === 'stop') {
                  onConsent?.({ dataCollection: 'off', shareStats: 'none' });
                  setOpen(false);
                } else void onErase?.();
                setConfirm(null);
              }}
            />
            <Btn small kind="ghost" label={x.cancel} onPress={() => setConfirm(null)} />
          </View>
        </View>
      )}
    </View>
  );
}

// ── Domain 1 ──

function shortDay(day: string, ui: UiLang) {
  const [y, m, d] = day.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString(ui === 'ar' ? 'ar-LB' : ui === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return `${d}/${m}`;
  }
}

function UsageView({ x, u, profile, wl, uiLang }: { x: DataStrings; u: ReturnType<typeof usageSummary>; profile: Profile; wl: (id: string) => string; uiLang: UiLang }) {
  const [table, setTable] = useState(false);
  return (
    <>
      <StatGrid>
        <StatTile label={x.daysUsed} value={String(u.daysUsed)} sub={x.ofDays(u.periodDays)} />
        <StatTile label={x.sessions} value={String(u.sessions)} sub={x.perWeek(u.sessionsPerWeek)} />
        <StatTile label={x.avgSession} value={x.minutes(u.avgSessionMinutes)} />
        <StatTile label={x.activeTime} value={x.minutes(u.activeMinutes)} />
        <StatTile label={x.selections} value={String(u.selections)} />
        <StatTile label={x.utterances} value={String(u.utterances)} />
      </StatGrid>
      <ChartCard
        title={x.perDayTitle}
        right={<Btn small kind="ghost" icon={table ? 'grid' : 'list'} label={table ? x.chartView : x.tableView} onPress={() => setTable(!table)} />}
      >
        <ColumnChart table={table} unit={x.selections.toLowerCase()} columns={u.perDay.map((d) => ({ key: d.day, label: shortDay(d.day, uiLang), value: d.selections }))} />
      </ChartCard>
      <ChartCard title={x.momentTitle} note={u.timeZone ? x.timeZone(u.timeZone) : undefined}>
        <BarList items={(Object.keys(u.timeOfDay) as (keyof typeof u.timeOfDay)[]).map((k) => ({ key: k, label: x.moments[k], value: u.timeOfDay[k] }))} />
      </ChartCard>
      <ChartCard title={x.modesTitle}>
        <BarList items={(Object.keys(u.modes) as (keyof typeof u.modes)[]).map((k) => ({ key: k, label: x.modes[k], value: u.modes[k] }))} />
      </ChartCard>
      <ChartCard title={x.pagesTitle}>
        {u.pages.length ? (
          <BarList
            items={u.pages.slice(0, 10).map((pg) => ({
              key: pg.page,
              label: pageName(profile, pg.page, wl, x),
              sub: `${x.pageKinds[pg.kind]} · ${x.minutes(pg.minutes)}`,
              value: pg.opens,
              lead: profile.boards[pg.page] ? <SymbolView symbol={symbolOf(profile, profile.boards[pg.page].concept)} size={26} /> : undefined,
            }))}
          />
        ) : (
          <Note text={x.none} />
        )}
      </ChartCard>
      <ChartCard title={x.tlaTitle}>
        <StatGrid>
          <StatTile label={x.tlaOpens} value={String(u.tla.opens)} />
          <StatTile label={x.tlaTime} value={x.minutes(u.tla.minutes)} />
          <StatTile label={x.tlaCreated} value={String(u.tla.created)} />
        </StatGrid>
      </ChartCard>
      <ChartCard title={x.devicesTitle}>
        {u.devices.length ? (
          <DataTable head={['', x.daysUsed, x.selections]} rows={u.devices.map((d) => [d.platform, x.daysOn(d.days), d.selections])} />
        ) : (
          <Note text={x.none} />
        )}
      </ChartCard>
      <ChartCard title={x.inactivityTitle}>
        <DataTable
          head={['', '']}
          rows={[
            [x.daysWithout, u.inactivity.daysWithout],
            [x.longestBreak, x.daysN(u.inactivity.longestBreakDays)],
            [x.avgPause, x.minutes(u.inactivity.avgPauseMinutes)],
            [x.offlineTime, x.minutes(u.offlineMinutes)],
            [x.errors, u.errors],
          ]}
        />
      </ChartCard>
    </>
  );
}

// ── Domain 2 ──

function WordChips({ items, profile, wl }: { items: { concept: string; extra?: string }[]; profile: Profile; wl: (id: string) => string }) {
  const rtl = useNavRtl();
  return (
    <View style={[st.chips, rtl && { flexDirection: 'row-reverse' }]}>
      {items.map((w) => (
        <View key={w.concept} style={st.wordChip}>
          <SymbolView symbol={symbolOf(profile, w.concept)} size={22} />
          <Text style={st.wordChipText}>
            {wl(w.concept)}
            {w.extra ? <Text style={{ color: C.textMuted }}> · {w.extra}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function VocabularyView({
  x,
  v,
  profile,
  wl,
  level,
  uiLang,
}: {
  x: DataStrings;
  v: ReturnType<typeof vocabularySummary>;
  profile: Profile;
  wl: (id: string) => string;
  level: CollectLevel;
  uiLang: UiLang;
}) {
  if (!v.available) {
    return (
      <>
        <StatGrid>
          <StatTile label={x.distinct} value={String(v.distinct)} />
          <StatTile label={x.searchesTitle} value={String(v.searches)} />
        </StatGrid>
        <Note text={`${x.vocabUsageOnly} ${LEVEL_RANK[level] < 2 ? x.needLevel(x.levels.vocabulary) : ''}`} />
      </>
    );
  }
  const classes = CLASS_ORDER.filter((c) => c !== 'folder' && v.byClass[c]);
  return (
    <>
      <StatGrid>
        <StatTile label={x.distinct} value={String(v.distinct)} />
        <StatTile label={x.newWords} value={String(v.newWords.length)} />
        <StatTile label={x.reused} value={String(v.reused.length)} />
        <StatTile label={x.searchesTitle} value={String(v.searches)} />
      </StatGrid>
      <ChartCard title={x.topWords}>
        <BarList
          items={v.top.slice(0, 12).map((w) => ({ key: w.concept, label: wl(w.concept), value: w.count, lead: <SymbolView symbol={symbolOf(profile, w.concept)} size={26} /> }))}
        />
      </ChartCard>
      <ChartCard title={x.coreTitle} note={x.coreNote}>
        <SplitBar parts={[{ key: 'core', label: x.core, value: v.core }, { key: 'specific', label: x.specific, value: v.specific }]} />
      </ChartCard>
      <ChartCard title={x.classesTitle}>
        <BarList items={classes.map((c) => ({ key: c, label: CLASS_NAMES[c][uiLang], value: v.byClass[c] ?? 0 }))} />
      </ChartCard>
      <ChartCard title={x.newWords} note={v.hasBaseline ? x.newNote : x.firstPeriod}>
        {v.newWords.length ? <WordChips items={v.newWords.slice(0, 40).map((w) => ({ concept: w.concept, extra: shortDay(w.day, uiLang) }))} profile={profile} wl={wl} /> : <Note text={x.none} />}
      </ChartCard>
      <ChartCard title={x.reused}>
        {v.reused.length ? <WordChips items={v.reused.slice(0, 40).map((w) => ({ concept: w.concept, extra: x.onDays(w.days) }))} profile={profile} wl={wl} /> : <Note text={x.none} />}
      </ChartCard>
      <ChartCard title={x.personal}>
        {v.personal.length ? (
          <BarList items={v.personal.map((w) => ({ key: w.concept, label: wl(w.concept), value: w.count, lead: <SymbolView symbol={symbolOf(profile, w.concept)} size={26} /> }))} />
        ) : (
          <Note text={x.none} />
        )}
      </ChartCard>
      <ChartCard title={x.searchesTitle} note={x.searchesN(v.searches)}>
        {v.searched.length ? <BarList items={v.searched.slice(0, 10).map((w) => ({ key: w.concept, label: wl(w.concept), value: w.count }))} /> : <Note text={x.none} />}
      </ChartCard>
    </>
  );
}

// ── Domain 3 ──

function LanguageView({
  x,
  l,
  wl,
  level,
  recent,
  uiLang,
  onAnnotate,
}: {
  x: DataStrings;
  l: ReturnType<typeof languageSummary>;
  wl: (id: string) => string;
  level: CollectLevel;
  recent: NonNullable<UsageDay['samples']>;
  uiLang: UiLang;
  onAnnotate?: (s: NonNullable<UsageDay['samples']>[number]) => void;
}) {
  const rtl = useNavRtl();
  const sentence = (tokens: NonNullable<UsageDay['samples']>[number]['tokens']) => sentenceText(tokens, wl);
  return (
    <>
      <StatGrid>
        <StatTile label={x.utterances} value={String(l.utterances)} />
        <StatTile label={x.mlu} value={l.mlu.toLocaleString(uiLang === 'ar' ? 'ar-LB' : uiLang)} sub={x.mluUnit} />
        {l.samples > 0 && <StatTile label={x.longest} value={String(l.longest)} sub={x.mluUnit} />}
        {l.samples > 0 && <StatTile label={x.combinations} value={String(l.combinations)} />}
      </StatGrid>
      <ChartCard title={x.lengthTitle} note={x.langUsageOnly}>
        <BarList
          items={[
            { key: '1', label: x.lengths.one, value: l.len1 },
            { key: '2', label: x.lengths.two, value: l.len2 },
            { key: '3', label: x.lengths.three, value: l.len3plus },
          ]}
        />
      </ChartCard>
      {LEVEL_RANK[level] < 3 && !l.samples ? (
        <Note text={x.needLevel(x.levels.language)} />
      ) : (
        <>
          <Note text={x.rulesNote} />
          <ChartCard title={x.relationsTitle}>
            <BarList items={(Object.keys(l.relations) as (keyof typeof l.relations)[]).map((k) => ({ key: k, label: x.relations[k], value: l.relations[k] }))} labelWidth="50%" />
          </ChartCard>
          <ChartCard title={x.structuresTitle}>
            <BarList items={(Object.keys(l.structures) as (keyof typeof l.structures)[]).map((k) => ({ key: k, label: x.structures[k], value: l.structures[k] }))} labelWidth="50%" />
          </ChartCard>
          <ChartCard title={x.featuresTitle}>
            {(Object.keys(l.features) as (keyof typeof l.features)[]).map((k) => {
              const f = l.features[k];
              return (
                <View key={k} style={st.feature}>
                  <View style={[{ flexDirection: 'row', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
                    <Text style={[ss.title, { flex: 1, fontSize: 15 }, rtl && RIGHT]}>{x.features[k]}</Text>
                    <Text style={st.count}>{f.count}</Text>
                  </View>
                  {f.words.length > 0 && (
                    <Text style={[ss.sub, rtl && RIGHT]}>{f.words.slice(0, 10).map((w) => `${wl(w.concept)} (${w.count})`).join(' · ')}</Text>
                  )}
                  {f.examples.slice(0, 2).map((e) => (
                    <Text key={e.t} style={[st.example, rtl && RIGHT]}>
                      « {sentence(e.tokens)} » <Text style={{ color: C.textMuted }}>— {when(e.t, uiLang)}</Text>
                    </Text>
                  ))}
                </View>
              );
            })}
          </ChartCard>
          {l.topCombinations.length > 0 && (
            <ChartCard title={x.combosTitle}>
              <BarList
                items={l.topCombinations.map((c) => ({
                  key: c.words.join(' '),
                  label: c.words.map((w) => (w.startsWith('"') ? w.slice(1, -1) : wl(w))).join(' '),
                  value: c.count,
                }))}
                labelWidth="55%"
              />
            </ChartCard>
          )}
          <ChartCard title={x.recentTitle}>
            {recent.length ? (
              recent.map((s) => (
                <View key={s.t} style={[st.sample, rtl && { flexDirection: 'row-reverse' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.example, rtl && RIGHT]}>« {sentence(s.tokens)} »</Text>
                    <Text style={[ss.sub, rtl && RIGHT]}>{when(s.t, uiLang)}</Text>
                  </View>
                  {onAnnotate && <Btn small icon="pencil" label={x.annotate} onPress={() => onAnnotate(s)} />}
                </View>
              ))
            ) : (
              <Note text={x.none} />
            )}
          </ChartCard>
        </>
      )}
    </>
  );
}

// ── Domain 4 ──

function FunctionsView({ x, f, level }: { x: DataStrings; f: ReturnType<typeof functionsSummary>; level: CollectLevel }) {
  const subOf = (r: (typeof f.rows)[number]) => {
    const parts: string[] = [];
    const a = (Object.keys(r.autonomy) as (keyof typeof r.autonomy)[]).filter((k) => r.autonomy[k]).map((k) => `${x.autonomy[k]} ${r.autonomy[k]}`);
    if (a.length) parts.push(a.join(', '));
    if (r.contexts.length) parts.push(`${x.contexts}: ${r.contexts.slice(0, 3).map((c) => c.concept).join(', ')}`);
    if (r.partners.length) parts.push(`${x.partners}: ${r.partners.slice(0, 3).map((c) => c.concept).join(', ')}`);
    if (r.results.length) parts.push(`${x.results}: ${r.results.slice(0, 2).map((c) => c.concept).join(', ')}`);
    if (!parts.length && r.examples.length) parts.push(`« ${r.examples[0]} »`);
    return parts.join(' · ');
  };
  return (
    <>
      <Note text={x.functionsNote} />
      <StatGrid>
        <StatTile label={x.diversity} value={`${f.diversity}`} sub={`/ ${FUNCTIONS.length}`} />
        <StatTile label={x.detected} value={String(f.detected)} />
        <StatTile label={x.observed} value={String(f.observed)} />
      </StatGrid>
      {LEVEL_RANK[level] < 3 && <Note text={x.needLevel(x.levels.language)} />}
      <ChartCard title={x.functionsTitle}>
        {f.rows.length ? (
          <PairBarList series={[x.detected, x.observed]} items={f.rows.map((r) => ({ key: r.fn, label: x.functions[r.fn], a: r.detected, b: r.observed, sub: subOf(r) }))} />
        ) : (
          <Note text={x.none} />
        )}
      </ChartCard>
    </>
  );
}

// ── Observations ──

function Observations({
  x,
  obs,
  canObserve,
  onEdit,
  onNew,
  reload,
  childName,
}: {
  x: DataStrings;
  obs: Observation[];
  canObserve: boolean;
  onEdit: (o: Observation) => void;
  onNew: () => void;
  reload: () => Promise<void>;
  childName: string;
}) {
  const { api, uiLang } = useSession();
  const rtl = useNavRtl();
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [ctx, setCtx] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const chosen = obs.filter((o) => sel.has(o.id));
  const toggle = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSel(n);
  };
  const exportSel = async () => {
    const head = [x.csv.date, x.csv.utterance, x.function, x.csv.context, x.csv.partner, x.autonomyLabel, x.csv.result, x.note, x.csv.author];
    const rows = chosen.map((o) => [
      new Date(o.at).toISOString().slice(0, 16).replace('T', ' '),
      o.utterance ?? '',
      o.function ? x.functions[o.function] : '',
      o.context ?? '',
      o.partner ?? '',
      o.autonomy ? x.autonomy[o.autonomy] : '',
      o.result ?? '',
      o.note ?? '',
      o.authorName,
    ]);
    await exportText(`observations_${childName.replace(/[^\p{L}\p{N}]+/gu, '_')}.csv`, toCsv([head, ...rows]), 'text/csv');
  };
  return (
    <>
      <Note text={x.obsNote} />
      {!canObserve && <Note text={x.obsDevice} />}
      <View style={[st.toolbar, rtl && { flexDirection: 'row-reverse' }]}>
        {canObserve && <Btn small kind="primary" icon="plus" label={x.addObs} onPress={onNew} />}
        {obs.length > 0 && (
          <Btn
            small
            icon="check"
            label={selecting ? x.cancel : x.select}
            onPress={() => {
              setSelecting(!selecting);
              setSel(new Set());
              setConfirmDelete(false);
            }}
          />
        )}
      </View>
      {selecting && (
        <View style={st.selBar}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, rtl && { flexDirection: 'row-reverse' }]}>
            <Btn small kind="ghost" label={x.selectAll} onPress={() => setSel(new Set(obs.map((o) => o.id)))} />
            <Text style={ss.title}>{x.selected(sel.size)}</Text>
          </View>
          {sel.size > 0 && (
            <>
              <View style={[{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }, rtl && { flexDirection: 'row-reverse' }]}>
                <View style={{ flex: 1 }}>
                  <Field label={x.setContext} value={ctx} onChangeText={setCtx} placeholder={x.context} />
                </View>
                <Btn
                  small
                  label={x.setContextApply}
                  disabled={!ctx.trim()}
                  onPress={async () => {
                    for (const o of chosen) {
                      const { createdBy: _c, authorName: _a, createdAt: _t, ...rest } = o;
                      await api.saveObservation({ ...rest, context: ctx.trim() }).catch(() => {});
                    }
                    setCtx('');
                    await reload();
                  }}
                />
              </View>
              <View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, rtl && { flexDirection: 'row-reverse' }]}>
                <Btn small icon="download" label={x.exportSelected} onPress={() => void exportSel()} />
                <Btn small kind="danger" icon="trash" label={x.deleteSelected} onPress={() => setConfirmDelete(true)} />
              </View>
              {confirmDelete && (
                <View style={st.confirm}>
                  <Text style={[ss.title, rtl && RIGHT]}>{x.deleteConfirm(sel.size)}</Text>
                  <View style={[{ flexDirection: 'row', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
                    <Btn
                      small
                      kind="danger"
                      label={x.confirm}
                      onPress={async () => {
                        for (const o of chosen) await api.deleteObservation(o.id).catch(() => {});
                        setSel(new Set());
                        setConfirmDelete(false);
                        await reload();
                      }}
                    />
                    <Btn small kind="ghost" label={x.cancel} onPress={() => setConfirmDelete(false)} />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
      {obs.length ? (
        obs.map((o) => {
          const on = sel.has(o.id);
          const sub = [
            when(o.at, uiLang),
            o.function ? x.functions[o.function] : null,
            o.context,
            o.partner,
            o.autonomy ? x.autonomy[o.autonomy] : null,
            o.result,
            x.by(o.authorName),
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={o.id}
              onPress={() => (selecting ? toggle(o.id) : canObserve && onEdit(o))}
              style={[ss.row, rtl && ss.rowRev, on && { borderColor: C.accent, backgroundColor: C.accentSoft }]}
              accessibilityRole={selecting ? 'checkbox' : 'button'}
              {...(selecting ? checked(on) : null)}
            >
              {selecting ? (
                <View style={[st.box, on && st.boxOn]}>{on && <Icon name="check" size={16} color="#fff" strokeWidth={3} />}</View>
              ) : (
                <Icon name="pencil" size={20} color={C.textMuted} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[ss.title, rtl && RIGHT]}>{o.utterance ? `« ${o.utterance} »` : o.function ? x.functions[o.function] : '—'}</Text>
                <Text style={[ss.sub, rtl && RIGHT]}>{sub}</Text>
                {o.note ? <Text style={[ss.sub, rtl && RIGHT]}>{o.note}</Text> : null}
              </View>
            </Pressable>
          );
        })
      ) : (
        <Note text={x.noObs} />
      )}
    </>
  );
}

function ObservationForm({
  x,
  draft,
  previous,
  onSave,
  onCancel,
  onDelete,
}: {
  x: DataStrings;
  draft: Draft;
  previous: Observation[];
  onSave: (d: Draft) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { uiLang } = useSession();
  const rtl = useNavRtl();
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const set = (patch: Draft) => setD({ ...d, ...patch });
  const recentOf = (k: 'context' | 'partner' | 'result') => [...new Set(previous.map((o) => o[k]).filter((v): v is string => !!v))].slice(0, 6);
  const quick = (k: 'context' | 'partner' | 'result') => {
    const items = recentOf(k);
    if (!items.length) return null;
    return (
      <View style={[st.chips, rtl && { flexDirection: 'row-reverse' }]}>
        {items.map((v) => (
          <Pressable key={v} onPress={() => set({ [k]: v })} style={[st.chip, d[k] === v && st.chipOn]} accessibilityRole="button">
            <Text style={[st.chipText, d[k] === v && { color: '#fff' }]}>{v}</Text>
          </Pressable>
        ))}
      </View>
    );
  };
  return (
    <View style={{ gap: 12 }}>
      <Btn small kind="ghost" icon={rtl ? 'chevronRight' : 'chevronLeft'} label={x.cancel} onPress={onCancel} style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }} />
      <Text style={[ss.title, { fontSize: 20 }, rtl && RIGHT]}>{d.id ? x.editObs : x.addObs}</Text>
      <Note text={`${x.when} : ${when(d.at ?? Date.now(), uiLang)}${d.sampleT ? ` · ${x.fromSample}` : ''}`} />
      <Field label={x.utterance} value={d.utterance ?? ''} onChangeText={(v) => set({ utterance: v })} />
      <Text style={[st.label, rtl && RIGHT]}>{x.function}</Text>
      <View style={[st.chips, rtl && { flexDirection: 'row-reverse' }]}>
        {FUNCTIONS.map((fn: CommFunction) => (
          <Pressable
            key={fn}
            onPress={() => set({ function: d.function === fn ? undefined : fn })}
            style={[st.chip, d.function === fn && st.chipOn]}
            accessibilityRole="radio"
            {...checked(d.function === fn)}
          >
            <Text style={[st.chipText, d.function === fn && { color: '#fff' }]}>{x.functions[fn]}</Text>
          </Pressable>
        ))}
      </View>
      <Field label={x.context} value={d.context ?? ''} onChangeText={(v) => set({ context: v })} />
      {quick('context')}
      <Field label={x.partner} value={d.partner ?? ''} onChangeText={(v) => set({ partner: v })} />
      {quick('partner')}
      <Text style={[st.label, rtl && RIGHT]}>{x.autonomyLabel}</Text>
      <Segmented<'none' | 'spontaneous' | 'prompted' | 'modelled'>
        value={d.autonomy ?? 'none'}
        onChange={(v) => set({ autonomy: v === 'none' ? undefined : v })}
        options={[
          { value: 'none', label: '—' },
          { value: 'spontaneous', label: x.autonomy.spontaneous },
          { value: 'prompted', label: x.autonomy.prompted },
          { value: 'modelled', label: x.autonomy.modelled },
        ]}
      />
      <Field label={x.result} value={d.result ?? ''} onChangeText={(v) => set({ result: v })} />
      {quick('result')}
      <Field label={x.note} value={d.note ?? ''} onChangeText={(v) => set({ note: v })} multiline />
      <View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, rtl && { flexDirection: 'row-reverse' }]}>
        <Btn
          kind="primary"
          icon="check"
          label={x.save}
          disabled={busy || !(d.utterance?.trim() || d.function)}
          onPress={async () => {
            setBusy(true);
            const clean = (s?: string) => (s?.trim() ? s.trim() : undefined);
            await onSave({ ...d, utterance: clean(d.utterance), context: clean(d.context), partner: clean(d.partner), result: clean(d.result), note: clean(d.note) }).catch(() => setBusy(false));
          }}
        />
        {onDelete && <Btn kind="danger" icon="trash" label={x.delete} onPress={() => void onDelete()} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  msg: { fontSize: 14, fontWeight: '600', color: C.success },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  optionOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  confirm: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F4B4AE', backgroundColor: C.helpSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  wordChipText: { fontSize: 14, color: C.text },
  feature: { gap: 4, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  count: { fontSize: 15, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  example: { fontSize: 14, color: C.text },
  sample: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  selBar: { gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accent },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.textMuted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.accent, borderColor: C.accent },
  label: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, color: C.text },
});
