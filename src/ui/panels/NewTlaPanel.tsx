import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SYMBOL_DEFAULTS } from '../../data/symbolMap';
import { TLA_CORE, TLA_FUNCTIONS } from '../../data/defaults';
import { editStrings } from '../../i18n/edit';
import { aiAvailable, askAiForPhoto, askAiForTla } from '../../lib/aiPlanner';
import { countFeature } from '../../lib/product';
import { mainBoardOrder, tlaLayout, type Placed } from '../../lib/boardOrder';
import { pickPhotoForAi, type AiPhoto } from '../../lib/photoForAi';
import { allConceptIds, getConcept, label, symbolOf } from '../../lib/lexicon';
import { pictoCredit, pictoRef } from '../../lib/pictoLibrary';
import { guessSpelling, type PreparedIndex } from '../../lib/pictoSearch';
import { boardToolsStrings } from '../../i18n/boardTools';
import { normalize } from '../../lib/search';
import { planAutomatically, planFromAi, planFromLibrary, type PlanItem, type TlaPlan } from '../../lib/tlaPlanner';
import type { Board, Concept, Profile, Schedule, SymbolRef, WordClass } from '../../model/types';
import { useApp, useBack } from '../../state/AppState';
import { Btn, Field, Panel, Section, Toggle, useNavRtl } from '../common';
import { moveItem, Reorderable } from '../Reorderable';
import { PictoSearch, PictoThumb, usePictoLibrary } from '../PictoPicker';
import { useSeen } from '../Seen';
import { ImportTla } from './EditMenus';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

const MAX_WORDS = 24;
const MAX_STEPS = 12;

/**
 * Pictogram → the built-in word that uses it. When a word and the name of a board or a sequence
 * share a picture ("dentist" the person, "dentist" the activity board), the word wins: it is the
 * one the child has on the main board.
 */
const NAME_OF_A_BOARD = /^[tsbf]_/;
const byPictoKey = new Map<string, string>();
for (const [concept, key] of Object.entries(SYMBOL_DEFAULTS)) {
  const had = byPictoKey.get(key);
  if (!had || (NAME_OF_A_BOARD.test(had) && !NAME_OF_A_BOARD.test(concept))) byPictoKey.set(key, concept);
}

/** Reuses a word the profile already has (same pictogram or same French label). */
function existingConcept(profile: Profile, pictoKey: string | undefined, fr: string): string | undefined {
  const known = pictoKey ? byPictoKey.get(pictoKey) : undefined;
  if (known) return known;
  const key = normalize(fr);
  return allConceptIds(profile).find((id) => {
    const c = getConcept(profile, id);
    return c && c.cls !== 'folder' && normalize(c.labels.fr) === key;
  });
}

/** The kind of a new word, from its pictogram: its topics, or a symbol named "…, to" (an action). */
function guessClass(topics: string[], pictoKey?: string): WordClass {
  if (topics.includes('verb') || (pictoKey && /_,_to$/.test(pictoKey))) return 'verb';
  if (topics.includes('qualifying adjective') || topics.includes('adjective')) return 'descriptor';
  return 'noun';
}

/** Labels for a planned item: the proposal's own words first, then the library's keywords. */
function labelsFor(lib: PreparedIndex, item: PlanItem) {
  const it = lib.byId.get(item.id);
  const fr = item.labels?.fr ?? it?.[4][0] ?? '';
  return { fr, en: item.labels?.en ?? it?.[5][0] ?? fr, ar: item.labels?.ar ?? it?.[6][0] ?? fr };
}

/**
 * Turns planned pictograms into words of the child's profile: a word the profile already has
 * is reused, the others are created with their picture. Shared by "new board" and "new sequence".
 */
