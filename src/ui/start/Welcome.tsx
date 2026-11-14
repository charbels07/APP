/** First screen: what the app is, the language, and the ways in (log in, sign up, a tablet's code, a free try). */
import React from 'react';
import { View } from 'react-native';
import { adminStrings } from '../../i18n/admin';
import { useSession } from '../../state/Session';
import { PictoCredit } from '../PictoCredits';
import { Btn } from '../common';
import { Icon } from '../Icon';
import { C } from '../theme';
import { LinkBtn, Logo, StartLayout, T, st, useRtl } from './StartLayout';

export function Welcome() {
  const { s, go, uiLang, api, enter } = useSession();
  const rtl = useRtl();
  return (
    <StartLayout>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Logo size={88} />
        <T style={[st.title, { textAlign: 'center', fontSize: 32, lineHeight: 38 }]} accessibilityRole="header">
          {s.welcomeTitle}
        </T>
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
      {/* The two ways in. "Keep me logged in" is on the form that follows. */}
      <View style={{ gap: 10 }}>
        <Btn kind="primary" icon="user" label={s.logIn} onPress={() => go({ name: 'auth', mode: 'signIn', role: 'parent' })} />
        <Btn icon="plus" label={s.signUp} onPress={() => go({ name: 'role' })} />
      </View>
      <View style={{ gap: 2 }}>
        <LinkBtn label={s.pairDevice} onPress={() => go({ name: 'pair' })} />
        <LinkBtn label={s.tryFirst} onPress={() => go({ name: 'preview' })} />
        {/* Demo server only: a look at the app's team side, with invented people and figures. */}
        {api.demoOpenBackOffice && (
          <LinkBtn label={adminStrings(uiLang).demoEntry} onPress={() => void api.demoOpenBackOffice!().then(() => enter()).catch(() => {})} />
        )}
      </View>
      <PictoCredit lang={uiLang} compact />
    </StartLayout>
  );
}
