/**
 * "Write to the team": an idea or a problem, sent from the account page to the app's team
 * (they read it in the back office). For a member of that team, also the way back to the back office.
 */
import React, { useState } from 'react';
import { Platform, Text } from 'react-native';
import type { FeedbackKind } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { adminStrings } from '../../i18n/admin';
import { APP_VERSION } from '../../lib/appVersion';
import { useSession } from '../../state/Session';
import { Btn, Field, Section, Segmented } from '../common';
import { Note } from '../settings/SettingsScreen';
import { ErrorText } from '../start/StartLayout';
import { C } from '../theme';

const KINDS: FeedbackKind[] = ['idea', 'problem', 'other'];

export function WriteTeam() {
  const { api, uiLang, s, isAdmin, go } = useSession();
  const a = adminStrings(uiLang);
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.sendFeedback({ kind, text: text.trim(), platform: Platform.OS, appVersion: APP_VERSION });
      setText('');
      setSent(true);
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title={a.writeTeam}>
      <Note text={a.writeIntro} />
      <Segmented value={kind} options={KINDS.map((k) => ({ value: k, label: a.kinds[k] }))} onChange={setKind} />
      <Field
        value={text}
        onChangeText={(t) => {
          setText(t);
          setSent(false);
        }}
        placeholder={a.writePlaceholder}
        accessibilityLabel={a.writePlaceholder}
        multiline
        maxLength={4000}
      />
      <ErrorText text={error} />
      {sent && <Text style={{ color: C.success, fontWeight: '700' }}>{a.writeSent}</Text>}
      <Btn small kind="primary" icon="mail" label={a.send} disabled={busy || text.trim().length < 3} onPress={() => void send()} />
      {isAdmin && <Btn small icon="shield" label={a.entry} onPress={() => go({ name: 'admin' })} />}
    </Section>
  );
}
