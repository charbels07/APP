/**
 * "Download all my data" (GDPR access and portability): one JSON file with everything the server
 * keeps about the account and the children whose profile it owns (`export_my_data`). A fresh proof
 * is asked first (useProof). Settings → Account → Privacy and data; the professional's account page.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { errorText } from '../../i18n/account';
import { securityStrings } from '../../i18n/security';
import { exportJson } from '../../lib/platform';
import { useSession } from '../../state/Session';
import { Btn } from '../common';
import { useProof } from '../ProveItsYou';
import { C } from '../theme';
import { Note } from './SettingsScreen';

export function DownloadMyData() {
  const { api, uiLang, account, s } = useSession();
  const t = securityStrings(uiLang);
  const proof = useProof('exportAll');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!account || account.provider === 'device') return null;
  return (
    <View style={{ gap: 8 }}>
      <Note text={t.downloadNote} />
      <Btn
        small
        icon="download"
        label={t.downloadAll}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          setMsg(null);
          try {
            await proof.run(async () => {
              const data = await api.exportMyData();
              await exportJson(`daleth-data-${new Date().toISOString().slice(0, 10)}.json`, data);
              setMsg({ ok: true, text: t.downloaded });
            });
          } catch (e) {
            setMsg({ ok: false, text: errorText(s, e) });
          } finally {
            setBusy(false);
          }
        }}
      />
      {proof.gate}
      {msg ? (
        <Text style={{ color: msg.ok ? C.success : C.help, fontWeight: '700' }} accessibilityLiveRegion="polite">
          {msg.text}
        </Text>
      ) : null}
    </View>
  );
}
