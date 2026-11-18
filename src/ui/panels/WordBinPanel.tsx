/**
 * "Deleted words and boards": what was deleted from the child's board in the last 30 days, put
 * back in one touch. A word goes back to its own place when it is still empty, never moving
 * another word (positions are the child's motor plan). Opened from Settings → Board → Words and pictures.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { backupStrings } from '../../i18n/backup';
import { label } from '../../lib/lexicon';
import { binItems, takeBack } from '../../lib/wordBin';
import { useApp, useBack } from '../../state/AppState';
import { Btn, Panel } from '../common';
import { Note } from '../settings/SettingsScreen';
import { Row, day } from '../settings/TeamTab';
import { SymbolView } from '../SymbolView';
import { symbolOf } from '../../lib/lexicon';
import { C } from '../theme';

export function WordBinPanel() {
  const app = useApp();
  const onBack = useBack();
  const { profile } = app;
  const ui = profile.settings.uiLang ?? 'fr';
  const t = backupStrings(ui);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const items = binItems(profile);
  const boardName = (id: string) => {
    const b = profile.boards[id];
    return b ? label(profile, b.concept, app.lang) : id;
  };
  return (
    <Panel title={t.wordBin} onClose={() => app.setOverlay(null)} onBack={onBack} tone="edit">
      <View style={{ gap: 10 }}>
        <Note text={t.wordBinNote} />
        {items.length === 0 && <Note text={t.wordBinEmpty} />}
        {items.map((it) => {
          const name = it.kind === 'cell' ? label(profile, it.cell.concept, app.lang) : label(profile, it.board.concept, app.lang);
          return (
            <Row
              key={it.id}
              icon={it.kind === 'cell' ? 'image' : 'grid'}
              title={name}
              sub={`${it.kind === 'cell' ? t.onBoard(boardName(it.board)) : t.activityBoard} · ${day(it.at, ui)}`}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <SymbolView symbol={symbolOf(profile, it.kind === 'cell' ? it.cell.concept : it.board.concept)} size={32} />
                  <Btn
                    small
                    icon="undo"
                    label={t.putBack}
                    accessibilityLabel={`${t.putBack} ${name}`}
                    onPress={() => {
                      // Tried on a copy first: the answer is known before the board changes.
                      const out = takeBack(structuredClone(profile), it.id);
                      if (out === 'back' || out === 'moved') app.update((d) => void takeBack(d, it.id));
                      setMsg(
                        out === 'full'
                          ? { ok: false, text: t.boardFull }
                          : out === 'moved'
                            ? { ok: true, text: t.backMoved }
                            : out === 'back'
                              ? { ok: true, text: t.backPlace }
                              : { ok: false, text: t.failed },
                      );
                    }}
                  />
                </View>
              }
            />
          );
        })}
        {msg ? (
          <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '700' }} accessibilityLiveRegion="polite">
            {msg.text}
          </Text>
        ) : null}
      </View>
    </Panel>
  );
}
