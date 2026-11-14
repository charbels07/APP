import { checked, expanded, pressed, selected, spoken } from '../ui/a11y';
import { SERIES } from '../ui/data/Charts';
import { C } from '../ui/theme';

/** Contrast between two colours, as WCAG defines it (1 = identical, 21 = black on white). */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const v = hex.replace('#', '');
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('colours can be read (WCAG 1.4.3 and 1.4.11)', () => {
  it('text has a contrast of at least 4.5:1 on every background it is written on', () => {
    const pairs: [string, string, string][] = [
      ['text on the page', C.text, C.bg],
      ['grey text on the page', C.textMuted, C.bg],
      ['grey text on a card', C.textMuted, C.surface],
      ['grey text on a soft blue', C.textMuted, C.accentSoft],
      ['blue text on white', C.accent, C.surface],
      ['blue text on the page', C.accent, C.bg],
      ['blue text on soft blue', C.accent, C.accentSoft],
      ['white on a blue button', '#FFFFFF', C.accent],
      ['red text on white', C.help, C.surface],
      ['red text on soft red', C.help, C.helpSoft],
      ['white on a red button', '#FFFFFF', C.help],
      ['green text on white', C.success, C.surface],
      ['green text on soft green', C.success, C.successSoft],
      ['white on a green button', '#FFFFFF', C.success],
      ['orange text on white', C.edit, C.surface],
      ['orange text on soft orange', C.edit, C.editSoft],
      ['text of the side bar', C.railText, C.rail],
      ['example text in a field', C.placeholder, C.surface],
      ['white inside a blue bar of a chart', '#FFFFFF', SERIES[0]],
      ['dark text inside an orange bar of a chart', C.text, SERIES[1]],
    ];
    for (const [what, fg, bg] of pairs) expect([what, contrast(fg, bg) >= 4.5]).toEqual([what, true]);
  });
  it('the edge of a field and the track of a switch stand out by at least 3:1', () => {
    expect(contrast(C.inputBorder, C.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(C.inputBorder, C.bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('the state of a control is said on every platform', () => {
  it('gives both the React Native state and the web attribute', () => {
    expect(checked(true)).toEqual({ accessibilityState: { checked: true }, 'aria-checked': true });
    expect(checked(false)['aria-checked']).toBe(false); // "off" is said too, not left out
    expect(selected(true)).toEqual({ accessibilityState: { selected: true }, 'aria-selected': true });
    expect(pressed(false)).toEqual({ accessibilityState: { selected: false }, 'aria-pressed': false });
    expect(expanded(true)).toEqual({ accessibilityState: { expanded: true }, 'aria-expanded': true });
  });
  it('tags a word with its language', () => {
    expect(spoken('ar')).toEqual({ lang: 'ar', accessibilityLanguage: 'ar' });
  });
});
