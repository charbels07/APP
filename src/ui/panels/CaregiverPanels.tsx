import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BUILTIN_CONCEPTS } from '../../data/concepts';
import { CLASS_NAMES, CLASS_ORDER, CLASS_COLORS, C, radius } from '../theme';
import { allConceptIds, display, getConcept, isRtl, label, LANG_NAMES, symbolOf, wordClass } from '../../lib/lexicon';
import { deleteMedia } from '../../lib/media';
import { pickPhoto } from '../../lib/photos';
import { APP_PRESETS, appLinkOf, isIncomplete, openAppUrl } from '../../lib/appLinks';
import { exportJson, exportPdf, printDocument } from '../../lib/platform';
import { boardCells, buildPrintHtml, conceptCell, type PrintOptions } from '../../lib/printHtml';
import { canSpan } from '../../lib/boardOps';
import { pictoToMedia } from '../../lib/pictoLibrary';
import { search } from '../../lib/search';
import { listVoices, prepareVoices, speakText } from '../../lib/speech';
import type { VoiceChoice } from '../../lib/voices';
import { resetProfile } from '../../lib/storage';
import { UI_LANG_NAMES } from '../../i18n/ui';
import { LANGS, type AppLink, type CellDisplay, type Lang, type Profile, type UiLang, type WordClass } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section, Segmented, Toggle } from '../common';
import { PictoSearch } from '../PictoPicker';
import { WebPicturePicker } from '../WebPictures';
import { PrintPreview } from '../PrintPreview';
import { SymbolView, useMediaUri } from '../SymbolView';
import { scheduleTitle } from '../screens/ScheduleScreen';
import { Recorder } from './Recorder';

export function CaregiverOverlay() {
  const { overlay } = useApp();
  switch (overlay?.kind) {
    case 'settings':
      return <SettingsPanel />;
    case 'print':
      return <PrintPanel />;
    case 'editor':
      return <CellEditor board={overlay.board} index={overlay.index} />;
    case 'conceptEditor':
      return <ConceptEditorPanel concept={overlay.concept} />;
    case 'picker':
      return <PickerPanel title={overlay.title} onPick={overlay.onPick} />;
    case 'scheduleEditor':
      return <ScheduleEditor id={overlay.id} />;
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
  const base = BUILTIN_CONCEPTS[id]?.labels[lang];
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
  const { profile, t } = app;
  const [spanError, setSpanError] = useState(false);
  const b = profile.boards[board];
  const cell = b?.cells[index];
  if (!b || !cell) return null;
  const isCore = b.kind === 'core';

  const replace = () =>
    app.setOverlay({
      kind: 'picker',
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
    <Panel title={t.editWord} onClose={() => app.setOverlay(null)} tone="edit">
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

function ConceptEditorPanel({ concept }: { concept: string }) {
  const app = useApp();
  return (
    <Panel title={app.t.editWord} onClose={() => app.setOverlay(null)} tone="edit">
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
      label={LANG_NAMES[lang]}
      value={value}
      onChangeText={setValue}
      style={isRtl(lang) ? { textAlign: 'right', writingDirection: 'rtl' } : undefined}
    />
  );
}

function ConceptEditorBody({ conceptId }: { conceptId: string }) {
  const app = useApp();
  const { profile, t, lang } = app;
  const [audioLang, setAudioLang] = useState<Lang>(lang);
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
    if (name) setSymbol({ kind: 'media', name });
  };

  return (
    <>
      <View style={s.previewRow}>
        <View style={[s.preview, { backgroundColor: CLASS_COLORS[cls].bg, borderColor: CLASS_COLORS[cls].border }]}>
          <SymbolView symbol={sym} size={84} />
          <Text style={s.previewText}>{label(profile, conceptId, lang)}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {LANGS.map((l) => (
            <LabelField key={l} conceptId={conceptId} lang={l} />
          ))}
        </View>
      </View>

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
                if (name) setSymbol({ kind: 'media', name });
              }}
            />
          </>
        )}
        {source === 'photo' && (
          <View style={s.wrapRow}>
            <Btn small icon="image" label={t.photoLibrary} onPress={() => photo('library')} />
            <Btn small icon="camera" label={t.takePhoto} onPress={() => photo('camera')} />
          </View>
        )}
        {source === 'web' && (
          <WebPicturePicker
            initialQuery={label(profile, conceptId, profile.settings.uiLang)}
            onPicked={(name, credit) => setSymbol({ kind: 'media', name }, credit)}
          />
        )}
        <View style={s.row}>
          <Btn small icon="undo" label={t.resetSymbol} onPress={() => setSymbol(undefined)} />
          <TextInput value={emoji} onChangeText={setEmoji} placeholder={t.emojiPlaceholder} style={[s.input, { width: 110 }]} maxLength={8} />
          <Btn small label={t.emoji} disabled={!emoji.trim()} onPress={() => setSymbol({ kind: 'emoji', value: emoji.trim() })} />
        </View>
      </Section>

      <AppLinkEditor conceptId={conceptId} />

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

      <Section title={`${t.voice} — ${LANG_NAMES[audioLang]}`}>
        <Segmented value={audioLang} onChange={setAudioLang} options={LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))} />
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
    </>
  );
}

