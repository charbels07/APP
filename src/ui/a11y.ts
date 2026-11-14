/**
 * The state of a control, said to screen readers on every platform at once.
 * iPad and Android read `accessibilityState`; the web version (react-native-web) ignores it and
 * reads the `aria-…` attributes instead. Spread the result on the control: `{...checked(on)}`.
 */

/** A switch, a check box or one choice of a list: on or off. */
export const checked = (on: boolean) => ({ accessibilityState: { checked: on }, 'aria-checked': on });

/** A tab: the one that is open. */
export const selected = (on: boolean) => ({ accessibilityState: { selected: on }, 'aria-selected': on });

/** A button that stays "on" once pressed (a card picked among others). */
export const pressed = (on: boolean) => ({ accessibilityState: { selected: on }, 'aria-pressed': on });

/** A row that opens and closes. */
export const expanded = (on: boolean) => ({ accessibilityState: { expanded: on }, 'aria-expanded': on });

/**
 * The language of a word, so a screen reader pronounces it properly when the words of the board
 * are not in the language of the menus (WCAG 3.1.2). `lang` is read by browsers,
 * `accessibilityLanguage` by iPhone / iPad.
 */
export const spoken = (lang: string) => ({ lang, accessibilityLanguage: lang });

