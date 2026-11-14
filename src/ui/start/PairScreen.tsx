/**
 * A new tablet joins a child's profile with the 8-character code shown on the parent's device
 * (letters and digits; typed in any case, with or without the space).
 * The tablet gets its own nameless account (no email), limited to that child.
 */
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { errorText } from '../../i18n/account';
import { useSession } from '../../state/Session';
import { Btn, Field } from '../common';
import { ErrorText, StartLayout, T, st } from './StartLayout';

/** "abcd2345" → "ABCD 2345": easier to read and to compare with the other screen. */
export const groupCode = (v: string) => {
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return c.length > 4 ? `${c.slice(0, 4)} ${c.slice(4)}` : c;
};

export function PairScreen() {
  const { s, go, api, deviceId, enter } = useSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState(s.deviceNameDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const profileId = await api.redeemPairingCode(code.replace(/[^A-Za-z0-9]/g, ''), {
        id: deviceId,
        name: name.trim() || s.deviceNameDefault,
        platform: Platform.OS,
      });
      await enter({ profileId });
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StartLayout title={s.pairTitle} onBack={() => go({ name: 'welcome' })}>
      <T style={st.muted}>{s.pairIntro}</T>
      <Field
        label={s.pairCode}
        value={code}
        onChangeText={(v) => setCode(groupCode(v))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        style={{ fontSize: 26, letterSpacing: 4, textAlign: 'center' }}
        accessibilityLabel={s.pairCode}
      />
      <Field label={s.deviceName} value={name} onChangeText={setName} accessibilityLabel={s.deviceName} />
      <ErrorText text={error} />
      <Btn kind="primary" icon="link" label={s.pairButton} onPress={submit} disabled={busy || code.replace(/[^A-Za-z0-9]/g, '').length < 6} />
    </StartLayout>
  );
}