export function conceptMaker(lib: PreparedIndex, profile: Profile, stamp: string) {
  const newConcepts: Record<string, Concept> = {};
  const symbols: Record<string, SymbolRef> = {};
  const credits: Record<string, string | undefined> = {};
  const made = new Map<number, string>(); // pictogram → concept, shared by words and steps
  let n = 0;
  const conceptFor = async (item: PlanItem): Promise<string | undefined> => {
    if (made.has(item.id)) return made.get(item.id);
    const it = lib.byId.get(item.id);
    if (!it) return undefined;
    const labels = labelsFor(lib, item);
    const reuse = existingConcept(profile, it[10], labels.fr);
    if (reuse) {
      made.set(item.id, reuse);
      return reuse;
    }
    const cid = `c_${stamp}_${n++}`;
    newConcepts[cid] = {
      id: cid,
      cls: item.cls ?? guessClass(it[7] ?? [], it[10]),
      // Arabic from the library is Standard Arabic; AI proposals come in the family's dialect. Editable either way.
      labels,
      emoji: '⭐',
      custom: true,
    };
    const ref = await pictoRef(item.id).catch(() => undefined);
    if (ref) (symbols[cid] = ref), (credits[cid] = await pictoCredit(item.id).catch(() => undefined));
    made.set(item.id, cid);
    return cid;
  };
  /** The word that names the board or the sequence (its picture: the pictogram closest to the topic). */
  const titleConcept = async (id: string, name: string, plan: { anchor?: number; title?: Partial<Record<'fr' | 'en' | 'ar', string>> } | null) => {
    const anchorItem = plan?.anchor !== undefined ? lib.byId.get(plan.anchor) : undefined;
    newConcepts[id] = {
      id,
      cls: 'noun',
      labels: { fr: name, en: plan?.title?.en ?? anchorItem?.[5][0] ?? name, ar: plan?.title?.ar ?? anchorItem?.[6][0] ?? name },
      emoji: '🗂️',
      custom: true,
    };
    if (plan?.anchor !== undefined) {
      const ref = await pictoRef(plan.anchor).catch(() => undefined);
      if (ref) (symbols[id] = ref), (credits[id] = await pictoCredit(plan.anchor).catch(() => undefined));
    }
  };
  /** Writes the new words and their pictures into the profile. */
  const apply = (d: Profile) => {
    Object.assign(d.customConcepts, newConcepts);
    for (const [cid, symbol] of Object.entries(symbols)) d.overrides[cid] = { symbol, ...(credits[cid] ? { credit: credits[cid] } : {}) };
  };
  return { conceptFor, titleConcept, apply };
}

/** The label shown under a planned pictogram, in the menus' language. */
export function planCaption(lib: PreparedIndex | null | false | undefined, item: PlanItem, ui: 'fr' | 'en' | 'ar'): string {
  if (!lib) return '';
  const l = labelsFor(lib, item);
  return l[ui] || l.fr || l.en || '';
}

/**
 * The steps of a plan: tap one to remove it, hold it then slide to change the order (or the
 * two small arrows), "add a step" searches the pictogram library.
 */
export function StepsEditor({
  steps,
  onChange,
  onHolding,
  max = MAX_STEPS,
}: {
  steps: PlanItem[];
  onChange: (steps: PlanItem[]) => void;
  onHolding?: (on: boolean) => void;
  max?: number;
}) {
  const { t, profile } = useApp();
  const lib = usePictoLibrary();
  const rtl = useNavRtl();
  const ui = profile.settings.uiLang;
  const [adding, setAdding] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {steps.length > 0 && (
        <>
          <Reorderable
            items={steps}
            keyOf={(item, i) => `${item.id}_${i}`}
            onMove={(from, to) => onChange(moveItem(steps, from, to))}
            onHolding={onHolding}
            labels={{ earlier: t.stepEarlier, later: t.stepLater }}
            rtl={rtl}
            render={(item, i, hold) => (
              <PictoThumb
                id={item.id}
                caption={planCaption(lib, item, ui) + (item.timerMin ? ` · ${item.timerMin} ${t.minutes}` : '')}
                removable
                wide
                hold={hold}
                onPress={() => onChange(steps.filter((_, j) => j !== i))}
              />
            )}
          />
          {steps.length > 1 && <Text style={styles.note}>{t.stepsHint}</Text>}
        </>
      )}
      {adding ? (
        <PictoSearch
          lang={ui}
          onPick={(id) => {
            if (steps.length < max) onChange([...steps, { id }]);
          }}
        />
      ) : (
        <Btn small icon="plus" label={t.addStep} onPress={() => setAdding(true)} />
      )}
    </View>
  );
}

