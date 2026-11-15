/**
 * Saving a recorded word without the silence around it (tablet app).
 * A recording cannot be opened as sound here, so the file is kept as it is and the two moments
 * where the voice starts and stops (from the loudness measured while recording) are written in
 * its name: the player starts and stops there (`spanOfName` in `speech.ts`).
 */
import { saveMedia } from './media';
import { levelSpan, spanTag, type Level } from './trimSilence';

export async function saveRecording(uri: string, levels: Level[], totalMs: number): Promise<string> {
  const span = levelSpan(levels, totalMs);
  return saveMedia(uri, 'm4a', span ? spanTag(span) : undefined);
}
