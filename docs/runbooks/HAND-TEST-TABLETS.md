# Hand-test on real tablets

Nothing in the gap review of November 2026 (`docs/GAP-REVIEW-2026-11.md`) was tried on a real device:
the web version was tested in a browser, the tablet apps only by reading the code. This list is what
the owner tries by hand on an **iPad** and an **Android tablet** before the store apps go to families.
It collects the "Left for the owner's hand-test list" paragraphs of batches 1, 2 and 5, and the list of
batch 6.

The button names below are the English ones on screen (menus in English: Settings → Board →
Languages → Menu language). "Caregiver mode" means: **Caregiver** on the bar, then the caregiver code.

## How to note a failure

For each line that fails, write down:

- **Device**: model (e.g. iPad 9th generation, Samsung Galaxy Tab A8).
- **OS version**: iPadOS / Android version (device Settings → General → About, or About tablet).
- **App version**: Settings → Account → Help → **Version** (and whether it is a store, TestFlight or
  development build).
- **What you did**, step by step, and **what happened** instead of what must happen. A screenshot or a
  screen recording helps. Never put the child's full name or a real child's words in the note.
- The date and time, and whether the device was online.

Tick a line only when it worked on the device named in its last column.

## 1. Speech and the four voices

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | Settings → Board → **Voice** → **Voice type**: choose **Woman**, **Save**, touch a few words of the board. | Each word is said at once by a woman's voice of the board's language. | both |
| [ ] | Same with **Man**. | A man's voice (not a machine-like or joke voice when the device has a normal one). | both |
| [ ] | Same with **Girl**. | A woman's voice made higher, clearly a child's. | both |
| [ ] | Same with **Boy**. | A man's voice made higher (about 50 %); on a device with no man's voice for the language, a woman's voice barely raised. Note how it sounds: its numbers are changed only with the owner's ear. | both |
| [ ] | Repeat the four voices with the board in French, English and Arabic (Settings → Board → **Languages**). | Each language is said by the device's own voice for it; Arabic by the device's standard Arabic voice whatever the dialect chosen. | both |
| [ ] | **Speed** (Voice group): try the slowest and the fastest, **Save**. | The words are said slower / faster; nothing else changes. | both |
| [ ] | Build a sentence of several words, touch **Speak**. | The whole sentence is said once, in order, with no word missing. | both |

## 2. Recordings

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | In caregiver mode, open a word, **Record** (the first time ever on this device). | The device asks for the microphone once; after "Allow" the recording starts; caregiver mode is **still on** afterwards. | both |
| [ ] | Touch that word on the board. | The family's recording is played (not the device's voice), with no long silence before or after. | both |
| [ ] | Record a word in a browser (computer, same account), then open the same child's board on the iPad and touch that word. | The browser-made recording plays on the iPad. If it cannot play, the device's voice says the word within about 1.5 s: never silence. | iPad |
| [ ] | With the voice on **Girl** or **Boy**: Search → **A new word** → **Create a new word**, fill in the word and a picture, do **not** record, **Save**. | The word is saved without a recording (recording is optional now); **Record** is still offered. | both |

## 3. Lock the screen

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | **Lock** on the bar → caregiver code. | "Lock the screen" opens with the steps for this device and **Open the device's settings**. | both |
| [ ] | iPad: **Open the device's settings**. | Settings opens on Daleth AAC's page. | iPad |
| [ ] | iPad: back to the first page of Settings → Accessibility → **Guided Access** on, with a passcode. In the app, triple-click the side (or Home) button → Start. | The child cannot leave the app (Home, swipe, notifications). Triple-click + passcode leaves. | iPad |
| [ ] | Android: **Open the device's settings**. | The Security page opens (app pinning is there, or under "More security settings"). | Android |
| [ ] | Android: turn on App pinning ("Ask for PIN before unpinning") and pin the app. | Home and Overview do not leave the app until the PIN. | Android |
| [ ] | With Guided Access or pinning on, touch **Help** on the bar. | Help opens: it is always reachable. | both |

