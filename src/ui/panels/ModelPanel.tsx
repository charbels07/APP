import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { label } from '../../lib/lexicon';
import { parseSentence } from '../../lib/parseSentence';
import type { Lang } from '../../model/types';
import { useApp } from '../../state/AppState';
import { Btn, Field, Panel, Section, Segmented } from '../common';
import { Icon } from '../Icon';
import { C, radius } from '../theme';

const RECOGNITION_LANG: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  // iOS only offers Standard (Saudi) Arabic; Android and browsers accept Lebanese.
  ar: Platform.OS === 'ios' ? 'ar-SA' : 'ar-LB',
};

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

function VoiceButton({ lang, onFinal }: { lang: Lang; onFinal: (text: string) => void }) {
  const app = useApp();
  const { t, profile } = app;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(false);
  const finalText = useRef('');

  useSpeechRecognitionEvent('result', (e) => {
    const tx = e.results[0]?.transcript ?? '';
    setTranscript(tx);
    if (e.isFinal) finalText.current = tx;
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const tx = finalText.current || transcript;
    finalText.current = '';
    if (tx.trim()) onFinal(tx);
  });
  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setError(true);
  });

  const start = async () => {
    setError(false);
    setTranscript('');
    finalText.current = '';
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) throw new Error('unavailable');
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) throw new Error('denied');
      // Help the recogniser with the board's own words.
      const vocab = profile.boards.core.cells
        .filter(Boolean)
        .map((c) => label(profile, c!.concept, lang))
        .slice(0, 100);
      ExpoSpeechRecognitionModule.start({
        lang: RECOGNITION_LANG[lang],
        interimResults: true,
        continuous: false,
        contextualStrings: vocab,
      });
      setListening(true);
    } catch {
      setError(true);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={listening ? () => ExpoSpeechRecognitionModule.stop() : start}
        accessibilityRole="button"
        accessibilityLabel={listening ? t.stop : t.dictate}
        style={({ pressed }) => [styles.mic, listening && styles.micOn, pressed && { opacity: 0.8 }]}
      >
        <Icon name={listening ? 'pause' : 'mic'} size={34} color="#fff" />
        <Text style={styles.micText}>{listening ? t.listening : t.dictate}</Text>
      </Pressable>
      {transcript ? <Text style={styles.transcript}>« {transcript} »</Text> : null}
      {error && <Text style={[styles.note, styles.warn]}>{t.dictateUnavailable}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, padding: 10, borderRadius: radius.md, color: C.edit },
  label: { fontSize: 14, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  grow: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  mic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: C.accent,
  },
  micOn: { backgroundColor: C.help },
  micText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  transcript: { fontSize: 18, color: C.text, fontStyle: 'italic' },
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
