import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { deleteMedia } from '../../lib/media';
import { saveRecording } from '../../lib/recordingTrim';
import type { Level } from '../../lib/trimSilence';
import { playMedia } from '../../lib/speech';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { C } from '../theme';

/**
 * Records a personal pronunciation for a word in one language (spec §13, §25):
 * used for names, dialect words, or words the synthetic voice gets wrong.
 * The silence before and after the word is left out when the recording is saved (`saveRecording`).
 */
// The loudness is measured while recording: in the tablet app it tells where the voice is.
const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export function Recorder({ media, onChange }: { media?: string; onChange: (name: string | undefined) => void }) {
  const { t } = useApp();
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 60);
  const [error, setError] = useState<string | null>(null);
  const levels = useRef<Level[]>([]);
  useEffect(() => {
    if (state.isRecording && typeof state.metering === 'number') levels.current.push({ ms: state.durationMillis ?? 0, db: state.metering });
  }, [state.isRecording, state.metering, state.durationMillis]);

  const start = async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError(t.noMic);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      levels.current = [];
      recorder.record();
    } catch {
      setError(t.noMic);
    }
  };

  const stop = async () => {
    try {
      const totalMs = state.durationMillis ?? 0;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) return;
      const name = await saveRecording(uri, levels.current, totalMs);
      if (media) deleteMedia(media);
      onChange(name);
    } catch {
      setError(t.noMic);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {state.isRecording ? (
          <Btn kind="danger" icon="pause" label={`${t.stop} (${Math.round((state.durationMillis ?? 0) / 1000)} s)`} onPress={stop} />
        ) : (
          <Btn icon="mic" label={t.record} onPress={start} />
        )}
        {media && !state.isRecording && (
          <>
            <Btn icon="play" label={t.play} onPress={() => playMedia(media)} />
            <Btn
              kind="danger"
              icon="trash"
              accessibilityLabel={t.remove}
              onPress={() => {
                deleteMedia(media);
                onChange(undefined);
              }}
            />
          </>
        )}
      </View>
      {state.isRecording && <Text style={{ color: C.help, fontWeight: '700' }}>● {t.recording}</Text>}
      {error && <Text style={{ color: C.help }}>{error}</Text>}
    </View>
  );
}
