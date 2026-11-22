/**
 * "Confirm it is you": the account's password, a code sent to its own e-mail (or phone), or, when
 * two-step sign-in is on, the authenticator code. Used by "Forgot the code?" on the caregiver keypad
 * and before what cannot be undone (the database asks for it: error `proof_needed`, then the action
 * is tried once more). A linked tablet has no way to prove: it is done from a parent's device.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BackendError } from '../backend/Backend';
import { securityStrings, type ProofReason } from '../i18n/security';
import { codeFrom } from '../lib/codeInput';
import { proofWays, type ForgotWays } from '../lib/forgotCode';
import { waitsElsewhere } from '../lib/outside';
import { useSessionMaybe } from '../state/Session';
import { Btn, useNavRtl } from './common';
import { PasswordField } from './start/AuthScreen';
import { C } from './theme';

export interface ProofTexts {
  /** "{to}" is replaced by the address. */
  introPw: string;
  intro: string;
  introTwoStep: string;
  password: string;
  confirm: string;
  sent: string;
  demo: string;
  code: string;
  check: string;
  send: string;
  resend: string;
  wrong: string;
  wrongPassword: string;
  error: string;
  /** Shown when this account has no way to prove (a linked tablet). */
  noWay: string;
}

export function ProveItsYou({ ways, twoStep, texts, onProved }: { ways: ForgotWays | null; twoStep: boolean; texts: ProofTexts; onProved: () => void }) {
  const sess = useSessionMaybe();
  const rtl = useNavRtl();
  const [st, setSt] = useState<{ sent: boolean; code: string; pw: string; busy: boolean; err: string | null; demo?: string }>({
    sent: false,
    code: '',
    pw: '',
    busy: false,
    err: null,
  });
  const set = (p: Partial<typeof st>) => setSt((s) => ({ ...s, ...p }));
  const api = sess?.api;
  // Demonstration: the code an authenticator app would show now.
  useEffect(() => {
    if (!twoStep || !api?.demoTwoStepCode) return;
    const read = () => void api.demoTwoStepCode?.().then((c) => c && setSt((s) => ({ ...s, demo: c })));
    read();
    const id = setInterval(read, 10_000);
    return () => clearInterval(id);
  }, [api, twoStep]);
  // The code is in the person's mailbox or authenticator app: going to read it does not close this screen.
  useEffect(() => waitsElsewhere(), []);
  const rtlText = rtl ? styles.rtl : null;
  if (!api || !ways) return <Text style={[styles.text, rtlText]}>{texts.noWay}</Text>;
  const contact = ways.contact;
  const to = ways.to;

  const checkTwoStep = async () => {
    const typed = codeFrom(st.code);
    if (typed.length !== 6 || st.busy) return;
    set({ busy: true, err: null });
    try {
      await api.twoStepCode(typed);
      onProved();
    } catch (e) {
      set({ busy: false, err: (e as BackendError)?.code === 'code_invalid' ? texts.wrong : texts.error });
    }
  };
  const checkPw = async () => {
    if (!ways.password || !st.pw || st.busy) return;
    set({ busy: true, err: null });
    try {
      await api.checkPassword(st.pw);
      onProved();
    } catch (e) {
      set({ busy: false, err: (e as BackendError)?.code === 'wrong_credentials' ? texts.wrongPassword : texts.error });
    }
  };
  const sendCode = async () => {
    set({ busy: true, err: null });
    try {
      const sent = await api.requestPasswordReset(contact);
      set({ sent: true, busy: false, demo: sent.demoCode });
    } catch {
      set({ busy: false, err: texts.error });
    }
  };
  const checkCode = async () => {
    const typed = codeFrom(st.code);
    if (!typed) return;
    set({ busy: true, err: null });
    try {
      await api.checkResetCode(contact, typed);
      onProved();
    } catch {
      set({ busy: false, err: texts.wrong });
    }
  };

  const codeField = (onSubmit: () => void) => (
    <TextInput
      value={st.code}
      onChangeText={(v) => set({ code: v, err: null })}
      onSubmitEditing={onSubmit}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={60}
      placeholder={texts.code}
      placeholderTextColor={C.placeholder}
      accessibilityLabel={texts.code}
      style={styles.codeInput}
    />
  );
  const error = st.err ? (
    <Text style={[styles.text, { color: C.help, fontWeight: '700' }, rtlText]} accessibilityLiveRegion="polite">
      {st.err}
    </Text>
  ) : null;

  // Two-step sign-in on: the authenticator code proves it, and keeps the session's second step.
  if (twoStep) {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.text, rtlText]}>{texts.introTwoStep}</Text>
        {codeField(() => void checkTwoStep())}
        {st.demo ? <Text style={[styles.muted, rtlText]}>{`${texts.demo} ${st.demo}`}</Text> : null}
        {error}
        <Btn kind="primary" icon="check" label={texts.check} onPress={() => void checkTwoStep()} disabled={st.busy || codeFrom(st.code).length !== 6} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.text, rtlText]}>{(ways.password && !st.sent ? texts.introPw : texts.intro).replace('{to}', to)}</Text>
      {/* The account's password, for accounts made with one; hidden once a code was asked for. */}
      {ways.password && !st.sent && (
        <>
          <PasswordField label={texts.password} value={st.pw} onChange={(v) => set({ pw: v, err: null })} onSubmit={() => void checkPw()} />
          <Btn kind="primary" icon="check" label={texts.confirm} onPress={() => void checkPw()} disabled={st.busy || !st.pw} />
        </>
      )}
      {st.sent && (
        <Text style={[styles.muted, rtlText]} accessibilityLiveRegion="polite">
          {texts.sent.replace('{to}', to)}
          {st.demo ? ` ${texts.demo} ${st.demo}` : ''}
        </Text>
      )}
      {st.sent && codeField(() => void checkCode())}
      {error}
      <View style={[styles.row, rtl && { flexDirection: 'row-reverse' }]}>
        {st.sent && <Btn kind="primary" label={texts.check} onPress={() => void checkCode()} disabled={st.busy || !codeFrom(st.code)} />}
        <Btn kind={st.sent || ways.password ? 'secondary' : 'primary'} label={st.sent ? texts.resend : texts.send} onPress={() => void sendCode()} disabled={st.busy} />
      </View>
    </View>
  );
}

