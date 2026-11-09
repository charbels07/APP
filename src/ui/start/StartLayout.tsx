/** Frame of the screens before the board: back button, language switch, centred card. */
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import type { UiLang } from '../../model/types';
import { useSession } from '../../state/Session';
import { Icon } from '../Icon';
import { C, radius } from '../theme';

export const RIGHT: TextStyle = { textAlign: 'right', writingDirection: 'rtl' };

/** Text that follows the navigation direction (right-aligned in Arabic). */
export function T({ style, children, ...rest }: React.ComponentProps<typeof Text> & { style?: StyleProp<TextStyle> }) {
  const rtl = useSession().uiLang === 'ar';
  return (
    <Text style={[st.text, style, rtl && RIGHT]} {...rest}>
      {children}
    </Text>
  );
}

export function useRtl() {
  return useSession().uiLang === 'ar';
}

const LANGS: { l: UiLang; label: string }[] = [
  { l: 'fr', label: 'FR' },
  { l: 'en', label: 'EN' },
  { l: 'ar', label: 'ع' },
];

export function LangSwitch() {
  const { uiLang, setUiLang, s } = useSession();
  return (
    <View style={st.lang} accessibilityRole="radiogroup" accessibilityLabel={s.navLanguage}>
      <Icon name="globe" size={18} color={C.textMuted} />
      {LANGS.map(({ l, label }) => (
        <Pressable
          key={l}
          onPress={() => setUiLang(l)}
          style={[st.langBtn, uiLang === l && st.langOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: uiLang === l }}
          accessibilityLabel={{ fr: 'Français', en: 'English', ar: 'العربية' }[l]}
        >
          <Text style={[st.langText, uiLang === l && { color: C.accent }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The app's mark: a speech bubble holding four word cards (colours of the word classes). */
export function Logo({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M10 6h44a6 6 0 0 1 6 6v32a6 6 0 0 1-6 6H28l-12 10v-10h-6a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6Z" fill={C.accent} />
      <Rect x={14} y={14} width={16} height={12} rx={3} fill="#FFF3BF" />
      <Rect x={34} y={14} width={16} height={12} rx={3} fill="#DDF4DA" />
      <Rect x={14} y={30} width={16} height={12} rx={3} fill="#DCEAFF" />
      <Rect x={34} y={30} width={16} height={12} rx={3} fill="#FFE6CF" />
    </Svg>
  );
}

export function StartLayout({
  title,
  onBack,
  children,
  maxWidth = 560,
}: {
  title?: string;
  onBack?: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const { s } = useSession();
  const rtl = useRtl();
  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[st.top, rtl && st.rev]}>
        {onBack ? (
          <Pressable onPress={onBack} style={[st.back, rtl && st.rev]} accessibilityRole="button" accessibilityLabel={s.back}>
            <Icon name={rtl ? 'chevronRight' : 'chevronLeft'} size={22} color={C.text} />
            <Text style={st.backText}>{s.back}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <LangSwitch />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
          <View style={[st.card, { maxWidth }]}>
            {title ? <T style={st.title} accessibilityRole="header">{title}</T> : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** A big tappable choice (role, option…). */
export function ChoiceCard({
  icon,
  title,
  text,
  onPress,
  selected,
}: {
  icon?: React.ComponentProps<typeof Icon>['name'];
  title: string;
  text?: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const rtl = useRtl();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.choice, rtl && st.rev, selected && st.choiceOn, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={text ? `${title}. ${text}` : title}
    >
      {icon && (
        <View style={st.choiceIcon}>
          <Icon name={icon} size={28} color={C.accent} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <T style={st.choiceTitle}>{title}</T>
        {text ? <T style={st.muted}>{text}</T> : null}
      </View>
      <Icon name={rtl ? 'chevronLeft' : 'chevronRight'} size={22} color={C.textMuted} />
    </Pressable>
  );
}

/** A link-looking button. */
export function LinkBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={st.link} hitSlop={6}>
      <Text style={st.linkText}>{label}</Text>
    </Pressable>
  );
}

/** Red message under a form. */
export function ErrorText({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <T style={st.error} accessibilityRole="alert">
      {text}
    </T>
  );
}

export const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rev: { flexDirection: 'row-reverse' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, minHeight: 52 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 6 },
  backText: { fontSize: 16, fontWeight: '600', color: C.text },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.surface, borderRadius: 22, padding: 3, paddingLeft: 10, borderWidth: 1, borderColor: C.border },
  langBtn: { minWidth: 40, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  langOn: { backgroundColor: C.accentSoft },
  langText: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  text: { fontSize: 16, color: C.text, lineHeight: 23 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, lineHeight: 32 },
  muted: { fontSize: 15, color: C.textMuted, lineHeight: 21 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    minHeight: 64,
  },
  choiceOn: { borderColor: C.accent, backgroundColor: '#F3F7FF' },
  choiceIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontSize: 18, fontWeight: '700' },
  link: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontSize: 16, color: C.accent, fontWeight: '600', textAlign: 'center' },
  error: { color: C.help, fontSize: 15, fontWeight: '600' },
});
