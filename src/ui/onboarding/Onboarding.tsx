/**
 * Parent's first journey: the child's profile (questionnaire + review), then the set-up
 * (starting vocabulary, board layout, access method) and a try of the full board.
 * The profile is created on the server at the end; answers are kept on the device meanwhile,
 * so closing the app does not lose them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDefaultProfile, DEFAULT_SETTINGS } from '../../data/defaults';
import { DIALECT_ORDER, DIALECTS, dialectName } from '../../data/dialects';
import { errorText } from '../../i18n/account';
import { dataStrings } from '../../i18n/data';
import { onboardingStrings, type OnboardingStrings } from '../../i18n/onboarding';
import { availableLangs, getConcept, label, langName, symbolOf, wordClass } from '../../lib/lexicon';
import {
  AAC_BEFORE,
  ACTIVITY_CHOICES,
  applyAnswers,
  emptyAnswers,
  intakeOf,
  OTHER_WAYS,
  recommendedLevel,
  SPEECH,
  wordsAtLevel,
  type Answers,
  type FeedbackChoice,
  type StartVocab,
  type VisualChoice,
} from '../../lib/onboarding';
import { pickTextFile } from '../../lib/pickTextFile';
import { exactPicto, searchPictos } from '../../lib/pictoSearch';
import { loadPictoLibrary, pictoCredit, pictoToMedia } from '../../lib/pictoLibrary';
import { prepareVoices, speakText } from '../../lib/speech';
import { forgetLegacyProfile, loadLegacyProfile, migrate } from '../../lib/storage';
import type { ArabicDialect, Lang, Profile } from '../../model/types';
import { AppProvider } from '../../state/AppState';
import { useSession } from '../../state/Session';
import { Btn, Field, Segmented } from '../common';
import { Icon } from '../Icon';
import { Root } from '../Root';
import { ErrorText, LinkBtn, StartLayout, T, st, useRtl } from '../start/StartLayout';
import { SymbolView } from '../SymbolView';
import { C, CLASS_COLORS, radius } from '../theme';
import { checked } from '../a11y';

const STEPS = ['child', 'arabic', 'langs', 'voice', 'comm', 'activities', 'visual', 'feedback', 'review', 'vocab', 'layout', 'access', 'plans', 'data', 'try'] as const;
type StepId = (typeof STEPS)[number];
const SETUP_FROM = STEPS.indexOf('vocab');
/** Name of a language of the child, with the Arabic the family chose. */
const langLabel = (a: Answers, l: Lang) => langName({ arabic: a.arabic ?? 'lb' }, l);

interface Draft {
  answers: Answers;
  step: number;
}

