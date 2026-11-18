/**
 * "Export for another AAC app (.obz)": next to the profile's own export (Account → Privacy with an
 * account, Settings → Board → Code and data without one). The boards in the Open Board Format,
 * so the family is never locked in (src/lib/obz.ts).
 */
import React, { useState } from 'react';
import { Text } from 'react-native';
import { exportObz } from '../../lib/obzExport';
import type { Profile } from '../../model/types';
import { Btn } from '../common';
import { C } from '../theme';

export function ObzExportButton({
  profile,
  childName,
  label,
  busy,
  failed,
  small,
}: {
  profile: Profile;
  childName?: string;
  label: string;
  busy: string;
  failed: string;
  small?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  return (
    <>
      <Btn
        small={small}
        icon="download"
        label={state === 'busy' ? busy : label}
        disabled={state === 'busy'}
        onPress={async () => {
          setState('busy');
          try {
            await exportObz(profile, childName);
            setState('idle');
          } catch {
            setState('failed');
          }
        }}
      />
      {state === 'failed' && (
        <Text style={{ color: C.help, fontWeight: '600' }} accessibilityLiveRegion="polite">
          {failed}
        </Text>
      )}
    </>
  );
}
