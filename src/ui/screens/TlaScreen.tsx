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
import { sceneSize, stepScene, toggleMark, type Mark } from '../../lib/sceneMarks';
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
  // Circles drawn on the scene's picture with a double touch: a gesture of the moment, never saved.
  const [marks, setMarks] = useState<Record<string, Mark[]>>({});
  const sceneShare = sceneSize(current?.scene?.size);
  const resizeScene = (dir: 1 | -1) => {
    if (!current) return;
    const id = current.id;
    app.update((d) => {
      const sc = d.boards[id]?.scene;
      if (sc) sc.size = stepScene(sc.size, dir);
    });
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
          <ScenePane
            board={current}
            share={sceneShare}
            onChoose={editMode ? openScene : undefined}
            onResize={editMode ? resizeScene : undefined}
            marks={marks[current.id] ?? []}
            onMarks={(m) => setMarks((all) => ({ ...all, [current.id]: m }))}
          />
          {/* The board takes the rest of the room, whatever size the picture is given. */}
          <View style={[styles.sceneBoard, { flex: 1 - sceneShare }]}>
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

/**
 * The big picture of the scene. A double touch on a place circles it (again on the circle: it goes).
 * In caregiver mode: "Smaller picture" / "Bigger picture" (the board beside it takes the rest), and an
 * empty place opens the choice of the picture.
 */
function ScenePane({
  board,
  share,
  onChoose,
  onResize,
  marks,
  onMarks,
}: {
  board: Board;
  share: number;
  onChoose?: () => void;
  onResize?: (dir: 1 | -1) => void;
  marks: Mark[];
  onMarks: (m: Mark[]) => void;
}) {
  const { profile } = useApp();
  const x = boardToolsStrings(profile.settings.uiLang);
  const image = board.scene?.image;
  const flex = { flex: share };
  if (!image)
    return onChoose ? (
      <Pressable
        onPress={onChoose}
        accessibilityRole="button"
        accessibilityLabel={x.sceneChoose}
        style={({ pressed }) => [styles.scene, flex, styles.sceneEdit, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.sceneEmpty}>
          <Icon name="image" size={44} color={C.textMuted} />
          <Text style={styles.sceneHint}>{x.sceneChoose}</Text>
        </View>
      </Pressable>
    ) : (
      <View style={[styles.scene, flex]}>
        <View style={styles.sceneEmpty}>
          <Icon name="image" size={44} color={C.textMuted} />
        </View>
      </View>
    );
  return (
    <View style={[styles.scene, flex, onResize && styles.sceneEdit]}>
      <SceneImage
        image={image}
        label={x.sceneTouch}
        style={styles.sceneImage}
        marks={marks}
        onDoubleTouch={(px, py, w, h) => onMarks(toggleMark(marks, px, py, w, h))}
      />
      {onResize && (
        <View style={styles.sceneTools}>
          <Btn small icon="minus" accessibilityLabel={x.smaller} disabled={share <= 0.2} onPress={() => onResize(-1)} />
          <Btn small icon="plus" accessibilityLabel={x.bigger} disabled={share >= 0.75} onPress={() => onResize(1)} />
        </View>
      )}
      {marks.length > 0 && (
        <View style={styles.sceneClear}>
          <Btn small icon="x" label={x.clearCircles} onPress={() => onMarks([])} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sceneRow: { flex: 1, flexDirection: 'row', gap: 8 },
  sceneStacked: { flexDirection: 'column' },
  scene: { minHeight: 120, borderRadius: radius.md, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  sceneEdit: { borderStyle: 'dashed', borderColor: C.edit },
  sceneBoard: { minWidth: 0, minHeight: 0 },
  sceneTools: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 6 },
  sceneClear: { position: 'absolute', bottom: 6, right: 6 },
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
