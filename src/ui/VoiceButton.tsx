import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { arabicLocale, label } from '../lib/lexicon';
import type { Lang } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { C, radius } from './theme';

/** iOS only offers Standard (Saudi) Arabic; Android and browsers accept the country's own Arabic. */
const recognitionLang = (lang: Lang, arabic: string): string =>
  lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : Platform.OS === 'ios' ? 'ar-SA' : arabic;

/** Microphone button: speech recognition on the device (dictation, search by voice). */
export function VoiceButton({
  lang,
  onFinal,
  onPartial,
  label: idleLabel,
  compact,
}: {
  lang: Lang;
  onFinal: (text: string) => void;
  /** Words heard so far (to fill a search field live). */
  onPartial?: (text: string) => void;
  label?: string;
  compact?: boolean;
}) {
  const app = useApp();
  const { t, profile } = app;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(false);
  const finalText = useRef('');

  useSpeechRecognitionEvent('result', (e) => {
    const tx = e.results[0]?.transcript ?? '';
    setTranscript(tx);
    onPartial?.(tx);
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
        lang: recognitionLang(lang, arabicLocale(profile.settings)),
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
        accessibilityLabel={listening ? t.stop : idleLabel ?? t.dictate}
        style={({ pressed }) => [styles.mic, compact && styles.micCompact, listening && styles.micOn, pressed && { opacity: 0.8 }]}
      >
        <Icon name={listening ? 'pause' : 'mic'} size={compact ? 24 : 34} color="#fff" />
        <Text style={[styles.micText, compact && { fontSize: 16 }]}>{listening ? t.listening : idleLabel ?? t.dictate}</Text>
      </Pressable>
      {transcript && !onPartial ? <Text style={styles.transcript}>« {transcript} »</Text> : null}
      {error && <Text style={[styles.note, styles.warn]}>{t.dictateUnavailable}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, padding: 10, borderRadius: radius.md, color: C.edit },
  mic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: C.accent,
  },
  micCompact: { minHeight: 48, paddingHorizontal: 14 },
  micOn: { backgroundColor: C.help },
  micText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  transcript: { fontSize: 18, color: C.text, fontStyle: 'italic' },
});