export function Onboarding() {
  const sess = useSession();
  const { api, account, uiLang } = sess;
  const o = onboardingStrings(uiLang);
  const draftKey = `caa.onboarding.v1.${account?.id ?? 'anon'}`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resumed, setResumed] = useState(false);
  const [legacy, setLegacy] = useState<Profile | null>(null);
  const [siblings, setSiblings] = useState<{ id: string; name: string }[]>([]);
  const [imported, setImported] = useState<{ name: string; profile: Profile } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let d: Draft | null = null;
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (raw) d = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      if (d && d.step > 0) setResumed(true);
      setDraft(d ?? { answers: emptyAnswers(uiLang === 'en' ? 'en' : uiLang === 'ar' ? 'ar' : 'fr'), step: 0 });
      setLegacy(await loadLegacyProfile());
      setSiblings((await api.listProfiles().catch(() => [])).filter((p) => p.access === 'owner').map((p) => ({ id: p.id, name: p.name })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (d: Draft) => {
    setDraft(d);
    AsyncStorage.setItem(draftKey, JSON.stringify(d)).catch(() => {});
  };
  if (!draft) return null;
  const a = draft.answers;
  const set = (patch: Partial<Answers>) => save({ ...draft, answers: { ...a, ...patch } });
  const stepId: StepId = STEPS[draft.step];
  const goto = (i: number) => {
    setError(null);
    setResumed(false);
    save({ ...draft, step: Math.max(0, Math.min(STEPS.length - 1, i)) });
  };
  const next = () => {
    if (stepId === 'child' && !a.name.trim()) return setError(o.needName);
    if (stepId === 'arabic' && !a.arabic) return setError(o.needArabic);
    if (stepId === 'langs' && !a.langs.length) return setError(o.needLang);
    goto(draft.step + 1);
  };
  const back = () => (draft.step === 0 ? sess.signOut() : goto(draft.step - 1));

  if (stepId === 'try') {
    return (
      <TryBoard
        answers={a}
        base={baseProfile(a, legacy, imported)}
        siblingId={a.vocab === 'copy' ? a.copyFrom : undefined}
        onBack={back}
        onDone={async (data) => {
          const rec = await api.createProfile({ name: a.name.trim(), age: a.age, intake: intakeOf(a), data });
          await AsyncStorage.removeItem(draftKey).catch(() => {});
          if (a.vocab === 'legacy') await forgetLegacyProfile();
          sess.openProfile(rec.id);
        }}
      />
    );
  }

  const inSetup = draft.step >= SETUP_FROM;
  const partSteps = inSetup ? STEPS.length - SETUP_FROM : SETUP_FROM;
  const partIndex = inSetup ? draft.step - SETUP_FROM : draft.step;
  return (
    <StartLayout onBack={back} maxWidth={640}>
      <View style={{ gap: 8 }}>
        <T style={s.part}>
          {inSetup ? o.partSetup : o.partChild} · {o.stepOf} {partIndex + 1} {o.of} {partSteps}
        </T>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${((draft.step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>
      {resumed && <T style={{ color: C.textMuted, fontSize: 14 }}>{o.resumeNote}</T>}
      {stepId === 'child' && <ChildStep o={o} a={a} set={set} />}
      {stepId === 'child' && <LinkBtn label={sess.s.haveCode} onPress={() => sess.go({ name: 'invitations' })} />}
      {stepId === 'arabic' && <ArabicStep o={o} a={a} set={set} />}
      {stepId === 'langs' && <LangStep o={o} a={a} set={set} />}
      {stepId === 'voice' && <VoiceStep o={o} a={a} set={set} />}
      {stepId === 'comm' && <CommStep o={o} a={a} set={set} />}
      {stepId === 'activities' && <ActivitiesStep o={o} a={a} set={set} />}
      {stepId === 'visual' && (
        <ChoiceStep<VisualChoice>
          title={o.visualTitle}
          value={a.visual}
          options={(['standard', 'large', 'contrast', 'unsure'] as VisualChoice[]).map((v) => ({ value: v, label: o.visual[v], note: o.visualNotes[v] }))}
          onChange={(visual) => set({ visual })}
          preview={<LookPreview visual={a.visual} />}
        />
      )}
      {stepId === 'feedback' && (
        <ChoiceStep<FeedbackChoice>
          title={o.feedbackTitle}
          value={a.feedback}
          options={(['standard', 'reduced', 'later'] as FeedbackChoice[]).map((v) => ({ value: v, label: o.feedback[v], note: o.feedbackNotes[v] }))}
          onChange={(feedback) => set({ feedback })}
        />
      )}
      {stepId === 'review' && <ReviewStep o={o} a={a} goto={goto} />}
      {stepId === 'vocab' && (
        <VocabStep
          o={o}
          a={a}
          set={set}
          hasLegacy={!!legacy}
          siblings={siblings}
          imported={imported}
          onImport={async () => {
            setError(null);
            try {
              const f = await pickTextFile();
              if (!f) return;
              const parsed = JSON.parse(f.text);
              if (!parsed?.boards?.core) throw new Error('bad');
              setImported({ name: f.name, profile: migrate(parsed) });
              set({ vocab: 'file' });
            } catch {
              setError(o.fileBad);
            }
          }}
        />
      )}
      {stepId === 'layout' && <LayoutStep o={o} a={a} set={set} />}
      {stepId === 'access' && <AccessStep o={o} a={a} set={set} />}
      {stepId === 'plans' && <PlansStep o={o} a={a} set={set} />}
      {stepId === 'data' && <DataStep o={o} a={a} set={set} />}
      <ErrorText text={error} />
      <View style={[s.footer, useRtlRow()]}>
        <Btn label={o.back} onPress={back} style={{ flex: 1 }} />
        <Btn
          kind="primary"
          label={o.next}
          onPress={next}
          style={{ flex: 2 }}
          disabled={stepId === 'vocab' && a.vocab === 'file' && !imported}
        />
      </View>
    </StartLayout>
  );
}

function useRtlRow() {
  return useRtl() ? { flexDirection: 'row-reverse' as const } : null;
}

function baseProfile(a: Answers, legacy: Profile | null, imported: { profile: Profile } | null): Profile {
  if (a.vocab === 'legacy' && legacy) return legacy;
  if (a.vocab === 'file' && imported) return imported.profile;
  return createDefaultProfile();
}

type StepProps = { o: OnboardingStrings; a: Answers; set: (p: Partial<Answers>) => void };

function Title({ text, intro }: { text: string; intro?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={st.title} accessibilityRole="header">
        {text}
      </T>
      {intro ? <T style={st.muted}>{intro}</T> : null}
    </View>
  );
}

/** One choice among several, as large rows with a round marker (or square for several). */
function Option({
  label: text,
  note,
  selected,
  onPress,
  multi,
  badge,
}: {
  label: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  badge?: string;
}) {
  const rtl = useRtl();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.option, rtl && st.rev, selected && s.optionOn, pressed && { opacity: 0.85 }]}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      {...checked(selected)}
      accessibilityLabel={note ? `${text}. ${note}` : text}
    >
      <View style={[multi ? s.box : s.radio, selected && s.markOn]}>{selected && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontWeight: '600' }}>{text}</T>
        {note ? <T style={{ fontSize: 14, color: C.textMuted, lineHeight: 19 }}>{note}</T> : null}
      </View>
      {badge ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ChildStep({ o, a, set }: StepProps) {
  return (
    <>
      <Title text={o.childTitle} />
      <Field label={o.childName} value={a.name} onChangeText={(name) => set({ name })} autoComplete="off" autoCapitalize="words" />
      <Field
        label={o.childAge}
        value={a.age ? String(a.age) : ''}
        onChangeText={(v) => {
          const n = parseInt(v.replace(/\D/g, ''), 10);
          set({ age: Number.isFinite(n) && n > 0 && n < 120 ? n : undefined });
        }}
        keyboardType="number-pad"
      />
      <T style={s.label}>{o.childGender}</T>
      <Segmented<'m' | 'f'>
        value={a.gender}
        onChange={(gender) => set({ gender })}
        options={[
          { value: 'm', label: o.boy },
          { value: 'f', label: o.girl },
        ]}
      />
    </>
  );
}

/** Which Arabic the family wants (asked, nothing pre-chosen), or none at all. */
function ArabicStep({ o, a, set }: StepProps) {
  const { uiLang } = useSession();
  const choose = (arabic: ArabicDialect) =>
    // "None": Arabic cannot stay among the child's languages.
    set({ arabic, langs: arabic === 'none' ? a.langs.filter((l) => l !== 'ar') : a.langs });
  return (
    <>
      <Title text={o.arabicTitle} intro={o.arabicIntro} />
      {([...DIALECT_ORDER, 'none'] as ArabicDialect[]).map((d) => (
        <Option key={d} label={dialectName(d, uiLang)} note={d === 'none' ? undefined : DIALECTS[d].langName} selected={a.arabic === d} onPress={() => choose(d)} />
      ))}
    </>
  );
}

function LangStep({ o, a, set }: StepProps) {
  const toggle = (l: Lang) => set({ langs: a.langs.includes(l) ? a.langs.filter((x) => x !== l) : [...a.langs, l] });
  return (
    <>
      <Title text={o.langTitle} intro={o.langIntro} />
      {availableLangs({ arabic: a.arabic ?? 'lb' }).map((l) => (
        <Option key={l} multi label={langLabel(a, l)} selected={a.langs.includes(l)} onPress={() => toggle(l)} badge={a.langs[0] === l ? o.langMain : undefined} />
      ))}
      <T style={{ color: C.textMuted, fontSize: 14 }}>{o.langNavNote}</T>
    </>
  );
}

function VoiceStep({ o, a, set }: StepProps) {
  const listen = async () => {
    const lang = a.langs[0] ?? 'fr';
    const settings = { ...DEFAULT_SETTINGS, lang, voiceKind: a.voiceKind, voiceAge: a.voiceAge };
    await prepareVoices(settings);
    await speakText(o.voiceSample[lang], lang, settings);
  };
  return (
    <>
      <Title text={o.voiceTitle} intro={o.voiceIntro} />
      <T style={s.label}>{o.voiceKind}</T>
      <Segmented<Answers['voiceKind']>
        value={a.voiceKind}
        onChange={(voiceKind) => set({ voiceKind })}
        options={[
          { value: 'f', label: o.voiceF },
          { value: 'm', label: o.voiceM },
          { value: 'device', label: o.voiceDevice },
        ]}
      />
      <T style={s.label}>{o.voiceAge}</T>
      <Segmented<Answers['voiceAge']>
        value={a.voiceAge}
        onChange={(voiceAge) => set({ voiceAge })}
        options={[
          { value: 'child', label: o.voiceChild },
          { value: 'adult', label: o.voiceAdult },
        ]}
      />
      <Btn icon="volume" label={o.listen} onPress={listen} />
    </>
  );
}

function CommStep({ o, a, set }: StepProps) {
  return (
    <>
      <Title text={o.commTitle} intro={o.commIntro} />
      <T style={s.question}>{o.qSpeech}</T>
      {SPEECH.map((v) => (
        <Option key={v} label={o.speech[v]} selected={a.speech === v} onPress={() => set({ speech: v })} />
      ))}
      <T style={s.question}>{o.qOther}</T>
      {OTHER_WAYS.map((v) => (
        <Option
          key={v}
          multi
          label={o.other[v]}
          selected={a.otherWays.includes(v)}
          onPress={() => set({ otherWays: a.otherWays.includes(v) ? a.otherWays.filter((x) => x !== v) : [...a.otherWays, v] })}
        />
      ))}
      <T style={s.question}>{o.qBefore}</T>
      {AAC_BEFORE.map((v) => (
        <Option key={v} label={o.before[v]} selected={a.aacBefore === v} onPress={() => set({ aacBefore: v })} />
      ))}
    </>
  );
}

function ActivitiesStep({ o, a, set }: StepProps) {
  const profile = useMemo(() => createDefaultProfile(), []);
  const lang = a.langs[0] ?? 'fr';
  const [text, setText] = useState('');
  const rtl = useRtl();
  const add = () => {
    const v = text.trim();
    if (v && !a.customActivities.includes(v)) set({ customActivities: [...a.customActivities, v] });
    setText('');
  };
  return (
    <>
      <Title text={o.actTitle} intro={o.actIntro} />
      <View style={[s.chips, rtl && { flexDirection: 'row-reverse' }]}>
        {ACTIVITY_CHOICES.filter((id) => getConcept(profile, id)).map((id) => {
          const on = a.activities.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => set({ activities: on ? a.activities.filter((x) => x !== id) : [...a.activities, id] })}
              style={[s.chip, on && s.chipOn]}
              accessibilityRole="checkbox"
              {...checked(on)}
              accessibilityLabel={label(profile, id, lang)}
            >
              <SymbolView symbol={symbolOf(profile, id)} size={44} />
              <Text style={[s.chipText, on && { color: C.accent }]} numberOfLines={1}>
                {label(profile, id, lang)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <T style={s.label}>{o.actAdd}</T>
      <View style={[{ flexDirection: 'row', gap: 8 }, rtl && { flexDirection: 'row-reverse' }]}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder={o.actPlaceholder} placeholderTextColor={C.placeholder} style={[s.input, { flex: 1 }]} />
        <Btn icon="plus" onPress={add} accessibilityLabel={o.actAdd} disabled={!text.trim()} />
      </View>
      {a.customActivities.length > 0 && (
        <View style={[s.chips, rtl && { flexDirection: 'row-reverse' }]}>
          {a.customActivities.map((c) => (
            <Pressable
              key={c}
              onPress={() => set({ customActivities: a.customActivities.filter((x) => x !== c) })}
              style={[s.tag]}
              accessibilityRole="button"
              accessibilityLabel={`${c} ×`}
            >
              <Text style={{ fontSize: 15, color: C.accent, fontWeight: '600' }}>{c}</Text>
              <Icon name="x" size={16} color={C.accent} />
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

function ChoiceStep<V extends string>({
  title,
  value,
  options,
  onChange,
  preview,
}: {
  title: string;
  value: V;
  options: { value: V; label: string; note?: string }[];
  onChange: (v: V) => void;
  preview?: React.ReactNode;
}) {
  return (
    <>
      <Title text={title} />
      {options.map((op) => (
        <Option key={op.value} label={op.label} note={op.note} selected={value === op.value} onPress={() => onChange(op.value)} />
      ))}
      {preview}
    </>
  );
}

/** Three sample cards drawn with the chosen presentation. */
function LookPreview({ visual }: { visual: VisualChoice }) {
  const profile = useMemo(() => createDefaultProfile(), []);
  const { uiLang } = useSession();
  const lang = uiLang === 'en' ? 'en' : uiLang === 'ar' ? 'ar' : 'fr';
  const contrast = visual === 'contrast';
  return (
    <View style={[s.lookRow, contrast && { backgroundColor: '#000' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {(['i', 'want', 'eat'] as const).map((id) => {
        const cls = wordClass(profile, id);
        const colors = CLASS_COLORS[cls];
        return (
          <View
            key={id}
            style={[
              s.lookCard,
              { backgroundColor: contrast ? '#101418' : colors.bg, borderColor: colors.border, borderWidth: contrast ? 4 : 2 },
            ]}
          >
            <SymbolView symbol={symbolOf(profile, id)} size={visual === 'large' ? 50 : 56} />
            <Text
              style={{
                color: contrast ? '#fff' : C.text,
                fontSize: visual === 'large' ? 20 : 15,
                fontWeight: visual === 'large' || contrast ? '800' : '600',
              }}
            >
              {label(profile, id, lang)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewStep({ o, a, goto }: { o: OnboardingStrings; a: Answers; goto: (i: number) => void }) {
  const rtl = useRtl();
  const { uiLang } = useSession();
  const rows: { label: string; value: string; step: StepId }[] = [
    { label: o.rName, value: [a.name, a.age ? `${a.age} ${o.years}` : '', a.gender === 'f' ? o.girl : o.boy].filter(Boolean).join(' · '), step: 'child' },
    { label: o.rArabic, value: dialectName(a.arabic, uiLang), step: 'arabic' },
    { label: o.rLangs, value: a.langs.map((l) => langLabel(a, l)).join(', '), step: 'langs' },
    {
      label: o.rVoice,
      value: `${a.voiceKind === 'f' ? o.voiceF : a.voiceKind === 'm' ? o.voiceM : o.voiceDevice} · ${a.voiceAge === 'child' ? o.voiceChild : o.voiceAdult}`,
      step: 'voice',
    },
    {
      label: o.rComm,
      value: [a.speech && o.speech[a.speech], a.otherWays.map((w) => o.other[w]).join(', '), a.aacBefore && o.before[a.aacBefore]].filter(Boolean).join(' · ') || o.none,
      step: 'comm',
    },
    { label: o.rActivities, value: String(a.activities.length + a.customActivities.length || o.none), step: 'activities' },
    { label: o.rVisual, value: o.visual[a.visual], step: 'visual' },
    { label: o.rFeedback, value: o.feedback[a.feedback], step: 'feedback' },
  ];
  return (
    <>
      <Title text={o.reviewTitle} intro={o.reviewIntro} />
      {rows.map((r) => (
        <View key={r.step} style={[s.reviewRow, rtl && st.rev]}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={s.label}>{r.label}</T>
            <T>{r.value}</T>
          </View>
          <Btn small kind="ghost" icon="pencil" label={o.edit} onPress={() => goto(STEPS.indexOf(r.step))} />
        </View>
      ))}
    </>
  );
}

function VocabStep({
  o,
  a,
  set,
  hasLegacy,
  siblings,
  imported,
  onImport,
}: StepProps & {
  hasLegacy: boolean;
  siblings: { id: string; name: string }[];
  imported: { name: string } | null;
  onImport: () => void;
}) {
  const choices: StartVocab[] = ['core', ...(hasLegacy ? (['legacy'] as const) : []), ...(siblings.length ? (['copy'] as const) : []), 'file'];
  return (
    <>
      <Title text={o.vocabTitle} intro={o.vocabIntro} />
      {choices.map((v) => (
        <View key={v} style={{ gap: 8 }}>
          <Option
            label={o.vocab[v]}
            note={o.vocabNotes[v]}
            selected={a.vocab === v}
            badge={v === 'core' ? o.recommended : undefined}
            onPress={() => (v === 'file' ? onImport() : set({ vocab: v, copyFrom: v === 'copy' ? a.copyFrom ?? siblings[0]?.id : a.copyFrom }))}
          />
          {v === 'copy' && a.vocab === 'copy' && siblings.length > 1 && (
            <Segmented value={a.copyFrom ?? siblings[0].id} onChange={(copyFrom: string) => set({ copyFrom })} options={siblings.map((c) => ({ value: c.id, label: c.name }))} />
          )}
          {v === 'file' && a.vocab === 'file' && (
            <View style={{ gap: 6 }}>
              {imported ? <T style={{ color: C.success, fontWeight: '600' }}>{`${o.fileOk} ${imported.name}`}</T> : null}
              <Btn small icon="download" label={o.chooseFile} onPress={onImport} />
            </View>
          )}
        </View>
      ))}
    </>
  );
}

function LayoutStep({ o, a, set }: StepProps) {
  const profile = useMemo(() => createDefaultProfile(), []);
  const rec = recommendedLevel(a);
  const level = a.level ?? rec;
  return (
    <>
      <Title text={o.layoutTitle} intro={o.layoutIntro} />
      <T style={s.label}>{o.wordsShown}</T>
      {([1, 2, 3] as const).map((l) => (
        <Option
          key={l}
          label={`${[o.level1, o.level2, o.level3][l - 1]} — ${wordsAtLevel(profile, l)} ${o.wordsCount}`}
          selected={level === l}
          badge={l === rec ? o.recommended : undefined}
          onPress={() => set({ level: l })}
        />
      ))}
      <MiniBoard profile={profile} level={level} />
      <T style={{ color: C.textMuted, fontSize: 14 }}>{o.levelNote}</T>
      <T style={s.label}>{o.pictoSize}</T>
      <Segmented<Answers['pictoSize']>
        value={a.pictoSize}
        onChange={(pictoSize) => set({ pictoSize })}
        options={[
          { value: 'normal', label: o.pictoNormal },
          { value: 'large', label: o.pictoLarge },
        ]}
      />
      <Option multi label={o.showLabels} selected={a.showLabels} onPress={() => set({ showLabels: !a.showLabels })} />
    </>
  );
}

/** The main board in miniature: coloured squares are the words shown at this level. */
function MiniBoard({ profile, level }: { profile: Profile; level: 1 | 2 | 3 }) {
  const b = profile.boards.core;
  return (
    <View style={s.mini} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: b.rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: b.cols }).map((__, c) => {
            const cell = b.cells[r * b.cols + c];
            const shown = !!cell && (cell.level ?? 1) <= level;
            const color = shown && cell ? CLASS_COLORS[cell.folder ? 'folder' : wordClass(profile, cell.concept)] : null;
            return (
              <View
                key={c}
                style={[
                  s.miniCell,
                  color ? { backgroundColor: color.bg, borderColor: color.border } : { backgroundColor: C.surfaceAlt, borderColor: C.border },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function AccessStep({ o, a, set }: StepProps) {
  return (
    <>
      <Title text={o.accessTitle} intro={o.accessIntro} />
      {(['release', 'press', 'hold'] as const).map((v) => (
        <Option key={v} label={o.access[v]} note={o.accessNotes[v]} selected={a.access === v} badge={v === 'release' ? o.recommended : undefined} onPress={() => set({ access: v })} />
      ))}
      {a.access === 'hold' && (
        <>
          <T style={s.label}>{o.holdTime}</T>
          <Segmented<number> value={a.holdTime} onChange={(holdTime) => set({ holdTime })} options={[0.5, 1, 1.5, 2].map((v) => ({ value: v, label: `${v} ${o.sec}` }))} />
        </>
      )}
      <T style={s.label}>{o.repeatDelay}</T>
      <Segmented<number> value={a.repeatDelay} onChange={(repeatDelay) => set({ repeatDelay })} options={[0, 1, 2, 3, 5].map((v) => ({ value: v, label: `${v} ${o.sec}` }))} />
      <T style={{ color: C.textMuted, fontSize: 14 }}>{o.accessLater}</T>
    </>
  );
}

function PlansStep({ o, a, set }: StepProps) {
  return (
    <>
      <Title text={o.plansTitle} intro={o.plansIntro} />
      <Option multi label={o.planDay} note={o.planDayNote} selected onPress={() => {}} />
      <Option multi label={o.planWeek} note={o.planWeekNote} selected={!!a.planWeek} onPress={() => set({ planWeek: !a.planWeek })} />
      <Option multi label={o.planMonth} note={o.planMonthNote} selected={!!a.planMonth} onPress={() => set({ planMonth: !a.planMonth })} />
      <T style={{ color: C.textMuted, fontSize: 14 }}>{o.plansLater}</T>
    </>
  );
}

/** Communication follow-up: the family chooses; no answer is pre-selected (no answer = nothing recorded). */
function DataStep({ o, a, set }: StepProps) {
  const d = dataStrings(useSession().uiLang);
  return (
    <>
      <Title text={o.dataTitle} intro={o.dataIntro} />
      {(['off', 'usage', 'vocabulary', 'language'] as const).map((l) => (
        <Option key={l} label={d.levels[l]} note={d.levelNotes[l]} selected={a.dataCollection === l} onPress={() => set({ dataCollection: l })} />
      ))}
      <T style={{ color: C.textMuted, fontSize: 14 }}>{o.dataLater}</T>
    </>
  );
}

/** The real app with the chosen settings: everything works; "Finish" creates the profile. */
function TryBoard({
  answers,
  base,
  siblingId,
  onBack,
  onDone,
}: {
  answers: Answers;
  base: Profile;
  siblingId?: string;
  onBack: () => void;
  onDone: (p: Profile) => Promise<void>;
}) {
  const sess = useSession();
  const o = onboardingStrings(sess.uiLang);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Profile | null>(null);

  useEffect(() => {
    (async () => {
      let start = base;
      if (siblingId) start = await sess.api.getProfile(siblingId).then((r) => migrate(r.data)).catch(() => base);
      const custom = await customWords(answers.customActivities, answers.langs[0] ?? 'fr');
      const p = applyAnswers(start, answers, custom);
      // The guide opens on the real board, not during the try.
      latest.current = p;
      setProfile({ ...p, guide: { ...p.guide, openOnStart: false } });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) {
    return (
      <StartLayout>
        <ActivityIndicator color={C.accent} />
      </StartLayout>
    );
  }
  const rtl = sess.uiLang === 'ar';
  const banner = (
    <View style={[s.tryBanner, rtl && { flexDirection: 'row-reverse' }]}>
      <Icon name="sparkles" size={22} color={C.success} />
      <Text style={[s.tryText, rtl && { textAlign: 'right' }]} numberOfLines={3}>
        {error ?? o.tryBanner}
      </Text>
      <Btn small label={o.back} onPress={onBack} disabled={busy} />
      <Btn
        small
        kind="success"
        icon="check"
        label={busy ? o.creating : o.finish}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const p = latest.current!;
            await onDone({ ...p, guide: { ...p.guide, openOnStart: true, seen: false } });
          } catch (e) {
            setError(errorText(sess.s, e));
            setBusy(false);
          }
        }}
      />
    </View>
  );
  return (
    <AppProvider initial={profile} onChange={(p) => (latest.current = p)} uiLang={sess.uiLang} setUiLang={sess.setUiLang}>
      <Root banner={banner} />
    </AppProvider>
  );
}

/** The family's own activities become words, with a pictogram from the offline library when one matches. */
async function customWords(texts: string[], lang: Lang): Promise<{ id: string; label: string; media?: string; credit?: string }[]> {
  if (!texts.length) return [];
  const stamp = Date.now().toString(36);
  let index: Awaited<ReturnType<typeof loadPictoLibrary>> | null = null;
  try {
    index = await Promise.race([loadPictoLibrary(), new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
  } catch {
    index = null;
  }
  const out = [];
  for (const [i, text] of texts.entries()) {
    let media: string | undefined;
    let credit: string | undefined;
    if (index) {
      const id = exactPicto(index, text) ?? searchPictos(index, text, lang, 1)[0];
      if (id !== undefined) media = await pictoToMedia(id).catch(() => undefined);
      if (id !== undefined && media) credit = await pictoCredit(id).catch(() => undefined);
    }
    out.push({ id: `c_${stamp}${i}`, label: text, media, credit });
  }
  return out;
}

const s = StyleSheet.create({
  part: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  label: { fontSize: 13, color: C.textMuted, fontWeight: '700' },
  question: { fontSize: 17, fontWeight: '700', marginTop: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 52,
    backgroundColor: C.surface,
  },
  optionOn: { borderColor: C.accent, backgroundColor: '#F3F7FF' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#98A2B3', alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#98A2B3', alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: C.accent, borderColor: C.accent },
  badge: { backgroundColor: C.successSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: C.success, fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: 92,
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipOn: { borderColor: C.accent, backgroundColor: '#F3F7FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentSoft, borderRadius: 16, paddingHorizontal: 12, minHeight: 34 },
  input: {
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 48,
    fontSize: 17,
    color: C.text,
    backgroundColor: C.surface,
  },
  lookRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', padding: 12, borderRadius: radius.md, backgroundColor: C.bg },
  lookCard: { width: 96, height: 104, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8 },
  mini: { gap: 3, alignSelf: 'center', padding: 8, backgroundColor: C.bg, borderRadius: radius.md, direction: 'ltr' },
  miniCell: { width: 18, height: 14, borderRadius: 3, borderWidth: 1 },
  tryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.successSoft,
    borderColor: '#6CE9A6',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
  },
  tryText: { flex: 1, fontWeight: '700', fontSize: 15, color: C.success },
});
