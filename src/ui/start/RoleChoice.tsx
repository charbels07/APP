/** "Who are you?": parent / relative or professional. Decides the journey after sign-up. */
import React from 'react';
import { useSession } from '../../state/Session';
import { C } from '../theme';
import { ChoiceCard, LinkBtn, StartLayout, T } from './StartLayout';

export function RoleChoice() {
  const { s, go } = useSession();
  return (
    <StartLayout title={s.roleTitle} onBack={() => go({ name: 'preview' })}>
      <ChoiceCard icon="heart" title={s.roleParent} text={s.roleParentText} onPress={() => go({ name: 'auth', mode: 'signUp', role: 'parent' })} />
      <ChoiceCard icon="briefcase" title={s.rolePro} text={s.roleProText} onPress={() => go({ name: 'auth', mode: 'signUp', role: 'pro' })} />
      <T style={{ color: C.textMuted, fontSize: 14 }}>{s.roleProNote}</T>
      <LinkBtn label={s.haveAccount} onPress={() => go({ name: 'auth', mode: 'signIn', role: 'parent' })} />
    </StartLayout>
  );
}
