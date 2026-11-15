# Accessibility check

**Standard:** WCAG 2.2, level AA (the reference most accessibility laws point to) ·
**Date:** 15 November 2026 · **What was checked:** the web version of the app (same code as the tablet app).

This is a check done by a program and by reading the code. It is **not a certificate**: no tool can
state that an app "complies everywhere". A formal statement needs an independent audit and tests
with people who use a screen reader, a switch or a keyboard every day.

## Result in one look

| | |
|---|---|
| Screens scanned by the program | 54 different screens, at several sizes, in Arabic and in French: 211 scans |
| Rule breaks found at the start | 4 kinds, on almost every screen (see below) |
| Rule breaks left in the scans | 0 |
| Keyboard-only use | works: Tab, Enter, Space, Escape; the focus is always visible |
| Still to be done by a person | listening with a real screen reader on iPad, Android and a computer |

Run it again at any time: `npm run test:a11y` (about 10 minutes; needs Playwright on the machine).

## What was scanned

- **Family side** (33 screens): welcome, the try-it board, who are you, sign-up, code, set-up of the
  child (first name, languages, which Arabic, the "?" explanation, the board to try at the end), the board,
  a folder, the three tabs of the magnifying glass (search, keyboard, model), help, activity boards,
  schedule, timer, guide, caregiver code,
  caregiver mode, word editor, settings (Board, Team, Progress, Account), and the six back-office pages.
