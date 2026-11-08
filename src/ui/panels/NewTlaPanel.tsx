import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ARASAAC_DEFAULTS } from '../../data/arasaacMap';
import { TLA_CORE } from '../../data/defaults';
import { aiAvailable, askAiForTla } from '../../lib/aiPlanner';
import { allConceptIds, getConcept, label, symbolOf } from '../../lib/lexicon';
import { pictoToMedia } from '../../lib/pictoLibrary';
import type { PreparedIndex } from '../../lib/pictoSearch';
import { normalize } from '../../lib/search';
import { planAutomatically, planFromAi, planFromLibrary, type PlanItem, type TlaPlan } from '../../lib/tlaPlanner';
import type { Board, Cell, Concept, Profile, Schedule, WordClass } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section, Toggle } from '../common';
import { PictoSearch, PictoThumb, usePictoLibrary } from '../PictoPicker';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

/** Communicative functions added to every suggested TLA (TLA-02: comment, ask, share turns). */
const FUNCTION_WORDS = ['look_at', 'my_turn', 'i_like_it', 'where'];
const MAX_WORDS = 24;
const MAX_STEPS = 12;

const byArasaacId = new Map(Object.entries(ARASAAC_DEFAULTS).map(([concept, id]) => [id, concept]));

/** Reuses a word the profile already has (same pictogram or same French label). */
function existingConcept(profile: Profile, pictoId: number, fr: string): string | undefined {
  const known = byArasaacId.get(pictoId);
  if (known) return known;
  const key = normalize(fr);
  return allConceptIds(profile).find((id) => {
    const c = getConcept(profile, id);
    return c && c.cls !== 'folder' && normalize(c.labels.fr) === key;
  });
}

function guessClass(topics: string[]): WordClass {
  if (topics.includes('verb')) return 'verb';
  if (topics.includes('qualifying adjective')) return 'descriptor';
  return 'noun';
}

/** Labels for a planned item: the proposal's own words first, then ARASAAC's keywords. */
function labelsFor(lib: PreparedIndex, item: PlanItem) {
  const it = lib.byId.get(item.id);
  const fr = item.labels?.fr ?? it?.[4][0] ?? '';
  return { fr, en: item.labels?.en ?? it?.[5][0] ?? fr, ar: item.labels?.ar ?? it?.[6][0] ?? fr };
}

