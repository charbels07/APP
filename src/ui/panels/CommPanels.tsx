import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { availableLangs, isFolderName, isRtl, label, symbolOf } from '../../lib/lexicon';
import { countFeature } from '../../lib/product';
import { search, type Location } from '../../lib/search';
import { speakText } from '../../lib/speech';
import { typedChips } from '../../lib/typedWords';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { opensAlone, useApp, useBack } from '../../state/AppState';
import { codeAccepted, codeOf, keypadStart, mayChooseCode, pinPause, pinTooEasy, provesBeforeChoosing } from '../../lib/caregiverCode';
import { useBoard } from '../../state/BoardContext';
import { Btn, Panel, useNavRtl } from '../common';
import { usePictoLibrary } from '../PictoPicker';
import { chipPicture } from '../SentenceStrip';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';
import { SearchBox } from '../SearchBox';
import { VoiceButton } from '../VoiceButton';
import { useSessionMaybe } from '../../state/Session';
import { forgotCodeWays } from '../../lib/forgotCode';
import { ProveItsYou } from '../ProveItsYou';
import { openAppUrl } from '../../lib/appLinks';
import { afterCodeStop, laterKey, today } from '../../lib/billing';
import type { AfterCode } from '../../state/AppState';

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
  const back = useBack();
  const { help } = profile;
  return (
    <Panel title={`${t.helpTitle} — ${help.message[lang]}`} onClose={() => app.setOverlay(null)} onBack={back} tone="help">
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
/** Wrong codes are counted on this device (the pauses: `pinPause`). */
const PIN_LOCK = 'caa.pinlock';
export { pinPause, pinTooEasy };

/**
 * Caregiver mode is protected so the user can't modify the board by accident (NAV-04).
 * The first time, the person simply chooses a code (typed twice) and then uses it each time;
 * there is no code to know beforehand, and while none is chosen no code opens anything
 * (src/lib/caregiverCode.ts). Wrong codes are counted on this device.
 * "Forgot the code?": the account's password, or a code sent to the account's e-mail (or phone),
 * proves it is the family (or, for her own code, the professional); then a new code is chosen.
 * A linked tablet has neither: it is done from a parent's device (src/lib/forgotCode.ts).
 *
 * `first`: a family's board with no code yet, opened by a parent. The keypad is there by itself
 * and cannot be closed (the bar, and Help on it, stay reachable); once the code is chosen the
 * board is simply there, or the guide on the first opening of a new board.
 */
/**
 * What opens once the code is right (or "Later" under the subscription's message): another app or a
 * page, a demonstration's recording, a panel on its own (settings, lock, guide, a new word…), or the
 * tools of caregiver mode.
 */
export function goOnAfterCode(app: ReturnType<typeof useApp>, then: AfterCode | undefined) {
  if (then?.kind === 'openLink') {
    app.setOverlay(null);
    void openAppUrl(then.url);
    return;
  }
  if (then?.kind === 'recordDemo') return app.startRecording();
  // The settings, "Lock the screen", the guide, a new word for the timer open on their own: the board stays as the child uses it.
  if (then && opensAlone(then)) return app.setOverlay(then);
  app.setEditMode(true);
  app.setOverlay(then ?? null);
}

export function PinPanel({ first = false }: { first?: boolean }) {
  const app = useApp();
  const board = useBoard();
  const cameFrom = useBack();
  const { t, profile } = app;
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  // On a professional's board the code is her own (kept with her account), never the family's.
  const own = app.ownCode;
  const { pin, unset } = codeOf(own, profile.settings.pin);
  // In a child's profile the family chooses the code (the preview has no account: anyone trying it does).
  // Forgotten code: who may choose a new one, and where the check code is sent.
  const sess = useSessionMaybe();
  const acc = sess?.account;
  const canChoose = mayChooseCode({ own: !!own, family: !!board, manager: !!board?.manager, device: acc?.provider === 'device' });
  const [asked, setStep] = useState<'enter' | 'choose' | 'repeat' | 'forgot'>('enter');
  // Nothing chosen yet: who may choose does it now; anyone else is told where it is chosen. On a
  // family's board already in use, the account first proves who is choosing (not the child).
  const proofFirst = provesBeforeChoosing({ family: !!board, own: !!own, team: app.freeEdit, first });
  const step = asked === 'enter' ? keypadStart({ unset, canChoose, proofFirst }) : asked;
  // A board that is not saved yet (the set-up's trial) is the signed-in person's own.
  const ways = forgotCodeWays({ account: acc, manager: board ? board.manager : true, ownCode: !!own });
  // The account was confirmed: the new code is chosen without the old one.
  const [proved, setProved] = useState(false);
  const [chosen, setChosen] = useState('');
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
  // What comes after the right code.
  const then = app.overlay?.kind === 'pin' ? app.overlay.then : undefined;
  // The first opening of a new board: the guide opens once the code is chosen.
  const beforeGuide = first ? !!profile.guide?.openOnStart : then?.kind === 'guide';
  // Another app or a web page is about to open from the board (a parental gate: `linkNeedsCode`).
  const leaving = then?.kind === 'openLink' ? then : undefined;
  const rtl = useNavRtl();
  // The subscription's message waits until tomorrow once "Later" was chosen today (this device).
  const [laterToday, setLaterToday] = useState(false);
  const boardId = board?.profileId;
  useEffect(() => {
    if (!boardId) return;
    AsyncStorage.getItem(laterKey(boardId))
      .then((d) => setLaterToday(d === today()))
      .catch(() => {});
  }, [boardId]);
  const open = () => {
    // Chosen at the board's opening: the board stays as the child uses it.
    if (first) return beforeGuide ? app.setOverlay({ kind: 'guide' }) : undefined;
    // Payment: the reminder, or (paused, frozen) nothing that changes the board (src/lib/billing.ts).
    const pay = board?.billing;
    if (pay && afterCodeStop({ status: pay.status, payer: pay.payer, laterToday, then: then?.kind, team: app.freeEdit }) !== 'none') {
      return app.setOverlay({ kind: 'payment', then });
    }
    goOnAfterCode(app, then);
  };
  const again = (text: string | null) => {
    setMsg(text);
    setTimeout(() => setCode(''), 400);
  };
  const press = (d: string) => {
    if (waiting || step === 'notChosen' || step === 'prove') return;
    const next = (code + d).slice(0, 4);
    setMsg(null);
    setCode(next);
    if (next.length < 4) return;
    if (step === 'enter') {
      if (!codeAccepted(next, { pin, unset })) {
        const fails = lock.fails + 1;
        const pause = pinPause(fails);
        saveLock({ fails, until: Date.now() + pause });
        // During a pause the countdown is what the person must read, not "Wrong code".
        return again(pause ? null : t.pinWrong);
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
          // The guide of a new board was waiting for the code: it opens now (the first keypad), or
          // is offered by the welcome card (the code was chosen from the bar instead).
          if (p.guide?.openOnStart) p.guide = { ...p.guide, openOnStart: false };
        });
      open();
    }
  };
  const startForgot = () => {
    setCode('');
    setMsg(null);
    // The try-it preview has no account and saves nothing: forgetting there simply means choosing
    // again. Everywhere else the account proves who is asking.
    if (app.preview) return setStep('choose');
    setStep('forgot');
  };
  // It is the account's owner: the count of wrong codes starts again, and a new code is chosen.
  const confirmed = () => {
    saveLock({ fails: 0, until: 0 });
    setProved(true);
    setStep('choose');
  };
  const rtlText = rtl ? ({ textAlign: 'right', writingDirection: 'rtl' } as const) : null;
  const hint = waiting
    ? t.pinLocked.replace('{n}', String(wait))
    : msg ?? (step === 'choose' ? (proved ? t.pinForgotOk : t.pinChoose) : step === 'repeat' ? t.pinRepeat : t.pinHint);
  const error = !!msg && !waiting;
  const close = () => app.setOverlay(null);
  return (
    <Panel
      title={step === 'forgot' ? t.pinForgotTitle : step === 'enter' && !leaving ? t.pinTitle : t.pinChooseTitle}
      // The first choice of a family's code cannot be put off: no cross, no Escape.
      onClose={first ? undefined : close}
      onBack={step === 'forgot' && !unset ? () => setStep('enter') : first ? undefined : cameFrom}
      maxWidth={step === 'enter' ? 380 : 440}
      tone="edit"
    >
      {step === 'prove' && (
        // No code yet on a board already in use: what the code is, then who is choosing it.
        <View style={styles.pinWhy}>
          <Text style={[styles.pinWhyText, rtlText]}>{t.pinWhy[0]}</Text>
        </View>
      )}
      {(step === 'forgot' || step === 'prove') && (
        <ProveItsYou
          ways={sess ? ways : null}
          twoStep={!!sess?.security?.twoStep}
          onProved={confirmed}
          texts={{
            introPw: t.pinForgotIntroPw,
            intro: t.pinForgotIntro,
            introTwoStep: t.pinForgotIntroTwoStep,
            password: t.pinForgotPassword,
            confirm: t.pinForgotConfirm,
            sent: t.pinForgotSent,
            demo: t.pinForgotDemo,
            code: t.pinForgotCode,
            check: t.pinForgotCheck,
            send: t.pinForgotSend,
            resend: t.pinForgotResend,
            wrong: t.pinForgotWrong,
            wrongPassword: t.pinForgotWrongPassword,
            error: t.pinForgotError,
            noWay: t.pinForgotFamily,
          }}
        />
      )}
      {step === 'notChosen' && (
        // No code exists yet and this person does not choose it: no keypad, since no code would be right.
        <>
          <Text style={[styles.pinWhyText, rtlText]}>{t.pinNotChosen}</Text>
          <Btn kind="primary" icon="check" label={t.close} onPress={close} />
        </>
      )}
      {(step === 'choose' || step === 'repeat') && (
        // Choosing a code: what it is and what it protects, before the digits.
        <View style={styles.pinWhy}>
          {(own ? t.pinWhyPro : t.pinWhy).map((line, i) => (
            <Text key={i} style={[styles.pinWhyText, rtl && { textAlign: 'right', writingDirection: 'rtl' }]}>
              {line}
            </Text>
          ))}
          {beforeGuide && <Text style={[styles.pinWhyText, { fontWeight: '700' }, rtl && { textAlign: 'right', writingDirection: 'rtl' }]}>{t.pinThenGuide}</Text>}
        </View>
      )}
      {step !== 'forgot' && step !== 'prove' && step !== 'notChosen' && (
        <>
          {leaving && (
            <Text style={[styles.pinWhyText, { fontWeight: '700' }, rtlText]}>{t.pinOpensApp.replace('{name}', leaving.name)}</Text>
          )}
          <Text
            style={[
              styles.muted,
              { textAlign: 'center' },
              (error || waiting) && { color: C.help, fontWeight: '700' },
              proved && step === 'choose' && !error && !waiting && { color: C.success, fontWeight: '700' },
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
          {step === 'enter' && (
            <Pressable onPress={startForgot} accessibilityRole="button" accessibilityLabel={t.pinForgot} style={styles.forgotLink}>
              <Text style={styles.forgotText}>{t.pinForgot}</Text>
            </Pressable>
          )}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  warn: { fontSize: 14, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  pinWhy: { gap: 6, backgroundColor: C.surfaceAlt, borderRadius: radius.md, padding: 12 },
  pinWhyText: { fontSize: 15, lineHeight: 21, color: C.text },
  forgotLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  forgotText: { color: C.accent, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
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
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginVertical: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.edit },
  dotOn: { backgroundColor: C.edit },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: 84, height: 64 },
  keyBtn: { borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '700', color: C.text },
});
