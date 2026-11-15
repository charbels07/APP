# Project notes

- Expo SDK 58 / React Native 0.88 / TypeScript. Expo APIs change between SDKs: check
  `node_modules/<pkg>/build/*.d.ts` before using an API instead of relying on memory.
- Use `EXPO_OFFLINE=1 npx expo install <pkg>` (the Expo API host may be unreachable).
- Checks before committing: `npm run typecheck` and `npm test`.
- No Expo Router on purpose: the app is one surface with a persistent universal bar
  (`src/ui/Root.tsx`); overlays live inside the content area so the bar is always reachable.
- Vocabulary is concept-based (`src/data/concepts.ts`); never move core cells
  (`src/data/defaults.ts`) when editing: positions are the user's motor plan.
- Part of the words shown (levels 1 and 2): outside caregiver mode the main board is drawn without
  holes, each word sliding up in its own column (`compactPlaces` in `src/lib/boardOps.ts`; also print
  and the set-up preview). Display only: never change the stored cells for it. The family can keep
  "Final places" instead (`settings.wordPlaces`); caregiver mode always shows the real places.
- Platform-specific code uses `.web.ts(x)` siblings (media store, printing, preview).
- Pictograms: only libraries verified as free for commercial use (`docs/PICTOGRAM-LICENSES.md`,
  `pictograms/libraries.json`). Never add ARASAAC or any NC / unclear-licence set. A pictogram is
  identified by its stable key `library/file` (`SymbolRef` kind `picto`), not by a number.
- `npm run fetch:picto` downloads the originals at pinned versions into `../picto-sources`
  (`PICTO_SOURCES`); `npm run build:picto` rebuilds the library (`assets/picto/`, base64 text packs:
  some hosts refuse binary files), `src/data/pictoLibrary.ts`, `src/data/pictoLibraries.ts` (credits
  page) and `pictograms/database/`; `npm run build:symbols` rebuilds the built-in words' pictures
  (`assets/symbols/`, `src/data/symbolMap.ts`; choices by hand in `pictograms/default-overrides.json`).
- French/Arabic words for the icon libraries come from `pictograms/translations/*.tsv` and are
  flagged "to review" (`*` in the picker); never present them as validated vocabulary.
- Speech recognition uses `expo-speech-recognition` (native module): test on a dev/EAS build, not Expo Go.
- Two languages: `settings.lang` (words: labels, speech) and `settings.uiLang` (navigation: `src/i18n/ui.ts`,
  `src/data/guide.ts`, FR/EN/AR). Arabic navigation mirrors menus via `useNavRtl()`; never mirror boards.
- A word's picture has two sources only: "App's library" (the offline pictograms) and "Your library" (a
  picture saved on the device, or a photo). Pictures searched on the internet were removed on purpose
  (November 2026): do not add an online picture search or a "paste a link" option back unless asked.
- Arabic: the family chooses a dialect or none (`settings.arabic`). In the set-up the languages come first;
  "Which Arabic?" is only asked when Arabic is ticked, and no Arabic among the languages means
  `arabic = 'none'` (`applyAnswers`). `src/data/concepts.ts` holds the Lebanese
  words; `src/data/dialectWords.ts` lists what differs per dialect (data only: also read by the build script).
  Always read Arabic labels through `getConcept` / `label`, languages through `availableLangs`, and the
  language name through `langName` — never `BUILTIN_CONCEPTS[id].labels.ar` or `LANGS` directly in screens.
- Dialect voices: NOT used (decision of November 2026: the generated voices were judged bad by a native
  listener). Arabic is read by the device's standard Arabic voice whatever the dialect; do not generate or
  ship voice packs, and do not make the Arabic voice follow the dialect, unless asked. The code stays, switched
  off by the empty index (`npm run build:voices`, `src/lib/dialectVoice.ts`, `src/data/voicePackIndex.ts`).
