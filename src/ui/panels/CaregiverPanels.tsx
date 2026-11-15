import { createDefaultProfile } from '../../data/defaults';
import { enterFullscreen, exitFullscreen } from '../../lib/childLock';
import { useBoard } from '../../state/BoardContext';
import { useSession } from '../../state/Session';
import { PictoCredit } from '../PictoCredits';
import { onboardingStrings } from '../../i18n/onboarding';
import { editStrings } from '../../i18n/edit';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DIALECT_ORDER, dialectName } from '../../data/dialects';
import { VOICE_INDEX, VOICE_PROVIDER } from '../../data/voicePackIndex';

import { CLASS_NAMES, CLASS_ORDER, CLASS_COLORS, C, radius } from '../theme';
import { allConceptIds, availableLangs, display, getConcept, isRtl, label, langName, symbolOf, wordClass } from '../../lib/lexicon';
import { deleteMedia } from '../../lib/media';
import { libraryAccess, pickPhoto, type LibraryAccess } from '../../lib/photos';
import { APP_PRESETS, appLinkOf, isIncomplete, openAppUrl } from '../../lib/appLinks';
import { exportJson, exportPdf, printDocument } from '../../lib/platform';
import { boardCells, buildPrintHtml, conceptCell, type PrintOptions } from '../../lib/printHtml';
import { canSpan } from '../../lib/boardOps';
import { pictoCredit, pictoToMedia } from '../../lib/pictoLibrary';
import { countFeature, reportProblem } from '../../lib/product';
import { searchWords } from '../../lib/search';
import { prepareVoices, speakText } from '../../lib/speech';
import { optionParts, voiceOption, type VoiceOption } from '../../lib/voices';
import type { VoiceChoice } from '../../lib/voices';
import { UI_LANG_NAMES } from '../../i18n/ui';
import type { AppLink, ArabicDialect, CellDisplay, Lang, Profile, UiLang, WordClass } from '../../model/types';
import { useApp, useBack } from '../../state/AppState';
import { Btn, Field, Panel, Section, Segmented, Toggle, useNavRtl } from '../common';
import { Icon, type IconName } from '../Icon';
import { expanded } from '../a11y';
import { PictoSearch } from '../PictoPicker';
import { SearchBox } from '../SearchBox';
import { VoiceButton } from '../VoiceButton';
import { PrintPreview } from '../PrintPreview';
import { SymbolView, useMediaUri } from '../SymbolView';
import { useWiggle } from '../wiggle';
import { scheduleTitle } from '../screens/ScheduleScreen';
import { CellMenu, MoveToTlaPanel, ShareTlaPanel, TlaMenu } from './EditMenus';
import { Recorder } from './Recorder';
import { pinTooEasy } from './CommPanels';
import { stable } from '../../lib/profileDiff';
import { normalize } from '../../lib/search';

/**
 * "Your library": a picture saved on the device, or a photo taken now. A line says what the app is
 * allowed to see of the person's pictures (the tablet asks the first time; a browser has nothing
 * to ask, it only hands over the chosen picture).
 */
function OwnLibrary({ onPick }: { onPick: (from: 'library' | 'camera') => void | Promise<void> }) {
  const { t } = useApp();
  const [access, setAccess] = useState<LibraryAccess | null>(null);
  const look = useCallback(() => void libraryAccess().then(setAccess), []);
  useEffect(look, [look]);
  const pick = async (from: 'library' | 'camera') => {
    await onPick(from);
    look();
  };
  return (
    <>
      <Text style={s.note}>{t.ownLibraryNote}</Text>
      <View style={s.wrapRow}>
        <Btn small icon="image" label={t.pickPicture} onPress={() => void pick('library')} />
        <Btn small icon="camera" label={t.takePhoto} onPress={() => void pick('camera')} />
      </View>
      {access ? <Text style={[s.note, access === 'none' && { color: C.edit, fontWeight: '700' }]}>{t.libraryAccess[access]}</Text> : null}
    </>
  );
}

/** What "pictograms wiggle" looks like, shown at once (the setting itself is applied on "Save"). */
function WiggleTry({ label, concept }: { label: string; concept: string }) {
  const { profile } = useApp();
  // Once when the switch is turned on, then at each press.
  const [n, setN] = useState(1);
  const transform = useWiggle(n);
  return (
    <View style={s.row}>
      <Animated.View style={{ transform }}>
        <SymbolView symbol={symbolOf(profile, concept)} size={48} />
      </Animated.View>
      <Btn small icon="play" label={label} onPress={() => setN((x) => x + 1)} />
    </View>
  );
}

/** The child lock of this device: the switch and how to stop the child leaving the app. */
function ChildLock() {
  const app = useApp();
  const sess = useSession();
  const { t } = app;
  return (
    <>
      <Toggle
        label={t.lockToggle}
        value={sess.childLock}
        note={t.lockNote}
        onChange={(on) => {
          // Full screen must be asked inside the tap (browsers refuse it otherwise).
          if (on) enterFullscreen();
          else exitFullscreen();
          sess.setChildLock(on);
          if (on) {
            countFeature('lock');
            app.setEditMode(false);
            app.setOverlay(null);
          }
        }}
      />
      <Text style={s.label}>{t.lockSystemTitle}</Text>
      <Text style={s.note}>{Platform.OS === 'web' ? t.lockWeb : Platform.OS === 'android' ? t.lockAndroid : t.lockIpad}</Text>
      {Platform.OS === 'web' && <Text style={s.note}>{t.lockIpad}</Text>}
      {Platform.OS === 'web' && <Text style={s.note}>{t.lockAndroid}</Text>}
    </>
  );
}

/** The child lock on its own, opened from the board's bar (after the caregiver code). */
function LockPanel() {
  const app = useApp();
  return (
    <Panel title={app.t.lockTitle} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={620}>
      <ChildLock />
    </Panel>
  );
}

export function CaregiverOverlay() {
  const { overlay } = useApp();
  switch (overlay?.kind) {
    case 'lock':
      return <LockPanel />;
    case 'print':
      return <PrintPanel cards={overlay.cards} />;
    case 'editor':
      return overlay.only ? (
        <PartEditor board={overlay.board} index={overlay.index} only={overlay.only} />
      ) : (
        <CellEditor board={overlay.board} index={overlay.index} />
      );
    case 'conceptEditor':
      return <ConceptEditorPanel concept={overlay.concept} />;
    case 'picker':
      return <PickerPanel title={overlay.title} onPick={overlay.onPick} />;
    case 'scheduleEditor':
      return <ScheduleEditor id={overlay.id} />;
    case 'cellMenu':
      return <CellMenu board={overlay.board} index={overlay.index} />;
    case 'tlaMenu':
      return <TlaMenu id={overlay.id} />;
    case 'shareTla':
      return <ShareTlaPanel id={overlay.id} />;
    case 'moveToTla':
      return <MoveToTlaPanel />;
    default:
      return null;
  }
}

// ── Profile mutation helpers (built-in vocabulary is never modified, only overridden) ──

function setLabel(d: Profile, id: string, lang: Lang, value: string) {
  const custom = d.customConcepts[id];
  if (custom) {
    custom.labels[lang] = value;
    return;
  }
  const base = getConcept(d, id)?.labels[lang];
  const o = (d.overrides[id] ??= {});
  o.labels = { ...(o.labels ?? {}) };
  if (!value.trim() || value === base) delete o.labels[lang];
  else o.labels[lang] = value;
}

function setClass(d: Profile, id: string, cls: WordClass) {
  if (d.customConcepts[id]) d.customConcepts[id].cls = cls;
  else (d.overrides[id] ??= {}).cls = cls;
}

// ── Word editor ──

