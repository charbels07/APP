import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isRtl, label, symbolOf } from '../../lib/lexicon';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { Grid } from '../Grid';
import { Icon } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

/** Main AAC board (core) and its folders (fringe). */
export function BoardScreen() {
  const app = useApp();
  const { profile, path, goBack, goHome, lang, t, editMode } = app;
  const boardId = path[path.length - 1];
  const board = profile.boards[boardId] ?? profile.boards.core;
  const inFolder = path.length > 1;

  return (
    <View style={{ flex: 1, gap: 6 }}>
      {inFolder && (
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t.back}
          >
            <Icon name="chevronLeft" size={26} />
            <Text style={styles.backText}>{t.back}</Text>
          </Pressable>
          <Pressable onPress={goHome} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
            <Text style={styles.crumb}>{t.home}</Text>
          </Pressable>
          <Icon name="chevronRight" size={18} color={C.textMuted} />
          <SymbolView symbol={symbolOf(profile, board.concept)} size={34} />
          <Text style={[styles.title, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]} numberOfLines={1}>
            {label(profile, board.concept, lang)}
          </Text>
          {editMode && (
            <Btn small icon="pencil" label={t.editWord} onPress={() => app.setOverlay({ kind: 'conceptEditor', concept: board.concept })} />
          )}
        </View>
      )}
      <Grid board={board} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 4,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 48,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  backText: { fontSize: 17, fontWeight: '700', color: C.text },
  crumb: { fontSize: 16, color: C.accent, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
});
