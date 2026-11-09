/** Professional side (verification, workspace): replaced by the full workspace in the next phase. */
import React from 'react';
import { useSession } from '../../state/Session';
import { Btn } from '../common';
import { StartLayout, T, st } from '../start/StartLayout';

export function ProHome() {
  const { s, account, signOut } = useSession();
  return (
    <StartLayout title={account?.displayName || s.rolePro}>
      <T style={st.muted}>{s.roleProText}</T>
      <Btn icon="logout" label={s.signOut} onPress={signOut} />
    </StartLayout>
  );
}
