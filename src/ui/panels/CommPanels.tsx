import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { aiAvailable, askAiToReadDrawing, type DrawingGuess, type Stroke } from '../../lib/aiPlanner';
import { isRtl, label, LANG_NAMES, symbolOf } from '../../lib/lexicon';
import { search, type Location } from '../../lib/search';
import { speakText } from '../../lib/speech';
import { typedChips } from '../../lib/typedWords';
import { LANGS, type Lang, type UiLang } from '../../model/types';
import { UI_LANG_NAMES } from '../../i18n/ui';
import { useApp } from '../../state/AppState';
import { Btn, Panel, Section } from '../common';
import { DrawPad } from '../DrawPad';
import { usePictoLibrary } from '../PictoPicker';
import { chipPicture } from '../SentenceStrip';
import { Icon } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';
import { VoiceButton } from '../VoiceButton';

export function pathText(loc: Location, app: ReturnType<typeof useApp>): string {
  const { profile, lang, t } = app;
  if (loc.path[0] === 'core') {
    const parts = [t.home];
    if (loc.path.length > 1) parts.push(label(profile, profile.boards[loc.board].concept, lang));
    return parts.join(' › ');
  }
  return `${t.tla} › ${label(profile, profile.boards[loc.board]?.concept ?? '', lang)}`;
}

/** Universal search (spec §11), 1 action from anywhere. */
export function SearchPanel() {
  const app = useApp();
  const { profile, lang, t } = app;
  const [q, setQ] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [penDown, setPenDown] = useState(false);
  const results = useMemo(() => search(profile, q), [profile, q]);
  const wordOf = (g: DrawingGuess) => g[lang] || g.fr || g.en || g.ar || '';

  return (
    <Panel title={t.search} onClose={() => app.setOverlay(null)} scrollLocked={penDown}>
      {/* Three ways in: type, say the word, or draw it. */}
      <View style={styles.ways}>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <VoiceButton compact lang={lang} label={t.sayWord} onPartial={setQ} onFinal={setQ} />
        </View>
        <Btn
          kind={drawing ? 'primary' : 'secondary'}
          icon="pencil"
          label={t.drawWord}
          onPress={() => setDrawing((d) => !d)}
          style={{ flexGrow: 1, flexBasis: 160, minHeight: 48 }}
        />
      </View>
      {drawing && <DrawSearch onWord={setQ} wordOf={wordOf} onPen={setPenDown} />}
      <View style={styles.searchBox}>
        <Icon name="search" size={22} color={C.textMuted} />
        <TextInput
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder={t.searchPlaceholder}
          placeholderTextColor="#98A2B3"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {q ? (
          <Pressable onPress={() => setQ('')} accessibilityLabel={t.clear}>
            <Icon name="x" size={20} color={C.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {q.trim() && !results.length ? <Text style={styles.muted}>{t.noResults}</Text> : null}
      {results.map((r) => {
        const loc = r.locations.find((l) => l.path[0] === 'core') ?? r.locations[0];
        const others = LANGS.filter((l) => l !== lang).map((l) => label(profile, r.concept, l));
        return (
          <View key={r.concept} style={styles.result}>
            <SymbolView symbol={symbolOf(profile, r.concept)} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.resultLabel, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]}>
                {label(profile, r.concept, lang)}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {others.join(' · ')}
              </Text>
              <Text style={styles.path} numberOfLines={1}>
                {loc ? `${pathText(loc, app)} › ${label(profile, r.concept, lang)}` : t.notOnBoard}
                {loc && !loc.visible ? `  (${t.hiddenAtLevel})` : ''}
              </Text>
            </View>
            <Btn small icon="volume" accessibilityLabel={t.speak} onPress={() => app.speakConcept(r.concept)} />
            <Btn
              small
              icon="plus"
              accessibilityLabel={t.add}
              onPress={() => {
                app.touchConcept(r.concept);
                app.setOverlay(null);
              }}
            />
            <Btn small kind="primary" icon="target" label={t.showMe} disabled={!loc} onPress={() => loc && app.showMeWhere(loc)} />
          </View>
        );
      })}
    </Panel>
  );
}

/** Search by drawing: the drawing is recognised (AI), its guesses fill the search. */
function DrawSearch({
  onWord,
  wordOf,
  onPen,
}: {
  onWord: (w: string) => void;
  wordOf: (g: DrawingGuess) => string;
  onPen: (down: boolean) => void;
}) {
  const { t, profile } = useApp();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [state, setState] = useState<'idle' | 'thinking' | 'done' | 'failed' | 'unavailable' | 'off'>('idle');
  const [guesses, setGuesses] = useState<DrawingGuess[]>([]);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const find = async () => {
    if (!profile.settings.aiSuggestions) return setState('off');
    if (!(await aiAvailable())) return setState('unavailable');
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setState('thinking');
    const res = await askAiToReadDrawing(strokes, size[0], size[1], c.signal);
    if (c.signal.aborted) return;
    if (res === null) return setState('unavailable');
    setGuesses(res);
    setState(res.length ? 'done' : 'failed');
    if (res.length) onWord(wordOf(res[0]));
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.muted}>{t.drawHint}</Text>
      <DrawPad strokes={strokes} onChange={setStrokes} onSize={(w, h) => setSize([w, h])} onPen={onPen} />
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
          <Text style={styles.resultLabel}>{t.drawGuesses}</Text>
          {guesses.map((g, i) => (
            <Btn key={i} small kind={i === 0 ? 'primary' : 'secondary'} label={wordOf(g)} onPress={() => onWord(wordOf(g))} />
          ))}
        </View>
      )}
      {state === 'failed' && <Text style={styles.warn}>{t.drawFailed}</Text>}
      {state === 'unavailable' && <Text style={styles.warn}>{t.drawUnavailable}</Text>}
      {state === 'off' && <Text style={styles.warn}>{t.drawAiOff}</Text>}
    </View>
  );
}