function CellEditor({ board, index }: { board: string; index: number }) {
  const app = useApp();
  const back = useBack();
  const { profile, t } = app;
  const [spanError, setSpanError] = useState(false);
  const b = profile.boards[board];
  const cell = b?.cells[index];
  if (!b || !cell) return null;
  const isCore = b.kind === 'core';

  const replace = () =>
    app.setOverlay({
      kind: 'picker',
      back: { kind: 'editor', board, index },
      onPick: (conceptId) => {
        app.update((d) => {
          const c = d.boards[board].cells[index];
          if (c) c.concept = conceptId;
        });
        app.setOverlay({ kind: 'editor', board, index });
      },
    });
  const remove = () => {
    app.update((d) => void (d.boards[board].cells[index] = null));
    app.setOverlay(null);
  };
  const setCell = (fn: (c: NonNullable<typeof cell>) => void) =>
    app.update((d) => {
      const c = d.boards[board].cells[index];
      if (c) fn(c);
    });
  const span = cell.span ?? [1, 1];
  const spans: { value: string; label: string; span: [number, number] }[] = [
    { value: '1x1', label: '1 × 1', span: [1, 1] },
    { value: '2x1', label: '2 × 1', span: [2, 1] },
    { value: '1x2', label: '1 × 2', span: [1, 2] },
    { value: '2x2', label: '2 × 2', span: [2, 2] },
  ];
  const STRENGTHS: { value: string; label: string; v?: number }[] = [
    { value: 'pale', label: t.pale, v: 0.1 },
    { value: 'soft', label: t.soft },
    { value: 'medium', label: t.medium, v: 0.45 },
    { value: 'strong', label: t.strong, v: 0.72 },
    { value: 'full', label: t.full, v: 1 },
  ];
  const strength = STRENGTHS.find((x) => x.v === cell.intensity)?.value ?? 'soft';

  return (
    <Panel title={t.editWord} onClose={() => app.setOverlay(null)} onBack={back} tone="edit">
      <ConceptEditorBody conceptId={cell.concept} />

      <Section title={t.card}>
        <Text style={s.label}>{t.cardSize}</Text>
        <Segmented
          value={String(cell.size ?? 1)}
          onChange={(v) => setCell((c) => (v === '1' ? delete c.size : (c.size = Number(v))))}
          options={[
            { value: '0.6', label: '60 %' },
            { value: '0.8', label: '80 %' },
            { value: '1', label: '100 %' },
          ]}
        />
        <Text style={s.label}>{t.cardSpan}</Text>
        <Segmented
          value={`${span[0]}x${span[1]}`}
          onChange={(v) => {
            const next = spans.find((x) => x.value === v)!.span;
            const test = structuredClone(b);
            delete test.cells[index]!.span;
            if (!canSpan(test, index, next)) return setSpanError(true);
            setSpanError(false);
            setCell((c) => (next[0] === 1 && next[1] === 1 ? delete c.span : (c.span = next)));
          }}
          options={spans.map(({ value, label }) => ({ value, label }))}
        />
        {spanError && <Text style={[s.note, { color: C.help }]}>{t.spanBlocked}</Text>}
        <Text style={s.label}>{t.colorStrength}</Text>
        <Segmented
          value={strength}
          onChange={(v) => {
            const x = STRENGTHS.find((o) => o.value === v)!;
            setCell((c) => (x.v === undefined ? delete c.intensity : (c.intensity = x.v)));
          }}
          options={STRENGTHS.map(({ value, label }) => ({ value, label }))}
        />
      </Section>

      {isCore && !cell.folder && (
        <Section title={t.level}>
          <Segmented
            value={cell.level ?? 1}
            onChange={(v) => setCell((c) => void (c.level = v as 1 | 2 | 3))}
            options={[1, 2, 3].map((n) => ({ value: n, label: `${t.levelN} ${n}` }))}
          />
          <Text style={s.note}>{t.levelHelp}</Text>
        </Section>
      )}
      {isCore && <Text style={[s.note, s.lockNote]}>{t.moveWarning}</Text>}
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <Btn
          icon="target"
          label={t.moveCell}
          onPress={() => {
            app.setMoveSource({ board, index });
            app.setOverlay(null);
          }}
          style={{ flexGrow: 1 }}
        />
        {!cell.folder && <Btn icon="pencil" label={t.replaceWord} onPress={replace} style={{ flexGrow: 1 }} />}
        {!cell.folder && <Btn kind="danger" icon="trash" label={t.removeFromBoard} onPress={remove} style={{ flexGrow: 1 }} />}
      </View>
      <Btn kind="primary" icon="check" label={t.close} onPress={() => app.setOverlay(null)} />
    </Panel>
  );
}

/** Double-tap menu → "Replace the picture" / "Record the pronunciation": just that part. */
function PartEditor({ board, index, only }: { board: string; index: number; only: 'image' | 'voice' }) {
  const app = useApp();
  const back = useBack();
  const cell = app.profile.boards[board]?.cells[index];
  if (!cell) return null;
  const e = editStrings(app.profile.settings.uiLang);
  return (
    <Panel title={only === 'image' ? e.replaceImage : e.recordVoice} onClose={() => app.setOverlay(null)} onBack={back} tone="edit">
      <ConceptEditorBody conceptId={cell.concept} only={only} />
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <Btn icon="pencil" label={e.edit} onPress={() => app.setOverlay({ kind: 'editor', board, index })} style={{ flexGrow: 1 }} />
        <Btn kind="primary" icon="check" label={app.t.close} onPress={() => app.setOverlay(null)} style={{ flexGrow: 1 }} />
      </View>
    </Panel>
  );
}

function ConceptEditorPanel({ concept }: { concept: string }) {
  const app = useApp();
  const back = useBack();
  return (
    <Panel title={app.t.editWord} onClose={() => app.setOverlay(null)} onBack={back} tone="edit">
      <ConceptEditorBody conceptId={concept} />
      <Btn kind="primary" icon="check" label={app.t.close} onPress={() => app.setOverlay(null)} />
    </Panel>
  );
}

