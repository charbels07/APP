/**
 * Professional side: verification first (until submitted), then the workspace.
 * A professional under review can explore the workspace meanwhile.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Verification as V } from '../../backend/types';
import { useSession } from '../../state/Session';
import { C } from '../theme';
import { Verification } from './Verification';
import { Workspace } from './Workspace';

export function ProHome({ open }: { open?: string }) {
  const { api } = useSession();
  const [v, setV] = useState<V | null | undefined>(undefined);
  const [mode, setMode] = useState<'verify' | 'workspace' | null>(null);
  // The first screen depends on the verification; afterwards the person moves freely.
  const load = () =>
    api
      .getVerification()
      .catch(() => null)
      .then((x) => {
        setV(x);
        setMode((m) => m ?? (!x || x.status === 'draft' ? 'verify' : 'workspace'));
      });
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