export function NewTlaPanel() {
  const app = useApp();
  const onBack = useBack();
  const { t, profile } = app;
  const lib = usePictoLibrary();
  const ui = profile.settings.uiLang;
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState<TlaPlan | null>(null);
  const [aiOk, setAiOk] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [makeSchedule, setMakeSchedule] = useState(true);
  const [adding, setAdding] = useState<'words' | null>(null);
  // A step is being held (hold then slide to reorder): the panel must not scroll under the finger.
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const aiCtl = useRef<AbortController | null>(null);
  const aiEnabled = aiOk && profile.settings.aiSuggestions !== false;
  // For the app's team (families who agreed): the AI's buttons were on screen.
  useSeen(aiEnabled && 'ai');
  const e = editStrings(ui);
  // For the app's team (families who agreed): a board was started, finished, in how long, and
  // whether the suggestion was kept as it was. Never its name or its words.
  const startedAt = useRef(Date.now());
  const edited = useRef(false);
  useEffect(() => {
    countFeature('tlaStart');
  }, []);
  const editPlan = (p: TlaPlan) => {
    edited.current = true;
    setPlan(p);
  };
  // Photo → activity board.
  const [photo, setPhoto] = useState<AiPhoto | null>(null);
  const [hint, setHint] = useState('');
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const fromPhoto = async (source: 'library' | 'camera') => {
    if (!lib) return;
    setPhotoMsg(null);
    const p = await pickPhotoForAi(source).catch(() => null);
    if (!p) return;
    setPhoto(p);
    setPlan(null);
    setAdding(null);
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setReading(true);
    countFeature('ai');
    edited.current = false;
    const ai = await askAiForPhoto(p, hint || topic, ctl.signal, profile.settings.arabic);
    if (ctl.signal.aborted) return;
    setReading(false);
    if (!ai) return setPhotoMsg(e.photoFailed);
    const title = ai.title?.[ui] || ai.title?.fr || hint.trim() || topic.trim();
    if (!topic.trim() && title) setTopic(title);
    const next = planFromAi(lib, title || 'photo', ui, ai);
    if (!next.words.length) return setPhotoMsg(e.photoEmpty);
    setMakeSchedule(false);
    setPlan(next);
  };

  useEffect(() => {
    aiAvailable().then(setAiOk);
    return () => aiCtl.current?.abort();
  }, []);

  const caption = (item: PlanItem) => planCaption(lib, item, ui);

  // The topic words in the order of the child's main board (same kinds together, in the same
  // order): what the list shows is what the board will be, and an added word goes to its place.
  const inBoardOrder = useMemo(() => {
    if (!lib) return (words: PlanItem[]) => words;
    const { sort } = mainBoardOrder(profile);
    const describe = (item: PlanItem): Placed => {
      const it = lib.byId.get(item.id);
      const known = it ? existingConcept(profile, it[10], labelsFor(lib, item).fr) : undefined;
      return known ? { concept: known, cls: getConcept(profile, known)?.cls ?? 'noun' } : { cls: item.cls ?? guessClass(it?.[7] ?? [], it?.[10]) };
    };
    return (words: PlanItem[]) => sort(words, describe);
  }, [lib, profile]);
  const topicWords = useMemo(() => (plan ? inBoardOrder(plan.words) : []), [plan, inBoardOrder]);

  const askAi = async () => {
    if (!lib || !topic.trim()) return;
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setThinking(true);
    countFeature('ai');
    const ai = await askAiForTla(topic, ctl.signal, profile.settings.arabic);
    if (ctl.signal.aborted) return;
    setThinking(false);
    // No answer: nothing is said about it, the automatic suggestion shows and the AI buttons go away.
    if (!ai) void aiAvailable().then(setAiOk);
    const p = ai ? planFromAi(lib, topic, ui, ai) : null;
    if (p && p.words.length) setPlan(p);
    else {
      setPlan((cur) => cur ?? planAutomatically(lib, topic, ui));
    }
  };

  // A word of the topic the library does not know: the spelling it probably meant.
  const [spelling, setSpelling] = useState<string | undefined>();
  const suggest = (about = topic) => {
    if (!lib || !about.trim()) return;
    edited.current = false;
    setAdding(null);
    setSpelling(guessSpelling(lib, about, ui));
    const fromLibrary = planFromLibrary(lib, about, ui);
    if (fromLibrary) setPlan(fromLibrary);
    else if (aiEnabled) {
      setPlan(null);
      askAi();
    } else setPlan(planAutomatically(lib, about, ui));
  };

  const create = async (p: TlaPlan | null) => {
    if (!lib) return;
    setBusy(true);
    const stamp = Date.now().toString(36);
    const boardId = `tla_${stamp}`;
    const titleId = `c_tla_${stamp}`;
    const { conceptFor, titleConcept, apply } = conceptMaker(lib, profile, stamp);

    const words: string[] = [];
    for (const item of inBoardOrder(p?.words ?? [])) {
      const cid = await conceptFor(item);
      if (cid && !words.includes(cid)) words.push(cid);
    }
    const stepConcepts: { concept: string; timerMin?: number }[] = [];
    if (makeSchedule)
      for (const item of p?.steps ?? []) {
        const cid = await conceptFor(item);
        if (cid) stepConcepts.push({ concept: cid, timerMin: item.timerMin });
      }

    await titleConcept(titleId, topic.trim() || t.newTlaTitle, p);

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
      apply(d);
      // Like the main board: each kind of word in its own column (the new words are known now).
      const board: Board = { id: boardId, kind: 'tla', concept: titleId, ...tlaLayout(d, words) };
      d.boards[boardId] = board;
      d.tlaOrder.push(boardId);
      if (schedule) {
        d.schedules.push(schedule);
        d.activeSchedule = schedule.id;
      }
    });
    setBusy(false);
    countFeature('tlaDone');
    countFeature('tlaMs', Math.min(Date.now() - startedAt.current, 30 * 60 * 1000));
    if (p?.source === 'ai') countFeature('tlaAi');
    if (photo) countFeature('tlaPhoto');
    if (p) countFeature(edited.current ? 'tlaChanged' : 'tlaKept');
    app.openTla(boardId);
  };

  const bt = boardToolsStrings(ui);
  const sourceText =
    plan?.source === 'library' ? t.sourceLibrary : plan?.source === 'ai' ? t.sourceAi : plan?.sentence ? bt.sourceSentence : plan ? t.sourceAuto : '';

  return (
    <Panel title={t.newTlaTitle} onClose={() => app.setOverlay(null)} onBack={onBack} tone="edit" maxWidth={900} scrollLocked={holding}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Field label={t.tlaTopic} value={topic} onChangeText={setTopic} onSubmitEditing={() => suggest()} autoFocus placeholder={t.topicExample} />
        </View>
        <Btn kind="primary" icon="star" label={t.suggest} disabled={!lib || !topic.trim() || thinking} onPress={() => suggest()} style={styles.grow} />
      </View>
      {spelling && normalize(spelling) !== normalize(topic) && (
        <View style={styles.sourceRow}>
          <Text style={styles.spellText}>{bt.didYouMean}</Text>
          <Btn
            small
            kind="primary"
            label={ui === 'fr' ? `« ${spelling} » ?` : ui === 'ar' ? `«${spelling}»؟` : `“${spelling}”?`}
            onPress={() => {
              setTopic(spelling);
              suggest(spelling);
            }}
          />
        </View>
      )}
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}

      {aiEnabled && (
        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>{e.photoTitle}</Text>
          <Text style={styles.note}>{e.photoNote}</Text>
          <Field label={e.photoHint} value={hint} onChangeText={setHint} />
          <View style={styles.row}>
            {photo && <Image source={{ uri: photo.uri }} style={styles.photo} accessibilityIgnoresInvertColors />}
            <Btn icon="camera" label={photo ? e.photoAgain : e.takePhoto} disabled={!lib || reading} onPress={() => fromPhoto('camera')} />
            <Btn icon="image" label={e.choosePhoto} disabled={!lib || reading} onPress={() => fromPhoto('library')} />
          </View>
          {reading && (
            <View style={styles.thinking}>
              <ActivityIndicator color={C.accent} />
              <Text style={[styles.note, { flex: 1 }]}>{e.photoReading}</Text>
              <Btn
                small
                label={t.cancel}
                onPress={() => {
                  aiCtl.current?.abort();
                  setReading(false);
                }}
              />
            </View>
          )}
          {photoMsg && <Text style={[styles.note, styles.warn]}>{photoMsg}</Text>}
          <Text style={styles.note}>{e.photoPrivacy}</Text>
        </View>
      )}

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

      {plan && !thinking && (
        <>
          <View style={styles.sourceRow}>
            <Text style={[styles.badge, plan.source === 'ai' && styles.badgeAi]}>{sourceText}</Text>
            {aiEnabled && plan.source !== 'ai' && <Btn small icon="star" label={t.askAi} onPress={askAi} />}
          </View>
          <Text style={styles.note}>{t.suggestHint}</Text>
          <Section title={t.coreBlock}>
            <View style={styles.chips}>
              {[...TLA_CORE.flat(), ...TLA_FUNCTIONS].map((id) => (
                <View key={id} style={styles.chip}>
                  <SymbolView symbol={symbolOf(profile, id)} size={28} />
                  <Text style={styles.chipText}>{label(profile, id, ui)}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title={`${t.topicWords} (${plan.words.length})`}>
            <Text style={styles.note}>{t.topicOrderNote}</Text>
            <View style={styles.grid}>
              {topicWords.map((item) => (
                <PictoThumb
                  key={item.id}
                  id={item.id}
                  caption={caption(item)}
                  removable
                  onPress={() => editPlan({ ...plan, words: plan.words.filter((x) => x.id !== item.id) })}
                />
              ))}
            </View>
            {adding === 'words' ? (
              <PictoSearch
                lang={ui}
                onPick={(id) => {
                  if (!plan.words.some((x) => x.id === id) && plan.words.length < MAX_WORDS)
                    editPlan({ ...plan, words: [...plan.words, { id }] });
                }}
              />
            ) : (
              <Btn small icon="plus" label={t.addWord} onPress={() => setAdding('words')} />
            )}
          </Section>

          <Section title={`${t.stepsTitle} (${plan.steps.length})`}>
            <StepsEditor steps={plan.steps} onChange={(steps) => editPlan({ ...plan, steps })} onHolding={setHolding} />
            {plan.steps.length > 0 && <Toggle label={t.makeSchedule} value={makeSchedule} onChange={setMakeSchedule} />}
          </Section>

          <Btn kind="primary" icon="check" label={busy ? t.creating : t.createTla} disabled={busy} onPress={() => create(plan)} />
        </>
      )}
      <Btn icon="grid" label={t.emptyTla} disabled={busy} onPress={() => create(null)} />
      <ImportTla />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  grow: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  note: { fontSize: 13, color: C.textMuted },
  spellText: { fontSize: 14, fontWeight: '700', color: C.text },
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
  photoCard: { gap: 8, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
  photoTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  photo: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: C.surface },
  step: { alignItems: 'center' },
  stepNum: { fontSize: 13, fontWeight: '900', color: C.textMuted },
});
