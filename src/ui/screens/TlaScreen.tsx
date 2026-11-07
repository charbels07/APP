import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { blankTla } from '../../data/defaults';
import { isRtl, label, symbolOf } from '../../lib/lexicon';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { Grid } from '../Grid';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

/** Aided language boards (spec §14): contextual extensions, never a separate app. */
export function TlaScreen() {
  const app = useApp();
  const { profile, tlaId, lang, editMode, t } = app;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const current = tlaId && profile.boards[tlaId] ? profile.boards[tlaId] : profile.boards[profile.tlaOrder[0]];

  const createTla = () => {
    const stamp = Date.now().toString(36);
    const conceptId = `c_tla_${stamp}`;
    const boardId = `tla_${stamp}`;
    app.update((d) => {
      d.customConcepts[conceptId] = {
        id: conceptId,
        cls: 'noun',
        labels: { fr: 'Nouveau TLA', en: 'New board', ar: 'لوح جديد' },
        emoji: '🗂️',
        custom: true,
      };
      d.boards[boardId] = blankTla(boardId, conceptId);
      d.tlaOrder.push(boardId);
    });
    app.openTla(boardId);
    app.setOverlay({ kind: 'conceptEditor', concept: conceptId });
  };

  const deleteTla = () => {
    if (!current) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    const id = current.id;
    app.update((d) => {
      d.tlaOrder = d.tlaOrder.filter((x) => x !== id);
      delete d.boards[id];
      if (d.lastTla === id) d.lastTla = d.tlaOrder[0];
      for (const s of d.schedules) for (const st of s.steps) if (st.tla === id) delete st.tla;
    });
    setConfirmDelete(false);
    app.openTla(profile.tlaOrder.find((x) => x !== id));
  };

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {profile.tlaOrder.map((id) => {
            const b = profile.boards[id];
            if (!b) return null;
            const active = current?.id === id;
            return (
              <Pressable
                key={id}
                onPress={() => (active && editMode ? app.setOverlay({ kind: 'conceptEditor', concept: b.concept }) : app.openTla(id))}
                style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <SymbolView symbol={symbolOf(profile, b.concept)} size={30} />
                <Text style={[styles.tabText, active && { color: C.accent }, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]}>
                  {label(profile, b.concept, lang)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {editMode && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Btn small icon="plus" label={t.newTla} onPress={createTla} />
            {current && (
              <Btn small kind="danger" icon="trash" label={confirmDelete ? '?' : undefined} accessibilityLabel={t.deleteTla} onPress={deleteTla} />
            )}
          </View>
        )}
      </View>
      {current ? <Grid board={current} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { gap: 6, paddingRight: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  tabText: { fontSize: 16, fontWeight: '700', color: C.text },
});
