import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { deleteMedia, saveMedia } from '../../lib/media';
import { playMedia } from '../../lib/speech';
import { useApp } from '../../state/AppState';
import { Btn } from '../common';
import { C } from '../theme';

/**
 * Records a personal pronunciation for a word in one language (spec §13, §25):
 * used for names, dialect words, or words the synthetic voice gets wrong.
 */
export function Recorder({ media, onChange }: { media?: string; onChange: (name: string | undefined) => void }) {
  const { t } = useApp();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = useState<string | null>(null);

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
      recorder.record();
    } catch {
      setError(t.noMic);
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) return;
      const name = await saveMedia(uri, Platform.OS === 'web' ? 'webm' : 'm4a');
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
