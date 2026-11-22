/**
 * "Export the board": the board with its photos and sounds, without the caregiver code
 * (src/lib/backupFile.ts). Account → Privacy with an account, Settings → Board → Code and data
 * without one; read back by "Import a board from another caregiver" in the set-up.
 */
import React, { useState } from 'react';
import { Text } from 'react-native';
import { backupStrings } from '../../i18n/backup';
import { exportBackup } from '../../lib/backupFile';
import type { Profile, UiLang } from '../../model/types';
import { Btn } from '../common';
import { C } from '../theme';

export function BoardExportButton({ profile, childName, uiLang, small }: { profile: Profile; childName?: string; uiLang: UiLang; small?: boolean }) {
  const t = backupStrings(uiLang);
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'failed' } | { kind: 'missing'; n: number }>({ kind: 'idle' });
  return (
    <>
      <Btn
        small={small}
        icon="download"
        label={state.kind === 'busy' ? t.exportBusy : t.exportBoard}
        disabled={state.kind === 'busy'}
        onPress={async () => {
          setState({ kind: 'busy' });
          try {
            const { missing } = await exportBackup(profile, childName);
            setState(missing ? { kind: 'missing', n: missing } : { kind: 'idle' });
          } catch {
            setState({ kind: 'failed' });
          }
        }}
      />
      {state.kind === 'failed' && (
        <Text style={{ color: C.help, fontWeight: '600' }} accessibilityLiveRegion="polite">
          {t.exportFailed}
        </Text>
      )}
      {state.kind === 'missing' && (
        <Text style={{ color: C.textMuted, fontWeight: '600' }} accessibilityLiveRegion="polite">
          {t.exportMissing(state.n)}
        </Text>
      )}
    </>
  );
}
