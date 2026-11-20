# Project notes

- Expo SDK 58 / React Native 0.88 / TypeScript. Expo APIs change between SDKs: check
  `node_modules/<pkg>/build/*.d.ts` before using an API instead of relying on memory.
- Use `EXPO_OFFLINE=1 npx expo install <pkg>` (the Expo API host may be unreachable).
- Checks before committing: `npm run typecheck` and `npm test`.
- Publishing (owner's decision, November 2026): every finished change goes on the live app without
  asking. Once the checks pass: commit, push the session branch, open a pull request into the
  repository's default branch (`claude/amazing-ptolemy-w798kn`, the one Cloudflare publishes) and merge
  it; Cloudflare rebuilds the web app by itself. If the default branch moved meanwhile, bring it into the
  session branch and run the checks again first. Database migrations (`supabase/migrations`) are not
  published by this: say so when a change needs one.
- No Expo Router on purpose: the app is one surface with a persistent universal bar
  (`src/ui/Root.tsx`); overlays live inside the content area so the bar is always reachable.
- Vocabulary is concept-based (`src/data/concepts.ts`); never move core cells
  (`src/data/defaults.ts`) when editing: positions are the user's motor plan.
- Part of the words shown (levels 1 and 2): outside caregiver mode the main board is drawn without
  holes, each word sliding up in its own column (`compactPlaces` in `src/lib/boardOps.ts`; also print
  and the set-up preview). Display only: never change the stored cells for it. The family can keep
  "Final places" instead (`settings.wordPlaces`); caregiver mode always shows the real places.
- Platform-specific code uses `.web.ts(x)` siblings (media store, printing, preview).
- Sync: an open board looks for others' changes every 30 s with `profileVersion` (one number) and downloads the
  profile only when it is newer (`pull` in `src/state/profileSync.ts`). Never download whole profiles on a timer.
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
- Voice (owner's decisions, November 2026): every voice is the device's own, or a family's recording of a
  word (`overrides[id].audio[lang]`, which always wins). No paid speech service: Microsoft Azure children's
  voices were built and removed the same day; do not add a speech service, a server function for speech or a
  key for one unless asked. The family chooses one of FOUR voices, in every language: Woman, Man, Girl, Boy
  (`voiceOption` / `optionParts` in `src/lib/voices.ts`; Settings → Voice and the set-up), plus the speed.
  "Device voice", the voice height and "a specific voice" were removed from the screens on purpose: do not
  bring them back, and never remove the Girl and Boy voices (the owner was upset when they went).
- How the four are made (`chooseVoice`): voices are told apart by name (Android: by code, `ANDROID_MEN`);
  machine-like and joke voices (`ROBOTIC`) come last. Girl = a woman's voice raised (`CHILD.girl`, the owner
  judged it good: do not change it). Boy = a man's voice raised by 50 % (`boyPitch`: aimed a little above a young
  voice the owner liked, after he asked for "a bit more like a child"), a woman's voice barely raised when
  the device has no man's. Chrome's
  "Google" voices cannot change height: a child's voice prefers another voice of the device. The boy has not
  been confirmed by the owner's ear: change its numbers only with them.
- Vibration: removed on purpose (owner's decision, November 2026): no vibration anywhere (touch, timer,
  dragging) and no switch for it. Do not add `expo-haptics` or `navigator.vibrate` back unless asked.
- With a child's voice (Girl or Boy), "Create a new word" requires a recording in the board's language before
  Save (`PickerPanel`, `t.recordRequired`).