export function NewTlaPanel() {
  const app = useApp();
  const { t, profile } = app;
  const lib = usePictoLibrary();
  const ui = profile.settings.uiLang;
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState<TlaPlan | null>(null);
  const [aiOk, setAiOk] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [makeSchedule, setMakeSchedule] = useState(true);
  const [adding, setAdding] = useState<'words' | 'steps' | null>(null);
  const [busy, setBusy] = useState(false);
  const aiCtl = useRef<AbortController | null>(null);
  const aiEnabled = aiOk && profile.settings.aiSuggestions !== false;

  useEffect(() => {
    aiAvailable().then(setAiOk);
    return () => aiCtl.current?.abort();
  }, []);

  const caption = (item: PlanItem) => {
    if (!lib) return '';
    const l = labelsFor(lib, item);
    return l[ui] || l.fr || l.en || '';
  };

  const askAi = async () => {
    if (!lib || !topic.trim()) return;
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setThinking(true);
    setAiFailed(false);
    const ai = await askAiForTla(topic, ctl.signal);
    if (ctl.signal.aborted) return;
    setThinking(false);
    const p = ai ? planFromAi(lib, topic, ui, ai) : null;
    if (p && p.words.length) setPlan(p);
    else {
      setAiFailed(true);
      setPlan((cur) => cur ?? planAutomatically(lib, topic, ui));
    }
  };

  const suggest = () => {
    if (!lib || !topic.trim()) return;
    setAdding(null);
    setAiFailed(false);
    const fromLibrary = planFromLibrary(lib, topic, ui);
    if (fromLibrary) setPlan(fromLibrary);
    else if (aiEnabled) {
      setPlan(null);
      askAi();
    } else setPlan(planAutomatically(lib, topic, ui));
  };

  const create = async (p: TlaPlan | null) => {
    if (!lib) return;
    setBusy(true);
    const stamp = Date.now().toString(36);
    const boardId = `tla_${stamp}`;
    const titleId = `c_tla_${stamp}`;
    const newConcepts: Record<string, Concept> = {};
    const symbols: Record<string, string> = {};
    const made = new Map<number, string>(); // pictogram → concept, shared by words and steps
    let n = 0;
    const conceptFor = async (item: PlanItem): Promise<string | undefined> => {
      if (made.has(item.id)) return made.get(item.id);
      const it = lib.byId.get(item.id);
      if (!it) return undefined;
      const labels = labelsFor(lib, item);
      const reuse = existingConcept(profile, item.id, labels.fr);
      if (reuse) {
        made.set(item.id, reuse);
        return reuse;
      }
      const cid = `c_${stamp}_${n++}`;
      newConcepts[cid] = {
        id: cid,
        cls: item.cls ?? guessClass(it[7] ?? []),
        // Arabic from ARASAAC is Standard Arabic; AI proposals give Lebanese. Editable either way.
        labels,
        emoji: '⭐',
        custom: true,
      };
      const media = await pictoToMedia(item.id).catch(() => undefined);
      if (media) symbols[cid] = media;
      made.set(item.id, cid);
      return cid;
    };

    const words: string[] = [];
    for (const item of p?.words ?? []) {
      const cid = await conceptFor(item);
      if (cid && !words.includes(cid)) words.push(cid);
    }
    const stepConcepts: { concept: string; timerMin?: number }[] = [];
    if (makeSchedule)
      for (const item of p?.steps ?? []) {
        const cid = await conceptFor(item);
        if (cid) stepConcepts.push({ concept: cid, timerMin: item.timerMin });
      }

    const anchorItem = p?.anchor !== undefined ? lib.byId.get(p.anchor) : undefined;
    const name = topic.trim() || t.newTlaTitle;
    newConcepts[titleId] = {
      id: titleId,
      cls: 'noun',
      labels: {
        fr: name,
        en: p?.title?.en ?? anchorItem?.[5][0] ?? name,
        ar: p?.title?.ar ?? anchorItem?.[6][0] ?? name,
      },
      emoji: '🗂️',
      custom: true,
    };
    if (p?.anchor !== undefined) {
      const media = await pictoToMedia(p.anchor).catch(() => undefined);
      if (media) symbols[titleId] = media;
    }

    // Core words in the two left columns (same place on every TLA), then functions, then topic words.
    const specific = [...FUNCTION_WORDS, ...words];
    const cols = 6;
    const rows = Math.max(TLA_CORE.length, Math.ceil(specific.length / (cols - 2)));
    const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
    for (let r = 0; r < rows; r++) {
      if (TLA_CORE[r]) {
        cells[r * cols] = { concept: TLA_CORE[r][0] };
        cells[r * cols + 1] = { concept: TLA_CORE[r][1] };
      }
      for (let c = 2; c < cols; c++) {
        const w = specific[r * (cols - 2) + (c - 2)];
        if (w) cells[r * cols + c] = { concept: w };
      }
    }
    const board: Board = { id: boardId, kind: 'tla', concept: titleId, rows, cols, cells };
    const schedule: Schedule | undefined = stepConcepts.length
      ? {
          id: `sched_${stamp}`,
          title: '',
          concept: titleId,
          recurring: false,
          steps: stepConcepts.map((s, i) => ({ id: `step_${stamp}_${i}`, concept: s.concept, done: false, tla: boardId, timerMin: s.timerMin })),
        }
      : undefined;
    app.update((d) => {
      Object.assign(d.customConcepts, newConcepts);
      for (const [cid, media] of Object.entries(symbols)) d.overrides[cid] = { symbol: { kind: 'media', name: media } };
      d.boards[boardId] = board;
      d.tlaOrder.push(boardId);
      if (schedule) {
        d.schedules.push(schedule);
        d.activeSchedule = schedule.id;
      }
    });
    setBusy(false);
    app.openTla(boardId);
  };

  const sourceText =
    plan?.source === 'library' ? t.sourceLibrary : plan?.source === 'ai' ? t.sourceAi : plan ? t.sourceAuto : '';

  return (
    <Panel title={t.newTlaTitle} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={900}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Field label={t.tlaTopic} value={topic} onChangeText={setTopic} onSubmitEditing={suggest} autoFocus placeholder="préparer un gâteau" />
        </View>
        <Btn kind="primary" icon="star" label={t.suggest} disabled={!lib || !topic.trim() || thinking} onPress={suggest} style={styles.grow} />
      </View>
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}

      {thinking && (
        <View style={styles.thinking}>
          <ActivityIndicator color={C.accent} />
          <Text style={[styles.note, { flex: 1 }]}>{t.aiThinking}</Text>
          <Btn
            small
            label={t.cancel}
            onPress={() => {
              aiCtl.current?.abort();
              setThinking(false);
              if (lib) setPlan((cur) => cur ?? planAutomatically(lib, topic, ui));
            }}
          />
        </View>
      )}
      {aiFailed && <Text style={[styles.note, styles.warn]}>{t.aiFailed}</Text>}

      {plan && !thinking && (
        <>
          <View style={styles.sourceRow}>
            <Text style={[styles.badge, plan.source === 'ai' && styles.badgeAi]}>{sourceText}</Text>
            {aiEnabled && plan.source !== 'ai' && <Btn small icon="star" label={t.askAi} onPress={askAi} />}
          </View>
          <Text style={styles.note}>{t.suggestHint}</Text>
          <Section title={t.coreBlock}>
            <View style={styles.chips}>
              {[...TLA_CORE.flat(), ...FUNCTION_WORDS].map((id) => (
                <View key={id} style={styles.chip}>
                  <SymbolView symbol={symbolOf(profile, id)} size={28} />
                  <Text style={styles.chipText}>{label(profile, id, ui)}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title={`${t.topicWords} (${plan.words.length})`}>
            <View style={styles.grid}>
              {plan.words.map((item) => (
                <PictoThumb
                  key={item.id}
                  id={item.id}
                  caption={caption(item)}
                  removable
                  onPress={() => setPlan({ ...plan, words: plan.words.filter((x) => x.id !== item.id) })}
                />
              ))}
            </View>
            {adding === 'words' ? (
              <PictoSearch
                lang={ui}
                onPick={(id) => {
                  if (!plan.words.some((x) => x.id === id) && plan.words.length < MAX_WORDS)
                    setPlan({ ...plan, words: [...plan.words, { id }] });
                }}
              />
            ) : (
              <Btn small icon="plus" label={t.addWord} onPress={() => setAdding('words')} />
            )}
          </Section>

          <Section title={`${t.stepsTitle} (${plan.steps.length})`}>
            {plan.steps.length > 0 && (
              <View style={styles.grid}>
                {plan.steps.map((item, i) => (
                  <View key={`${item.id}_${i}`} style={styles.step}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                    <PictoThumb
                      id={item.id}
                      caption={caption(item) + (item.timerMin ? ` · ${item.timerMin} ${t.minutes}` : '')}
                      removable
                      onPress={() => setPlan({ ...plan, steps: plan.steps.filter((_, j) => j !== i) })}
                    />
                  </View>
                ))}
              </View>
            )}
            {adding === 'steps' ? (
              <PictoSearch
                lang={ui}
                onPick={(id) => {
                  if (plan.steps.length < MAX_STEPS) setPlan({ ...plan, steps: [...plan.steps, { id }] });
                }}
              />
            ) : (
              <Btn small icon="plus" label={t.addStep} onPress={() => setAdding('steps')} />
            )}
            {plan.steps.length > 0 && <Toggle label={t.makeSchedule} value={makeSchedule} onChange={setMakeSchedule} />}
          </Section>

          <Btn kind="primary" icon="check" label={busy ? t.creating : t.createTla} disabled={busy} onPress={() => create(plan)} />
        </>
      )}
      <Btn icon="grid" label={t.emptyTla} disabled={busy} onPress={() => create(null)} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  grow: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: C.accentSoft },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: C.success,
    backgroundColor: C.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badgeAi: { color: C.accent, backgroundColor: C.accentSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { alignItems: 'center' },
  stepNum: { fontSize: 13, fontWeight: '900', color: C.textMuted },
});
