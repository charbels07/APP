import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { serverMode } from './src/backend';
import { SessionProvider } from './src/state/Session';
import { Stages } from './src/ui/Stages';

export default function App() {
  // A finished build made without the server's address must not look like the real app
  // (it would be the demo: accounts that are not real, nothing saved online).
  if (serverMode() === 'missing') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#101828', textAlign: 'center' }} accessibilityRole="header">
          Empower Communication
        </Text>
        <Text style={{ fontSize: 16, color: '#344054', textAlign: 'center', marginTop: 12, maxWidth: 460 }}>
          This copy of the app was built without its server settings, so it cannot open. Cette copie de l’application a été construite sans les réglages de
          son serveur. هذه النسخة من التطبيق بُنيت بدون إعدادات الخادم.
        </Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Stages />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
