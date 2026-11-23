/**
 * The search field of the whole app: the same ways in as the home search, wherever a word or a
 * picture is looked for (word picker, pictogram library, a professional's materials…).
 *  - say the word (microphone);
 *  - draw it (only while the AI helper is there);
 *  - type it.
 * A new way to search is added here once, so that it is available everywhere.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { strings } from '../i18n/ui';
import { aiAvailable, askAiToReadDrawing, type DrawingGuess, type Stroke } from '../lib/aiPlanner';
import type { Lang, Profile, UiLang } from '../model/types';
import { useAppMaybe } from '../state/AppState';
import { Btn, PanelScrollLock } from './common';
import { DrawPad } from './DrawPad';
import { Icon } from './Icon';
import { useSeen } from './Seen';
import { C, radius } from './theme';
import { VoiceButton } from './VoiceButton';

export function SearchBox({
  value,
  onChange,
  placeholder,
  lang,
  autoFocus,
  profile: givenProfile,
  uiLang,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  /** The language that is listened for when the word is said. */
  lang: Lang;
  autoFocus?: boolean;
  /** Outside a board (a professional's pages): the profile and the menu language to use. */
  profile?: Profile;
  uiLang?: UiLang;
}) {
  const app = useAppMaybe();
  const profile = givenProfile ?? app?.profile;
  const t = uiLang ? strings(uiLang) : app?.t ?? strings('fr');
  const rtl = (uiLang ?? app?.profile.settings.uiLang) === 'ar';
  const [drawing, setDrawing] = useState(false);
  // Searching by drawing needs the AI helper: without it the button is simply not there. A family that
  // turned the AI off (the switch is gone while the AI is switched off, gap review Q47) keeps it off.
  const [aiUp, setAiUp] = useState(false);
  const canDraw = aiUp && profile?.settings.aiSuggestions !== false;
  useEffect(() => {
    let alive = true;
    void aiAvailable().then((ok) => alive && setAiUp(ok));
    return () => {
      alive = false;
    };
  }, []);
  // For the app's team (families who agreed): the AI's "Draw" button was on screen.
  useSeen(canDraw && 'ai');
  // While a finger draws, the panel around must not scroll.
  const lockScroll = useContext(PanelScrollLock);
  useEffect(() => () => lockScroll(false), [lockScroll]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.ways, rtl && { flexDirection: 'row-reverse' }]}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <VoiceButton compact lang={lang} label={t.sayWord} onPartial={onChange} onFinal={onChange} profile={profile} uiLang={uiLang} />
        </View>
        {canDraw && profile ? (
          <Btn
            kind={drawing ? 'primary' : 'secondary'}
            icon="pencil"
            label={t.drawWord}
            onPress={() => setDrawing((d) => !d)}
            style={{ flexGrow: 1, flexBasis: 160, minHeight: 48 }}
          />
        ) : null}
      </View>
      {drawing && canDraw && profile ? <DrawSearch lang={lang} profile={profile} t={t} onWord={onChange} onPen={lockScroll} onGone={() => setAiUp(false)} /> : null}
      <View style={[styles.box, rtl && { flexDirection: 'row-reverse' }]}>
        <View style={styles.glass}>
          <Icon name="search" size={22} color={C.textMuted} />
        </View>
        <TextInput
          autoFocus={autoFocus}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          accessibilityLabel={placeholder}
          placeholderTextColor={C.placeholder}
          style={[styles.input, rtl && { textAlign: 'right' }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={() => onChange('')} style={styles.clear} accessibilityRole="button" accessibilityLabel={t.clearSearch}>
            <Icon name="x" size={20} color={C.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Search by drawing: the drawing is recognised (AI), its guesses fill the search. */
function DrawSearch({
  lang,
  profile,
  t,
  onWord,
  onPen,
  onGone,
}: {
  lang: Lang;
  profile: Profile;
  t: ReturnType<typeof strings>;
  onWord: (w: string) => void;
  onPen: (down: boolean) => void;
  /** The helper stopped answering: "Draw" goes away, without a sentence about it. */
  onGone: () => void;
}) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [state, setState] = useState<'idle' | 'thinking' | 'done' | 'failed'>('idle');
  const [guesses, setGuesses] = useState<DrawingGuess[]>([]);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const wordOf = (g: DrawingGuess) => g[lang] || g.fr || g.en || g.ar || '';

  const find = async () => {
    if (!(await aiAvailable())) return onGone();
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState('thinking');
    const res = await askAiToReadDrawing(strokes, size[0], size[1], c.signal, profile.settings.arabic);
    if (c.signal.aborted) return;
    if (res === null) return onGone();
    setGuesses(res);
    setState(res.length ? 'done' : 'failed');
    if (res.length) onWord(wordOf(res[0]));
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.muted}>{t.drawHint}</Text>
      <DrawPad label={t.drawHint} strokes={strokes} onChange={setStrokes} onSize={(w, h) => setSize([w, h])} onPen={onPen} />
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Btn small icon="undo" label={t.undoStroke} disabled={!strokes.length} onPress={() => setStrokes((s) => s.slice(0, -1))} />
        <Btn
          small
          kind="danger"
          icon="trash"
          label={t.clearDrawing}
          disabled={!strokes.length}
          onPress={() => {
            setStrokes([]);
            setGuesses([]);
            setState('idle');
          }}
        />
        <Btn
          kind="primary"
          icon="search"
          label={t.findDrawing}
          disabled={!strokes.length || state === 'thinking'}
          onPress={find}
          style={{ flexGrow: 1 }}
        />
      </View>
      {state === 'thinking' && (
        <View style={[styles.row, { alignItems: 'center' }]}>
          <ActivityIndicator color={C.accent} />
          <Text style={styles.muted}>{t.drawThinking}</Text>
        </View>
      )}
      {state === 'done' && (
        <View style={[styles.row, { flexWrap: 'wrap', alignItems: 'center' }]}>
          <Text style={styles.guesses}>{t.drawGuesses}</Text>
          {guesses.map((g, i) => (
            <Btn key={i} small kind={i === 0 ? 'primary' : 'secondary'} label={wordOf(g)} onPress={() => onWord(wordOf(g))} />
          ))}
        </View>
      )}
      {state === 'failed' && <Text style={styles.warn}>{t.drawFailed}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  ways: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: C.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 52,
    backgroundColor: C.surface,
  },
  // `minWidth: 0`: in a browser a text field refuses to get narrower than about 20 letters, which
  // pushed the magnifying glass and the cross out of the box on a phone.
  input: { flex: 1, minWidth: 0, fontSize: 18, color: C.text, minHeight: 48 },
  glass: { width: 22, flexShrink: 0 },
  clear: { width: 36, height: 36, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  muted: { color: C.textMuted, fontSize: 14 },
  guesses: { fontSize: 19, fontWeight: '800', color: C.text },
  warn: { fontSize: 14, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
});
