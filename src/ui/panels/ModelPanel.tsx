import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { parseSentence } from '../../lib/parseSentence';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section, Segmented } from '../common';
import { Icon } from '../Icon';
import { C, radius } from '../theme';
import { VoiceButton } from '../VoiceButton';

/**
 * Partner modelling (spec §29 "je modèle"): dictate a sentence and watch the app
 * press each word on the board, or record a demonstration and replay it.
 */
export function ModelPanel() {
  const app = useApp();
  const { t, profile, lang } = app;
  const [text, setText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const show = (sentence: string) => {
    const steps = parseSentence(profile, sentence, lang);
    if (steps.length) app.playSteps(steps, { speakAtEnd: true });
  };

  return (
    <Panel title={t.modelTitle} onClose={() => app.setOverlay(null)}>
      <Section title={t.dictate}>
        <Text style={styles.note}>{t.dictateHint}</Text>
        <VoiceButton lang={lang} onFinal={show} />
        <View style={styles.row}>
          <View style={styles.grow}>
            <Field
              label={t.orType}
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => text.trim() && show(text)}
              placeholder="je veux manger"
              returnKeyType="go"
              style={lang === 'ar' ? { textAlign: 'right' } : undefined}
            />
          </View>
          <Btn kind="danger" icon="trash" label={t.clear} disabled={!text} onPress={() => setText('')} />
          <Btn kind="primary" icon="pointer" label={t.showOnBoard} disabled={!text.trim()} onPress={() => show(text)} style={styles.grow} />
        </View>
      </Section>

      <Section title={t.demos}>
        <Btn kind="danger" icon="record" label={t.recordDemo} onPress={app.startRecording} />
        <Text style={styles.note}>{t.recordHint}</Text>
        {profile.demos.length === 0 && <Text style={styles.note}>{t.noDemos}</Text>}
        {profile.demos.map((d) => (
          <View key={d.id} style={styles.demo}>
            <Icon name="pointer" size={22} color={C.textMuted} />
            <Text style={styles.demoTitle} numberOfLines={2}>
              {d.title}
            </Text>
            <Btn small kind="primary" icon="play" label={t.replay} onPress={() => app.playSteps(d.steps)} />
            <Btn
              small
              kind="danger"
              icon="trash"
              label={confirmDelete === d.id ? '?' : undefined}
              accessibilityLabel={t.remove}
              onPress={() => {
                if (confirmDelete !== d.id) return setConfirmDelete(d.id);
                app.update((p) => void (p.demos = p.demos.filter((x) => x.id !== d.id)));
              }}
            />
          </View>
        ))}
        <Text style={styles.label}>{t.speed}</Text>
        <Segmented
          value={String(profile.settings.modelPace ?? 1)}
          onChange={(v) => app.update((p) => void (p.settings.modelPace = Number(v)))}
          options={[
            { value: '1.6', label: t.slow },
            { value: '1', label: t.normal },
            { value: '0.6', label: t.fast },
          ]}
        />
      </Section>
    </Panel>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, padding: 10, borderRadius: radius.md, color: C.edit },
  label: { fontSize: 14, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  grow: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: C.surfaceAlt,
  },
  demoTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
});
