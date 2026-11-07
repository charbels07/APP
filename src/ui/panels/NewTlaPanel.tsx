import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ARASAAC_DEFAULTS } from '../../data/arasaacMap';
import { TLA_CORE } from '../../data/defaults';
import { TLA_SEED_ALIASES, TLA_SEEDS } from '../../data/tlaSeeds';
import { allConceptIds, getConcept, label, symbolOf } from '../../lib/lexicon';
import { pictoToMedia } from '../../lib/pictoLibrary';
import { suggestForTopic } from '../../lib/pictoSearch';
import { normalize } from '../../lib/search';
import type { Board, Cell, Concept, Profile, WordClass } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section } from '../common';
import { PictoSearch, PictoThumb, usePictoLibrary } from '../PictoPicker';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

/** Communicative functions added to every suggested TLA (TLA-02: comment, ask, share turns). */
const FUNCTION_WORDS = ['look_at', 'my_turn', 'i_like_it', 'where'];
const MAX_SUGGESTIONS = 24;

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

export function NewTlaPanel() {
  const app = useApp();
  const { t, profile } = app;
  const lib = usePictoLibrary();
  const ui = profile.settings.uiLang;
  const [topic, setTopic] = useState('');
  const [anchor, setAnchor] = useState<number | undefined>();
  const [ids, setIds] = useState<number[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const caption = (id: number) => {
    const it = lib ? lib.byId.get(id) : undefined;
    return (ui === 'en' ? it?.[5][0] : undefined) ?? it?.[4][0] ?? '';
  };

  const suggest = () => {
    if (!lib || !topic.trim()) return;
    const r = suggestForTopic(lib, topic, ui, 16, { lists: TLA_SEEDS, aliases: TLA_SEED_ALIASES });
    setAnchor(r.anchor);
    setIds(r.ids);
    setAdding(false);
  };

  const create = async (pictos: number[]) => {
    if (!lib) return;
    setBusy(true);
    const stamp = Date.now().toString(36);
    const boardId = `tla_${stamp}`;
    const titleId = `c_tla_${stamp}`;
    const newConcepts: Record<string, Concept> = {};
    const symbols: Record<string, string> = {};
    const words: string[] = [];
    for (const [n, id] of pictos.entries()) {
      const it = lib.byId.get(id);
      if (!it) continue;
      const fr = it[4][0] ?? '';
      const reuse = existingConcept(profile, id, fr);
      if (reuse) {
        if (!words.includes(reuse)) words.push(reuse);
        continue;
      }
      const cid = `c_${stamp}_${n}`;
      newConcepts[cid] = {
        id: cid,
        cls: guessClass(it[7] ?? []),
        // Arabic from ARASAAC is Standard Arabic: the family can switch it to Lebanese in the editor.
        labels: { fr, en: it[5][0] ?? fr, ar: it[6][0] ?? fr },
        emoji: '⭐',
        custom: true,
      };
      const media = await pictoToMedia(id).catch(() => undefined);
      if (media) symbols[cid] = media;
      words.push(cid);
    }
    const anchorItem = anchor !== undefined ? lib.byId.get(anchor) : undefined;
    newConcepts[titleId] = {
      id: titleId,
      cls: 'noun',
      labels: {
        fr: topic.trim() || t.newTlaTitle,
        en: anchorItem?.[5][0] ?? topic.trim(),
        ar: anchorItem?.[6][0] ?? topic.trim(),
      },
      emoji: '🗂️',
      custom: true,
    };
    if (anchor !== undefined) {
      const media = await pictoToMedia(anchor).catch(() => undefined);
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
    app.update((d) => {
      Object.assign(d.customConcepts, newConcepts);
      for (const [cid, media] of Object.entries(symbols)) d.overrides[cid] = { symbol: { kind: 'media', name: media } };
      d.boards[boardId] = board;
      d.tlaOrder.push(boardId);
    });
    setBusy(false);
    app.openTla(boardId);
  };

  return (
    <Panel title={t.newTlaTitle} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={900}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label={t.tlaTopic}
            value={topic}
            onChangeText={setTopic}
            onSubmitEditing={suggest}
            autoFocus
            placeholder="piscine"
          />
        </View>
        <Btn kind="primary" icon="star" label={t.suggest} disabled={!lib || !topic.trim()} onPress={suggest} style={{ alignSelf: 'flex-end' }} />
      </View>
      {lib === null && <Text style={styles.note}>{t.pictoLoading}</Text>}

      {ids && (
        <>
          <Text style={styles.note}>{t.suggestHint}</Text>
          <Section title={t.coreBlock}>
            <View style={styles.chips}>
              {[...TLA_CORE.flat(), ...FUNCTION_WORDS].map((id) => (
                <View key={id} style={styles.chip}>
                  <SymbolView symbol={symbolOf(profile, id)} size={28} />
                  <Text style={styles.chipText}>{label(profile, id, ui === 'en' ? 'en' : 'fr')}</Text>
                </View>
              ))}
            </View>
          </Section>
          <Section title={`${t.topicWords} (${ids.length})`}>
            <View style={styles.grid}>
              {anchor !== undefined && <PictoThumb id={anchor} caption={`★ ${caption(anchor)}`} selected />}
              {ids.map((id) => (
                <PictoThumb key={id} id={id} caption={caption(id)} removable onPress={() => setIds(ids.filter((x) => x !== id))} />
              ))}
            </View>
          </Section>
          {adding ? (
            <PictoSearch
              lang={ui}
              onPick={(id) => {
                if (!ids.includes(id) && ids.length < MAX_SUGGESTIONS) setIds([...ids, id]);
              }}
              selectedId={undefined}
            />
          ) : (
            <Btn icon="plus" label={t.addWord} onPress={() => setAdding(true)} />
          )}
          <Btn kind="primary" icon="check" label={busy ? t.creating : t.createTla} disabled={busy} onPress={() => create(ids)} />
        </>
      )}
      <Btn icon="grid" label={t.emptyTla} disabled={busy} onPress={() => create([])} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  note: { fontSize: 13, color: C.textMuted },
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
});
