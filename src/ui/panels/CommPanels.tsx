import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isRtl, label, LANG_NAMES, symbolOf } from '../../lib/lexicon';
import { search, type Location } from '../../lib/search';
import { speakText } from '../../lib/speech';
import { LANGS, type Lang } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Panel } from '../common';
import { Icon } from '../Icon';
import { SymbolView } from '../SymbolView';
import { C, radius } from '../theme';

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
  const results = useMemo(() => search(profile, q), [profile, q]);

  return (
    <Panel title={t.search} onClose={() => app.setOverlay(null)}>
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

/** Keyboard always available for literate users (spec §10). */
export function KeyboardPanel() {
  const app = useApp();
  const { t, lang, profile } = app;
  const [text, setText] = useState('');
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
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Btn kind="danger" icon="trash" label={t.clear} disabled={!text} onPress={() => setText('')} style={{ flexGrow: 1 }} />
        <Btn kind="success" icon="volume" label={t.speak} disabled={!text.trim()} onPress={() => speakText(text, lang, profile.settings)} style={{ flex: 1 }} />
        <Btn
          kind="primary"
          icon="plus"
          label={t.addToSentence}
          disabled={!text.trim()}
          onPress={() => {
            app.addText(text);
            app.setOverlay(null);
          }}
          style={{ flex: 1 }}
        />
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
export function LangPanel() {
  const app = useApp();
  const { t, profile } = app;
  const choose = (l: Lang) => {
    app.update((d) => void (d.settings.lang = l));
    app.setOverlay(null);
  };
  return (
    <Panel title={t.language} onClose={() => app.setOverlay(null)} maxWidth={480}>
      {LANGS.map((l) => {
        const active = profile.settings.lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => choose(l)}
            style={({ pressed }) => [styles.langBtn, active && styles.langActive, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.langText, active && { color: C.accent }]}>{LANG_NAMES[l]}</Text>
            {active && <Icon name="check" size={24} color={C.accent} strokeWidth={3} />}
          </Pressable>
        );
      })}
      <Text style={styles.muted}>{t.langNote}</Text>
    </Panel>
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
  langText: { fontSize: 22, fontWeight: '700', color: C.text },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginVertical: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.edit },
  dotOn: { backgroundColor: C.edit },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: 84, height: 64 },
  keyBtn: { borderRadius: radius.md, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: '700', color: C.text },
});