- Settings → Board page (owner's request, November 2026: "tidy, simple words, nothing twice"): ten groups
  closed at first (`Group` in `CaregiverPanels.tsx`): Languages, Words and pictures, Display, Touch, Sentence,
  Voice, Universal bar, Help button, Code and data, About. A new control goes into the group it belongs to,
  with a short label and no explaining sentence unless the choice cannot be understood without one. Nothing
  appears twice: the child lock and the guide are on the bar (not in the settings), the profile's backup is
  on the Account page when there is an account, the menus' language is in Languages (not in a family's
  Account page). The guide's "settings" chapter names the groups; keep its step order (`setupHelp.ts`).
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
  by removing one storage key by hand. Photos and recordings are copied through the account (`src/state/mediaSync.ts`, pure part
  `src/lib/mediaPlan.ts`): same file name on every device and in `profile-media/<profile id>/<name>`; only names
  that pass `isSyncable` travel or become paths. Sent by those who may change the board, received by the whole
  team, photos shrunk before sending; it never blocks the board (waits and retries). Files received from the
  account leave the device with the child's copy (`forgetChild`, `forgetEverything`); files made on the device
  stay at sign-out unless the person ticks erase. The database decides who sends, the kind, the size and the
  quota (`20261118000300_media_sync.sql`, attacks in `supabase/tests/media_scenario.sql`); files of something
  erased are deleted by `caa-purge`; the demo server mirrors it (`LocalBackend.uploadMedia`).
- Demo builds are asked for on purpose: `EXPO_PUBLIC_APP_MODE=demo` (a release build with no server
  address shows "not connected"). Web headers: `public/_headers` (a test checks the policy).
- Caregiver code: `settings.pin === '1234'` means "not chosen yet"; never show or suggest a default code.
  The family chooses it the first time a new board opens, before the guide (`OpenGuideOnStart` in
  `src/ui/Stages.tsx` opens `{ kind: 'pin', then: { kind: 'guide' } }` once the person's rights are
  known), and whenever a code is being chosen the keypad explains what it is (`t.pinWhy`). Never let
  the "choose a code" keypad appear without that explanation. "Forgot the code?" under the keypad: the account's password
  (`checkPassword`) or a code sent to the account's e-mail or phone (`requestPasswordReset`, checked by
  `checkResetCode`, password unchanged) lets the family (or a professional, for her own code) choose a new one; a linked tablet is sent to a parent's device (who: `forgotCodeWays`). Board settings are edited through `useSettingsDraft` (saved on
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
- Two-step sign-in (`src/ui/TwoStep.tsx`, migration `20261118000000_security_2.sql`): offered to everyone in
  My account, required for the back office (`is_admin()` needs "aal2"; `is_team()` only shows the way in). Once
  on, the database shows nothing of the children until the code is typed (`mfa_ok` in `access_of`,
  `owns_profile`, `list_profiles`, and a restrictive rule on every table): a new table with row rules gets that
  restrictive rule too. Sign-in routes to the `twoStep` stage first (`route` in `Session.tsx`).
- What cannot be undone asks a fresh proof, decided by the database (`fresh_proof`: signed in, password, e-mailed
  code or authenticator code in the last 10 minutes; error `proof_needed`): deleting the account or a child's
  profile, a full-access device code, "Download all my data". The screen wraps the call in `useProof(reason)`
  (`src/ui/ProveItsYou.tsx`), which shows the proof in place and tries once more; the keypad's "Forgot the
  code?" uses the same `ProveItsYou`. Never ask the proof in the app only.
- Team members do not read each other's e-mail nor the family's connection code: the app reads the team with
  `list_members` and profiles with explicit columns (`PROFILE_COLS`), never `select('*')` on `profiles` or
  `members` (column rights refuse it).
- The session is kept in the system's secure storage on phones and tablets (`src/lib/deviceVault.ts`, through
  `sessionStore`); the browser keeps its storage.
- A server that cannot answer is "offline", never "signed out" (`serverUnavailable` in `supabase.ts`): only a
  clear "no session" may lead to `forgetEverything`, which erases the child's copy.
- Deleting a child's profile puts it in the family's bin for 30 days (`delete_profile`; `list_bin`,
  `restore_profile`; `ProfileBin`), then the nightly job erases it; the direct table delete is closed. The
  server keeps copies of the board (weekly, before a big change, by hand; 10 per child: `BoardVersions`);
  putting one back keeps the current board first and never changes the family's choices (code, follow-up,
  sharing). Words and activity boards deleted on the board go to the profile's own bin for 30 days
  (`src/lib/wordBin.ts`, `removeCells` / `binBoard`); putting back never moves another word.
- Stored files of something erased (account, profile, document) are deleted by the server (`storage_purge`
  queue, function `caa-purge`, same key as `caa-mail`); the app's own deletions stay "best effort".
