import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { C, radius } from './theme';

export function Panel({
  title,
  onClose,
  children,
  maxWidth = 760,
  tone = 'default',
  headerRight,
  scroll = true,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  tone?: 'default' | 'help' | 'edit';
  headerRight?: React.ReactNode;
  scroll?: boolean;
}) {
  const headerBg = tone === 'help' ? C.helpSoft : tone === 'edit' ? C.editSoft : C.surface;
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View style={[styles.panel, { maxWidth }]}>
        <View style={[styles.panelHeader, { backgroundColor: headerBg }]}>
          <Text style={styles.panelTitle} numberOfLines={1}>
            {title}
          </Text>
          {headerRight}
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="close">
            <Icon name="x" size={24} />
          </Pressable>
        </View>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.panelBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.panelBody, { flex: 1 }]}>{children}</View>
        )}
      </View>
    </View>
  );
}

type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

export function Btn({
  label,
  icon,
  onPress,
  kind = 'secondary',
  small,
  disabled,
  style,
  accessibilityLabel,
}: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const palette: Record<BtnKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: C.accent, fg: '#fff', border: C.accent },
    secondary: { bg: C.surface, fg: C.text, border: C.border },
    danger: { bg: C.surface, fg: C.help, border: '#F4B4AE' },
    ghost: { bg: 'transparent', fg: C.text, border: 'transparent' },
    success: { bg: C.success, fg: '#fff', border: C.success },
  };
  const p = palette[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: p.bg, borderColor: p.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={small ? 18 : 20} color={p.fg} />}
      {label ? <Text style={[styles.btnText, small && { fontSize: 14 }, { color: p.fg }]}>{label}</Text> : null}
    </Pressable>
  );
}

export function Toggle({ label, value, onChange, note }: { label: string; value: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput placeholderTextColor="#98A2B3" style={[styles.input, style]} {...rest} />
    </View>
  );
}

export const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    zIndex: 50,
  },
  panel: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  panelTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text },
  closeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  panelBody: { padding: 18, gap: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  btnSmall: { minHeight: 40, paddingHorizontal: 12 },
  btnText: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 48 },
  rowLabel: { fontSize: 16, color: C.text },
  note: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  switch: { width: 50, height: 30, borderRadius: 15, backgroundColor: '#C9D1DB', padding: 3 },
  switchOn: { backgroundColor: C.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 20 }] },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: C.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  segment: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: radius.sm, flexGrow: 1, alignItems: 'center' },
  segmentActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  segmentText: { fontSize: 15, color: C.textMuted, fontWeight: '600' },
  segmentTextActive: { color: C.accent },
  section: { gap: 8, paddingBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 17,
    color: C.text,
    backgroundColor: C.surface,
  },
});