- Children's voice (owner's decision, November 2026): with voice age "Child" and a girl's voice, French and
  English are said by voices of Microsoft Azure AI Speech chosen by the owner by ear (Maisie EN, Eloise FR),
  through the server function `caa-voice`. The boy is NOT sent there: he keeps the tablet's voice
  (free), brought as near as possible to Azure's "Dustin" (`BOY_HZ`, `boyPitch`, `kindFor` in `voices.ts`).
  The girl's voice lives in `src/lib/childVoice.ts`, `childVoiceSound.ts` (sounds kept by `saidCache`). Do not change these voices unless asked. The tablet's voice stays the safety net (offline, not
  deployed, Arabic): never leave a child silent, and show the setting only when `childVoiceAvailable()`. The
  family is told the text travels to Microsoft and can refuse (`settings.childVoiceOnline`); never send the
  child's name. With a child's voice, "Create a new word" requires a recording before Save (`PickerPanel`).
- A man's / woman's voice is chosen by name in `src/lib/voices.ts`: machine-like and joke voices (`ROBOTIC`)
  come last. A family's own recording of a word (`overrides[id].audio[lang]`) always wins over any voice.
  On the tablet (`CHILD`), the girl is a woman's voice raised; the boy is a man's voice raised by about 40 %
  (measured: Dustin 160–190 Hz, men 100–140 Hz), a woman's voice a little lower only when the device has no
  man's. "Device voice" + child for a boy is the boy's voice too (`kindFor`). Android voices are told apart by
  their code (`ANDROID_MEN`). Not yet confirmed by ear on a tablet: change the numbers only with the owner.
- App pictograms live in `src/data/concepts.ts` (`app: { url, triggers }`); new built-in folders are added
  to saved profiles by a one-time migration in `src/lib/storage.ts` (only into an empty slot).
- Back office (`src/ui/admin/`, stage `admin`): only accounts in the database table `admins`; every
  `admin_*` function checks `is_admin()` (never rely on hiding the page). A `pro` account works on a
  child's profile only once its verification is `verified` (triggers + `access_of`; the demo server
  mirrors this in `LocalBackend.cleared`). Figures from children's profiles or usage: consenting
  families only (`shareStats = 'anonymous'`), never under 5 children, never a name, word or sentence.
- Accessibility (WCAG 2.2 AA, `docs/ACCESSIBILITY.md`): react-native-web ignores `accessibilityState`,
  so give states with the helpers of `src/ui/a11y.ts` (`{...checked(on)}`, `selected`, `pressed`, `expanded`,
  `spoken(lang)`); a labelled `Pressable` always has a role; overlays go through `Panel` (dialog, focus,
  Escape); colours come from `src/ui/theme.ts` (contrast is tested). Run `npm run test:a11y` after UI changes.
- Security (`docs/SECURITY.md`): the database decides, never the app. A function that receives rights,
  a status or an owner from the app must clean or ignore them (`clean_perms`, column grants); anything
  a person can repeat goes through `rate_limit`; nothing is executable by `anon`. A new rule comes
  with its attack in `supabase/tests/security_scenario.sql`. In the app, data that can come from
  someone else (synced profile, shared material, proposal, file) goes through `src/lib/safety.ts`
  (`safeLink`, `plain`, `foreignOps` in `profileDiff.ts`); links never travel with shared content.
- A profile leaves a device through `src/lib/deviceData.ts` (`forgetEverything`, `forgetChild`), never
  by removing one storage key by hand. Photos and recordings exist only on the device that made them.
- Demo builds are asked for on purpose: `EXPO_PUBLIC_APP_MODE=demo` (a release build with no server
  address shows "not connected"). Web headers: `public/_headers` (a test checks the policy).
- Caregiver code: `settings.pin === '1234'` means "not chosen yet"; never show or suggest a default code.
  The family chooses it the first time a new board opens, before the guide (`OpenGuideOnStart` in
  `src/ui/Stages.tsx` opens `{ kind: 'pin', then: { kind: 'guide' } }` once the person's rights are
  known), and whenever a code is being chosen the keypad explains what it is (`t.pinWhy`). Never let
  the "choose a code" keypad appear without that explanation. Board settings are edited through `useSettingsDraft` (saved on
  "Save", not at each change): new settings controls use the draft's `st` / `set`, not `app.update`.
- Words for the user: the Schedule screen holds "sequences" (step lists: New sequence / Edit sequence) and
  the week and month "schedules" (never "plan": it reads as a subscription plan). Lists the user orders
  by hand use `src/ui/Reorderable.tsx` (hold and slide, plus arrows as the non-drag alternative).
