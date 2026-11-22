import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { eraseLater } from '../../lib/mediaKeep';
import { outside } from '../../lib/outside';
import { countFeature, reportProblem } from '../../lib/product';
import { saveRecording } from '../../lib/recordingTrim';
import type { Level } from '../../lib/trimSilence';
import { playMedia } from '../../lib/speech';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { useSeen } from '../Seen';
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
  // For the app's team (families who agreed): the way to record a word was on screen.
  useSeen('recording');
  useEffect(() => {
    if (state.isRecording && typeof state.metering === 'number') levels.current.push({ ms: state.durationMillis ?? 0, db: state.metering });
  }, [state.isRecording, state.metering, state.durationMillis]);

  const start = async () => {
    setError(null);
    try {
      // The system's question about the microphone covers the app for a moment.
      const perm = await outside(() => requestRecordingPermissionsAsync());
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
      // The recording it replaces stays 30 days ("Undo", earlier versions).
      if (media) void eraseLater([media]);
      onChange(name);
      countFeature('recording');
    } catch (e) {
      reportProblem('mic', e);
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
                void eraseLater([media]);
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
