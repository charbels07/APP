/**
 * "Turn on notifications?": asked once per account on a device, right after signing in, before
 * the person reaches the board or the workspace. Only shown where notifications can really work
 * (`shouldAskPush`). "Not now" is remembered too; the switch stays in the account's preferences.
 */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { pushStrings } from '../../i18n/push';
import { pushAsked, turnPushOn } from '../../lib/push';
import { useSession } from '../../state/Session';
import { Btn } from '../common';
import { C } from '../theme';
import { LinkBtn, StartLayout, T } from './StartLayout';

export function NotifyScreen({ then }: { then?: { profileId?: string; app?: boolean } }) {
  const { api, account, enter, uiLang } = useSession();
  const t = pushStrings(uiLang);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const leave = async () => {
    setBusy(true);
    if (account) await pushAsked(account.id);
    await enter(then).catch(() => setBusy(false));
  };
  const turnOn = async () => {
    setBusy(true);
    const r = await turnPushOn(api, uiLang);
    if (r === 'on') return leave();
    // The reason stays on screen until the person goes on.
    setProblem(r === 'refused' ? t.refused : t.failed);
    setBusy(false);
  };

  return (
    <StartLayout title={t.askTitle}>
      <T style={st.text}>{account?.role === 'pro' ? t.askPro : t.askParent}</T>
      <T style={st.muted}>{t.askNote}</T>
      {problem ? (
        <>
          <T style={st.problem} accessibilityRole="alert">
            {problem}
          </T>
          <Btn kind="primary" label={t.goOn} onPress={() => void leave()} disabled={busy} />
        </>
      ) : (
        <>
          <Btn kind="primary" icon="bell" label={t.yes} onPress={() => void turnOn()} disabled={busy} />
          <LinkBtn label={t.later} onPress={() => void leave()} />
        </>
      )}
    </StartLayout>
  );
}

const st = StyleSheet.create({
  text: { fontSize: 16, color: C.text, lineHeight: 23 },
  muted: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  problem: { fontSize: 15, color: C.text, lineHeight: 21, fontWeight: '600' },
});
