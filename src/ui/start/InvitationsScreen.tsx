/**
 * Joining a child's team: invitations received by this account (sent to its email),
 * or a code given by the family. Accepting opens the child's board with the rights chosen
 * by the family; nothing is reachable before that.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Invitation } from '../../backend/types';
import { errorText } from '../../i18n/account';
import { settingsStrings } from '../../i18n/settings';
import { useSession } from '../../state/Session';
import { Btn, Field } from '../common';
import { ErrorText, LinkBtn, StartLayout, T, st } from './StartLayout';

export function InvitationsScreen() {
  const { s, api, uiLang, account, enter, go, signOut } = useSession();
  const x = settingsStrings(uiLang);
  const [list, setList] = useState<Invitation[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .myInvitations()
      .then((r) => setList(r.received.filter((i) => i.status === 'pending')))
      .catch(() => {});
  }, [api]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(s, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <StartLayout title={s.invitesTitle} onBack={signOut}>
      <T style={st.muted}>{s.invitesIntro}</T>
      {list.length === 0 && <T style={st.muted}>{s.noInvites}</T>}
      {list.map((i) => (
        <View key={i.id} style={{ gap: 8, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#D5DBE3' }}>
          <T style={{ fontWeight: '700', fontSize: 17 }}>{s.inviteFrom(i.fromName, i.childName)}</T>
          <T style={st.muted}>{`${x.roles[i.role]} · ${x.levels[i.level]} — ${x.levelNotes[i.level]}`}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn
              label={s.declineInvite}
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await api.respondInvitation(i.id, false);
                  setList((l) => l.filter((y) => y.id !== i.id));
                })
              }
            />
            <Btn
              kind="primary"
              label={s.acceptInvite}
              style={{ flex: 2 }}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await api.respondInvitation(i.id, true);
                  await enter({ profileId: i.profileId });
                })
              }
            />
          </View>
        </View>
      ))}
      <Field label={s.inviteCode} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} />
      <ErrorText text={error} />
      <Btn
        kind="primary"
        label={s.join}
        disabled={busy || code.trim().length < 6}
        onPress={() =>
          run(async () => {
            const inv = await api.acceptInvitationCode(code.trim());
            await enter({ profileId: inv.profileId });
          })
        }
      />
      {account?.role === 'parent' && <LinkBtn label={s.createOwn} onPress={() => go({ name: 'onboarding' })} />}
    </StartLayout>
  );
}
