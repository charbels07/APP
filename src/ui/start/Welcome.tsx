/** First screen: what the app is, the language, and the ways in. */
import React from 'react';
import { View } from 'react-native';
import { APP_NAME } from '../../i18n/account';
import { useSession } from '../../state/Session';
import { Btn } from '../common';
import { Icon } from '../Icon';
import { C } from '../theme';
import { LinkBtn, Logo, StartLayout, T, st, useRtl } from './StartLayout';

export function Welcome() {
  const { s, go } = useSession();
  const rtl = useRtl();
  return (
    <StartLayout>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Logo size={88} />
        <T style={[st.title, { textAlign: 'center', fontSize: 34 }]} accessibilityRole="header">
          {APP_NAME}
        </T>
        <T style={[st.title, { textAlign: 'center', fontSize: 22, color: C.textMuted }]}>{s.welcomeTitle}</T>
      </View>
      <T style={{ fontSize: 18, lineHeight: 26, textAlign: 'center' }}>{s.welcomeLine}</T>
      <View style={{ gap: 10 }}>
        {s.welcomePoints.map((p) => (
          <View key={p} style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
            <View style={{ marginTop: 2 }}>
              <Icon name="check" size={20} color={C.success} />
            </View>
            <T style={{ flex: 1 }}>{p}</T>
          </View>
        ))}
      </View>
      <Btn kind="primary" label={s.continue} onPress={() => go({ name: 'preview' })} />
      <View style={{ gap: 2 }}>
        <LinkBtn label={s.haveAccount} onPress={() => go({ name: 'auth', mode: 'signIn', role: 'parent' })} />
        <LinkBtn label={s.pairDevice} onPress={() => go({ name: 'pair' })} />
      </View>
    </StartLayout>
  );
}
