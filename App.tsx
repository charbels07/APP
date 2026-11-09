import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from './src/state/Session';
import { Stages } from './src/ui/Stages';

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Stages />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