/** The texts of the proof asked before an action (navigation language). */
export function proofTexts(lang: Parameters<typeof securityStrings>[0], reason: ProofReason): ProofTexts {
  const t = securityStrings(lang);
  const why = t.proofBefore[reason];
  return {
    introPw: t.proofIntroPw.replace('{why}', why),
    intro: t.proofIntro.replace('{why}', why),
    introTwoStep: t.proofIntroTwoStep.replace('{why}', why),
    password: t.password,
    confirm: t.confirm,
    sent: t.sent,
    demo: t.demoCode,
    code: t.received,
    check: t.check,
    send: t.sendCode,
    resend: t.resend,
    wrong: t.wrongCode,
    wrongPassword: t.wrongPassword,
    error: t.failed,
    noWay: t.noWay,
  };
}

/**
 * Wraps an action the database may refuse until the person proves it is them: `run(fn)` tries it;
 * on `proof_needed`, `gate` shows the proof where the action is, then the action runs once more.
 * Cancelling leaves everything as it was.
 */
export function useProof(reason: ProofReason) {
  const sess = useSessionMaybe();
  const [pending, setPending] = useState<{ retry: () => void; cancel: () => void } | null>(null);
  const run = useCallback(
    (fn: () => Promise<void>) =>
      new Promise<void>((resolve, reject) => {
        const attempt = async (first: boolean) => {
          try {
            await fn();
            resolve();
          } catch (e) {
            if (first && e instanceof BackendError && e.code === 'proof_needed') {
              setPending({
                retry: () => void attempt(false),
                cancel: () => resolve(),
              });
            } else reject(e);
          }
        };
        void attempt(true);
      }),
    [],
  );
  const lang = sess?.uiLang ?? 'fr';
  const t = securityStrings(lang);
  const gate = pending ? (
    <View style={styles.card} accessibilityRole="none">
      <Text style={styles.title} accessibilityRole="header">
        {t.proofTitle}
      </Text>
      <ProveItsYou
        ways={proofWays(sess?.account)}
        twoStep={!!sess?.security?.twoStep}
        texts={proofTexts(lang, reason)}
        onProved={() => {
          const p = pending;
          setPending(null);
          p.retry();
        }}
      />
      <Btn
        small
        label={t.cancel}
        onPress={() => {
          pending.cancel();
          setPending(null);
        }}
      />
    </View>
  ) : null;
  return { run, gate, waiting: !!pending };
}

const styles = StyleSheet.create({
  text: { fontSize: 15, color: C.text, lineHeight: 21 },
  muted: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codeInput: { borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, fontSize: 22, letterSpacing: 4, color: C.text, textAlign: 'center' },
  card: { gap: 12, padding: 14, borderRadius: 14, backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.accent },
  title: { fontSize: 17, fontWeight: '800', color: C.text },
});