- **Professional side** (21 screens): the four verification steps, the status page, the tour,
  every section of the workspace (dashboard, users, library, collaborations, guide, account),
  connecting a user, the library's search and a material's form, and a child's profile prepared by
  the professional (first step, the page with the parents' code, the board, its three settings pages).
- **Sizes:** computer (1180 × 900), phone (390 × 800), very narrow (320 × 640, the size WCAG uses for
  "reflow"), and 590 × 450 (a computer window zoomed to 200 %).
- **Languages:** English everywhere; Arabic (right to left) on 9 screens at three sizes, the very
  narrow one included; French, which has the longest names, on 10 screens at the very narrow size
  (the same 9 and the board at the end of the set-up).

## What was wrong, and what was done

### Screen readers (WCAG 4.1.2, 1.3.1, 3.1.1, 3.1.2, 2.4.2)

| Problem | Who it blocked | Fix |
|---|---|---|
| Switches, check boxes and choices did not say whether they were on or off in a browser. The app gave the state the React Native way, which the web layer ignores. | Blind users: "switch" with no "on / off" | A small helper (`src/ui/a11y.ts`) now gives the state both ways, on about 20 controls. |
| Tabs were not grouped as tabs (back office, activity boards, workspace). | Screen readers could not say "tab 2 of 5" | The rows of tabs are declared as tab lists. |
| Empty cards, sentence chips and schedule steps had a name but no role. | The name was ignored | They are declared as buttons. |
| The sentence strip was a button containing other buttons. | Confusing: a button inside a button | The strip is no longer a button for assistive tools (the Speak button does that job); touching it still speaks. |
| Charts and figure tiles had a description attached to nothing. | The description was not read | Each is now one "image" with its description; column charts can also be shown as tables. |
| The page always said it was in English, and was titled "CAA". | A French or Arabic page read with English pronunciation | The page now declares the language of the menus and is titled "Empower Communication". |
| Words of the board were not tagged with their language. | English menus + Arabic words: Arabic read with an English voice | Each card and each sentence chip carries its language. |
| Panels (search, guide, settings…) were not announced as dialogs. | No "dialog" announcement, no clear start | Panels are dialogs with their title as name; the page has a "navigation" and a "main" area. |

### Keyboard (WCAG 2.1.1, 2.4.3, 2.4.7, 2.4.11)

| Problem | Fix |
|---|---|
| Text links such as "I already have an account" could be reached with Tab but did not answer Enter. | They are now buttons (they act inside the app); the links of the credits page are real links. |
| Opening a panel left the focus behind it: one had to Tab through the whole board (60 cards) to reach it. | The focus goes into the panel; the board behind cannot be reached while it is open; the side bar stays reachable. |
| Escape did nothing. | Escape closes the panel on top, and the focus goes back to the button that opened it. |
| Two search fields hid the focus mark. | The focus mark is back. |

Checked by the program: order of Tab on the first screen, Enter and Space on cards, tabs, panels,
Escape, focus return, and that the focused control always shows a visible mark.

### Colours (WCAG 1.4.3 text 4.5:1, 1.4.11 controls 3:1)

| Element | Before | After | Needed |
|---|---|---|---|
| Blue text on soft blue (selected language, links, tabs) | 4.2 | 5.4 | 4.5 |
| Red text on soft red ("Clear all") | 4.0 | 4.8 | 4.5 |
| Green text on soft green | 4.3 | 5.5 | 4.5 |
| "Now" in the schedule (orange on white) | 2.3 | 5.4 | 3 (large text) |
| Percentages inside chart bars (white on orange) | 3.2 | 4.9 (dark text) | 4.5 |
| Percentages inside chart bars (white on blue) | 4.4 | 4.8 | 4.5 |
| Example text inside empty fields | 1.7 – 2.6 | 5.0 | 4.5 |
| Edge of the fields to type in | 1.4 | 3.5 | 3 |
| "Off" track of a switch | 1.5 | 3.5 | 3 |

The blue, the red and the green of the app are each a little darker than before. A test
(`src/__tests__/accessibility.test.ts`) now fails if a colour pair drops under the rule.

### Small screens and zoom (WCAG 1.4.4, 1.4.10, 2.5.8)

| Problem | Fix |
|---|---|
| The hint in the empty sentence strip was cut on a phone and could not be scrolled with a keyboard. | It wraps on two lines. |
| "Home" in a folder's header was 20 px high. | 44 px. |
| With the timer's options open on a short screen, the board was squashed to a thin strip. | On a short screen the options sit on one line that scrolls sideways. |
| Chart columns are narrower than 24 px on a phone. | The same figures can be shown as a table (allowed by the rule as an equivalent). |
| Three boards have a banner above them, with a sentence and buttons: the try-it board ("Preview: try the board freely. Nothing is saved."), the board at the end of the set-up and the professional's material boards. The buttons stayed beside the sentence whatever the width. At 320 px the last button went past the edge of the screen: "Create my account" by 27 px in French (2 px in English), "Finish" of the set-up by 18 px in French, "Save to the library" by 165 px in French. The sentence itself was cut after a few words, on phones too. | One banner for the three (`src/ui/BoardBanner.tsx`): when there is no room for both on one line, the buttons go under the sentence, which now shows in full (three languages). |

No screen scrolls sideways at 320 px, and nothing is lost at 200 % zoom in the scans.
The run now fails when a screen is wider than its window, on either side (the Arabic menus are
mirrored, so a row that is too long sticks out on the left): `scripts/a11y/sideways.js`. Before, the
figure was written in a results file that nobody read, and the try-it board was only opened in
English: this is how the banner went unnoticed. What scrolls inside its own area (the cards of the
board on a narrow screen) is not counted.

Not in the run at 320 px: the professional side (scanned at 1180 and 390 px, in English). Tried once
at 320 px on 15 November 2026 with the same scan: no screen wider than its window in English. In
French and in Arabic only the demonstration board and a material board were tried there (the
material board is the one fixed above); the other screens of the workspace were not.

## What a program cannot check (still to do)

1. **Listening with a real screen reader**: VoiceOver on an iPad, TalkBack on Android, NVDA or
   VoiceOver on a computer. The names and roles are in place, but only listening shows whether the
   order and the wording make sense. This matters most on the board and in the word editor.
2. **The tablet app itself.** The same names, roles and states are given to iOS and Android, but
   nothing was tested on a device.
3. **Text spacing set by the user** (WCAG 1.4.12) and very large system fonts on tablets.
4. **Switch access and eye gaze**: not supported (the set-up says so). Every action works with a
   keyboard in a browser, which is the basis for switch access, but scanning is not built.
5. **Photos added by families** have no description other than the word they illustrate.

## Points to decide (not failures found by the scan)

- **The caregiver code** (four digits to remember). WCAG 3.3.8 asks that signing in does not rest on
  memory alone. The account sign-in is fine (password managers and pasted codes work). The caregiver
  code is a gate against the child, not a sign-in, but an auditor may ask for another way (the
  device's fingerprint or face unlock, for example).
- **Colour of the cards** tells the kind of word (people, actions…). It is never the only clue to use
  a card (picture and word are there), so it passes; the meaning of the colours is in the guide.
- **Moving a card by sliding it** has an alternative without sliding ("Move this card", then touch
  the new place), as WCAG 2.5.7 asks.

## About "everywhere in the world"

There is no single world rule. Most laws (the European Accessibility Act and its standard
EN 301 549, the rules used in the United States, the United Kingdom, Canada, Australia…) refer to
WCAG at level AA, which is what was used here. What each law requires of this app in each
country, and whether a written accessibility statement is needed, is a question for a lawyer.