- A verified `pro` account can create a child's profile and hand it to the parents (the role-`parent`
  invitation it wrote: `join_profile`; `ParentsCard` in `src/ui/pro/Workspace.tsx`). While a professional
  owns a profile, recording and sharing stay off (database + `LocalBackend`); never offer those controls there.
  On every board a professional opens (her draft of a child's board, the try-board of the set-up, the
  "Settings" shortcut of her workspace) the caregiver code IS asked: her own code (`useOwnCode` in
  `src/state/ownCode.ts`, kept in her account's `prefs.pin`, chosen the first time with `t.pinWhyPro`),
  never the family's, which she neither sees nor changes (`AppProvider ownCode`). Only the accounts of
  the app's own team are never asked a code, on any board they open (`freeEdit={sess.isAdmin}`: the
  owner's decision, November 2026). Never use `freeEdit` for anyone else, a professional included.
- Notices are stored as sentences by the server: a new notice gets its three versions in
  `src/lib/notices.ts` (shown with `noticeText`), with a line in `src/__tests__/notices.test.ts`.
- Professionals' materials: no separate "create" page and no title field; the library creates
  (`CreateTiles`) and names a material by what it contains (`src/lib/resourceNames.ts`, shown with
  `resourceName`). AI buttons and messages only show when `aiAvailable()` says yes: never a sentence about
  the AI being unavailable.
- Activity boards (TLA) order their topic words like the child's main board (`src/lib/boardOrder.ts`:
  `mainBoardOrder`, `tlaLayout`, `arrangeTla`). Automatic when a board is created; on a board already made
  it is only done on request ("Arrange like the main board" in the board's menu): never re-order a board
  the child uses without the caregiver asking. The core block (`TLA_CORE`) and `TLA_FUNCTIONS` never move.
- The Settings panel on a professional's draft board gets its information from `ProBoardContext` (no sync
  engine there): Team / Follow-up / Account are `ProSettingsTab` (`src/ui/pro/ProSettings.tsx`). Do not hand
  a fake `BoardCtx` to `TeamTab` / `AccountTab` (they write through `board.sync`). On that board the banner
  only shows once something changed; without changes only the child's name and "Close".
- Entry screen: "Log in" and "Sign up" (plus the tablet code and a quiet "try it first"). "Keep me logged
  in" (`src/lib/keepSignedIn.ts`, ticked by default) decides where the session is written: on the device,
  or in the visit's store (`src/lib/visit(.web).ts`). The Supabase client must keep `storage: sessionStore`;
  a tablet linked with a code always keeps its session (`PairScreen` forces the choice to yes).
- E-mails: to users, the server only sends sign-in codes (Supabase Auth). Invitations are not e-mailed
  by the app: "Send by email" asks which mail service to use and opens a new message already written there
  (`src/ui/MailChoice.tsx`, `src/lib/inviteMail.ts`); never word a button as if the app had sent an e-mail.
  A professional's code field accepts an invitation code or the family's code.
- E-mails to the app's own team (a professional applied; the figures of the week): written by the database
  (`team_mail`, migration `20261116000000_team_mail.sql`), sent by the function `caa-mail`, which is only a
  postman. The request e-mail gives the professional's name, profession and country (the owner asked for
  the name), never a document or an address, and no name in the subject. The weekly figures are counts
  only: no name, word or sentence, and the back-office rule for usage (consenting families, 5 children or
  more). Nothing of it is reachable from the app; a new kind of message is written in SQL with its checks
  in `supabase/tests/team_mail_scenario.sql`.
- The board's bar has "Settings" and "Lock" (child lock) for the parents: outside caregiver mode they
  always go through the code (`{ kind: 'pin', then: { kind: 'settings' | 'lock' } }`), and open without
  turning caregiver mode on (`opensAlone`). Never open the settings or the lock from the bar without the code
  (the only exception is an account of the app's team, see `freeEdit`; a professional types her own code).
- The way back to the back office is a button only the app's team sees (`isAdmin` from the session, which
  asks the database): at the bottom of the bar of their own board (no code: the team is never asked one)
  and in the header of the professional workspace. Never show it to another account; hiding it is comfort
  only, every `admin_*` function still checks `is_admin()`.
