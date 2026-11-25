> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**
>
> Written from `docs/ACCESSIBILITY.md` (check of 14 November 2026). Assessment item: 8.15. An
> accessibility statement usually needs an independent audit before it can say "partially
> compliant" with confidence: the status below is a proposal. Publish in French, English and
> Arabic.

# Accessibility statement — Daleth AAC

DALETH wants Daleth AAC to be usable by everyone: children who
communicate with it, and the adults around them, including people who use a screen reader, a
keyboard, a switch or a large text size.

This statement covers the Daleth AAC apps for iPhone, iPad and Android, version
`[version]`, and the pages `[website]/support/` and `[website]/delete-account/`.

## Status

**`[Partially compliant — to confirm after an independent audit]`** with the Web Content
Accessibility Guidelines (WCAG) 2.2, level AA, the reference used by the European standard
EN 301 549.

## How it was checked

| | |
|---|---|
| Date | 14 November 2026; scan run again on 18 November 2026 |
| Method | Automatic scan (axe-core) and reading of the code, by the development team; not an independent audit |
| What | The web build of the app (the same code as the phone and tablet apps; the web version itself is only open to chosen testers, the product is the store apps): 64 screens, 232 scans, at four sizes (computer, phone, 320 px wide, 200 % zoom) and in Arabic (right to left) |
| Keyboard | Tab, Enter, Space and Escape on every main screen; the focus is always visible |
| Colours | Every colour pair of the app is tested automatically for contrast (4.5:1 for text, 3:1 for controls) |
| Result | 0 rule breaks left in the scans (4 kinds found at the start, fixed) |
| Repeat | `npm run test:a11y` after every change to the screens |

## What works

- Switches, check boxes and choices say whether they are on or off to screen readers; tabs are
  grouped as tabs; panels are announced as dialogs, take the focus, and close with Escape.
- Each card and word of the sentence is tagged with its language, so that an Arabic word is not
  read with an English voice.
- Pages declare the language of the menus; Arabic menus read right to left (boards are never
  mirrored: the place of each word is the child's motor plan).
- Moving a card has a way without sliding ("Move this card", then touch the new place).
- Charts can be shown as tables.
- No screen scrolls sideways at 320 px; nothing is lost at 200 % zoom.
- Switch scanning and dwell selection are available for children who cannot touch a card
  directly *(November 2026; not part of the 14 November check)*.

## What is not accessible yet, or not checked

| What | Why | What we will do |
|---|---|---|
| Use with a real screen reader (VoiceOver on iPad and iPhone, TalkBack on Android) | Names, roles and states are in place, but nobody has listened yet. Most important on the board and in the word editor | Test with people who use them every day `[date]` |
| The apps on devices | The check was made on the web build of the same code | Test on iPad, Android tablet, phone `[date]` |
| Text spacing set by the user (WCAG 1.4.12) and very large system fonts | Not tested | `[date]` |
| Switch scanning and dwell selection | New: not yet tested with children who use switches | `[date]` |
| Eye gaze | Not supported | `[decision]` |
| Photos added by families | Their only description is the word they illustrate | Acceptable for the board; to review |
| The caregiver code (four digits to remember; WCAG 3.3.8) | It is a gate against the child, not a sign-in; the account itself has password managers and pasted codes. An auditor may ask for another way (the device's face or fingerprint unlock) | `[decision]` |

## Tell us

If something in the app is hard or impossible to use for you or your child:

- in the app: Settings → Account → "Help us improve Daleth AAC" → "Report an accessibility
  difficulty" (professionals: Account & licence);
- by e-mail: `daleth.contact@gmail.com`.

We answer within `[number]` working days. If our answer does not satisfy you, you can contact
`[the competent authority of your country — in France, the Défenseur des droits]`.

## Date

Statement written on `[date]`, from the check of 14 November 2026. Reviewed `[date]`.
