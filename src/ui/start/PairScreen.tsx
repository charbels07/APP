/**
 * A new tablet joins a child's profile with the 6-digit code shown on the parent's device.
 * The tablet gets its own nameless account (no email), limited to that child.
 */
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { errorText } from '../../i18n/account';
import { useSession } from '../../state/Session';
import { Btn, Field } from '../common';
import { ErrorText, StartLayout, T, st } from './StartLayout';

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
      const profileId = await api.redeemPairingCode(code.replace(/\s/g, ''), {
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
        onChangeText={(v) => setCode(v.replace(/[^\d ]/g, '').slice(0, 7))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        style={{ fontSize: 28, letterSpacing: 6, textAlign: 'center' }}
        accessibilityLabel={s.pairCode}
      />
      <Field label={s.deviceName} value={name} onChangeText={setName} accessibilityLabel={s.deviceName} />
      <ErrorText text={error} />
      <Btn kind="primary" icon="link" label={s.pairButton} onPress={submit} disabled={busy || code.replace(/\s/g, '').length < 6} />
    </StartLayout>
  );
}
