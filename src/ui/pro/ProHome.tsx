/**
 * Professional side: verification first (until submitted), then the workspace.
 * A professional under review can explore the workspace meanwhile.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { peopleStrings } from '../../i18n/people';
import { Btn } from '../common';
import type { Verification as V } from '../../backend/types';
import { useSession } from '../../state/Session';
import { C } from '../theme';
import { Verification } from './Verification';
import { Workspace } from './Workspace';

export function ProHome({ open }: { open?: string }) {
  const { api, uiLang } = useSession();
  const [v, setV] = useState<V | null | undefined>(undefined);
  const [mode, setMode] = useState<'verify' | 'workspace' | null>(null);
  // The server could not answer: not "no verification yet" (that would send her to the form).
  const [offline, setOffline] = useState(false);
  // The first screen depends on the verification; afterwards the person moves freely.
  const load = () =>
    api.getVerification().then(
      (x) => {
        setOffline(false);
        setV(x);
        setMode((m) => m ?? (!x || x.status === 'draft' ? 'verify' : 'workspace'));
      },
      () => {
        // Already in the workspace: it stays as it is. At the start: say so, and try again.
        setMode((m) => {
          if (!m) setOffline(true);
          return m;
        });
      },
    );
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (offline && !mode) {
    const t = peopleStrings(uiLang);
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: C.bg }}>
        <Text style={{ color: C.text, fontSize: 17, textAlign: 'center' }} accessibilityRole="alert">
          {t.proOffline}
        </Text>
        <Btn kind="primary" icon="refresh" label={t.retry} onPress={() => void load()} />
      </View>
    );
  }
  if (v === undefined || !mode) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  if (mode === 'verify')
    return (
      <Verification
        initial={v}
        onExplore={() => {
          void load();
          setMode('workspace');
        }}
      />
    );
  return <Workspace verification={v} onVerify={() => setMode('verify')} openUserId={open} />;
}
