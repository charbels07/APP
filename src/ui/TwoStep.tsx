/**
 * Two-step sign-in: a 6-digit code from an authenticator app (Google Authenticator, Microsoft
 * Authenticator, 1Password…) after the password.
 *  - `TwoStepCard`: turn it on or off (Settings → Account → My account; the professional's account page);
 *  - `TwoStepScreen`: the code at sign-in, before anything else (the database shows nothing of the
 *    children until it is typed: `mfa_ok` in supabase/migrations/20261118000000_security_2.sql);
 *  - `BackOfficeGate`: the back office only opens with it (is_admin needs "aal2").
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { TwoStepSetup } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import { securityStrings, type SecurityStrings } from '../i18n/security';
import { codeFrom } from '../lib/codeInput';
import { useSession } from '../state/Session';
import { Btn, useNavRtl } from './common';
import { ErrorText, LinkBtn, StartLayout, T } from './start/StartLayout';
import { C } from './theme';

const groups = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();

/** Demonstration: the code an authenticator app would show now (refreshed every 10 s). */
function useDemoCode(on: boolean): string | undefined {
  const { api } = useSession();
  const [code, setCode] = useState<string>();
  useEffect(() => {
    if (!on || !api.demoTwoStepCode) return;
    const read = () => void api.demoTwoStepCode?.().then(setCode);
    read();
    const id = setInterval(read, 10_000);
    return () => clearInterval(id);
  }, [api, on]);
  return code;
}

function CodeInput({ value, onChange, onSubmit, label }: { value: string; onChange: (v: string) => void; onSubmit: () => void; label: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={20}
      placeholder={label}
      placeholderTextColor={C.placeholder}
      accessibilityLabel={label}
      style={styles.code}
    />
  );
}

/** Turn two-step sign-in on or off. `required`: the app's team (the back office needs it). */
export function TwoStepCard({ required }: { required?: boolean }) {
  const sess = useSession();
  const { api, account, security, refreshSecurity, uiLang } = sess;
  const t = securityStrings(uiLang);
  const rtl = useNavRtl();
  const [setup, setSetup] = useState<TwoStepSetup | null>(null);
  const [turningOff, setTurningOff] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const demo = useDemoCode(!!setup || turningOff);
  if (!account || account.provider === 'device') return null;
  const on = !!security?.twoStep;
  const team = required || !!security?.team;
  const rtlText = rtl ? styles.rtl : null;
  const fail = (e: unknown) => setMsg({ ok: false, text: e instanceof BackendError && e.code === 'code_invalid' ? t.wrongCode : t.failed });

  const start = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setSetup(await api.twoStepStart());
      setCode('');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!setup || codeFrom(code).length !== 6) return;
    setBusy(true);
    try {
      await api.twoStepConfirm(setup.factorId, codeFrom(code));
      setSetup(null);
      setCode('');
      await refreshSecurity();
      setMsg({ ok: true, text: t.nowOn });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const off = async () => {
    if (codeFrom(code).length !== 6) return;
    setBusy(true);
    try {
      await api.twoStepOff(codeFrom(code));
      setTurningOff(false);
      setCode('');
      await refreshSecurity();
      setMsg({ ok: true, text: t.nowOff });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={[styles.title, rtlText]} accessibilityRole="header">
        {t.twoStep}
      </Text>
      <Text style={[styles.text, rtlText]}>{on ? t.twoStepOn : t.twoStepOff}</Text>
      {team && <Text style={[styles.text, { fontWeight: '700' }, rtlText]}>{t.twoStepTeam}</Text>}
      {setup ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.text, rtlText]}>{t.stepScan}</Text>
          {setup.qrSvg ? (
            <View style={styles.qr} accessible accessibilityRole="image" accessibilityLabel={`${t.key} ${groups(setup.secret)}`}>
              <SvgXml xml={setup.qrSvg} width={180} height={180} />
            </View>
          ) : null}
          <Text style={[styles.muted, rtlText]}>{t.key}</Text>
          <Text style={styles.secret} selectable>
            {groups(setup.secret)}
          </Text>
          <Text style={[styles.text, rtlText]}>{t.stepType}</Text>
          <CodeInput value={code} onChange={(v) => setCode(v)} onSubmit={() => void confirm()} label={t.code} />
          {demo ? <Text style={[styles.muted, rtlText]}>{`${t.demoNow} ${demo}`}</Text> : null}
          <View style={[styles.row, rtl && styles.rowRev]}>
            <Btn small kind="primary" icon="check" label={t.confirm} onPress={() => void confirm()} disabled={busy || codeFrom(code).length !== 6} />
            <Btn small label={t.cancel} onPress={() => setSetup(null)} />
          </View>
        </View>
      ) : turningOff ? (
        <View style={{ gap: 10 }}>
          <Text style={[styles.text, rtlText]}>{t.offAsk}</Text>
          <CodeInput value={code} onChange={(v) => setCode(v)} onSubmit={() => void off()} label={t.code} />
          {demo ? <Text style={[styles.muted, rtlText]}>{`${t.demoNow} ${demo}`}</Text> : null}
          <View style={[styles.row, rtl && styles.rowRev]}>
            <Btn small kind="danger" label={t.turnOff} onPress={() => void off()} disabled={busy || codeFrom(code).length !== 6} />
            <Btn small label={t.cancel} onPress={() => setTurningOff(false)} />
          </View>
        </View>
      ) : on ? (
        // The team keeps it: the back office needs it.
        !team && <Btn small icon="lock" label={t.turnOff} onPress={() => (setMsg(null), setCode(''), setTurningOff(true))} />
      ) : (
        <Btn small kind={team ? 'primary' : 'secondary'} icon="lock" label={t.turnOn} onPress={() => void start()} disabled={busy} />
      )}
      {msg ? (
        <Text style={[styles.text, { color: msg.ok ? C.success : C.help, fontWeight: '700' }, rtlText]} accessibilityLiveRegion="polite">
          {msg.text}
        </Text>
      ) : null}
      {on && <Text style={[styles.muted, rtlText]}>{t.lostPhone}</Text>}
    </View>
  );
}

