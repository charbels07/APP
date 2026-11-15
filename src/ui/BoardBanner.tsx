/**
 * The banner a screen puts above the board (`<Root banner={…} />`): one sentence and its buttons.
 * Used by the try-it board, the board at the end of the set-up and the professional's boards.
 *
 * The sentence and the buttons share one line when there is room for both. On a narrow screen
 * (or with long names, as in French) the buttons go under the sentence. The sentence is shown in
 * full and nothing is pushed past the edge of the screen (WCAG 1.4.10): `npm run test:a11y` fails
 * otherwise. Do not go back to a single row that cannot wrap.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavRtl } from './common';
import { Icon, type IconName } from './Icon';
import { C, radius } from './theme';

export type BannerTone = 'accent' | 'edit' | 'success';

const TONES: Record<BannerTone, { color: string; bg: string }> = {
  accent: { color: C.accent, bg: C.accentSoft },
  edit: { color: C.edit, bg: C.editSoft },
  success: { color: C.success, bg: C.successSoft },
};

export function BoardBanner({
  icon,
  text,
  tone = 'accent',
  border,
  small,
  children,
}: {
  icon: IconName;
  text: string;
  tone?: BannerTone;
  /** Colour of the edge (by default the colour of the sentence). */
  border?: string;
  /** Slightly smaller letters. */
  small?: boolean;
  /** The buttons. */
  children?: React.ReactNode;
}) {
  const rtl = useNavRtl();
  const { color, bg } = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border ?? color }, rtl && styles.bannerRtl]}>
      <View style={[styles.sentence, rtl && styles.rowRtl]}>
        <Icon name={icon} size={22} color={color} />
        <Text style={[styles.text, { color }, small && styles.textSmall, rtl && styles.textRtl]}>{text}</Text>
      </View>
      {children ? <View style={[styles.buttons, rtl && styles.buttonsRtl]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 4,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
  },
  bannerRtl: { flexDirection: 'row-reverse', paddingLeft: 6, paddingRight: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  // 250: with less room than this for the sentence, the buttons leave its line.
  sentence: { flexGrow: 1, flexShrink: 1, flexBasis: 250, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, minWidth: 0, fontWeight: '700', fontSize: 15 },
  textSmall: { fontSize: 14 },
  textRtl: { textAlign: 'right' },
  // On a line of their own the buttons sit at its end (on the left in Arabic). Too many for one
  // line: they wrap as well.
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, maxWidth: '100%', marginLeft: 'auto' },
  buttonsRtl: { flexDirection: 'row-reverse', marginLeft: 0, marginRight: 'auto' },
});
