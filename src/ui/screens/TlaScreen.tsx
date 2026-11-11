import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const narrow = useWindowDimensions().width < 500;
  const current = tlaId && profile.boards[tlaId] ? profile.boards[tlaId] : profile.boards[profile.tlaOrder[0]];
  // Caregiver mode: a double tap on a tab opens the activity board's menu (edit, duplicate, share, print).
  const lastTap = useRef<{ id: string; at: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => clearTimeout(lastTap.current?.timer), []);
  const pressTab = (id: string, concept: string, active: boolean) => {
    if (!editMode) return app.openTla(id);
    const prev = lastTap.current;
    const now = Date.now();
    clearTimeout(prev?.timer);
    if (prev && prev.id === id && now - prev.at < 320) {
      lastTap.current = null;
      app.setOverlay({ kind: 'tlaMenu', id });
      return;
    }
    if (!active) app.openTla(id);
    const timer = setTimeout(() => {
      lastTap.current = null;
      if (active) app.setOverlay({ kind: 'conceptEditor', concept });
    }, 320);
    lastTap.current = { id, at: now, timer };
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.tabs}>
          {profile.tlaOrder.map((id) => {
            const b = profile.boards[id];
            if (!b) return null;
            const active = current?.id === id;
            return (
              <Pressable
                key={id}
                onPress={() => pressTab(id, b.concept, active)}
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
        {/* Always there, so a parent finds it; outside caregiver mode it first asks for the code. */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Btn
            small
            icon="plus"
            label={narrow ? undefined : t.newTla}
            accessibilityLabel={t.newTla}
            onPress={() => app.setOverlay(editMode ? { kind: 'newTla' } : { kind: 'pin', then: { kind: 'newTla' } })}
          />
          {editMode && current && (
            <Btn small kind="danger" icon="trash" label={confirmDelete ? '?' : undefined} accessibilityLabel={t.deleteTla} onPress={deleteTla} />
          )}
        </View>
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
  tabText: { fontSize: 16, fontWeight: '700', color: C.text, userSelect: 'none' },
});