/** At sign-in: the authenticator code, then where the person was going. */
export function TwoStepScreen({ then }: { then?: { profileId?: string; app?: boolean } }) {
  const { api, enter, signOut, uiLang, refreshSecurity } = useSession();
  const t = securityStrings(uiLang);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo = useDemoCode(true);
  const submit = async () => {
    if (codeFrom(code).length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.twoStepCode(codeFrom(code));
      await refreshSecurity();
      await enter(then);
    } catch (e) {
      setError(e instanceof BackendError && e.code === 'code_invalid' ? t.wrongCode : t.failed);
      setBusy(false);
    }
  };
  return (
    <StartLayout title={t.codeTitle}>
      <T style={styles.text}>{t.codeIntro}</T>
      <CodeInput value={code} onChange={setCode} onSubmit={() => void submit()} label={t.code} />
      {demo ? <T style={styles.muted}>{`${t.demoNow} ${demo}`}</T> : null}
      <ErrorText text={error} />
      <Btn kind="primary" label={t.codeGo} onPress={() => void submit()} disabled={busy || codeFrom(code).length !== 6} />
      <LinkBtn label={t.signOut} onPress={() => void signOut()} />
      <T style={styles.muted}>{t.lostPhone}</T>
    </StartLayout>
  );
}

/** The back office opens only once two-step sign-in is on and its code typed in this session. */
export function BackOfficeGate({ children, title }: { children: React.ReactNode; title: string }) {
  const { security, signOut, uiLang } = useSession();
  const t: SecurityStrings = securityStrings(uiLang);
  // Not known (no internet, or an older server): the database still decides.
  if (!security || security.level === 'aal2') return <>{children}</>;
  if (security.twoStep) return <TwoStepScreen then={{}} />;
  return (
    <StartLayout title={title}>
      <T style={styles.text}>{t.boRequired}</T>
      <TwoStepCard required />
      <LinkBtn label={t.signOut} onPress={() => void signOut()} />
    </StartLayout>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  text: { fontSize: 15, color: C.text, lineHeight: 21 },
  muted: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowRev: { flexDirection: 'row-reverse' },
  qr: { alignSelf: 'center', padding: 10, backgroundColor: '#FFFFFF', borderRadius: 12 },
  secret: { fontSize: 18, fontWeight: '700', letterSpacing: 1, color: C.text, textAlign: 'center' },
  code: { borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 12, minHeight: 50, fontSize: 24, letterSpacing: 6, color: C.text, textAlign: 'center', backgroundColor: C.surface },
});
