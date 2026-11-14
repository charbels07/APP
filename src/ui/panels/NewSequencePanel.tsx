/**
 * "New sequence" (Schedule screen, caregiver mode): the family types what the sequence is
 * about and the app proposes its steps, like it proposes the words of a new activity board:
 *   1. from the situation library when the topic is recognised (works offline);
 *   2. otherwise from the AI helper, when it is available and allowed in Settings;
 *   3. otherwise the steps are added by hand.
 * Steps stay a proposal: remove, add and reorder them (hold then slide) before creating.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { aiAvailable, askAiForTla } from '../../lib/aiPlanner';
import { planFromAi, planFromLibrary, type PlanItem, type TlaPlan } from '../../lib/tlaPlanner';
import type { Schedule } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section } from '../common';
import { usePictoLibrary } from '../PictoPicker';
import { C, radius } from '../theme';
import { conceptMaker, StepsEditor } from './NewTlaPanel';

export function NewSequencePanel() {
  const app = useApp();
  const { t, profile } = app;
  const lib = usePictoLibrary();
  const ui = profile.settings.uiLang;
  const [topic, setTopic] = useState('');
  /** null: nothing asked yet. */
  const [plan, setPlan] = useState<Pick<TlaPlan, 'anchor' | 'title' | 'source'> | null>(null);
  const [steps, setSteps] = useState<PlanItem[]>([]);
  const [aiOk, setAiOk] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const aiCtl = useRef<AbortController | null>(null);
  const aiEnabled = aiOk && profile.settings.aiSuggestions !== false;

  useEffect(() => {
    aiAvailable().then(setAiOk);
    return () => aiCtl.current?.abort();
  }, []);

  const askAi = async () => {
    if (!lib || !topic.trim()) return;
    aiCtl.current?.abort();
    const ctl = new AbortController();
    aiCtl.current = ctl;
    setThinking(true);
    const ai = await askAiForTla(topic, ctl.signal, profile.settings.arabic);
    if (ctl.signal.aborted) return;
    setThinking(false);
    if (!ai) void aiAvailable().then(setAiOk);
    const p = ai ? planFromAi(lib, topic, ui, ai) : null;
    if (p?.steps.length) {
      setPlan(p);
      setSteps(p.steps);
    } else setPlan((cur) => cur ?? { source: 'auto' });
  };

  const suggest = () => {
    if (!lib || !topic.trim()) return;
    const fromLibrary = planFromLibrary(lib, topic, ui);
    if (fromLibrary?.steps.length) {
      setPlan(fromLibrary);
      setSteps(fromLibrary.steps);
    } else if (aiEnabled) {
      setPlan(null);
      setSteps([]);
      void askAi();
    } else {
      // No ready-made steps: the picture of the topic is kept for the sequence's own card.
      setPlan({ anchor: fromLibrary?.anchor, source: 'auto' });
      setSteps([]);
    }
  };

  /** `withSteps` false: an empty sequence, completed by hand in its editor. */
  const create = async (withSteps: boolean) => {
    setBusy(true);
    const stamp = Date.now().toString(36);
    const id = `sched_${stamp}`;
    const name = topic.trim();
    let schedule: Schedule = { id, title: name || t.newSchedule, concept: 's_morning', recurring: false, steps: [] };
    let write: ((d: typeof profile) => void) | undefined;
    if (lib && (name || (withSteps && steps.length))) {
      const { conceptFor, titleConcept, apply } = conceptMaker(lib, profile, stamp);
      const made: Schedule['steps'] = [];
      if (withSteps)
        for (const [i, item] of steps.entries()) {
          const concept = await conceptFor(item);
          if (concept) made.push({ id: `step_${stamp}_${i}`, concept, done: false, timerMin: item.timerMin });
        }
      if (name) {
        // The sequence gets its own card (name + picture), like an activity board.
        const titleId = `c_seq_${stamp}`;
        await titleConcept(titleId, name, plan);
        schedule = { id, title: '', concept: titleId, recurring: false, steps: made };
      } else schedule = { ...schedule, steps: made };
      write = apply;
    }
    app.update((d) => {
      write?.(d);
      d.schedules.push(schedule);
      d.activeSchedule = id;
    });
    setBusy(false);
    // An empty sequence opens in its editor (to add steps); a ready one is shown at once.
    app.setOverlay(schedule.steps.length ? null : { kind: 'scheduleEditor', id });
  };

  const sourceText = plan?.source === 'library' ? t.sourceLibrary : plan?.source === 'ai' ? t.sourceAi : '';

  return (
    <Panel title={t.newSchedule} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={820} scrollLocked={holding}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Field label={t.seqTopic} value={topic} onChangeText={setTopic} onSubmitEditing={suggest} autoFocus />
        </View>
        <Btn kind="primary" icon="star" label={t.suggestSteps} disabled={!lib || !topic.trim() || thinking} onPress={suggest} style={styles.grow} />
      </View>
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}

      {thinking && (
        <View style={styles.thinking}>
          <ActivityIndicator color={C.accent} />
          <Text style={[styles.note, { flex: 1 }]}>{t.seqThinking}</Text>
          <Btn
            small
            label={t.cancel}
            onPress={() => {
              aiCtl.current?.abort();
              setThinking(false);
              setPlan((cur) => cur ?? { source: 'auto' });
            }}
          />
        </View>
      )}

      {plan && !thinking && (
        <>
          <View style={styles.sourceRow}>
            {sourceText ? <Text style={[styles.badge, plan.source === 'ai' && styles.badgeAi]}>{sourceText}</Text> : <Text style={[styles.note, styles.warn]}>{t.noSteps}</Text>}
            {aiEnabled && plan.source !== 'ai' && <Btn small icon="star" label={t.askAi} onPress={askAi} />}
          </View>
          <Section title={`${t.stepsTitle} (${steps.length})`}>
            <StepsEditor steps={steps} onChange={setSteps} onHolding={setHolding} />
          </Section>
          <Btn kind="primary" icon="check" label={busy ? t.creating : t.createSeq} disabled={busy || !steps.length} onPress={() => create(true)} />
        </>
      )}
      <Btn icon="plus" label={t.emptySeq} disabled={busy} onPress={() => create(false)} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  grow: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md, flex: 1 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: C.accentSoft },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { fontSize: 13, fontWeight: '700', color: C.success, backgroundColor: C.successSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  badgeAi: { color: C.accent, backgroundColor: C.accentSoft },
});
