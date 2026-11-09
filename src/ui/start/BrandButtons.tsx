/**
 * "Continue with Apple / Google" buttons, drawn the way each company asks
 * (Apple: black button with its logo; Google: white button with the four-colour G).
 * On iPhone/iPad the official Apple button is used (expo-apple-authentication).
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius } from '../theme';

function AppleLogo({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.37 12.6c-.03-2.7 2.2-4 2.3-4.07-1.25-1.83-3.2-2.08-3.9-2.1-1.66-.17-3.24.97-4.08.97-.85 0-2.14-.95-3.52-.92-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.08 1.35 10.73.9 1.3 1.96 2.75 3.36 2.7 1.35-.05 1.86-.87 3.49-.87 1.63 0 2.09.87 3.51.84 1.45-.02 2.37-1.32 3.26-2.62 1.03-1.5 1.45-2.96 1.47-3.04-.03-.01-2.82-1.08-2.85-4.29ZM13.7 4.68c.74-.9 1.24-2.15 1.1-3.4-1.07.04-2.36.71-3.13 1.61-.68.79-1.28 2.07-1.12 3.29 1.19.09 2.41-.61 3.15-1.5Z"
      />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function AppleButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setNative).catch(() => {});
  }, []);
  if (native) {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.md}
        style={{ height: 50, width: '100%' }}
        onPress={onPress}
      />
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.btn, s.apple, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <AppleLogo />
      <Text style={[s.text, { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function GoogleButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.btn, s.google, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <View style={{ width: 20 }}>
        <GoogleLogo />
      </View>
      <Text style={[s.text, { color: '#1F1F1F' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, borderRadius: radius.md, paddingHorizontal: 16 },
  apple: { backgroundColor: '#000' },
  google: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#747775' },
  text: { fontSize: 17, fontWeight: '600' },
});