## 4. Links behind the code

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | In caregiver mode, on a word: **This pictogram opens an app**, **App link** (e.g. a YouTube address), **Test**. | The link opens; back in the app, caregiver mode is still on. | both |
| [ ] | Leave caregiver mode; touch that pictogram (as the child would). | The keypad asks the caregiver code first; with the right code the app opens; without it nothing opens. | both |

## 5. Starting without internet

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | Signed in, a board opened once. Turn on airplane mode, close the app completely, open it. | The child's board is there within a few seconds (no long spinner, no Welcome page, never "signed out"); the words are said. | both |
| [ ] | Change a word while offline, then turn the internet back on with the board open. | The change reaches the account (Settings → Account → **Devices and sync**: no change left waiting); nothing is lost. | both |

## 6. A "use only" tablet receiving a new word

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | On a parent's phone: Settings → Account → **Link a device** → **Use only (school, nanny…)**. On the tablet: **Link this tablet with a code**, type the code. | The tablet opens the child's board. | both |
| [ ] | While someone uses the board on the tablet (a sentence half built), add a word from the parent's phone. | Within about 30 seconds the new word appears on the tablet; the sentence in progress is not lost; no error line. | both |
| [ ] | On the tablet, open an activity board and tick steps of a sequence, then add another word from the phone. | The new word still arrives; the tablet's activity board and ticks stay as they were. | both |

## 7. Arabic

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | Board in Arabic: build a sentence longer than the sentence bar. | The bar scrolls so that the last word is seen; it reads right to left; it can be scrolled back; **Speak** says the whole sentence. | both |
| [ ] | On a tablet with no Arabic voice installed (remove it in the device's text-to-speech settings), open a board in Arabic. | One line above the board: "No voice for Arabic on this device: the board cannot say its words (a word recorded by the family is still played). To install one: Settings → Voice." Its cross closes it; it comes back at the next opening until a voice is installed. | both |

## 8. Caregiver mode stays on for the app's own system screens

Each line starts in caregiver mode. Afterwards caregiver mode must **still be on**.

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | On a word: **Your library** → **Take a photo**, take it, keep it. | The photo is on the word; caregiver mode still on. | both |
| [ ] | Then open the device's Photos. | The photo taken is there. iPad: the question to add photos was asked once (the first time only); Android 10 and later asks nothing. | both |
| [ ] | On a word: **Your library** → **Choose a picture**, pick a photo from the device. | The photo is on the word; caregiver mode still on. | both |
| [ ] | Record a word (see section 2). | Caregiver mode still on. | both |
| [ ] | **Print / PDF** → **Export PDF**, share the file (Mail, Files, Drive…). | The PDF is shared; back in the app, caregiver mode still on. | both |
| [ ] | **Print / PDF** → **Print**, print or cancel in the system's print screen. | Back in the app, caregiver mode still on. | both |
| [ ] | Now press Home (or switch to another app), then come back to the app. | Caregiver mode is **off**; the board is directly usable; no keypad covers it. | both |
| [ ] | Caregiver mode on, touch nothing for 5 minutes. | Caregiver mode turns itself off; the adults' panels close; the board is usable. | both |

## 9. Export, import, undo of a photo

| | What to do | What must happen | Device |
|---|---|---|---|
| [ ] | On a board with photos and recordings: Settings → Account → **Privacy and data** → **Export the board (with its photos and sounds)**, share the file (AirDrop, Files, Drive, e-mail…). | One `.caa.zip` file is made and shared; the app says how many photos or recordings were not on this device yet, if any. | both |
| [ ] | On another tablet, **Sign up** with a new account → add a child → **Import a board from another caregiver (file)**, choose that file. | The board arrives with its words, photos and recordings; it has no caregiver code (the new family is asked to choose one), no links, no demonstrations. | both |
| [ ] | Device A: replace a word's photo. The next day, on device B (same child): Settings → **Team** → **Change history** → **Undo** on that change. | The old photo shows again on both devices (it was kept 30 days). | both |

## After the run

Send the failures (with the notes above) to whoever works on the app next; a failure in sections 1, 2,
5 or 6 (the child without a voice or a board) comes first.
