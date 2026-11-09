/**
 * Create an account / sign in / forgotten password.
 * Ways in: Apple, Google, email + password, phone + password. A new email or phone is
 * confirmed with a 6-digit code (in the demo the code is shown on screen instead of sent).
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { CodeSent } from '../../backend/Backend';
import type { Role } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { useSession } from '../../state/Session';
import { Btn, Field, Segmented } from '../common';
import { Icon } from '../Icon';
import { C, radius } from '../theme';
import { AppleButton, GoogleButton } from './BrandButtons';
import { ErrorText, LinkBtn, StartLayout, T, st, useRtl } from './StartLayout';

type Mode = 'signUp' | 'signIn' | 'forgot';
type Method = 'email' | 'phone';
type Target = { email?: string; phone?: string };
type Step =
  | { kind: 'form' }
  /** Confirming a new address (sign-up, or sign-in to a never-confirmed account). */
  | { kind: 'code'; target: Target; sent: CodeSent }
  /** Forgotten password: code + new password. */
  | { kind: 'reset'; target: Target; sent: CodeSent };

const MIN_PASSWORD = 8;

export function AuthScreen({ mode: initialMode, role: initialRole }: { mode: Mode; role: Role }) {
  const { s, go, api, enter } = useSession();
  const rtl = useRtl();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [method, setMethod] = useState<Method>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const target: Target = method === 'email' ? { email } : { phone };
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'cancelled' && code !== 'redirecting') setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (!(method === 'email' ? email.trim() : phone.trim())) throw { code: 'missing_contact' };
      if (mode === 'forgot') {
        const sent = await api.requestPasswordReset(target);
        setStep({ kind: 'reset', target, sent });
        return;
      }
      if (mode === 'signUp') {
        if (!name.trim()) throw { code: 'missing_name' };
        if (password.length < MIN_PASSWORD) throw { code: 'weak_password' };
        const sent = await api.signUp({ role, displayName: name, password, ...target });
        if (sent.signedIn) return enter();
        setStep({ kind: 'code', target, sent });
        return;
      }
      try {
        await api.signIn({ ...target, password });
        await enter();
      } catch (e) {
        // Account created but never confirmed: send a code again and confirm now.
        if ((e as { code?: string }).code === 'not_verified') {
          const sent = await api.resendCode(target);
          setStep({ kind: 'code', target, sent });
          return;
        }
        throw e;
      }
    });

  const provider = (p: 'google' | 'apple') =>
    run(async () => {
      await api.signInWithProvider(p, role);
      await enter();
    });

  // ── Code steps ──
  if (step.kind === 'code' || step.kind === 'reset') {
    return (
      <CodeStep
        step={step}
        busy={busy}
        error={error}
        info={info}
        onBack={() => {
          setStep({ kind: 'form' });
          setError(null);
        }}
        onResend={() =>
          run(async () => {
            const sent = step.kind === 'code' ? await api.resendCode(step.target) : await api.requestPasswordReset(step.target);
            setStep({ ...step, sent });
            setInfo(s.codeResent);
          })
        }
        onSubmit={(code, newPassword) =>
          run(async () => {
            if (step.kind === 'code') {
              await api.verifyCode(step.target, code);
              await enter();
            } else {
              if ((newPassword ?? '').length < MIN_PASSWORD) throw { code: 'weak_password' };
              await api.resetPassword(step.target, code, newPassword!);
              setStep({ kind: 'form' });
              setMode('signIn');
              setPassword('');
              setInfo(s.resetDone);
            }
          })
        }
      />
    );
  }

  const title = mode === 'signUp' ? s.signUpTitle : mode === 'signIn' ? s.signInTitle : s.resetTitle;
  return (
    <StartLayout
      title={title}
      onBack={() => (mode === 'forgot' ? setMode('signIn') : go(initialMode === 'signUp' ? { name: 'role' } : { name: 'welcome' }))}
    >
      {mode === 'signUp' && (
        <View style={[styles.roleChip, rtl && st.rev]}>
          <Icon name={role === 'pro' ? 'briefcase' : 'heart'} size={18} color={C.accent} />
          <T style={{ flex: 1, fontWeight: '700' }}>{role === 'pro' ? s.accountPro : s.accountParent}</T>
          <LinkBtn label={s.change} onPress={() => go({ name: 'role' })} />
        </View>
      )}

      {mode === 'forgot' ? (
        <T style={st.muted}>{s.resetIntro}</T>
      ) : (
        <View style={{ gap: 10 }}>
          {Platform.OS !== 'android' && <AppleButton label={s.continueApple} onPress={() => provider('apple')} disabled={busy} />}
          <GoogleButton label={s.continueGoogle} onPress={() => provider('google')} disabled={busy} />
          <View style={[styles.orRow, rtl && st.rev]}>
            <View style={styles.orLine} />
            <T style={{ color: C.textMuted }}>{s.or}</T>
            <View style={styles.orLine} />
          </View>
        </View>
      )}

      <Segmented<Method>
        value={method}
        onChange={(m) => {
          setMethod(m);
          setError(null);
        }}
        options={[
          { value: 'email', label: s.byEmail },
          { value: 'phone', label: s.byPhone },
        ]}
      />

      {mode === 'signUp' && (
        <View style={{ gap: 4 }}>
          <Field label={s.yourName} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <T style={styles.hint}>{s.yourNameHint}</T>
        </View>
      )}

      {method === 'email' ? (
        <Field
          label={s.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType={mode === 'signUp' ? 'emailAddress' : 'username'}
          style={{ textAlign: 'left', writingDirection: 'ltr' }}
        />
      ) : (
        <View style={{ gap: 4 }}>
          <Field
            label={s.phone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+961 …"
            style={{ textAlign: 'left', writingDirection: 'ltr' }}
          />
          <T style={styles.hint}>{s.phoneHint}</T>
        </View>
      )}

      {mode !== 'forgot' && (
        <View style={{ gap: 4 }}>
          <PasswordField label={s.password} value={password} onChange={setPassword} isNew={mode === 'signUp'} onSubmit={submit} />
          {mode === 'signUp' ? <T style={styles.hint}>{s.passwordRule}</T> : <LinkBtn label={s.forgot} onPress={() => setMode('forgot')} />}
        </View>
      )}

      <ErrorText text={error} />
      {info ? <T style={{ color: C.success, fontWeight: '600' }}>{info}</T> : null}

      <Btn
        kind="primary"
        label={mode === 'signUp' ? s.createAccount : mode === 'signIn' ? s.signIn : s.sendCode}
        onPress={submit}
        disabled={busy}
      />

      {mode === 'signUp' && <T style={[styles.hint, { textAlign: 'center' }]}>{s.privacyNote}</T>}

      {mode !== 'forgot' && (
        <View style={[styles.switchRow, rtl && st.rev]}>
          <T style={{ color: C.textMuted }}>{mode === 'signUp' ? s.alreadyAccount : s.noAccount}</T>
          <LinkBtn
            label={mode === 'signUp' ? s.signIn : s.createOne}
            onPress={() => {
              setError(null);
              if (mode === 'signUp') setMode('signIn');
              else go({ name: 'role' });
            }}
          />
        </View>
      )}
    </StartLayout>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  isNew,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isNew?: boolean;
  onSubmit?: () => void;
}) {
  const { s } = useSession();
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <T style={styles.label}>{label}</T>
      <View style={styles.pwRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'}
          onSubmitEditing={onSubmit}
          style={styles.pwInput}
          accessibilityLabel={label}
        />
        <Pressable
          onPress={() => setShown((v) => !v)}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={shown ? s.hidePassword : s.showPassword}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={22} color={C.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function CodeStep({
  step,
  busy,
  error,
  info,
  onBack,
  onResend,
  onSubmit,
}: {
  step: Extract<Step, { kind: 'code' | 'reset' }>;
  busy: boolean;
  error: string | null;
  info: string | null;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (code: string, newPassword?: string) => void;
}) {
  const { s } = useSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  // A new code can be asked for after 30 seconds.
  const [wait, setWait] = useState(30);
  useEffect(() => {
    setWait(30);
    const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(id);
  }, [step.sent]);
  const ready = code.length >= 6 && (step.kind === 'code' || password.length > 0);
  return (
    <StartLayout title={step.kind === 'code' ? s.codeTitle : s.resetTitle} onBack={onBack}>
      <T>
        {s.codeSentTo} <T style={{ fontWeight: '700', writingDirection: 'ltr' }}>{step.sent.sentTo}</T>
      </T>
      {step.sent.demoCode ? (
        <Pressable onPress={() => setCode(step.sent.demoCode!)} style={styles.demo} accessibilityRole="button">
          <Icon name="sparkles" size={18} color={C.edit} />
          <T style={{ flex: 1, color: C.edit }}>
            {s.codeDemo} <T style={{ fontWeight: '800', letterSpacing: 2, color: C.edit }}>{step.sent.demoCode}</T>
          </T>
        </Pressable>
      ) : null}
      <Field
        label={s.code}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
        accessibilityLabel={s.code}
        onSubmitEditing={() => ready && onSubmit(code, password)}
      />
      {step.kind === 'reset' && <PasswordField label={s.newPassword} value={password} onChange={setPassword} isNew />}
      <ErrorText text={error} />
      {info ? <T style={{ color: C.success, fontWeight: '600' }}>{info}</T> : null}
      <Btn kind="primary" label={step.kind === 'code' ? s.verify : s.savePassword} onPress={() => onSubmit(code, password)} disabled={busy || !ready} />
      <LinkBtn label={wait > 0 ? `${s.resendIn} ${wait} ${s.seconds}` : s.resend} onPress={() => wait === 0 && !busy && onResend()} />
      <LinkBtn label={s.changeAddress} onPress={onBack} />
    </StartLayout>
  );
}

const styles = StyleSheet.create({
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 44,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  hint: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  label: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.border, borderRadius: radius.md, backgroundColor: C.surface },
  pwInput: { flex: 1, minHeight: 46, paddingHorizontal: 12, fontSize: 17, color: C.text, writingDirection: 'ltr', textAlign: 'left' },
  eye: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center' },
  demo: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.editSoft, borderRadius: radius.md, padding: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
});

