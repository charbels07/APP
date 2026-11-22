/** "This device is full", one line above the board while a write on the device fails (src/lib/deviceFull.ts). */
import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { backupStrings } from '../i18n/backup';
import { deviceFull, onDeviceFull } from '../lib/deviceFull';
import type { UiLang } from '../model/types';
import { Icon } from './Icon';
import { C, radius } from './theme';

export function DeviceFullNotice({ uiLang }: { uiLang: UiLang }) {
  const full = useSyncExternalStore(onDeviceFull, deviceFull, deviceFull);
  if (!full) return null;
  const rtl = uiLang === 'ar';
  return (
    <View style={[styles.notice, rtl && { flexDirection: 'row-reverse' }]} accessibilityRole="alert">
      <Icon name="alert" size={20} color={C.edit} />
      <Text style={[styles.text, rtl && ({ textAlign: 'right', writingDirection: 'rtl' } as const)]}>{backupStrings(uiLang).deviceFull}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.editSoft, borderColor: '#FEC84B', borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 10 },
  text: { flex: 1, color: C.edit, fontSize: 14, fontWeight: '600' },
});