function LabelField({ conceptId, lang }: { conceptId: string; lang: Lang }) {
  const app = useApp();
  const [value, setValue] = useState(() => label(app.profile, conceptId, lang));
  useEffect(() => {
    const id = setTimeout(() => {
      if (value !== label(app.profile, conceptId, lang)) app.update((d) => setLabel(d, conceptId, lang, value));
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field
      label={langName(app.profile.settings, lang)}
      value={value}
      onChangeText={setValue}
      style={isRtl(lang) ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}
    />
  );
}

function ConceptEditorBody({ conceptId, only }: { conceptId: string; only?: 'image' | 'voice' }) {
  const app = useApp();
  const { profile, t, lang } = app;
  const langs = availableLangs(profile.settings);
  const [audioChoice, setAudioLang] = useState<Lang>(lang);
  const audioLang = langs.includes(audioChoice) ? audioChoice : langs[0];
  const [emoji, setEmoji] = useState('');
  const [source, setSource] = useState<PictureSource>('pictos');
  const cls = wordClass(profile, conceptId);
  const credit = profile.overrides[conceptId]?.credit;
  const sym = symbolOf(profile, conceptId);
  const audio = profile.overrides[conceptId]?.audio?.[audioLang];

  const setSymbol = (symbol: Profile['overrides'][string]['symbol'], credit?: string) =>
    app.update((d) => {
      const o = (d.overrides[conceptId] ??= {});
      const old = o.symbol;
      if (old?.kind === 'media' && (!symbol || symbol.kind !== 'media' || symbol.name !== old.name)) deleteMedia(old.name);
      if (symbol) o.symbol = symbol;
      else delete o.symbol;
      if (credit) o.credit = credit;
      else delete o.credit;
    });

  const photo = async (source: 'library' | 'camera') => {
    const name = await pickPhoto(source);
    if (!name) return;
    setSymbol({ kind: 'media', name });
    countFeature('photo');
  };

  return (
    <>
      <View style={s.previewRow}>
        <View style={[s.preview, { backgroundColor: CLASS_COLORS[cls].bg, borderColor: CLASS_COLORS[cls].border }]}>
          <SymbolView symbol={sym} size={84} />
          <Text style={s.previewText}>{label(profile, conceptId, lang)}</Text>
        </View>
        {!only && (
          <View style={{ flex: 1, gap: 8 }}>
            {langs.map((l) => (
              <LabelField key={l} conceptId={conceptId} lang={l} />
            ))}
          </View>
        )}
      </View>

      {only !== 'voice' && (
        <Section title={t.symbol}>
          {credit ? (
            <Text style={s.note}>
              {t.webCredit} : {credit}
            </Text>
          ) : null}
          <PictureSources value={source} onChange={setSource} />
          {source === 'pictos' && (
            <>
              <Text style={s.label}>{t.pictoLibrary}</Text>
              <PictoSearch
                initialQuery={label(profile, conceptId, profile.settings.uiLang)}
                lang={profile.settings.uiLang}
                onPick={async (id) => {
                  const name = await pictoToMedia(id);
                  if (!name) return;
                  setSymbol({ kind: 'media', name }, await pictoCredit(id));
                  // For the app's team (families who agreed): a picture was swapped (never which one).
                  countFeature('pictoSwap');
                }}
              />
            </>
          )}
          {source === 'photo' && <OwnLibrary onPick={photo} />}
          <View style={s.row}>
            <Btn small icon="undo" label={t.resetSymbol} onPress={() => setSymbol(undefined)} />
            <TextInput placeholderTextColor={C.placeholder} value={emoji} onChangeText={setEmoji} placeholder={t.emojiPlaceholder} style={[s.input, { width: 110 }]} maxLength={8} />
            <Btn small label={t.emoji} disabled={!emoji.trim()} onPress={() => setSymbol({ kind: 'emoji', value: emoji.trim() })} />
          </View>
        </Section>
      )}

      {!only && <AppLinkEditor conceptId={conceptId} />}

      {!only && (
        <Section title={t.displayMode}>
          <Segmented
            value={display(profile, conceptId)}
            onChange={(v: CellDisplay) => app.update((d) => void ((d.overrides[conceptId] ??= {}).display = v))}
            options={[
              { value: 'both', label: t.displayBoth },
              { value: 'image', label: t.displayImage },
              { value: 'text', label: t.displayText },
            ]}
          />
        </Section>
      )}

      {only !== 'image' && (
        <Section title={`${t.voice} — ${langName(profile.settings, audioLang)}`}>
          {/* One recording per language; a tick shows the languages that already have one. */}
          <Segmented
            value={audioLang}
            onChange={setAudioLang}
            options={langs.map((l) => ({ value: l, label: `${profile.overrides[conceptId]?.audio?.[l] ? '✓ ' : ''}${langName(profile.settings, l)}` }))}
          />
          <Text style={s.note}>{t.recordNote}</Text>
          <Recorder
            key={audioLang}
            media={audio}
            onChange={(name) =>
              app.update((d) => {
                const o = (d.overrides[conceptId] ??= {});
                o.audio = { ...(o.audio ?? {}) };
                if (name) o.audio[audioLang] = name;
                else delete o.audio[audioLang];
              })
            }
          />
        </Section>
      )}

      {!only && (
        <Section title={t.category}>
          <View style={s.wrapRow}>
            {CLASS_ORDER.filter((c) => c !== 'folder').map((c) => (
              <Pressable
                key={c}
                onPress={() => app.update((d) => setClass(d, conceptId, c))}
                style={[s.classChip, { backgroundColor: CLASS_COLORS[c].bg, borderColor: CLASS_COLORS[c].border }, cls === c && s.classActive]}
              >
                <Text style={s.classText}>{CLASS_NAMES[c][profile.settings.uiLang]}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

/** Which device voice each language uses now, with a button to hear it. */
function VoicesUsed({ st }: { st: Profile['settings'] }) {
  const { t } = useApp();
  const [plan, setPlan] = useState<Record<Lang, VoiceChoice> | null>(null);
  const key = JSON.stringify([st.voiceKind, st.voiceAge, st.gender, st.arabic]);
  useEffect(() => {
    let alive = true;
    prepareVoices(st).then((p) => alive && setPlan(p));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{t.voiceUsed}</Text>
      {availableLangs(st).map((l) => {
        const c = plan?.[l];
        return (
          <View key={l} style={s.row}>
            {/* Separate lines: an Arabic language name must not turn the French line right-to-left. */}
            <View style={{ flex: 1 }}>
              <Text style={s.classText}>{langName(st, l)}</Text>
              <Text style={s.note}>
                {c?.name ?? t.voiceDefaultUsed}
                {c && !c.exact ? ` — ${t.voiceApprox}` : ''}
              </Text>
            </View>
            <Btn small icon="volume" label={t.play} onPress={() => speakText(t.voiceSample[l], l, st)} />
          </View>
        );
      })}
    </View>
  );
}

type PictureSource = 'pictos' | 'photo';

/** Where a word's picture comes from: the app's library of pictograms, or the person's own pictures. */
function PictureSources({ value, onChange }: { value: PictureSource; onChange: (v: PictureSource) => void }) {
  const { t } = useApp();
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: 'pictos', label: t.srcPictos },
        { value: 'photo', label: t.srcPhoto },
      ]}
    />
  );
}

/** Turns a word into an app link (YouTube, WhatsApp…), with the words that open it from a sentence. */
function AppLinkEditor({ conceptId }: { conceptId: string }) {
  const app = useApp();
  const { profile, t } = app;
  const link = appLinkOf(profile, conceptId);
  const [url, setUrl] = useState(link?.url ?? '');
  const [triggers, setTriggers] = useState((link?.triggers ?? []).join(', '));

  const save = (next: AppLink | false) =>
    app.update((d) => {
      const o = (d.overrides[conceptId] ??= {});
      if (next === false && !getConcept(d, conceptId)?.app) delete o.app;
      else o.app = next;
    });

  // Typing is saved after a short pause.
  useEffect(() => {
    if (!link) return;
    const next: AppLink = { url: url.trim(), triggers: triggers.split(',').map((x) => x.trim()).filter(Boolean) };
    if (next.url === link.url && next.triggers.join('|') === link.triggers.join('|')) return;
    const id = setTimeout(() => save(next), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, triggers]);

  const turnOn = (on: boolean) => {
    if (!on) return save(false);
    const next = getConcept(profile, conceptId)?.app ?? { url: '', triggers: [label(profile, conceptId, 'fr')] };
    setUrl(next.url);
    setTriggers(next.triggers.join(', '));
    save(next);
  };

  const draft = { url, triggers: [] };
  const whatsapp = /wa\.me|whatsapp/i.test(url) || /whatsapp/i.test(label(profile, conceptId, 'en'));
  return (
    <Section title={t.appSection}>
      <Toggle label={t.appToggle} value={!!link} onChange={turnOn} />
      {link && (
        <>
          <View style={s.wrapRow}>
            {APP_PRESETS.map((p) => (
              <Btn key={p.name} small label={p.name} onPress={() => setUrl(p.url)} />
            ))}
          </View>
          <Field
            label={t.appUrl}
            value={url}
            onChangeText={setUrl}
            placeholder="https://…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {whatsapp && <Text style={s.note}>{t.appWhatsappHint}</Text>}
          {isIncomplete(draft) && <Text style={s.warnBox}>{t.appEmptyWarning}</Text>}
          <Field label={t.appTriggers} value={triggers} onChangeText={setTriggers} autoCapitalize="none" />
          <Btn small icon="external" label={t.appTest} disabled={isIncomplete(draft)} onPress={() => openAppUrl(url)} />
        </>
      )}
    </Section>
  );
}

/** Thumbnail of a picture already saved for a word being created. */
function MediaThumb({ name, size }: { name: string; size: number }) {
  const uri = useMediaUri(name);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 8 }} resizeMode="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#E4E7EC' }} />
  );
}

// ── Word picker (and new word creation) ──

function PickerPanel({ title, onPick }: { title?: string; onPick: (id: string) => void }) {
  const app = useApp();
  const cameFrom = useBack();
  const { profile, lang, t } = app;
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ fr: string; en: string; ar: string; emoji: string; cls: WordClass }>({
    fr: '',
    en: '',
    ar: '',
    emoji: '⭐',
    cls: 'noun',
  });

  const ids = useMemo(() => {
    // Words only: a folder's name is not a word to put on a card or in a sequence.
    if (q.trim()) return searchWords(profile, q, 60).map((r) => r.concept);
    return allConceptIds(profile)
      .filter((id) => getConcept(profile, id)?.cls !== 'folder')
      .sort((a, b) => label(profile, a, lang).localeCompare(label(profile, b, lang)));
  }, [q, profile, lang]);

  // Pictogram picked automatically from the offline library as the name is typed.
  const [picto, setPicto] = useState<number | undefined>();
  const [pictoTouched, setPictoTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  // …or a picture of the person's own ("Your library") chosen instead.
  const [source, setSource] = useState<PictureSource>('pictos');
  const [ownPicture, setOwnPicture] = useState<{ name: string; credit?: string } | null>(null);
  const chooseOwn = (name: string, credit?: string) => {
    if (ownPicture) deleteMedia(ownPicture.name);
    setOwnPicture({ name, credit });
  };
  const pictoQuery = draft.fr || draft.en || draft.ar;
  // With a child's voice a new word is said with the family's or the therapist's own voice:
  // it is recorded here, in the board's language, before the word can be added.
  const mustRecord = profile.settings.voiceAge === 'child';
  const [recording, setRecording] = useState<string | undefined>();
  const kept = useRef(false);
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  // A recording made for a word that was not added in the end is not left on the device.
  useEffect(
    () => () => {
      if (recordingRef.current && !kept.current) deleteMedia(recordingRef.current);
    },
    [],
  );

  const create = async () => {
    const id = `c_${Date.now().toString(36)}`;
    const name = draft.fr || draft.en || draft.ar;
    if (!name) return;
    setBusy(true);
    const media =
      ownPicture?.name ?? (picto !== undefined ? await pictoToMedia(picto).catch(() => undefined) : undefined);
    const credit = ownPicture?.name ? ownPicture.credit : picto !== undefined ? await pictoCredit(picto).catch(() => undefined) : undefined;
    app.update((d) => {
      d.customConcepts[id] = {
        id,
        cls: draft.cls,
        labels: { fr: draft.fr || name, en: draft.en || name, ar: draft.ar || name },
        emoji: draft.emoji || '⭐',
        custom: true,
      };
      if (media) d.overrides[id] = { symbol: { kind: 'media', name: media }, credit };
      if (recording) (d.overrides[id] ??= {}).audio = { [lang]: recording };
    });
    kept.current = true;
    setBusy(false);
    onPick(id);
  };

  return (
    <Panel
      title={creating ? t.createWord : title ?? t.chooseWord}
      onClose={() => app.setOverlay(null)}
      // Back: out of "create a new word" first, then to the panel this one was opened from.
      onBack={creating ? () => setCreating(false) : cameFrom}
      tone="edit"
    >
      {!creating ? (
        <Btn icon="plus" label={t.createWord} onPress={() => setCreating(true)} />
      ) : (
        <View style={s.createBox}>
          {/* The new word can be said instead of typed (in the language of the board). */}
          <VoiceButton compact lang={lang} label={t.sayWord} onPartial={(said) => setDraft((d) => ({ ...d, [lang]: said }))} onFinal={(said) => setDraft((d) => ({ ...d, [lang]: said }))} />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Français" value={draft.fr} onChangeText={(fr) => setDraft({ ...draft, fr })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="English" value={draft.en} onChangeText={(en) => setDraft({ ...draft, en })} />
            </View>
          </View>
          <View style={s.row}>
            {availableLangs(profile.settings).includes('ar') && (
              <View style={{ flex: 1 }}>
                <Field
                  label={langName(profile.settings, 'ar')}
                  value={draft.ar}
                  onChangeText={(ar) => setDraft({ ...draft, ar })}
                  style={{ textAlign: 'right' }}
                />
              </View>
            )}
            <View style={{ width: 110 }}>
              <Field label={t.emoji} value={draft.emoji} onChangeText={(emoji) => setDraft({ ...draft, emoji })} maxLength={8} />
            </View>
          </View>
          <View style={s.wrapRow}>
            {CLASS_ORDER.filter((c) => c !== 'folder').map((c) => (
              <Pressable
                key={c}
                onPress={() => setDraft({ ...draft, cls: c })}
                style={[s.classChip, { backgroundColor: CLASS_COLORS[c].bg, borderColor: CLASS_COLORS[c].border }, draft.cls === c && s.classActive]}
              >
                <Text style={s.classText}>{CLASS_NAMES[c][profile.settings.uiLang]}</Text>
              </Pressable>
            ))}
          </View>
          <PictureSources value={source} onChange={setSource} />
          {ownPicture && (
            <View style={s.row}>
              <MediaThumb name={ownPicture.name} size={64} />
              <Text style={[s.note, { flex: 1 }]}>
                {t.pictureChosen}
                {ownPicture.credit ? ` — ${ownPicture.credit}` : ''}
              </Text>
              <Btn
                small
                icon="x"
                accessibilityLabel={t.remove}
                onPress={() => {
                  deleteMedia(ownPicture.name);
                  setOwnPicture(null);
                }}
              />
            </View>
          )}
          {source === 'photo' && (
            <OwnLibrary
              onPick={async (from) => {
                const n = await pickPhoto(from);
                if (n) chooseOwn(n);
              }}
            />
          )}
          {source === 'pictos' && !ownPicture && pictoQuery ? (
            <View style={{ gap: 6 }}>
              <Text style={s.note}>{t.suggestedPicto}</Text>
              <PictoSearch
                query={pictoQuery}
                showInput={false}
                max={12}
                lang={draft.fr ? 'fr' : draft.en ? 'en' : 'ar'}
                selectedId={picto}
                onResults={(ids) => {
                  if (!pictoTouched) setPicto(ids[0]);
                }}
                onPick={(id) => {
                  setPictoTouched(true);
                  setPicto(id);
                }}
              />
            </View>
          ) : null}
          {mustRecord && (
            <Section title={`${t.recordRequired} — ${langName(profile.settings, lang)}`}>
              <Text style={s.note}>{t.recordRequiredNote}</Text>
              <Recorder media={recording} onChange={setRecording} />
            </Section>
          )}
          <Btn
            kind="primary"
            icon="check"
            label={busy ? t.creating : t.save}
            disabled={busy || !(draft.fr || draft.en || draft.ar) || (mustRecord && !recording)}
            onPress={create}
          />
        </View>
      )}
      {/* While a new word is being made, only that is on screen ("Back" returns to the list). */}
      {!creating && (
        <>
          {/* The same ways in as the home search: type the word, or say it. */}
          <SearchBox autoFocus value={q} onChange={setQ} placeholder={t.searchPlaceholder} lang={lang} />
          <View style={s.pickGrid}>
            {ids.slice(0, 120).map((id) => (
              <Pressable
                key={id}
                onPress={() => onPick(id)}
                style={({ pressed }) => [s.pickItem, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel={label(profile, id, lang)}
              >
                <SymbolView symbol={symbolOf(profile, id)} size={44} />
                <Text style={s.pickText} numberOfLines={2}>
                  {label(profile, id, lang)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Panel>
  );
}

// ── Schedule editor ──

function ScheduleEditor({ id }: { id: string }) {
  const app = useApp();
  const { profile, t, lang } = app;
  const [confirm, setConfirm] = useState(false);
  const sched = profile.schedules.find((x) => x.id === id);
  if (!sched) return null;
  const mutate = (fn: (s: Profile['schedules'][number]) => void) =>
    app.update((d) => {
      const target = d.schedules.find((x) => x.id === id);
      if (target) fn(target);
    });
  const tlaOptions = [undefined, ...profile.tlaOrder];
  const nextTla = (cur?: string) => tlaOptions[(tlaOptions.indexOf(cur) + 1) % tlaOptions.length];

  return (
    <Panel title={t.editSchedule} onClose={() => app.setOverlay(null)} tone="edit">
      <View style={s.row}>
        <Pressable
          onPress={() =>
            app.setOverlay({
              kind: 'picker',
              back: { kind: 'scheduleEditor', id },
              onPick: (c) => {
                mutate((x) => void (x.concept = c));
                app.setOverlay({ kind: 'scheduleEditor', id });
              },
            })
          }
          style={s.iconPick}
        >
          <SymbolView symbol={symbolOf(profile, sched.concept)} size={48} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Field label={t.scheduleName} value={sched.title} placeholder={scheduleTitle({ ...sched, title: '' }, profile, lang)} onChangeText={(v) => mutate((x) => void (x.title = v))} />
        </View>
      </View>
      {sched.steps.map((st, i) => (
        <View key={st.id} style={s.stepRow}>
          <Text style={s.stepNum}>{i + 1}</Text>
          <SymbolView symbol={symbolOf(profile, st.concept)} size={40} />
          <Text style={s.stepText} numberOfLines={1}>
            {label(profile, st.concept, lang)}
          </Text>
          <Btn small icon="arrowUp" accessibilityLabel="up" disabled={i === 0} onPress={() => mutate((x) => void x.steps.splice(i - 1, 0, ...x.steps.splice(i, 1)))} />
          <Btn small icon="arrowDown" accessibilityLabel="down" disabled={i === sched.steps.length - 1} onPress={() => mutate((x) => void x.steps.splice(i + 1, 0, ...x.steps.splice(i, 1)))} />
          <Btn
            small
            icon="grid"
            label={st.tla && profile.boards[st.tla] ? label(profile, profile.boards[st.tla].concept, lang) : t.none}
            accessibilityLabel={t.linkTla}
            onPress={() => mutate((x) => void (x.steps[i].tla = nextTla(st.tla)))}
          />
          <Btn small icon="minus" accessibilityLabel="-" onPress={() => mutate((x) => void (x.steps[i].timerMin = Math.max(0, (st.timerMin ?? 0) - 1) || undefined))} />
          <Text style={s.minutes}>
            {st.timerMin ?? 0} {t.minutes}
          </Text>
          <Btn small icon="plus" accessibilityLabel="+" onPress={() => mutate((x) => void (x.steps[i].timerMin = (st.timerMin ?? 0) + 1))} />
          <Btn small kind="danger" icon="trash" accessibilityLabel={t.remove} onPress={() => mutate((x) => void x.steps.splice(i, 1))} />
        </View>
      ))}
      <Btn
        icon="plus"
        label={t.addStep}
        onPress={() =>
          app.setOverlay({
            kind: 'picker',
            back: { kind: 'scheduleEditor', id },
            onPick: (c) => {
              mutate((x) => void x.steps.push({ id: `step_${Date.now().toString(36)}`, concept: c, done: false }));
              app.setOverlay({ kind: 'scheduleEditor', id });
            },
          })
        }
      />
      <View style={s.row}>
        <Btn
          kind="danger"
          icon="trash"
          label={confirm ? `${t.deleteSchedule} ?` : t.deleteSchedule}
          onPress={() => {
            if (!confirm) return setConfirm(true);
            app.update((d) => {
              d.schedules = d.schedules.filter((x) => x.id !== id);
              d.activeSchedule = d.schedules[0]?.id;
            });
            app.setOverlay(null);
          }}
          style={{ flex: 1 }}
        />
        <Btn kind="primary" icon="check" label={t.close} onPress={() => app.setOverlay(null)} style={{ flex: 1 }} />
      </View>
    </Panel>
  );
}

// ── Settings ──

const copyOf = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * The settings being changed, before they are saved. Every switch of the "Board" page writes
 * here; "Save" copies it into the child's profile, "Cancel changes" throws it away.
 * (Three things do not wait for Save, because they are not the child's settings: the language
 * of the menus, the child lock of this device, and "Reset".)
 */
export interface SettingsDraft {
  st: Profile['settings'];
  help: Profile['help'];
  /** The caregiver code as typed (kept apart: saved only when it is a valid new code). */
  pin: string;
  pinOk: boolean;
  setPin: (v: string) => void;
  set: (fn: (s: Profile['settings']) => void) => void;
  setHelp: (fn: (h: Profile['help']) => void) => void;
  dirty: boolean;
  save: () => void;
  cancel: () => void;
}

export function useSettingsDraft(): SettingsDraft {
  const app = useApp();
  const { profile } = app;
  const [draft, setDraft] = useState(() => ({ settings: copyOf(profile.settings), help: copyOf(profile.help) }));
  // On a professional's board the code shown and changed here is her own, not the family's.
  const own = app.ownCode;
  const savedPin = own ? own.value ?? '' : profile.settings.pin;
  const [pin, setPin] = useState(savedPin);
  // The menus' language and the code are compared apart.
  const core = (x: Profile['settings']) => stable({ ...x, uiLang: undefined, pin: undefined });
  const pinOk = pin === savedPin || (/^\d{4}$/.test(pin) && !pinTooEasy(pin));
  const dirty = core(draft.settings) !== core(profile.settings) || stable(draft.help) !== stable(profile.help) || (pinOk && pin !== savedPin);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  // Listening to a voice in Settings prepares it for the whole app: when the settings close,
  // the app goes back to the voice that is really saved.
  const saved = useRef(profile.settings);
  saved.current = profile.settings;
  useEffect(() => () => void prepareVoices(saved.current), []);
  // The profile changed elsewhere (another device, "Reset") while nothing was waiting here: follow it.
  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft({ settings: copyOf(profile.settings), help: copyOf(profile.help) });
    setPin(savedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.settings, profile.help, savedPin]);
  return {
    st: draft.settings,
    help: draft.help,
    pin,
    pinOk,
    setPin,
    set: (fn) =>
      setDraft((d) => {
        const settings = copyOf(d.settings);
        fn(settings);
        return { ...d, settings };
      }),
    setHelp: (fn) =>
      setDraft((d) => {
        const help = copyOf(d.help);
        fn(help);
        return { ...d, help };
      }),
    dirty,
    save: () => {
      if (own && pinOk && pin !== savedPin) own.save(pin);
      app.update((d) => {
        // The family's code is never touched from a professional's board.
        d.settings = { ...copyOf(draft.settings), uiLang: d.settings.uiLang, pin: !own && pinOk ? pin : d.settings.pin };
        d.help = copyOf(draft.help);
      });
    },
    cancel: () => {
      setDraft({ settings: copyOf(profile.settings), help: copyOf(profile.help) });
      setPin(savedPin);
    },
  };
}

/** The child's AAC settings (first page of Settings; the others are Team and Account). */
// ── Searching the settings ──

/**
 * The words typed in the settings' search bar (already simplified), and how many parts of the page
 * matched them. Empty: the whole page is shown.
 */
export const SettingsSearch = createContext<{ q: string; hits: { current: number } }>({ q: '', hits: { current: 0 } });

/**
 * The names of the settings in a piece of the page: the labels of its switches, fields and
 * choices. Explanations are left out on purpose (a note that mentions "voice" in passing would
 * bring up the wrong part).
 */
function wordsIn(node: React.ReactNode, out: string[] = []): string[] {
  React.Children.forEach(node, (child) => {
    if (React.isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      for (const k of ['label', 'title']) if (typeof props[k] === 'string') out.push(props[k] as string);
      // a small heading inside the part (<Text style={s.label}>)
      if (props.style === s.label && typeof props.children === 'string') out.push(props.children);
      if (Array.isArray(props.options)) for (const o of props.options as { label?: unknown }[]) if (typeof o?.label === 'string') out.push(o.label);
      wordsIn(props.children as React.ReactNode, out);
    }
  });
  return out;
}

/** Do all the words searched appear in these texts? (accents and capitals do not matter) */
export function matchesSearch(q: string, texts: string[]): boolean {
  const hay = normalize(texts.join(' '));
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

/**
 * A group of the settings page: a line with its name, opened by a touch. While searching, only
 * the groups that hold what is searched are shown, already open.
 */
function Group({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  const search = useContext(SettingsSearch);
  const rtl = useNavRtl();
  const [open, setOpen] = useState(false);
  if (search.q) {
    if (!matchesSearch(search.q, [title, ...wordsIn(children)])) return null;
    search.hits.current += 1;
  }
  const shown = open || !!search.q;
  return (
    <View style={[s.group, shown && s.groupOpen]}>
      <Pressable
        onPress={() => setOpen(!shown)}
        style={({ pressed }) => [s.groupHead, rtl && { flexDirection: 'row-reverse' }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={title}
        {...expanded(shown)}
      >
        <Icon name={icon} size={22} color={shown ? C.accent : C.text} />
        <Text style={[s.groupTitle, shown && { color: C.accent }, rtl && { textAlign: 'right' }]}>{title}</Text>
        <Icon name={shown ? 'chevronDown' : rtl ? 'chevronLeft' : 'chevronRight'} size={20} color={C.textMuted} />
      </Pressable>
      {shown && <View style={s.groupBody}>{children}</View>}
    </View>
  );
}

/** Shown under the page when the search found nothing in it. */
function NothingFound({ text }: { text: string }) {
  const search = useContext(SettingsSearch);
  return search.q && search.hits.current === 0 ? <Text style={s.note}>{text}</Text> : null;
}

export function BoardSettingsBody({ draft }: { draft: SettingsDraft }) {
  const app = useApp();
  const { profile, t } = app;
  const sess = useSession();
  const board = useBoard();
  const o = onboardingStrings(profile.settings.uiLang);
  const { st, set, pin, setPin } = draft;
  const searching = !!useContext(SettingsSearch).q;
  const langs = availableLangs(st);
  const childLangs = st.langs?.length ? st.langs : [st.lang];
  // As at set-up: Arabic not among the child's languages means no Arabic in the app, so "Which
  // Arabic?" only shows once Arabic is ticked. Ticked again before saving, it gets its dialect back.
  const lastDialect = useRef<ArabicDialect>('lb');
  if (st.arabic && st.arabic !== 'none') lastDialect.current = st.arabic;
  const toggleLang = (l: Lang, on: boolean) =>
    set((x) => {
      const cur = x.langs?.length ? x.langs : [x.lang];
      const next = on ? cur.filter((y) => y !== l) : [...cur, l];
      if (!next.length) return;
      x.langs = next;
      if (!next.includes(x.lang)) x.lang = next[0];
      if (l === 'ar') x.arabic = on ? 'none' : lastDialect.current;
    });
  const setArabic = (v: ArabicDialect) => set((x) => void (x.arabic = v));
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      {/* Ten short groups, closed at first: one thing in one place (the lock and the guide are on the bar). */}
      <Group title={t.gLanguages} icon="globe">
        <Text style={s.label}>{t.sChildLangs}</Text>
        <View style={s.wrapRow}>
          {availableLangs({ arabic: 'lb' }).map((l) => {
            const on = childLangs.includes(l);
            return (
              <Btn
                key={l}
                small
                kind={on ? 'primary' : 'secondary'}
                icon={on ? 'check' : undefined}
                selected={on}
                label={l === 'ar' ? o.langArabic : langName(st, l)}
                onPress={() => toggleLang(l, on)}
              />
            );
          })}
        </View>
        {langs.length > 1 && (
          <>
            <Text style={s.label}>{t.sCommLang}</Text>
            <Segmented value={st.lang} onChange={(v: Lang) => set((x) => void (x.lang = v))} options={langs.map((l) => ({ value: l, label: langName(st, l) }))} />
          </>
        )}
        {childLangs.includes('ar') && (
          <>
            <Text style={s.label}>{t.sArabic}</Text>
            <View style={s.wrapRow} accessibilityRole="radiogroup">
              {DIALECT_ORDER.map((d) => {
                const on = (st.arabic && st.arabic !== 'none' ? st.arabic : 'lb') === d;
                return (
                  <Btn
                    key={d}
                    small
                    kind={on ? 'primary' : 'secondary'}
                    icon={on ? 'check' : undefined}
                    selected={on}
                    label={dialectName(d, st.uiLang)}
                    onPress={() => setArabic(d)}
                  />
                );
              })}
            </View>
          </>
        )}
        <Text style={s.label}>{t.sInterface}</Text>
        <Segmented
          value={st.uiLang}
          onChange={(v: UiLang) => app.setUiLang(v)}
          options={(['fr', 'en', 'ar'] as UiLang[]).map((l) => ({ value: l, label: UI_LANG_NAMES[l] }))}
        />
      </Group>

      <Group title={t.gWords} icon="image">
        <Text style={s.label}>{t.sLevel}</Text>
        <Segmented
          value={st.revealLevel}
          onChange={(v) => set((x) => void (x.revealLevel = v as 1 | 2 | 3))}
          options={[1, 2, 3].map((n) => ({ value: n, label: `${t.levelN} ${n}` }))}
        />
        {st.revealLevel < 3 && (
          <>
            <Text style={s.label}>{t.sWordPlaces}</Text>
            <Segmented
              value={st.wordPlaces ?? 'compact'}
              onChange={(v) => set((x) => void (x.wordPlaces = v))}
              options={[
                { value: 'compact', label: t.sWordPlacesCompact },
                { value: 'final', label: t.sWordPlacesFinal },
              ]}
            />
            <Text style={s.note}>{(st.wordPlaces ?? 'compact') === 'compact' ? t.sWordPlacesCompactNote : t.sWordPlacesFinalNote}</Text>
          </>
        )}
        <Text style={s.label}>{t.sSymbols}</Text>
        <Segmented
          value={st.symbolSet}
          onChange={(v) => set((x) => void (x.symbolSet = v))}
          options={[
            { value: 'pictos', label: t.sSymbolsPictos },
            { value: 'emoji', label: 'Emoji' },
          ]}
        />
        <Toggle label={t.sShowLabels} value={st.showLabels} onChange={(v) => set((x) => void (x.showLabels = v))} />
        <Text style={s.label}>{o.pictoSize}</Text>
        <Segmented
          value={st.pictoSize ?? 'normal'}
          onChange={(v: Profile['settings']['pictoSize']) => set((x) => void (x.pictoSize = v))}
          options={[
            { value: 'normal', label: o.pictoNormal },
            { value: 'large', label: o.pictoLarge },
          ]}
        />
      </Group>

      <Group title={t.gDisplay} icon="eye">
        <Text style={s.label}>{o.visualTitle}</Text>
        <Segmented
          value={st.visual ?? 'standard'}
          onChange={(v: Profile['settings']['visual']) => set((x) => void (x.visual = v))}
          options={(['standard', 'large', 'contrast'] as const).map((v) => ({ value: v, label: o.visual[v] }))}
        />
        <Toggle
          label={o.reduceMotionToggle}
          value={!!st.reduceMotion}
          onChange={(v) =>
            set((x) => {
              x.reduceMotion = v;
              // Pictures that wiggle are an animation: turned off with the others.
              if (v) x.wiggle = false;
            })
          }
        />
        <Toggle
          label={t.sWiggle}
          value={!!st.wiggle}
          onChange={(v) =>
            set((x) => {
              x.wiggle = v;
              // "Fewer animations" would silently stop it: the last choice wins.
              if (v) x.reduceMotion = false;
            })
          }
        />
        {!!st.wiggle && <WiggleTry label={t.sWiggleTry} concept="want" />}
      </Group>

      <Group title={t.gTouch} icon="pointer">
        <Text style={s.label}>{o.accessTitle}</Text>
        <Segmented
          value={st.access ?? 'release'}
          onChange={(v: Profile['settings']['access']) => set((x) => void (x.access = v))}
          options={(['release', 'press', 'hold'] as const).map((v) => ({ value: v, label: o.access[v] }))}
        />
        <Text style={s.note}>{o.accessNotes[st.access ?? 'release']}</Text>
        {st.access === 'hold' && (
          <>
            <Text style={s.label}>{o.holdTime}</Text>
            <Segmented
              value={st.holdTime ?? 1}
              onChange={(v: number) => set((x) => void (x.holdTime = v))}
              options={[0.5, 1, 1.5, 2].map((v) => ({ value: v, label: `${v} s` }))}
            />
          </>
        )}
        <Text style={s.label}>{t.sRepeatDelay}</Text>
        <Segmented
          value={String(st.repeatDelay ?? 0)}
          onChange={(v) => set((x) => void (x.repeatDelay = Number(v)))}
          options={[
            { value: '0', label: t.repeatOff },
            ...[1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n} s` })),
          ]}
        />
      </Group>

      <Group title={t.gSentence} icon="pencil">
        <Toggle label={t.sSpeakOnTap} value={st.speakOnTap} onChange={(v) => set((x) => void (x.speakOnTap = v))} />
        <Toggle label={t.sAddToStrip} value={st.addToStrip} onChange={(v) => set((x) => void (x.addToStrip = v))} />
        <Toggle label={t.sGrammar} value={st.grammar} onChange={(v) => set((x) => void (x.grammar = v))} />
        {/* Only French and Arabic words change with the speaker's gender (English has no agreement). */}
        {[...childLangs, st.lang].some((l) => l === 'fr' || l === 'ar') && (
          <>
            <Text style={s.label}>{t.sGender}</Text>
            <Segmented
              value={st.gender}
              onChange={(v) => set((x) => void (x.gender = v))}
              options={[
                { value: 'm', label: t.masculine },
                { value: 'f', label: t.feminine },
              ]}
            />
          </>
        )}
        <Toggle label={t.sQuickZone} value={st.quickZone} onChange={(v) => set((x) => void (x.quickZone = v))} />
        <Toggle label={t.sAutoApps} value={st.autoOpenApps !== false} onChange={(v) => set((x) => void (x.autoOpenApps = v))} />
      </Group>

      <Group title={t.sVoice} icon="volume">
        <View style={s.row}>
          <Text style={[s.label, { flex: 1 }]}>
            {t.sRate} : {st.speechRate.toFixed(1)}×
          </Text>
          <Btn small icon="minus" accessibilityLabel="-" onPress={() => set((x) => void (x.speechRate = Math.max(0.5, +(x.speechRate - 0.1).toFixed(1))))} />
          <Btn small icon="plus" accessibilityLabel="+" onPress={() => set((x) => void (x.speechRate = Math.min(1.6, +(x.speechRate + 0.1).toFixed(1))))} />
        </View>
        <Text style={s.label}>{t.sVoiceKind}</Text>
        {/* Four voices, all made from the device's own: nothing else to choose. */}
        <Segmented
          value={voiceOption(st)}
          onChange={(v: VoiceOption) =>
            // What older versions let people choose (height, a precise voice) is put back to plain.
            set((x) => {
              Object.assign(x, optionParts(v));
              x.voicePitch = 1;
              x.voices = {};
            })
          }
          options={[
            { value: 'woman', label: t.voiceWoman },
            { value: 'man', label: t.voiceMan },
            { value: 'girl', label: t.voiceGirl },
            { value: 'boy', label: t.voiceBoy },
          ]}
        />
        {st.voiceAge === 'child' && <Text style={s.note}>{t.voiceKidsNote}</Text>}
        <VoicesUsed st={st} />
      </Group>

      <Group title={t.sBar} icon="grid">
        <Toggle label={t.tla} value={st.bar.tla} onChange={(v) => set((x) => void (x.bar.tla = v))} />
        <Toggle label={t.schedule} value={st.bar.schedule} onChange={(v) => set((x) => void (x.bar.schedule = v))} />
        {/* What the Schedule screen also offers: shown under it, so "schedule" means one thing. */}
        {st.bar.schedule && (
          <View style={s.under}>
            <Toggle
              label={o.planWeek}
              value={!!st.plans?.week}
              onChange={(v) => set((x) => void (x.plans = { ...(x.plans ?? { week: false, month: false }), week: v }))}
            />
            <Toggle
              label={o.planMonth}
              value={!!st.plans?.month}
              onChange={(v) => set((x) => void (x.plans = { ...(x.plans ?? { week: false, month: false }), month: v }))}
            />
          </View>
        )}
        <Toggle label={t.timer} value={st.bar.timer} onChange={(v) => set((x) => void (x.bar.timer = v))} />
      </Group>

      <Group title={t.sHelp} icon="help">
        {langs.map((l) => (
          <Field
            key={l}
            label={`${t.sHelpMessage} — ${langName(st, l)}`}
            value={draft.help.message[l]}
            onChangeText={(v) => draft.setHelp((h) => void (h.message[l] = v))}
            style={isRtl(l) ? { textAlign: 'right' } : undefined}
          />
        ))}
        <Field label={t.helpHowI} multiline value={draft.help.howICommunicate} onChangeText={(v) => draft.setHelp((h) => void (h.howICommunicate = v))} style={{ minHeight: 70 }} />
        <Field label={t.helpContact} value={draft.help.emergencyContact} onChangeText={(v) => draft.setHelp((h) => void (h.emergencyContact = v))} />
      </Group>

      <Group title={t.gCodeData} icon="shield">
        <Field label={app.ownCode ? t.sPinOwn : t.sPin} value={pin} keyboardType="number-pad" maxLength={4} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} />
        {!draft.pinOk && <Text style={s.note}>{pin.length === 4 ? t.pinTooEasy : t.sPinFour}</Text>}
        {app.ownCode && <Text style={s.note}>{t.sPinOwnNote}</Text>}
        <Toggle label={t.sAi} note={t.sAiNote} value={st.aiSuggestions !== false} onChange={(v) => set((x) => void (x.aiSuggestions = v))} />
        <View style={s.wrapRow}>
          {/* With an account, the backup is on the Account page (Privacy): not twice. */}
          {!board && <Btn icon="download" label={t.sExport} onPress={() => exportJson('profil-caa.json', profile)} />}
          <Btn
            kind="danger"
            icon="trash"
            label={confirmReset ? t.sResetConfirm : t.sReset}
            onPress={async () => {
              if (!confirmReset) return setConfirmReset(true);
              app.replaceProfile(createDefaultProfile());
              app.setEditMode(false);
            }}
          />
        </View>
      </Group>

      <Group title={t.sAbout} icon="heart">
        <Text style={s.note}>{t.aboutText}</Text>
        {Object.keys(VOICE_INDEX).length > 0 && (
          <Text style={s.note}>
            {t.aboutVoices} {VOICE_PROVIDER.name}.
          </Text>
        )}
        <PictoCredit lang={profile.settings.uiLang} />
      </Group>
      <NothingFound text={t.sSearchNone} />
    </>
  );
}

// ── Print / PDF ──

type PrintTarget = { kind: 'board'; id: string } | { kind: 'schedule'; id: string } | { kind: 'firstThen' } | { kind: 'cards' };

/** `cards`: words chosen with the multi-selection, printed as picture cards. */
function PrintPanel({ cards }: { cards?: string[] }) {
  const app = useApp();
  const back = useBack();
  const { profile, t, lang, view, path, tlaId } = app;
  const currentBoard = view === 'tla' && tlaId ? tlaId : path[path.length - 1];
  const [target, setTarget] = useState<PrintTarget>(
    cards?.length
      ? { kind: 'cards' }
      : view === 'schedule' && profile.activeSchedule
        ? { kind: 'schedule', id: profile.activeSchedule }
        : { kind: 'board', id: currentBoard },
  );
  const [o, setO] = useState<PrintOptions>({ paper: 'A4', landscape: true, blackWhite: false, labels: true, cutCards: false });
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let doc = '';
      if (target.kind === 'cards' && cards?.length) {
        const cells = await Promise.all(cards.map((c) => conceptCell(profile, c, lang)));
        const cols = Math.max(1, Math.min(cells.length, o.landscape ? 4 : 3));
        doc = buildPrintHtml(editStrings(profile.settings.uiLang).cardsTitle, Math.ceil(cells.length / cols), cols, cells, o, lang);
      } else if (target.kind === 'board') {
        const b = profile.boards[target.id];
        if (b) doc = buildPrintHtml(label(profile, b.concept, lang), b.rows, b.cols, await boardCells(profile, b, lang), o, lang);
      } else if (target.kind === 'schedule') {
        const sc = profile.schedules.find((x) => x.id === target.id);
        if (sc) {
          const cells = await Promise.all(sc.steps.map((st, i) => conceptCell(profile, st.concept, lang, String(i + 1))));
          const cols = Math.max(1, Math.min(cells.length, o.landscape ? 4 : 3));
          doc = buildPrintHtml(scheduleTitle(sc, profile, lang), Math.max(1, Math.ceil(cells.length / cols)), cols, cells, o, lang);
        }
      } else {
        const sc = profile.schedules.find((x) => x.id === profile.activeSchedule);
        const pending = sc?.steps.filter((x) => !x.done) ?? [];
        const first = profile.firstThen?.first ?? pending[0]?.concept;
        const then = profile.firstThen?.then ?? pending[1]?.concept;
        const cells = await Promise.all(
          [first, then].map((c, i) => (c ? conceptCell(profile, c, lang, i === 0 ? t.first : t.then) : Promise.resolve(null))),
        );
        doc = buildPrintHtml(t.firstThen, 1, 2, cells, o, lang);
      }
      if (alive) setHtml(doc);
    })();
    return () => {
      alive = false;
    };
  }, [target, o, profile, lang, t, cards]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      // For the app's team (families who agreed): something was printed, and which kind of support.
      countFeature('print');
      if (target.kind === 'schedule' || target.kind === 'firstThen') countFeature('printSchedule');
      else if (target.kind === 'board' && target.id !== 'core' && profile.boards[target.id]?.kind === 'tla') countFeature('printTla');
    } catch (e) {
      reportProblem('print', e);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const targets: { key: string; label: string; value: PrintTarget }[] = [
    ...(cards?.length ? [{ key: 'cards', label: `${editStrings(profile.settings.uiLang).cardsTitle} (${cards.length})`, value: { kind: 'cards' as const } }] : []),
    {
      key: `b:${currentBoard}`,
      label: `${t.currentBoard} : ${label(profile, profile.boards[currentBoard]?.concept ?? 'f_mine', lang)}`,
      value: { kind: 'board', id: currentBoard },
    },
    ...profile.tlaOrder
      .filter((id) => id !== currentBoard)
      .map((id) => ({ key: `b:${id}`, label: `${t.tla} : ${label(profile, profile.boards[id].concept, lang)}`, value: { kind: 'board' as const, id } })),
    ...profile.schedules.map((sc) => ({
      key: `s:${sc.id}`,
      label: `${t.schedule} : ${scheduleTitle(sc, profile, lang)}`,
      value: { kind: 'schedule' as const, id: sc.id },
    })),
    { key: 'ft', label: t.firstThen, value: { kind: 'firstThen' } },
  ];
  const targetKey = target.kind === 'firstThen' ? 'ft' : target.kind === 'cards' ? 'cards' : `${target.kind === 'board' ? 'b' : 's'}:${target.id}`;

  return (
    <Panel title={t.printTitle} onClose={() => app.setOverlay(null)} onBack={back} tone="edit" maxWidth={980}>
      <Section title={t.printWhat}>
        <View style={s.wrapRow}>
          {targets.map((x) => (
            <Btn key={x.key} small kind={x.key === targetKey ? 'primary' : 'secondary'} label={x.label} onPress={() => setTarget(x.value)} />
          ))}
        </View>
      </Section>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <View style={{ minWidth: 180, flex: 1, gap: 6 }}>
          <Text style={s.label}>{t.paper}</Text>
          <Segmented value={o.paper} onChange={(paper) => setO({ ...o, paper })} options={[{ value: 'A4', label: 'A4' }, { value: 'A3', label: 'A3' }]} />
        </View>
        <View style={{ minWidth: 240, flex: 1, gap: 6 }}>
          <Text style={s.label}>{t.orientation}</Text>
          <Segmented
            value={o.landscape ? 'l' : 'p'}
            onChange={(v) => setO({ ...o, landscape: v === 'l' })}
            options={[
              { value: 'p', label: t.portrait },
              { value: 'l', label: t.landscape },
            ]}
          />
        </View>
      </View>
      <Toggle label={t.blackWhite} value={o.blackWhite} onChange={(blackWhite) => setO({ ...o, blackWhite })} />
      <Toggle label={t.printLabels} value={o.labels} onChange={(labels) => setO({ ...o, labels })} />
      <Toggle label={t.cutCards} value={o.cutCards} onChange={(cutCards) => setO({ ...o, cutCards })} />
      <Text style={s.note}>{t.privacyNote}</Text>
      {Platform.OS === 'web' && <Text style={[s.note, s.lockNote]}>{t.printWebNote}</Text>}
      {html ? <PrintPreview html={html} landscape={o.landscape} /> : null}
      <View style={s.row}>
        <Btn kind="primary" icon="printer" label={t.printNow} disabled={!html || busy} onPress={() => run(() => printDocument(html, o.landscape))} style={{ flex: 1 }} />
        <Btn icon="download" label={t.exportPdf} disabled={!html || busy} onPress={() => run(() => exportPdf(html, o.paper, o.landscape))} style={{ flex: 1 }} />
      </View>
    </Panel>
  );
}

const s = StyleSheet.create({
  warnBox: { fontSize: 13, backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontSize: 13, color: C.textMuted },
  // Switches that belong to the one above them (week and month, under Schedule).
  // The groups of the settings page (see Group).
  group: { borderWidth: 1.5, borderColor: C.border, borderRadius: radius.md, backgroundColor: C.surface },
  groupOpen: { borderColor: C.accent },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14 },
  groupTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
  groupBody: { gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  under: { marginStart: 14, paddingStart: 12, borderStartWidth: 3, borderStartColor: C.border, gap: 4 },
  lockNote: { backgroundColor: C.surfaceAlt, padding: 10, borderRadius: radius.md },
  label: { fontSize: 14, fontWeight: '700', color: C.text },
  previewRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  preview: { width: 130, height: 140, borderRadius: 12, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  previewText: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 16,
    color: C.text,
  },
  hits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hit: { width: 76, height: 76, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  classChip: { paddingHorizontal: 12, minHeight: 38, justifyContent: 'center', borderRadius: 19, borderWidth: 2 },
  classActive: { borderWidth: 4 },
  classText: { fontSize: 14, fontWeight: '700', color: C.text },
  createBox: { gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: C.surfaceAlt },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickItem: {
    width: 104,
    height: 96,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    gap: 2,
    backgroundColor: '#fff',
  },
  pickText: { fontSize: 13, fontWeight: '600', textAlign: 'center', color: C.text },
  iconPick: { width: 64, height: 64, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  stepNum: { width: 20, fontWeight: '800', color: C.textMuted },
  stepText: { flex: 1, minWidth: 100, fontSize: 16, fontWeight: '700', color: C.text },
  minutes: { minWidth: 46, textAlign: 'center', fontWeight: '700', color: C.text },
});
