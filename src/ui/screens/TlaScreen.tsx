import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { binBoard } from '../../lib/wordBin';
import { isRtl, label, symbolOf } from '../../lib/lexicon';
import { useApp } from '../../state/AppState';
import { boardToolsStrings } from '../../i18n/boardTools';
import type { Board } from '../../model/types';
import { Btn, Segmented } from '../common';
import { Grid } from '../Grid';
import { Icon } from '../Icon';
import { SceneImage } from '../SceneImage';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';
import { selected } from '../a11y';

/** Aided language boards (spec §14): contextual extensions, never a separate app. */
export function TlaScreen() {
  const app = useApp();
  const { profile, tlaId, lang, editMode, t } = app;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { width } = useWindowDimensions();
  const narrow = width < 500;
  const x = boardToolsStrings(profile.settings.uiLang);
  const current = tlaId && profile.boards[tlaId] ? profile.boards[tlaId] : profile.boards[profile.tlaOrder[0]];
  // A visual scene: the big picture on the left, the board's pictograms on the right (one above
  // the other on a narrow screen). "Board" shows the board alone.
  const hasScene = !!current?.scene;
  const showScene = hasScene && app.sceneShown(current!.id);
  const openScene = () => {
    if (!current) return;
    const id = current.id;
    // The place on the left is made at once; the picture is chosen in the panel.
    if (!current.scene) app.update((d) => void (d.boards[id] && (d.boards[id].scene = {})));
    app.setSceneShown(id, true);
    app.setOverlay({ kind: 'scene', id });
  };
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
      // Kept 30 days in the board's bin (Settings → Board → Words and pictures).
      binBoard(d, id);
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
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
                {...selected(active)}
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
        {hasScene && current && !narrow && (
          <Segmented
            value={showScene ? 'scene' : 'board'}
            onChange={(v) => app.setSceneShown(current.id, v === 'scene')}
            options={[
              { value: 'board', label: x.showBoard },
              { value: 'scene', label: x.showScene },
            ]}
          />
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Btn
            small
            icon="plus"
            label={narrow ? undefined : t.newTla}
            accessibilityLabel={t.newTla}
            onPress={() => app.setOverlay(editMode ? { kind: 'newTla' } : { kind: 'pin', then: { kind: 'newTla' } })}
          />
          {/* Caregiver mode: a big picture beside this board (a visual scene). */}
          {editMode && current && (
            <Btn
              small
              icon="scene"
              label={narrow ? undefined : hasScene ? x.sceneChange : x.newScene}
              accessibilityLabel={hasScene ? x.sceneChange : x.newScene}
              onPress={openScene}
            />
          )}
          {editMode && current && (
            <Btn small kind="danger" icon="trash" label={confirmDelete ? '?' : undefined} accessibilityLabel={t.deleteTla} onPress={deleteTla} />
          )}
        </View>
      </View>
      {/* On a narrow screen the choice has its own line, so the boards' tabs keep their room. */}
      {hasScene && current && narrow && (
        <Segmented
          value={showScene ? 'scene' : 'board'}
          onChange={(v) => app.setSceneShown(current.id, v === 'scene')}
          options={[
            { value: 'board', label: x.showBoard },
            { value: 'scene', label: x.showScene },
          ]}
        />
      )}
      {current && showScene ? (
        <View style={[styles.sceneRow, width < 560 && styles.sceneStacked]}>
          <ScenePane board={current} onChoose={editMode ? openScene : undefined} label={x.scenePicture} choose={x.sceneChoose} />
          <View style={styles.sceneBoard}>
            <Grid board={current} />
          </View>
        </View>
      ) : current ? (
        <Grid board={current} />
      ) : (
        // No activity board left (all deleted): say so, and where a new one is made.
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t.noTla}</Text>
        </View>
      )}
    </View>
  );
}

/** The big picture of the scene; in caregiver mode, touching it changes it. */
function ScenePane({ board, onChoose, label, choose }: { board: Board; onChoose?: () => void; label: string; choose: string }) {
  const image = board.scene?.image;
  const inner = image ? (
    <SceneImage image={image} label={label} style={styles.sceneImage} />
  ) : (
    <View style={styles.sceneEmpty}>
      <Icon name="image" size={44} color={C.textMuted} />
      {onChoose ? <Text style={styles.sceneHint}>{choose}</Text> : null}
    </View>
  );
  if (!onChoose) return <View style={styles.scene}>{inner}</View>;
  return (
    <Pressable
      onPress={onChoose}
      accessibilityRole="button"
      accessibilityLabel={image ? label : choose}
      style={({ pressed }) => [styles.scene, styles.sceneEdit, pressed && { opacity: 0.8 }]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sceneRow: { flex: 1, flexDirection: 'row', gap: 8 },
  sceneStacked: { flexDirection: 'column' },
  scene: { flex: 0.7, minHeight: 120, borderRadius: radius.md, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  sceneEdit: { borderStyle: 'dashed', borderColor: C.edit },
  sceneBoard: { flex: 1.3, minWidth: 0, minHeight: 0 },
  sceneImage: { flex: 1 },
  sceneEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  sceneHint: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 18, color: C.textMuted, textAlign: 'center', maxWidth: 520 },
});
