import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { availableLangs, isFolderName, isRtl, label, langName, symbolOf } from '../../lib/lexicon';
import { countFeature } from '../../lib/product';
import { search, type Location } from '../../lib/search';
import { speakText } from '../../lib/speech';
import { typedChips } from '../../lib/typedWords';
import type { Lang, UiLang } from '../../model/types';
import { UI_LANG_NAMES } from '../../i18n/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { forgotCodeWays } from '../../lib/forgotCode';
import { opensAlone, useApp } from '../../state/AppState';
import { useBoard } from '../../state/BoardContext';
import { useSessionMaybe } from '../../state/Session';
import { Btn, Panel, Section, useNavRtl } from '../common';
import { usePictoLibrary } from '../PictoPicker';
import { chipPicture } from '../SentenceStrip';
import { Icon } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';
import { SearchBox } from '../SearchBox';
import { VoiceButton } from '../VoiceButton';
import { pressed } from '../a11y';
import { ProveItsYou } from './ForgotCode';
import { LinkBtn } from '../start/StartLayout';

export function pathText(loc: Location, app: ReturnType<typeof useApp>): string {
  const { profile, lang, t } = app;
  if (loc.path[0] === 'core') {
    const parts = [t.home];
    if (loc.path.length > 1) parts.push(label(profile, profile.boards[loc.board].concept, lang));
    return parts.join(' › ');
  }
  return `${t.tla} › ${label(profile, profile.boards[loc.board]?.concept ?? '', lang)}`;
}

/**
 * Universal search (spec §11), 1 action from anywhere. First tab of the tools panel (ToolsPanel).
 * The field itself (type, say, draw) is the one used everywhere a word is looked for: `SearchBox`.
 */
export function SearchBody() {
  const app = useApp();
  const { profile, lang, t } = app;
  const [q, setQ] = useState('');
  const results = useMemo(() => search(profile, q), [profile, q]);
  // For the app's team (families who agreed): the search was used; it found nothing (counted once
  // the person stops typing); something was chosen. Never the word that was looked for.
  const used = useRef(false);
  const none = !!q.trim() && results.length === 0;
  useEffect(() => {
    if (q.trim() && !used.current) {
      used.current = true;
      countFeature('search');
    }
  }, [q]);
  useEffect(() => {
    if (!none) return;
    const id = setTimeout(() => countFeature('searchNone'), 1500);
    return () => clearTimeout(id);
  }, [none, q]);

  return (
    <>
      <SearchBox autoFocus value={q} onChange={setQ} placeholder={t.searchPlaceholder} lang={lang} />
      {q.trim() && !results.length ? <Text style={styles.muted}>{t.noResults}</Text> : null}
      {results.map((r) => {
        const loc = r.locations.find((l) => l.path[0] === 'core') ?? r.locations[0];
        const others = availableLangs(profile.settings).filter((l) => l !== lang).map((l) => label(profile, r.concept, l));
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
            {/* A folder is found to see where it is: its name is not a word to say or to add. */}
            {!isFolderName(profile, r.concept) && (
              <>
                <Btn
                  small
                  icon="volume"
                  accessibilityLabel={t.speak}
                  onPress={() => {
                    countFeature('searchPick');
                    app.speakConcept(r.concept);
                  }}
                />
                <Btn
                  small
                  icon="plus"
                  accessibilityLabel={t.add}
                  onPress={() => {
                    countFeature('searchPick');
                    app.touchConcept(r.concept);
                    app.setOverlay(null);
                  }}
                />
              </>
            )}
            <Btn small kind="primary" icon="target" label={t.showMe} disabled={!loc} onPress={() => {
                if (!loc) return;
                countFeature('searchPick');
                app.showMeWhere(loc);
              }}
            />
          </View>
        );
      })}
    </>
  );
}

/**
 * Keyboard always available for literate users (spec §10). What is typed goes into the sentence
 * as picture cards: each word with the pictogram of the boards or of the offline library.
 */
