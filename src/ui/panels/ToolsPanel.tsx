/**
 * The magnifying glass of the universal bar: one panel, three tabs.
 *  - "Find on the board": find a word by typing, saying or drawing it, and see where it is;
 *  - "A new word": write, and put what was written in the sentence as picture cards;
 *  - "Write to model": dictate or type a sentence and watch the app press each word, record a demonstration.
 * They were three buttons of the bar; the tab that is open is the kind of the overlay
 * (`search`, `keyboard`, `model`), so the guide and the shortcuts still open the right one.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../../state/AppState';
import { selected } from '../a11y';
import { Panel, useNavRtl } from '../common';
import { Icon, type IconName } from '../Icon';
import { C, radius } from '../theme';
import { KeyboardBody, SearchBody } from './CommPanels';
import { ModelBody } from './ModelPanel';

export type Tool = 'search' | 'keyboard' | 'model';
const TOOLS: { tool: Tool; icon: IconName }[] = [
  { tool: 'search', icon: 'search' },
  { tool: 'keyboard', icon: 'keyboard' },
  { tool: 'model', icon: 'pointer' },
];

export function ToolsPanel({ tool }: { tool: Tool }) {
  const app = useApp();
  const { t } = app;
  const rtl = useNavRtl();
  // Three names of several words do not fit beside their icons on a phone or a small tablet:
  // there the name goes under the icon, on up to three lines.
  const narrow = useWindowDimensions().width < 700;
  // While a finger draws a word to search, the panel must not scroll.
  const [drawing, setDrawing] = useState(false);
  // Named by what each one is for: find a word of the board, write a word that is not on it, write a sentence to model.
  const names: Record<Tool, string> = { search: t.toolFind, keyboard: t.toolNewWord, model: t.toolModel };
  return (
    <Panel title={t.search} onClose={() => app.setOverlay(null)} scrollLocked={drawing}>
      <View style={[styles.tabs, rtl && { flexDirection: 'row-reverse' }]} accessibilityRole="tablist">
        {TOOLS.map(({ tool: k, icon }) => {
          const on = k === tool;
          return (
            <Pressable
              key={k}
              onPress={() => app.setOverlay({ kind: k })}
              style={({ pressed }) => [styles.tab, narrow && styles.tabNarrow, on && styles.tabOn, pressed && { opacity: 0.75 }]}
              accessibilityRole="tab"
              accessibilityLabel={names[k]}
              {...selected(on)}
            >
              <Icon name={icon} size={20} color={on ? '#fff' : C.text} />
              <Text style={[styles.tabText, narrow && styles.tabTextNarrow, on && { color: '#fff' }]} numberOfLines={narrow ? 3 : 2}>
                {names[k]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tool === 'search' && <SearchBody onPen={setDrawing} />}
      {tool === 'keyboard' && <KeyboardBody />}
      {tool === 'model' && <ModelBody />}
    </Panel>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  tabNarrow: { flexDirection: 'column', gap: 2, paddingHorizontal: 4, paddingVertical: 6, minHeight: 56 },
  tabOn: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { fontSize: 15, fontWeight: '700', color: C.text, flexShrink: 1, textAlign: 'center' },
  tabTextNarrow: { fontSize: 13, textAlign: 'center' },
});