- Consent: a family's child profile is created, or a professional's one taken over, only with the parent's
  consent recorded (`give_consent`, `consents`; text and version in `src/lib/consent.ts`, `ConsentBox`). A new
  text: raise `CHILD_DATA_CONSENT` and `consent_version()` together.
- Retention runs every night (`retention_daily`, migration `20261118000500_privacy.sql`): follow-up 24 months
  (sentences 12), history 24 months, notices 12 months, messages to the team 3 years, the team's log 5 years.
  Inactive accounts are only counted (Back office → Security): never delete accounts automatically unless asked.
  The values are in `docs/legal/RETENTION-SCHEDULE.md`; change both together.
- The children's sentences (`usage_days.samples_sealed`) and the observations' texts (`utterance_sealed`,
  `note_sealed`) are sealed with a key in Supabase Vault (`private.seal` / `private.unseal`): read them only through
  `usage_of` and `list_observations`; the app sends an observation's texts each time ('' clears one). A new field
  holding what a child said, or free text about a child, is sealed the same way.
- "Download all my data" (`export_my_data`, `DownloadMyData`) must cover every new table holding a person's or
  their child's data: add it there when a table is created.
- Dictation runs on the device when the language is installed for it (`installedFor`); otherwise the screen says
  Apple's or Google's service hears it (`t.dictateOnline`). Never hide that line.
- Database changes since 18 November 2026 come with a scenario in `supabase/tests/` added to `scripts/test-db.sh`
  and a line in `supabase/check-migrations.sql` (what the owner runs to see which files are still to run);
  the app must keep working before the owner runs a migration (`missingFunction` fallbacks in `supabase.ts`).
- Owner-facing documents: runbooks in `docs/runbooks/`, `docs/ACCESS-LIST.md`, `docs/ARCHITECTURE.md`, legal
  drafts in `docs/legal/` (drafts for a lawyer, never present them as final), store pages in `public/support/`
  and `public/delete-account/` (no script; keep them true when deletion or retention changes). The assessment's
  source is `docs/assessment/` (rebuild with `python3 scripts/assessment/build.py`).
- Choosing without pointing (Settings → Touch, all off by default): switch scanning (`src/lib/scanning.ts`,
  `src/ui/Scanner.tsx`), resting the pointer (`src/lib/dwell.ts`, `src/state/access.tsx`), "Where it first lands"
  (`src/lib/touchChoice.ts`) and "Bigger touch area". The scan never covers the universal bar (the adults' way to
  Settings) and pauses under every panel; it follows the displayed order (`compactPlaces`), never moves a card.
  A folder's name is not said in the spoken preview either.
- Core word places are a release check (`src/__tests__/coreLayout.test.ts`, `fixtures/coreLayout.json`): never
  rewrite the fixture to make a test pass; only `UPDATE_CORE_LAYOUT=1` after a layout validated by the speech
  therapist, said in the commit. `migrate` is checked against `fixtures/oldProfile.json`.
- Links out of the app: on the tablet apps, anything that opens another app or a web page from a screen the child
  reaches goes through `launchApp` / `app.openLink` (`{ kind: 'pin', then: { kind: 'openLink' } }`, `linkNeedsCode`).
  Never call `Linking.openURL` / `openAppUrl` directly there; no switch turns this off (store rules for children's
  apps). The child lock still opens nothing; `freeEdit` and caregiver mode skip the code.
- "Export for another AAC app (.obz)" sits next to the profile export; `obz.ts` uses the stored cells (never
  `compactPlaces`), folders get `load_board` and no `vocalization`, links never travel.
- iOS permission sentences live in `ios.infoPlist` (English) and `locales/{fr,en,ar}.json`; plugins carry none; a
  change is made in the three languages (`permissionTexts.test.ts`). `NoVoiceWarning` treats an empty voice list
  as "unknown" and shows nothing.
- Figures for the team, list 3: "seen" counters (`useSeen`, `src/ui/Seen.tsx`), speed in five steps (`countSpeed`),
  the app version per day; migration `20261118000400_product_more.sql`; `SHARE_TERMS` is 3 (and `product_terms()`).