export function KeyboardBody() {
  const app = useApp();
  const { t, lang, profile } = app;
  const [text, setText] = useState('');
  const lib = usePictoLibrary();
  const chips = useMemo(() => typedChips(profile, text, lang, lib || null), [profile, text, lang, lib]);
  return (
    <>
      {/* Said instead of typed: what is heard is added after what is already written. */}
      <VoiceButton compact lang={lang} label={t.sayWord} onFinal={(said) => setText((cur) => (cur.trim() ? `${cur.trim()} ` : '') + said)} />
      <TextInput
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        placeholder={t.typeHere}
        placeholderTextColor={C.placeholder}
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
    </>
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
        {(st.langs?.length ? st.langs : availableLangs(st)).map((l) => (
          <LangChoice
            key={l}
            label={langName(st, l)}
            active={st.lang === l}
            onPress={() => app.update((d) => void (d.settings.lang = l))}
          />
        ))}
        {st.langs?.length && st.langs.length < availableLangs(st).length ? (
          <>
            <Text style={styles.muted}>{t.otherLangs}</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {availableLangs(st).filter((l) => !st.langs.includes(l)).map((l) => (
                <LangChoice key={l} compact label={langName(st, l)} active={st.lang === l} onPress={() => app.update((d) => void (d.settings.lang = l))} />
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
      {...pressed(active)}
      accessibilityLabel={label}
    >
      <Text style={[styles.langText, active && { color: C.accent }]}>{label}</Text>
      {active && <Icon name="check" size={compact ? 20 : 24} color={C.accent} strokeWidth={3} />}
    </Pressable>
  );
}

/** After 5 wrong codes: a pause of 30 s, then 1, 2 and 5 minutes for each further wrong code. */
const PIN_LOCK = 'caa.pinlock';
export const pinPause = (fails: number) => (fails < 5 ? 0 : [30, 60, 120, 300][Math.min(fails - 5, 3)] * 1000);
/** 1234, 0000, 1111…: refused when the family chooses its code. */
export const pinTooEasy = (code: string) => code === '1234' || /^(\d)\1{3}$/.test(code);

/**
 * Caregiver mode is protected so the user can't modify the board by accident (NAV-04).
 * The first time, the person simply chooses a code (typed twice) and then uses it each time;
 * there is no code to know beforehand. Wrong codes are counted on this device.
 * "Forgot the code?": the family shows the account is theirs (password or a code by e-mail),
 * then chooses a new code the usual way (src/ui/panels/ForgotCode.tsx).
 */
export function PinPanel() {
  const app = useApp();
  const board = useBoard();
  const account = useSessionMaybe()?.account;
  const { t, profile } = app;
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  // On a professional's board the code is her own (kept with her account), never the family's.
  const own = app.ownCode;
  const pin = own ? own.value ?? '' : profile.settings.pin;
  // "1234" is only the value a new profile starts with: it means "not chosen yet".
  const unset = own ? !/^\d{4}$/.test(pin) : pin === '1234';
  // In a child's profile the family chooses the code (the preview has no account: anyone trying it does).
  const canChoose = !!own || !board || board.manager;
  const [step, setStep] = useState<'enter' | 'forgot' | 'choose' | 'repeat'>(unset && canChoose ? 'choose' : 'enter');
  const [chosen, setChosen] = useState('');
  // Code forgotten: only the family (never a linked tablet, nor a professional on her own code).
  const forgot = useMemo(
    () => (app.preview ? null : forgotCodeWays({ account, manager: !!board?.manager, ownCode: !!own })),
    [app.preview, account, board?.manager, own],
  );
  // The account was confirmed: the new code is chosen without the old one.
  const [proved, setProved] = useState(false);
  // The way around the code went away meanwhile (rights changed, signed out): back to the keypad.
  useEffect(() => {
    if (step === 'forgot' && !forgot) setStep('enter');
  }, [step, forgot]);
  const [lock, setLock] = useState({ fails: 0, until: 0 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    AsyncStorage.getItem(PIN_LOCK)
      .then((raw) => raw && setLock(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  const wait = Math.max(0, Math.ceil((lock.until - now) / 1000));
  const waiting = wait > 0;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [waiting]);
  const saveLock = (l: { fails: number; until: number }) => {
    setLock(l);
    setNow(Date.now());
    void AsyncStorage.setItem(PIN_LOCK, JSON.stringify(l)).catch(() => {});
  };
  // What comes after the right code. "guide": the first opening of a new board, where the family
  // chooses its code before reading the guide.
  const then = app.overlay?.kind === 'pin' ? app.overlay.then : undefined;
  const beforeGuide = then?.kind === 'guide';
  const rtl = useNavRtl();
  const open = () => {
    // The settings, the child lock and the guide open on their own: the board stays as the child uses it.
    if (then && opensAlone(then)) return app.setOverlay(then);
    app.setEditMode(true);
    if (then) app.setOverlay(then);
  };
  const again = (text: string) => {
    setMsg(text);
    setTimeout(() => setCode(''), 400);
  };
  const press = (d: string) => {
    if (waiting) return;
    const next = (code + d).slice(0, 4);
    setMsg(null);
    setCode(next);
    if (next.length < 4) return;
    if (step === 'enter') {
      if (next !== pin) {
        const fails = lock.fails + 1;
        saveLock({ fails, until: Date.now() + pinPause(fails) });
        return again(t.pinWrong);
      }
      if (lock.fails) saveLock({ fails: 0, until: 0 });
      open();
    } else if (step === 'choose') {
      if (pinTooEasy(next)) return again(t.pinTooEasy);
      setChosen(next);
      setStep('repeat');
      setCode('');
    } else if (step === 'repeat') {
      if (next !== chosen) {
        setStep('choose');
        return again(t.pinMismatch);
      }
      if (own) own.save(next);
      else
        app.update((p) => {
          p.settings.pin = next;
        });
      open();
    }
  };
  const hint =
    msg ??
    (waiting
      ? t.pinLocked.replace('{n}', String(wait))
      : step === 'choose'
        ? proved
          ? t.pinForgotOk
          : t.pinChoose
        : step === 'repeat'
          ? t.pinRepeat
          : unset
            ? t.pinNotChosen
            : t.pinHint);
  const error = !!msg;
  const confirmed = () => {
    // The person proved who they are: the count of wrong codes starts again.
    saveLock({ fails: 0, until: 0 });
    setProved(true);
    setMsg(null);
    setCode('');
    setStep('choose');
  };
  const rtlText = rtl ? ({ textAlign: 'right', writingDirection: 'rtl' } as const) : null;
  const keypad = (
    <>
      <Text
        style={[
          styles.muted,
          { textAlign: 'center' },
          (error || waiting) && { color: C.help, fontWeight: '700' },
          proved && step === 'choose' && !error && { color: C.success, fontWeight: '700' },
        ]}
        accessibilityLiveRegion="polite"
      >
        {hint}
      </Text>
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
    </>
  );
  return (
    <Panel
      title={step === 'enter' ? t.pinTitle : step === 'forgot' ? t.pinForgotTitle : t.pinChooseTitle}
      // Closed without choosing, on the first opening: the guide still opens (the code is asked later).
      onClose={() => app.setOverlay(beforeGuide ? { kind: 'guide' } : null)}
      // From "Forgot the code?": Back (and Escape) return to the keypad.
      onBack={step === 'forgot' ? () => setStep('enter') : undefined}
      maxWidth={step === 'enter' ? 380 : 440}
      tone="edit"
    >
      {step === 'forgot' && forgot ? (
        <ProveItsYou ways={forgot} onConfirmed={confirmed} />
      ) : (
        <>
          {step !== 'enter' && (
            // Choosing a code: what it is and what it protects, before the digits.
            <View style={styles.pinWhy}>
              {(own ? t.pinWhyPro : t.pinWhy).map((line, i) => (
                <Text key={i} style={[styles.pinWhyText, rtlText]}>
                  {line}
                </Text>
              ))}
              {beforeGuide && <Text style={[styles.pinWhyText, { fontWeight: '700' }, rtlText]}>{t.pinThenGuide}</Text>}
            </View>
          )}
          {keypad}
          {/* Also while waiting after too many wrong codes: that is when it is needed. */}
          {step === 'enter' && !unset && forgot ? (
            <LinkBtn
              label={t.pinForgot}
              onPress={() => {
                setMsg(null);
                setCode('');
                setStep('forgot');
              }}
            />
          ) : null}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  warn: { fontSize: 14, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  pinWhy: { gap: 6, backgroundColor: C.surfaceAlt, borderRadius: radius.md, padding: 12 },
  pinWhyText: { fontSize: 15, lineHeight: 21, color: C.text },
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