- Set-up journey: every question has a "?" beside its title (`Title help="…"` in `Onboarding.tsx`) that
  opens what the choice does plus the matching part of the guide (`src/data/setupHelp.ts`: three languages,
  written about "the child", guide parts named by chapter id and step index). A new step or question gets
  its entry there; `setupHelp.test.ts` fails otherwise. If a guide chapter's steps are re-ordered, check
  the indexes used in `setupHelp.ts`.
- The magnifying glass has three tabs named by what they are for (`t.toolFind`, `t.toolNewWord`,
  `t.toolModel`: "Find on the board", "A new word", "Write to model"); the bar's button and the panel's
  title stay "Search". "Draw" in the first tab only shows while `aiAvailable()` (not removed).
- The in-app guide (`src/data/guide.ts`) is updated with every change a user can see, in the three
  languages, with the names written on screen (`guide.test.ts` checks many of them).
- Child lock in a browser (`src/lib/childLock.web.ts`): full screen (asked again at the next touch on the
  board), no page bounce or pull-to-refresh (`overscroll-behavior` + stopping finger moves that scroll
  nothing: `canScrollWith`), a question before the page closes. A site cannot block Safari's swipe-down
  out of full screen: never promise that the browser lock keeps a child in (Guided Access does).
- A panel opened from another panel carries it in the overlay's `back` (`src/state/AppState.tsx`); the
  panel passes `onBack={useBack()}` to `Panel`, which shows "Back" (Escape and a touch beside go back, the
  cross closes everything). When a panel opens another one, give `back`; never leave only the cross.
- Searching a word or a picture always goes through `src/ui/SearchBox.tsx` (say the word, draw when
  `aiAvailable()`, type): never a bare `TextInput` for a search. It works outside a board too (`profile`,
  `uiLang` props; `useAppMaybe`). Several `VoiceButton`s can be on one screen: each only hears its own session.
- A folder's name is not a word (`isFolderName` in `src/lib/lexicon.ts`): the app never says it, never puts
  it in the sentence (`touchConcept` ignores it; a replay opens the folder silently) and never offers it where
  a word is chosen (`searchWords`, not `search`, in pickers). The home search still finds folders, with
  "Show me where" only.
- Recorded words are saved through `saveRecording` (`src/lib/recordingTrim(.web).ts`), which leaves out the
  silence before and after (`src/lib/trimSilence.ts`, pure and tested): the browser cuts the sound and saves
  a WAV; the tablet app keeps the file and writes the two moments in its name (`.t120-980.m4a`, read by
  `spanOfName` when playing). `mediaNamesIn` (`deviceData.ts`) must keep recognising every media name.
- Figures for the app's team (`src/lib/product.ts`, migration `20261117000000_product.sql`): a screen counts
  with `countFeature('name')` and reports with `reportProblem('kind', e)`; both do nothing unless the open
  board's family agreed (`sharesProduct`: `shareStats` + `shareTerms` ≥ `SHARE_TERMS`). Names come from fixed
  lists that the app and the database share (`product.test.ts` compares them): a new counter is added in
  both. Never send a word, a sentence, a board's name, free text or an error's message; never count from a
  `pro` or team account; never show a figure under 5 children of 5 families (a group of 1–4 is `few` /
  `hidden`, not a number). If what is shared grows, raise `SHARE_TERMS` and update `shareNote` (three
  languages): families are then asked again before anything new is sent.
- Back office pages (`src/ui/admin/BackOffice.tsx` + `ProductTabs.tsx`, words in `src/i18n/product.ts`):
  Professionals, Administration, Product, Requests, Bugs, Content, Security. A new figure goes to the page
  it belongs to, with a one-line intro kept short. The demo server answers with invented figures
  (`src/lib/demoBackOffice.ts`, flagged `example`). Content is counted from the app's own data files.
- "Help us improve Empower" (`src/ui/admin/WriteTeam.tsx`): six subjects (`FeedbackKind`) plus votes
  (`roadmap`, one vote per account, ideas written by the team in three languages). It is a message sent on
  purpose: it never depends on the sharing switch. Keep the "no personal or medical information" reminder.
- Services and keys: `docs/API-KEYS.md` (keep it up to date when a feature starts needing one).