/**
 * Keyboard always available for literate users (spec §10). What is typed goes into the sentence
 * as picture cards: each word with the pictogram of the boards or of the offline library.
 */
export function KeyboardPanel() {
  const app = useApp();
  const { t, lang, profile } = app;
  const [text, setText] = useState('');
  const lib = usePictoLibrary();
  const chips = useMemo(() => typedChips(profile, text, lang, lib || null), [profile, text, lang, lib]);
  return (
    <Panel title={t.keyboard} onClose={() => app.setOverlay(null)}>
      <TextInput
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        placeholder={t.typeHere}
        placeholderTextColor="#98A2B3"
        style={[styles.keyboardInput, { textAlign: isRtl(lang) ? 'right' : 'left', writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]}
      />
      {chips.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={styles.typedNote}>{t.typedPreview}</Text>
          <View style={[styles.typedRow, isRtl(lang) && { flexDirection: 'row-reverse' }]} accessibilityLabel={t.typedPreview}>
            {chips.map((c, i) => (
              <View key={`${i}-${c.text}`} style={styles.typedChip}>
                {c.word || c.picto ? <SymbolView symbol={chipPicture(profile, { picture: c })} size={44} /> : null}
                <Text style={[styles.typedText, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]}>{c.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Btn
          kind="primary"
          icon="plus"
          label={t.addToSentence}
          disabled={!text.trim()}
          onPress={() => {
            app.addText(text, chips);
            app.setOverlay(null);
          }}
          style={styles.keyboardMain}
        />
        <Btn kind="success" icon="volume" label={t.speak} disabled={!text.trim()} onPress={() => speakText(text, lang, profile.settings)} style={styles.keyboardBtn} />
        <Btn kind="danger" icon="trash" label={t.clear} disabled={!text} onPress={() => setText('')} style={styles.keyboardBtn} />
      </View>
    </Panel>
  );
}

/** Help button (spec §18): level 1 already spoken; level 2 choices; level 3 info on request. */
export function HelpPanel() {
  const app = useApp();
  const { t, profile, lang } = app;
  const [showInfo, setShowInfo] = useState(false);
  const { help } = profile;
  return (
    <Panel title={`${t.helpTitle} — ${help.message[lang]}`} onClose={() => app.setOverlay(null)} tone="help">
      <View style={styles.helpGrid}>
        {help.options.map((id) => (
          <Pressable
            key={id}
            onPress={() => app.speakConcept(id)}
            style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={label(profile, id, lang)}
          >
            <SymbolView symbol={symbolOf(profile, id)} size={72} />
            <Text style={[styles.helpLabel, { writingDirection: isRtl(lang) ? 'rtl' : 'ltr' }]}>{label(profile, id, lang)}</Text>
          </Pressable>
        ))}
      </View>
      {!showInfo ? (
        <Btn icon="list" label={t.helpMore} onPress={() => setShowInfo(true)} />
      ) : (
        <View style={styles.info}>
          <Text style={styles.infoTitle}>{t.helpHowI}</Text>
          <Text style={styles.infoText}>{help.howICommunicate || t.helpNotSet}</Text>
          <Text style={styles.infoTitle}>{t.helpContact}</Text>
          <Text style={styles.infoText}>{help.emergencyContact || t.helpNotSet}</Text>
        </View>
      )}
    </Panel>
  );
}

/** Language switch: two actions (protected against accidental change, spec §26). */
const UI_LANGS: UiLang[] = ['fr', 'en', 'ar'];

/**
 * Two separate choices, open to everyone from the bar: the words' language (what the
 * device says and writes on the cards) and the navigation language (menus, buttons, guide).
 */
export function LangPanel() {
  const app = useApp();
  const { t, profile } = app;
  const st = profile.settings;
  return (
    <Panel title={t.language} onClose={() => app.setOverlay(null)} maxWidth={560}>
      <Section title={t.wordsLang}>
        <Text style={styles.muted}>{t.wordsLangNote}</Text>
        {/* The child's languages first; the others stay reachable below. */}
        {(st.langs?.length ? st.langs : LANGS).map((l) => (
          <LangChoice
            key={l}
            label={LANG_NAMES[l]}
            active={st.lang === l}
            onPress={() => app.update((d) => void (d.settings.lang = l))}
          />
        ))}
        {st.langs?.length && st.langs.length < LANGS.length ? (
          <>
            <Text style={styles.muted}>{t.otherLangs}</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {LANGS.filter((l) => !st.langs.includes(l)).map((l) => (
                <LangChoice key={l} compact label={LANG_NAMES[l]} active={st.lang === l} onPress={() => app.update((d) => void (d.settings.lang = l))} />
              ))}
            </View>
          </>
        ) : null}
        <Text style={styles.muted}>{t.langNote}</Text>
      </Section>
      <Section title={t.navLang}>
        <Text style={styles.muted}>{t.navLangNote}</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {UI_LANGS.map((l) => (
            <LangChoice
              key={l}
              compact
              label={UI_LANG_NAMES[l]}
              active={st.uiLang === l}
              onPress={() => app.setUiLang(l)}
            />
          ))}
        </View>
      </Section>
      <Btn kind="primary" icon="check" label={t.close} onPress={() => app.setOverlay(null)} />
    </Panel>
  );
}

function LangChoice({ label, active, onPress, compact }: { label: string; active: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.langBtn, compact && styles.langCompact, active && styles.langActive, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.langText, active && { color: C.accent }]}>{label}</Text>
      {active && <Icon name="check" size={compact ? 20 : 24} color={C.accent} strokeWidth={3} />}
    </Pressable>
  );
}

/** Caregiver mode is protected so the user can't modify the board by accident (NAV-04). */
export function PinPanel() {
  const app = useApp();
  const { t, profile } = app;
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const press = (d: string) => {
    const next = (code + d).slice(0, 4);
    setError(false);
    setCode(next);
    if (next.length === 4) {
      if (next === profile.settings.pin) app.setEditMode(true);
      else {
        setError(true);
        setTimeout(() => setCode(''), 400);
      }
    }
  };
  return (
    <Panel title={t.pinTitle} onClose={() => app.setOverlay(null)} maxWidth={380} tone="edit">
      <Text style={[styles.muted, { textAlign: 'center' }]}>{error ? t.pinWrong : t.pinHint}</Text>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < code.length && styles.dotOn, error && { borderColor: C.help }]} />
        ))}
      </View>
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => (k === '⌫' ? setCode((c) => c.slice(0, -1)) : press(k))}
              style={({ pressed }) => [styles.key, styles.keyBtn, pressed && { backgroundColor: C.accentSoft }]}
              accessibilityRole="button"
              accessibilityLabel={k}
            >
              <Text style={styles.keyText}>{k}</Text>
            </Pressable>
          ),
        )}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  ways: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { fontSize: 14, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: C.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  searchInput: { flex: 1, fontSize: 18, color: C.text, minHeight: 48, outlineStyle: 'none' } as object,
  muted: { color: C.textMuted, fontSize: 14 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: C.surfaceAlt,
    flexWrap: 'wrap',
  },
  resultLabel: { fontSize: 19, fontWeight: '800', color: C.text },
  path: { fontSize: 13, color: C.accent, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  /** One row on a tablet; on a phone the main button first, the two others under it. */
  keyboardMain: { flexGrow: 2, flexBasis: 200 },
  keyboardBtn: { flexGrow: 1, flexBasis: 110 },
  typedNote: { fontSize: 13, color: C.textMuted },
  typedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typedChip: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  typedText: { fontSize: 15, fontWeight: '700', color: C.text },
  keyboardInput: {
    minHeight: 120,
    fontSize: 24,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: radius.md,
    padding: 12,
    color: C.text,
    textAlignVertical: 'top',
  },
  helpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  helpBtn: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 130,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#F4B4AE',
    backgroundColor: '#FFF6F5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  helpLabel: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
  info: { backgroundColor: C.surfaceAlt, borderRadius: radius.md, padding: 12, gap: 4 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: C.textMuted },
  infoText: { fontSize: 17, color: C.text, marginBottom: 6 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: C.border,
  },
  langActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  langCompact: { flexGrow: 1, flexBasis: 140, minHeight: 52, paddingHorizontal: 14, gap: 8 },
  langText: { fontSize: 22, fontWeight: '700', color: C.text },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginVertical: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.edit },
  dotOn: { backgroundColor: C.edit },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: 84, height: 64 },
  keyBtn: { borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '700', color: C.text },
});