/** Which device voice each language uses now, with a button to hear it. */
function VoicesUsed() {
  const { profile, t } = useApp();
  const st = profile.settings;
  const [plan, setPlan] = useState<Record<Lang, VoiceChoice> | null>(null);
  const key = JSON.stringify([st.voiceKind, st.voiceAge, st.voices]);
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
      {LANGS.map((l) => {
        const c = plan?.[l];
        return (
          <View key={l} style={s.row}>
            {/* Separate lines: an Arabic language name must not turn the French line right-to-left. */}
            <View style={{ flex: 1 }}>
              <Text style={s.classText}>{LANG_NAMES[l]}</Text>
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

type PictureSource = 'pictos' | 'photo' | 'web';

/** Where a word's picture comes from: offline pictograms, a photo, or the internet. */
function PictureSources({ value, onChange }: { value: PictureSource; onChange: (v: PictureSource) => void }) {
  const { t } = useApp();
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: 'pictos', label: t.srcPictos },
        { value: 'photo', label: t.srcPhoto },
        { value: 'web', label: t.srcWeb },
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
    if (q.trim()) return search(profile, q, 60).map((r) => r.concept);
    return allConceptIds(profile)
      .filter((id) => getConcept(profile, id)?.cls !== 'folder')
      .sort((a, b) => label(profile, a, lang).localeCompare(label(profile, b, lang)));
  }, [q, profile, lang]);

  // Pictogram picked automatically from the offline ARASAAC library as the name is typed.
  const [picto, setPicto] = useState<number | undefined>();
  const [pictoTouched, setPictoTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  // …or a photo / a picture from the internet chosen instead.
  const [source, setSource] = useState<PictureSource>('pictos');
  const [ownPicture, setOwnPicture] = useState<{ name: string; credit?: string } | null>(null);
  const chooseOwn = (name: string, credit?: string) => {
    if (ownPicture) deleteMedia(ownPicture.name);
    setOwnPicture({ name, credit });
  };
  const pictoQuery = draft.fr || draft.en || draft.ar;

  const create = async () => {
    const id = `c_${Date.now().toString(36)}`;
    const name = draft.fr || draft.en || draft.ar;
    if (!name) return;
    setBusy(true);
    const media =
      ownPicture?.name ?? (picto !== undefined ? await pictoToMedia(picto).catch(() => undefined) : undefined);
    app.update((d) => {
      d.customConcepts[id] = {
        id,
        cls: draft.cls,
        labels: { fr: draft.fr || name, en: draft.en || name, ar: draft.ar || name },
        emoji: draft.emoji || '⭐',
        custom: true,
      };
      if (media) d.overrides[id] = { symbol: { kind: 'media', name: media }, credit: ownPicture?.credit };
    });
    setBusy(false);
    onPick(id);
  };

  return (
    <Panel title={title ?? t.chooseWord} onClose={() => app.setOverlay(null)} tone="edit">
      {!creating ? (
        <Btn icon="plus" label={t.createWord} onPress={() => setCreating(true)} />
      ) : (
        <View style={s.createBox}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Français" value={draft.fr} onChangeText={(fr) => setDraft({ ...draft, fr })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="English" value={draft.en} onChangeText={(en) => setDraft({ ...draft, en })} />
            </View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="عربي" value={draft.ar} onChangeText={(ar) => setDraft({ ...draft, ar })} style={{ textAlign: 'right' }} />
            </View>
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
            <View style={s.wrapRow}>
              <Btn small icon="image" label={t.photoLibrary} onPress={async () => { const n = await pickPhoto('library'); if (n) chooseOwn(n); }} />
              <Btn small icon="camera" label={t.takePhoto} onPress={async () => { const n = await pickPhoto('camera'); if (n) chooseOwn(n); }} />
            </View>
          )}
          {source === 'web' && <WebPicturePicker initialQuery={pictoQuery} onPicked={chooseOwn} />}
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
          <Btn
            kind="primary"
            icon="check"
            label={busy ? t.creating : t.save}
            disabled={busy || !(draft.fr || draft.en || draft.ar)}
            onPress={create}
          />
        </View>
      )}
      <TextInput autoFocus value={q} onChangeText={setQ} placeholder={t.searchPlaceholder} style={s.input} placeholderTextColor="#98A2B3" />
      <View style={s.pickGrid}>
        {ids.slice(0, 120).map((id) => (
          <Pressable key={id} onPress={() => onPick(id)} style={({ pressed }) => [s.pickItem, pressed && { opacity: 0.6 }]}>
            <SymbolView symbol={symbolOf(profile, id)} size={44} />
            <Text style={s.pickText} numberOfLines={2}>
              {label(profile, id, lang)}
            </Text>
          </Pressable>
        ))}
      </View>
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

function SettingsPanel() {
  const app = useApp();
  const { profile, t } = app;
  const st = profile.settings;
  const set = (fn: (s: Profile['settings']) => void) => app.update((d) => fn(d.settings));
  const [voiceLang, setVoiceLang] = useState<Lang>(st.lang);
  const [voices, setVoices] = useState<Awaited<ReturnType<typeof listVoices>>>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pin, setPin] = useState(st.pin);
  useEffect(() => {
    listVoices(voiceLang).then(setVoices);
  }, [voiceLang]);

  return (
    <Panel title={t.settings} onClose={() => app.setOverlay(null)} tone="edit">
      <Btn icon="book" label={t.openGuide} onPress={() => app.setOverlay({ kind: 'guide' })} />
      <Section title={t.sCommunication}>
        <Text style={s.label}>{t.sCommLang}</Text>
        <Segmented value={st.lang} onChange={(v: Lang) => set((x) => void (x.lang = v))} options={LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))} />
        <Text style={s.label}>{t.sInterface}</Text>
        <Segmented
          value={st.uiLang}
          onChange={(v: UiLang) => set((x) => void (x.uiLang = v))}
          options={(['fr', 'en', 'ar'] as UiLang[]).map((l) => ({ value: l, label: UI_LANG_NAMES[l] }))}
        />
        <Text style={s.label}>{t.sGender}</Text>
        <Segmented
          value={st.gender}
          onChange={(v) => set((x) => void (x.gender = v))}
          options={[
            { value: 'm', label: t.masculine },
            { value: 'f', label: t.feminine },
          ]}
        />
        <Text style={s.label}>{t.sLevel}</Text>
        <Segmented
          value={st.revealLevel}
          onChange={(v) => set((x) => void (x.revealLevel = v as 1 | 2 | 3))}
          options={[1, 2, 3].map((n) => ({ value: n, label: `${t.levelN} ${n}` }))}
        />
        <Text style={s.label}>{t.sSymbols}</Text>
        <Segmented
          value={st.symbolSet}
          onChange={(v) => set((x) => void (x.symbolSet = v))}
          options={[
            { value: 'arasaac', label: 'ARASAAC' },
            { value: 'emoji', label: 'Emoji' },
          ]}
        />
        <Toggle label={t.sShowLabels} value={st.showLabels} onChange={(v) => set((x) => void (x.showLabels = v))} />
        <Toggle label={t.sSpeakOnTap} value={st.speakOnTap} onChange={(v) => set((x) => void (x.speakOnTap = v))} />
        <Toggle label={t.sAddToStrip} value={st.addToStrip} onChange={(v) => set((x) => void (x.addToStrip = v))} />
        <Toggle label={t.sGrammar} value={st.grammar} onChange={(v) => set((x) => void (x.grammar = v))} />
        <Toggle label={t.sQuickZone} value={st.quickZone} onChange={(v) => set((x) => void (x.quickZone = v))} />
        <Text style={s.label}>{t.sRepeatDelay}</Text>
        <Segmented
          value={String(st.repeatDelay ?? 0)}
          onChange={(v) => set((x) => void (x.repeatDelay = Number(v)))}
          options={[
            { value: '0', label: t.repeatOff },
            ...[1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n} s` })),
          ]}
        />
        <Text style={s.note}>{t.sRepeatNote}</Text>
        <Toggle label={t.sWiggle} value={!!st.wiggle} onChange={(v) => set((x) => void (x.wiggle = v))} />
        <Toggle label={t.sAutoApps} value={st.autoOpenApps !== false} onChange={(v) => set((x) => void (x.autoOpenApps = v))} />
      </Section>

      <Section title={t.sBar}>
        <Toggle label={t.tla} value={st.bar.tla} onChange={(v) => set((x) => void (x.bar.tla = v))} />
        <Toggle label={t.schedule} value={st.bar.schedule} onChange={(v) => set((x) => void (x.bar.schedule = v))} />
        <Toggle label={t.timer} value={st.bar.timer} onChange={(v) => set((x) => void (x.bar.timer = v))} note={t.sBarNote} />
      </Section>

      <Section title={t.sVoice}>
        <View style={s.row}>
          <Text style={[s.label, { flex: 1 }]}>
            {t.sRate} : {st.speechRate.toFixed(1)}×
          </Text>
          <Btn small icon="minus" accessibilityLabel="-" onPress={() => set((x) => void (x.speechRate = Math.max(0.5, +(x.speechRate - 0.1).toFixed(1))))} />
          <Btn small icon="plus" accessibilityLabel="+" onPress={() => set((x) => void (x.speechRate = Math.min(1.6, +(x.speechRate + 0.1).toFixed(1))))} />
        </View>
        <Text style={s.label}>{t.sVoiceKind}</Text>
        <Segmented
          value={st.voiceKind ?? 'device'}
          onChange={(v: Profile['settings']['voiceKind']) =>
            // A new kind of voice replaces any precise voice chosen before.
            set((x) => {
              x.voiceKind = v;
              x.voices = {};
            })
          }
          options={[
            { value: 'device', label: t.voiceDevice },
            { value: 'f', label: t.voiceFemale },
            { value: 'm', label: t.voiceMale },
          ]}
        />
        <Text style={s.label}>{t.sVoiceAge}</Text>
        <Segmented
          value={st.voiceAge ?? 'adult'}
          onChange={(v: Profile['settings']['voiceAge']) => set((x) => void (x.voiceAge = v))}
          options={[
            { value: 'adult', label: t.voiceAdult },
            { value: 'child', label: t.voiceChild },
          ]}
        />
        {st.voiceAge === 'child' && <Text style={s.note}>{t.voiceChildNote}</Text>}
        <VoicesUsed />
        <Text style={s.label}>{t.voicePrecise}</Text>
        <Text style={s.label}>{t.sVoiceFor}</Text>
        <Segmented value={voiceLang} onChange={setVoiceLang} options={LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] }))} />
        <View style={s.wrapRow}>
          <Btn
            small
            kind={!st.voices[voiceLang] ? 'primary' : 'secondary'}
            label={t.sDefaultVoice}
            onPress={() => set((x) => void delete x.voices[voiceLang])}
          />
          {voices.slice(0, 12).map((v) => (
            <Btn
              key={v.id}
              small
              kind={st.voices[voiceLang] === v.id ? 'primary' : 'secondary'}
              label={v.gender ? `${v.name} · ${v.gender === 'f' ? t.voiceFemale : t.voiceMale}` : v.name}
              onPress={() => set((x) => void (x.voices[voiceLang] = v.id))}
            />
          ))}
        </View>
      </Section>

      <Section title={t.sHelp}>
        {LANGS.map((l) => (
          <Field
            key={l}
            label={`${t.sHelpMessage} — ${LANG_NAMES[l]}`}
            value={profile.help.message[l]}
            onChangeText={(v) => app.update((d) => void (d.help.message[l] = v))}
            style={isRtl(l) ? { textAlign: 'right' } : undefined}
          />
        ))}
        <Field label={t.helpHowI} multiline value={profile.help.howICommunicate} onChangeText={(v) => app.update((d) => void (d.help.howICommunicate = v))} style={{ minHeight: 70 }} />
        <Field label={t.helpContact} value={profile.help.emergencyContact} onChangeText={(v) => app.update((d) => void (d.help.emergencyContact = v))} />
      </Section>

      <Section title={t.sSecurity}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label={t.sPin} value={pin} keyboardType="number-pad" maxLength={4} onChangeText={(v) => setPin(v.replace(/\D/g, ''))} />
          </View>
          <Btn small kind="primary" label={t.save} disabled={pin.length !== 4 || pin === st.pin} onPress={() => set((x) => void (x.pin = pin))} style={{ alignSelf: 'flex-end' }} />
        </View>
      </Section>

      <Section title={t.sData}>
        <Toggle label={t.sAi} value={st.aiSuggestions !== false} onChange={(v) => set((x) => void (x.aiSuggestions = v))} />
        <View style={s.wrapRow}>
          <Btn icon="download" label={t.sExport} onPress={() => exportJson('profil-caa.json', profile)} />
          <Btn
            kind="danger"
            icon="trash"
            label={confirmReset ? t.sResetConfirm : t.sReset}
            onPress={async () => {
              if (!confirmReset) return setConfirmReset(true);
              app.replaceProfile(await resetProfile());
              app.setEditMode(false);
            }}
          />
        </View>
      </Section>

      <Section title={t.sAbout}>
        <Text style={s.note}>{t.aboutText}</Text>
        <Text style={s.note}>{t.attribution}</Text>
      </Section>
    </Panel>
  );
}

// ── Print / PDF ──

type PrintTarget = { kind: 'board'; id: string } | { kind: 'schedule'; id: string } | { kind: 'firstThen' };

function PrintPanel() {
  const app = useApp();
  const { profile, t, lang, view, path, tlaId } = app;
  const currentBoard = view === 'tla' && tlaId ? tlaId : path[path.length - 1];
  const [target, setTarget] = useState<PrintTarget>(
    view === 'schedule' && profile.activeSchedule ? { kind: 'schedule', id: profile.activeSchedule } : { kind: 'board', id: currentBoard },
  );
  const [o, setO] = useState<PrintOptions>({ paper: 'A4', landscape: true, blackWhite: false, labels: true, cutCards: false });
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let doc = '';
      if (target.kind === 'board') {
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
  }, [target, o, profile, lang, t]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const targets: { key: string; label: string; value: PrintTarget }[] = [
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
  const targetKey = target.kind === 'firstThen' ? 'ft' : `${target.kind === 'board' ? 'b' : 's'}:${target.id}`;

  return (
    <Panel title={t.printTitle} onClose={() => app.setOverlay(null)} tone="edit" maxWidth={980}>
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
  lockNote: { backgroundColor: C.surfaceAlt, padding: 10, borderRadius: radius.md },
  label: { fontSize: 14, fontWeight: '700', color: C.text },
  previewRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  preview: { width: 130, height: 140, borderRadius: 12, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  previewText: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
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
