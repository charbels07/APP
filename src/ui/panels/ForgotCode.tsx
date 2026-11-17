/**
 * "Forgot the code?" on the caregiver keypad (PinPanel): before choosing a new family code, the
 * person shows that the signed-in account is theirs, with the account's password or with a
 * sign-in code sent to its own e-mail (a text message for an account with a phone only).
 * Who is offered this, and which ways: `forgotCodeWays` (src/lib/forgotCode.ts).
 * The new code is then chosen on the keypad as usual and saved like any change of the profile,
 * which the database accepts only from the family.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CodeSent } from '../../backend/Backend';
import { errorText } from '../../i18n/account';
import { codeFrom } from '../../lib/codeInput';
import type { ForgotWays } from '../../lib/forgotCode';
import { useApp } from '../../state/AppState';
import { useSession } from '../../state/Session';
import { Btn, Field, useNavRtl } from '../common';
import { Icon } from '../Icon';
import { PasswordField } from '../start/AuthScreen';
import { ErrorText, LinkBtn } from '../start/StartLayout';
import { C, radius } from '../theme';

export function ProveItsYou({ ways, onConfirmed }: { ways: ForgotWays; onConfirmed: () => void }) {
  const { t } = useApp();
  const { api, s } = useSession();
  const rtl = useNavRtl();
  const [mode, setMode] = useState<'password' | 'code'>(ways.password ? 'password' : 'code');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = rtl ? styles.rtl : null;
  const getCode = ways.code === 'phone' ? t.pinForgotBySms : t.pinForgotByEmail;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const why = (e as { code?: string })?.code;
      setError(why === 'wrong_credentials' ? t.pinForgotWrongPassword : errorText(s, e));
    } finally {
      setBusy(false);
    }
  };
  const send = () =>
    run(async () => {
      setMode('code');
      const next = await api.sendIdentityCode();
      setCode('');
      setSent(next);
    });
  const confirm = () =>
    run(async () => {
      await api.confirmIdentity(mode === 'password' ? { password } : { code });
      onConfirmed();
    });
  const ready = mode === 'password' ? password.length > 0 : code.length >= 6;

  return (
    <View style={styles.box}>
      <Text style={[styles.why, text]}>{t.pinForgotWhy}</Text>
      {/* Which account (once a code is sent, "We sent a code to…" names it). */}
      {sent && mode === 'code' ? null : <Text style={styles.account}>{ways.account}</Text>}
      {mode === 'password' ? (
        <PasswordField label={t.pinForgotPassword} value={password} onChange={setPassword} onSubmit={() => ready && void confirm()} />
      ) : sent ? (
        <>
          <Text style={[styles.note, text]}>
            {s.codeSentTo} <Text style={{ fontWeight: '700', writingDirection: 'ltr' }}>{sent.sentTo}</Text>
          </Text>
          {/* A real e-mail can land in the junk folder. */}
          {!sent.demoCode && ways.code === 'email' ? <Text style={[styles.note, text]}>{s.codeJunk}</Text> : null}
          {sent.demoCode ? (
            <Pressable onPress={() => setCode(sent.demoCode!)} style={styles.demo} accessibilityRole="button">
              <Icon name="sparkles" size={18} color={C.edit} />
              <Text style={{ flex: 1, color: C.edit }}>
                {s.codeDemo} <Text style={{ fontWeight: '800', letterSpacing: 2 }}>{sent.demoCode}</Text>
              </Text>
            </Pressable>
          ) : null}
          <Field
            label={s.code}
            value={code}
            onChangeText={(v) => setCode(codeFrom(v))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={styles.codeInput}
            onSubmitEditing={() => ready && void confirm()}
          />
          {/* What was copied from the e-mail, even when the mail app made a link of the code. */}
          <LinkBtn
            label={s.pasteCode}
            onPress={() => {
              Clipboard.getStringAsync()
                .then((v) => v && setCode(codeFrom(v)))
                .catch(() => {});
            }}
          />
        </>
      ) : null}
      <ErrorText text={error} />
      {mode === 'code' && !sent ? (
        <Btn kind="primary" icon={ways.code === 'phone' ? 'phone' : 'mail'} label={getCode} onPress={() => void send()} disabled={busy} />
      ) : (
        <Btn kind="primary" icon="check" label={t.pinForgotConfirm} onPress={() => void confirm()} disabled={busy || !ready} />
      )}
      {mode === 'code' && sent ? <LinkBtn label={s.resend} onPress={() => void send()} /> : null}
      {mode === 'password' && ways.code ? <LinkBtn label={getCode} onPress={() => void send()} /> : null}
      {mode === 'code' && ways.password ? (
        <LinkBtn
          label={t.pinForgotUsePassword}
          onPress={() => {
            setError(null);
            setMode('password');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  why: { fontSize: 15, lineHeight: 21, color: C.text },
  account: { fontSize: 16, fontWeight: '700', color: C.text, writingDirection: 'ltr', textAlign: 'center' },
  note: { fontSize: 14, lineHeight: 20, color: C.textMuted },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.editSoft, borderRadius: radius.md, padding: 12 },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center' },
});
