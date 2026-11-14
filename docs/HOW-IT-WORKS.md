# How it works — one simple sentence per feature

This file grows as each feature is built. Each line says **what** was made, **how**, in
**which language**, and **which infrastructure** (where it runs).

## The big picture

- **The app** is written in **TypeScript** (JavaScript with types, so mistakes are caught before
  running) using **React Native + Expo**: one code base gives the iPad/iPhone app, the Android app
  and the web demo.
- **The screens** are React components: small functions that describe what to draw from the
  current data; when the data changes, React redraws only what changed.
- **The child's board works without internet**: everything the child needs is saved on the
  tablet itself (AsyncStorage, a small database inside the app).
- **The server** (accounts, team, sharing) is **Supabase**: a ready-made online service that gives
  a **PostgreSQL** database (tables, written in **SQL**), logins, and file storage. We don't run
  our own machine: Supabase hosts it in Europe.
- **Two servers, one contract**: `src/backend/Backend.ts` lists everything the app can ask a
  server. A **demo server** (`local.ts`) fakes it on the device, the **real server**
  (`supabase.ts`) talks to Supabase. `src/backend/index.ts` picks one: the real one if the `.env`
  file gives its address, otherwise the demo. Screens never know the difference.

## Phase 1 — Foundations (data, permissions, server)

| Feature | How it was built |
|---|---|
| Data shapes | `src/backend/types.ts` (TypeScript) describes an account, a child profile, a team member, an invitation, a proposal… like a form template every part of the app must follow. |
| Who can do what | `src/lib/permissions.ts` (TypeScript) gives each role a preset (parent = everything, therapist = can prepare changes, teacher = use only) and sorts any change into "allowed now", "needs the parent's approval" or "not allowed". |
| Core words are protected | The same file marks any change to the core board (the fixed word positions = the child's motor plan) as "always needs approval" unless you are the parent. |
| Proposals, undo, conflicts | `src/lib/profileDiff.ts` (TypeScript) compares two versions of a profile and writes the differences as a list of small changes `{where, before, after}`. That list is a proposal, can be undone (swap before/after), and tells us if two people changed the same thing. |
| Demo server | `src/backend/local.ts` (TypeScript) stores fake accounts, profiles and invitations in the device's storage, one change at a time (a queue), and shows codes on screen instead of sending emails. |
| Real database | `supabase/migrations/…_init.sql` (**SQL**) creates 13 tables in PostgreSQL. |
| Security in the database | **Row-level security** (SQL rules on each table): the database itself checks, for every row, "is this person on this child's team?", so even a modified app cannot read another family's data. |
| Safe actions | Sensitive actions (save a profile, accept an invitation, approve a request…) are **SQL functions** run inside the database: they check the permission, the version number (to avoid overwriting someone's newer work) and the core-word rule in one step. |
| Files | `…_storage.sql` (SQL) creates two private folders in Supabase Storage: diplomas (only their owner) and a child's photos (only the child's team). |
| Logins | Supabase Auth handles passwords (stored scrambled, never readable), one-time codes by e-mail or SMS, Google and Apple; the app talks to it through `supabase-js`, the official TypeScript library. |
| Real server client | `src/backend/supabase.ts` (TypeScript) translates between the app and the database (names, dates, error codes) and calls the safe SQL functions. |
| Security test | `npm run test:db` (a **bash** script) starts a throw-away PostgreSQL on this computer, creates the tables, and plays a story (parent, therapist, teacher, stranger, tablet) checking 34 times that everyone sees and changes only what they should. |
| App tests | `npm test` runs **Jest** (TypeScript tests) on the logic: permissions, changes, the demo server with several people. |
| Secrets | The server address and its public key go in a `.env` file that is never sent to GitHub; the all-powerful "service_role" key is never put in the app. |
| Tablets can't do more than they should | A tablet linked with a code logs in without email ("anonymous"). A **trigger** (a small SQL rule the database runs by itself before saving) refuses anything new coming from such an account: no new profile, invitation, proposal or resource. |
| Live test | `npm run test:live` (TypeScript, **Jest**) uses the app's real connection code against the real Supabase project: a parent, a therapist, a teacher, a stranger and a tablet play the whole story on the internet, then their test accounts delete themselves. It found one real bug (creating a profile was refused), now fixed by a 4th SQL file. |
| Database changes | Each change to the database is a new numbered SQL file in `supabase/migrations/` ("migration"). Files already run on the project are never edited, so every copy of the database can be rebuilt in the same order. |

## Phase 2 — Before the board: welcome, preview, who are you, sign-in

| Feature | How it was built |
|---|---|
| The journey | `src/state/Session.tsx` (TypeScript + **React context**, a shared box every screen can read) remembers who is signed in and which step they are on: welcome → preview → parent/pro → sign-in → board. `src/ui/Stages.tsx` shows the screen of the current step. |
| Remembered on the tablet | The interface language, the last account and the open child are kept in **AsyncStorage** (a small storage space inside the app), so a tablet without Wi-Fi still opens the child's board. |
| Welcome page | `src/ui/start/Welcome.tsx` (React Native): logo drawn in **SVG** (shapes described with code), one sentence, three points, *Continue*. |
| Board preview | The real board is shown with a sample profile and an "on change" that does nothing: everything can be tried, nothing is saved. |
| Parent or professional | `RoleChoice.tsx`: two big cards; the choice is saved with the account and decides the journey. |
| Sign-in | `AuthScreen.tsx`: Apple and Google buttons (drawn following each company's rules), e-mail or phone + password. Supabase Auth checks the password and e-mails the code (sent through the app's own Gmail account, with our template in `supabase/email-templates/`); the demo server shows the code on screen instead. Forgotten password = code + new password. |
| Tablet linked with a code | `PairScreen.tsx`: the 6-digit code from the parent's device links the tablet with a nameless account limited to that child (the database rule from Phase 1). |
| Offline is not "signed out" | When the internet is down, the real-server code answers "offline" instead of "nobody is signed in", so the board stays. |
| Languages of the menus | Each person chooses their own navigation language (FR / EN / عربي at the top). It is kept with their account, not in the child's profile, so a therapist in French and a parent in Arabic can share the same child. Arabic menus read right to left. |
| Errors in plain words | Server error codes (wrong password, expired code, no internet…) are turned into one sentence in the person's language (`src/i18n/account.ts`). |

## Phase 3 — The child's profile and the set-up journey

| Feature | How it was built |
|---|---|
| Questionnaire | `src/ui/onboarding/Onboarding.tsx` (React Native): 12 steps with a progress bar. Answers are saved on the tablet after each step, so closing the app does not lose them. |
| First board adapted to the child | `src/lib/onboarding.ts` (TypeScript, tested with Jest) turns the answers into settings. "Communication today" chooses how many words are shown first (about 25, 60 or 81): hidden words keep their place, so nothing ever moves when more are shown. |
| Languages and voice | Several communication languages (the first is the main one); female / male, adult / child voice with a *Listen* button (the device's text-to-speech). |
| Favourite activities | Chosen from pictures, or typed: a typed activity gets a pictogram from the offline library when one matches. They go in the « mes mots » folder, in free slots only. |
| Presentation | Standard, larger text, or high contrast (dark cards, bright borders), drawn by the card component (`Grid.tsx`). |
| Sounds and animation | Standard, or reduced (no wiggle, no vibration, silent timer; the voice stays). |
| Starting vocabulary | Our core vocabulary, the board already on this tablet (from before accounts), a sibling's board, or a profile file. |
| Access method | Select when the finger lifts, as soon as it touches, or by holding it (0.5–2 s) — handled by the touch events of each card. |
| Try the board | The full app with the chosen settings; *Finish* creates the child's profile on the server. |
| Tailored guide | `src/data/guideTailored.ts` writes a "Your board" chapter from the child's real settings and opens it on the new board. |
| Sync | `src/state/profileSync.ts`: the board works from the copy on the tablet; changes are sent a moment later; if someone else saved in between, both changes are merged (tested with Jest). |

## Phase 4 — Settings in three pages: Board, Team, Account

| Feature | How it was built |
|---|---|
| Three pages | `src/ui/settings/SettingsScreen.tsx` (React Native): tabs *Tableau / Équipe / Compte*; the Team tab shows how many things wait for the parent. In the preview only *Tableau* exists. |
| The child's team | `TeamTab.tsx` asks the server (through the `Backend` contract) for members, invitations, proposals and history, and shows who can do what. |
| Inviting | Name, optional e-mail, role, level (1 Use / 2 Contribute / 3 Edit) and each permission are chosen **before** the invitation exists. The server makes an 8-character code; the parent shares it (phone's share sheet or copy). Only the person who accepts with their own account gets access. |
| Joining | `InvitationsScreen.tsx`: invitations sent to your e-mail appear after sign-up; or type the code. |
| Professionals asking to join | The family code for professionals: a request appears in the Team tab, the parent sets the rights, then accepts or declines. |
| Changing or removing someone | Role, level, permissions, an end date (1 week, 1 month, 3 months); *Remove access* cuts server access at once (the database rule from Phase 1). |
| Proposals | Before / after list with pictures, written in the reader's language (`src/lib/describeOps.ts`). A change touching core words needs an extra confirmation. Approve applies it; *Ask for a change* and *Decline* send a note back. |
| History with undo | Every change that reaches the server is recorded by the sync engine (who, when, what — never what the child said). *Undo* applies the opposite change; if part of it was changed again since, only the rest is undone. |
| Account | Name, sign-in method, password change, sign out; children (open, add another child); devices and sync (this device's state, last sync, last online backup, other devices, remove a lost device, link a new tablet with a 6-digit code); privacy statements and export; delete the child's profile or the account after typing a confirmation word; menu language and notification types; guide and version. |
| Subscription | Shown as "later": billing is deferred, and the child's communication will never be blocked by it. |
| A removed device | When a parent removes a tablet, the next time it opens it is signed out. |

## Phase 5 — The professional side

| Feature | How it was built |
|---|---|
| Verification in 4 steps | `src/ui/pro/Verification.tsx` (React Native): practice → licence or diploma → identity document → status, with a progress bar. Files are picked with `expo-document-picker` and stored in the private Supabase Storage folder `verification-docs` (only their owner and the review team can read them). The status is set by the review team (back-office, later); the demo has buttons to simulate it. |
| Workspace | `src/ui/pro/Workspace.tsx`: a side menu (or a top bar on phones) with Dashboard, My AAC users, Create materials, My library, Collaborations, Learning center, Account & licence. |
| Interactive tour | First visit: "Welcome to your Professional Workspace!" with *Launch the guide* or *Maybe later*. The tour moves through each section with *Skip* / *Next*; it is remembered in the account preferences and can be replayed with *Help*. One-time tips appear in three sections. |
| Connecting to a child | The professional types the family's code, picks a role and the rights they ask for, and sends a request; or accepts an invitation. No child is visible before the family agrees (enforced by the database). |
| Working on a child's board | `SandboxBoard.tsx`: the professional opens the child's real board, but every change stays in a **draft**. *Send for approval* compares the draft with the child's profile (`profileDiff.ts`) and sorts each change with the family's rules (`permissions.ts`): applied directly (editing rights), sent as a proposal, or not allowed. Core-word positions always go through the family. |
| Revisions | When the family asks for a change, *Resume* reopens the draft with the proposal; sending again updates the same proposal. |
| Materials | `src/lib/resources.ts` (TypeScript, tested): a material is a small piece of a profile. A TLA or schedule is made in a "sandbox" profile with the normal editors, then taken back out. First–Then, timers and picture cards (from words or photos, printable) have small forms. |
| Library | My templates (no child's data), Shared with me, and each child's materials; duplicate, personalise for a child (a copy, the template stays unchanged), share with a colleague or a child's team (view / edit), propose to a child's profile (the family decides), export, delete. |
| Learning center | Opens a demonstration board (nothing saved) directly on a tutorial: search ("Show me where"), the guide, modelling, a new TLA, access settings, languages. |
| Account & licence | Verified status ("free access"), connected users, credentials, account details, preferences; billing stays for later. |
| Tested | A browser walkthrough plays the whole story: a parent creates a child, a therapist signs up, verifies, connects with the family code, the parent accepts, the therapist drafts a new TLA and sends it, the parent reviews and approves, and the TLA appears on the child's board. |

## Round 7 — Lock mode, timer, week and month plans

| Feature | How it was built |
|---|---|
| Child lock | Settings → Board → Child lock, remembered **per device** (the parent's phone stays free). On the child's device: the Android back button is ignored (`BackHandler`), other apps no longer open from a picture, the screen stays on (`expo-keep-awake`), the status bar is hidden; in a browser the page goes full screen and asks before closing (`src/lib/childLock(.web).ts`). No app can block the iPad's Home gesture by itself: Apple reserves that for **Guided Access** (Android: **screen pinning**); the same section explains how to turn them on. |
| Timer that hides nothing | The timer is now a strip above the board (`TimerCard.tsx`, placed in the page layout instead of floating on top): the board measures the space left and its cards get a little smaller. |
| Picture of what the child waits for | The timer remembers a word (`timer.concept` in `AppState.tsx`), shown next to it; touching it says the word, and « C’est fini ! piscine » is said at the end. A schedule step's timer uses that step's picture. |
| Week and month plans | `src/ui/screens/PlansViews.tsx` (React Native): seven columns Monday–Sunday, and a month calendar (`src/data/calendar.ts` builds the weeks; Lebanese month names in Arabic). They are optional (`settings.plans`), chosen at set-up or in Settings. They are stored in the child's profile and added to the change sets (`profileDiff.ts`: one change per weekday or per event), so they sync, merge, can be proposed by a professional, and appear in the history with undo — tested with Jest. |

*(This round also completed the ARASAAC library and added its logo. ARASAAC did not authorise
commercial use, so both were removed in Round 9 below.)*

## Round 8 — Communication data (Suivi), quick gestures, Photo → activity board

| Feature | How it was built |
|---|---|
| Consent first | A setting `dataCollection` in the child's profile: off (default) / use / use + words / use + words + sentences. Asked during set-up with nothing pre-chosen (no answer = off), changed in Settings → Suivi by the parent only (the permission check in `src/lib/permissions.ts` refuses it from anyone else). Anonymous statistics are a second, separate yes/no (`shareStats`, off by default). |
| Recording | `src/state/usageTracker.ts` (TypeScript) receives small events from the board (word touched, sentence spoken, page opened, search, keyboard) and keeps one summary per day and per device: sessions (a new one after 5 minutes without a touch), active time, hours, pages, places, offline time, errors. Words are kept only at the "words" level, sentences only at the "sentences" level. Nothing is recorded while an adult edits the board or a demonstration plays. |
| Storage | Days stay on the tablet (120 days, for offline viewing) and are sent once a minute to a new table `usage_days` (**SQL**, `…_usage_data.sql`). A database function `save_usage_day` removes anything the consent does not allow before saving, and refuses everything when the follow-up is off — so even a modified app cannot store more. |
| Who sees it | Row-level security: the parent, a team manager, and members the parent gave "See the progress data" (`viewData`). Everyone else, including other professionals of the team, sees nothing (checked by `npm run test:db`). |
| The four domains | `src/lib/analytics.ts` (TypeScript, 13 Jest tests) turns the days into: **use** (days, sessions per day/week, session length, active time, morning/midday/afternoon/evening/night, pages, activity boards opened/created, devices, breaks, offline time, errors), **vocabulary** (each word's count, different words, new words, words used on several days, core vs specific, word categories, words added for the child, searches), **language** (lengths 1/2/3+, mean length, combinations, meaning relations such as agent-action or action-object, structures, pronouns, verbs, negation, questions, connectors, telling), **functions** (the 19 functions of the specification, guessed from the sentence's words by simple rules, plus the adults' observations, which always win). |
| Observations | A table `observations` (SQL): when, what the child said or did, function, context, partner, autonomy, result, note, author. Written by parents and allowed professionals (never from the child's tablet). Select several to export them as a spreadsheet file (**CSV**) or give them a common context. A recorded sentence can be annotated in one tap. |
| The Suivi page | `src/ui/data/DataDashboard.tsx` (React Native): period 7 days / 30 days / 3 months, tabs Use / Vocabulary / Language / Functions / Observations. Charts are drawn with plain views (`src/ui/data/Charts.tsx`): number tiles, a column per day (tap to read a day, or switch to a table), bars with the value at the tip, a split bar for core / specific; one blue for single series, blue + orange for two, checked for colour-blind safety. *Export (CSV)* writes the whole period. Parents: Settings → Suivi; professionals: their workspace → the child → *See the progress data*. |
| Us (the company) | A database **view** `research_usage` gives anonymous daily numbers (scrambled child id, age, sessions, active minutes, touches, sentence lengths, places, hours — no name, no words, no sentences) only for families who said yes to anonymous statistics. The app cannot read it; we open it in the Supabase dashboard (Table Editor or SQL Editor) until the back-office exists. |
| Erasing | Turning the follow-up off erases what the tablet kept; *Erase the recorded data* deletes every day on the server (a database rule allows it only to the family or a manager). |
| Double tap (caregiver mode) | `src/ui/Grid.tsx` waits 0.32 s after a tap: a second tap opens the card's menu (`src/ui/panels/EditMenus.tsx`): edit, replace the picture, record the pronunciation, add to favourites (the « mes mots » folder), duplicate, select several, delete. On an activity board tab: edit the title, duplicate, share, print. |
| Long press and slide (caregiver mode) | `src/ui/Grid.tsx` (React Native): a long press "arms" the card, then a **PanResponder** (React Native's tool to follow a finger) moves it with the finger; on release `moveCell` puts it in the slot under it (two cards swap) and an *Undo* button shows for 7 seconds. Near the left or right edge a wide board scrolls by itself. In a browser, a small listener stops the page from scrolling during the drag and hides the browser's long-press menu. Released without sliding, the long press still opens the card. |
| Sharing an activity board | Send it to someone with an account (it becomes a shared item in their library) or save it as a small file (**JSON**) to send by message; *New activity board → Import a file* (or *Shared with me*) adds it to another child without replacing anything. |
| Multi-selection | A selection bar: copy / paste into empty slots, size 60/80/100 %, send to an activity board, print as picture cards, delete. Cards taken from the main board are copied, never moved (the motor plan stays). A full activity board or folder grows by one row (up to 8). Logic in `src/lib/cellActions.ts`, 6 Jest tests. |
| Folder peek (use mode) | A long press on a folder shows its 6 most requested words (from this tablet's recorded days, if the family allows words), or its first words; touching one says it without opening the folder. A slow touch on a word now says it instead of doing nothing. |
| Photo → activity board | *New activity board → Create from a photo*: the photo is made smaller and kept in memory only; Claude (Anthropic's AI) lists what it sees that is useful (e.g. a menu's dishes) plus words to act, comment, ask, refuse and say preferences. The proposal goes through the same screen as the topic suggestions: remove or add words, then *Create*. |
| AI on phones and tablets | `supabase/functions/caa-ai` (TypeScript for **Deno**, a Supabase **Edge Function** — a small program that runs on Supabase's servers): it checks the person is signed in, counts their calls (40 a day, table `ai_calls`), sends only the topic, photo or drawing to Claude (model `claude-opus-5-5`, answers forced into the expected **JSON** shape), and returns the words. The Anthropic key is a Supabase secret, never inside the app. The prompts are shared with the browser demo (`supabase/functions/_shared/aiPrompts.ts`). |

## Round 9 — A pictogram library that can be sold (no more ARASAAC)

ARASAAC did not allow commercial use, so every ARASAAC pictogram was removed and replaced by ten
open libraries whose licence allows a paid app. Full report: `docs/PICTOGRAM-LICENSES.md`.

| Feature | How it was built |
|---|---|
| Licence check first | Before downloading anything, each library's licence was read at its official source (its own website or GitHub repository). Result: 10 libraries accepted, ARASAAC, Tawasol (its website contradicts itself), Sclera and others refused. Written in **Markdown** in `docs/PICTOGRAM-LICENSES.md`. |
| The list of libraries | `pictograms/libraries.json` (**JSON**, a simple text list): name, author, website, exact version, licence, copyright line and attribution sentence of each library. Everything else is generated from this file. |
| Downloading the originals | `scripts/fetch-pictogram-sources.sh` (**Bash**, a command-line script): downloads each library from its official source at a fixed version (npm packages and Git commits), into a folder next to the project. Originals are never changed. |
| Building the library | `scripts/build-pictograms.ts` (**TypeScript**, run with Node.js on the computer, not in the app): reads the 10 libraries, turns each SVG drawing into a small 160-pixel **WebP** image with the **sharp** tool, and packs them in 161 text files. 24,128 pictograms, 61 MB (ARASAAC was 81 MB). Company logos and skin-tone duplicates are left out. |
| One database | The same script writes `pictograms/database/pictograms.csv` (a spreadsheet file): one line per pictogram with its id, library, original file name, original label, concept, English / French / Arabic words, licence, author, links, attribution and whether it was modified (never). |
| Same idea, several drawings | Each pictogram gets a **concept** (its English name, normalised). 3,525 concepts have several drawings, so a search shows the Mulberry symbol, the emoji and the line icons side by side. |
| Three languages | Emoji words come from **Unicode CLDR** (Unicode's official word lists in French, English and Arabic). The app's own vocabulary and two word lists written for the project (`pictograms/translations/*.tsv`, tab-separated text) add French and Arabic to the other libraries. A word added automatically is marked "to review" (`*` in the app); an English word with several meanings is marked ambiguous instead of being translated blindly. |
| Pictures of the built-in words | `scripts/build-default-symbols.ts` (TypeScript) chooses one picture for each of the app's 254 words: the Mulberry symbol with the same name, else a choice made by hand (`pictograms/default-overrides.json`), else the OpenMoji emoji. Stored as 256-pixel images in `assets/symbols/`, bundled in the app so the board works offline. |
| In the app | A pictogram is now identified by a stable name such as `mulberry/apple` (`SymbolRef` in `src/model/types.ts`) instead of an ARASAAC number. `src/ui/SymbolView.tsx` (React Native) draws it; `src/lib/pictoSearch.ts` (TypeScript, tested) searches the three languages at once. |
| Choosing a picture | `src/ui/PictoPicker.tsx` (React Native): search box, one chip per library to filter (All, Mulberry, OpenMoji…), and under each result the word found and the library it comes from. The source and licence are saved with the word. Everything works offline. |
| Credits & licences page | `src/ui/PictoCredits.tsx` (React Native), opened from **Settings → About**, the welcome page, the guide and the professional workspace. It lists only the libraries really in the app, with author, website, licence and link, copyright line, attribution, "not modified", and the full licence text where the licence asks for it. The list is generated by the build script (`src/data/pictoLibraries.ts`), so it updates by itself when a library is added or removed. Available in French, English and Arabic. |
| Printed boards | `src/lib/printHtml.ts` adds a short credit line at the bottom of every printed page. |
| Pictures from the internet | The online search (`src/lib/webPictures.ts`) now only shows collections whose licence was verified (Mulberry, OpenMoji). |
| Old boards | When an older profile is opened, `migrate` in `src/lib/storage.ts` sends words that pointed to an ARASAAC pictogram back to the app's own picture; photos and personal pictures are kept. |
| Tested | 14 new Jest tests: only verified libraries and licences, no logo, the same symbol found with « manger », "eat" and « يأكل », the library filter, the "to review" marks, the credits list matching what is really in the app, licence texts present, old profiles converted. A browser walkthrough checked the board, the picker and the credits page (no request leaves the device). |

Infrastructure: nothing new on the server. The whole library is inside the app (offline); Supabase
is not involved. `sharp` is only a development tool (it is not shipped in the app).

## Round 10 — Small fixes after testing on a phone

| Feature | How it was built |
|---|---|
| Language button removed from the bar | The globe button was taken out of `src/ui/UniversalBar.tsx`. Languages are chosen in Settings (caregiver mode): *Communication language* and *Navigation language*. Consequence: the child can no longer change language alone. |
| Keyboard → pictograms | `src/lib/typedWords.ts` (TypeScript, 8 Jest tests): each typed word becomes a card with a picture — the word of the child's boards when it exists (« veux » → vouloir, « brosse à dents » on one card, « l'école » → école), else a pictogram of the offline library, else no picture (little words such as « une »). The card keeps exactly what was typed and is said as written. The keyboard panel shows the cards before they are added. Words kept away from children (alcohol…) never get a picture. |
| Guide brought up to date | `src/data/guide.ts` (TypeScript text in French, English and Arabic): two new chapters (*Where the pictograms come from*, *Professionals: proposing changes*) and updated ones (settings pages, languages in Settings, keyboard pictures, new-board options, week and month plans, picture sources, printing). A Jest test checks that the guide quotes the real names of the buttons, so it cannot drift silently. |
| New board always visible | The *New board* button of the boards page (`src/ui/screens/TlaScreen.tsx`) is now shown all the time. Outside caregiver mode it first asks for the caregiver code, then opens the creation panel (the code panel takes a `then` step, `src/state/AppState.tsx`). Before, it only appeared once caregiver mode was on. |
| Schedule on a phone | `src/ui/screens/ScheduleScreen.tsx`: the *Now* and *Next* cards measure the room they have (React Native `onLayout`) and size the picture and the word to fit, so nothing overlaps; on a short screen the day plan scrolls instead of squeezing. |
| Progress page in the preview | Settings shows Board, Team, Progress and Account even before an account exists; the last three explain what they will hold and offer *Create my account*. |
| Phone width | On a narrow screen the *New board* button keeps only its « + » so the board tabs stay visible, and the caregiver banner no longer cuts its *Done* button. |

## Round 11 — Arabic dialects (for the Middle East), or no Arabic

Arabic is not the same in Beirut, Cairo or Riyadh, so the family now chooses which Arabic the
app uses — or none.

| Feature | How it was built |
|---|---|
| The question at set-up | A new step in `src/ui/onboarding/Onboarding.tsx` (React Native), right after the child's name: Lebanese, Syrian, Jordanian / Palestinian, Egyptian, Saudi, Gulf, Iraqi, Modern Standard Arabic, or **None**. Nothing is chosen in advance and the family cannot continue without answering. The answer is saved in the child's profile as `settings.arabic` (`src/model/types.ts`). |
| The words of each dialect | `src/data/dialectWords.ts` (TypeScript, data only): for each dialect, only the words that differ from the Lebanese list — Syrian 17, Jordanian / Palestinian 43, Egyptian 117, Saudi 112, Gulf 113, Iraqi 123, Standard Arabic 182 (of 254 words). A word can have a masculine and a feminine form (« عايز / عايزة »). **First version: each list must be checked by a native speaker of that country.** |
| How the board changes | `conceptsFor(dialect)` in `src/data/dialects.ts` gives the vocabulary with its Arabic words in the chosen dialect, and `getConcept` in `src/lib/lexicon.ts` uses it — so the board, the sentence, the search, the keyboard and the printed pages all follow, with no other change. Words never move: only what is written and said changes. Words the family typed themselves stay as they are. |
| "None" | `availableLangs` (`src/lib/lexicon.ts`) removes Arabic from the child's languages: it disappears from the language choices, from the label fields of a word, from the recorded voice, the voice settings, the Help message and the word search. Menus in Arabic (the navigation language) remain a separate choice. |
| Changing it later | Settings → Board → Communication → *Arabic used in the app* (`src/ui/panels/CaregiverPanels.tsx`). The change appears in the team's history like any other setting. |
| The voice | Tablets rarely have a voice per dialect. `src/lib/voices.ts` picks the device voice of the same country when there is one (for example an Egyptian voice), otherwise the standard Arabic voice. For a real dialect accent, the recorded voice (word editor) stays the best. Speech recognition asks for the same country on Android and in browsers. |
| Calendar | `src/data/calendar.ts`: كانون الثاني، شباط… for the Levant and Iraq, يناير، فبراير… for Egypt, Saudi Arabia, the Gulf and Standard Arabic. |
| AI suggestions | The prompts (`supabase/functions/_shared/aiPrompts.ts`) ask for the chosen Arabic, or for no Arabic. The app only sends a short code (`eg`, `sa`…), never free text. The server function must be deployed again for this (`supabase functions deploy caa-ai`). |
| Finding pictures | The pictogram library's search index now contains every dialect's word for the app's vocabulary (`npm run build:picto`), so « أبغى », « عايز », « أريد » and « بدّي » all find the "want" pictogram. |
| Tested | 12 Jest tests (`src/__tests__/dialects.test.ts`): the words per dialect and gender, "none", the set-up answer, old profiles (they stay Lebanese), months, AI prompts, voices, search. A browser walkthrough: Saudi → « أبغى », then Egyptian → « عايز », then None → no Arabic left. |

Infrastructure: nothing new in the database (the choice is one more setting inside the profile).

## Round 12 — Dialect voices (so the app does not speak every dialect with one standard accent)

Tablets ship one Arabic voice (Standard Arabic). Recording each dialect ourselves is not possible,
so the clips are generated once by a speech service and shipped inside the app.

| Feature | How it was built |
|---|---|
| Which service | Microsoft **Azure AI Speech**: the only one found with a synthetic voice per Arab country (Lebanon, Syria, Jordan, Egypt, Saudi Arabia, Iraq, Kuwait…). Amazon has Gulf and Standard Arabic only; Google has Standard Arabic only. |
| Generating the clips | `scripts/build-voice-packs.ts` (**TypeScript**, run on a computer with `npm run build:voices`): asks the service which voices exist, picks a woman's and a man's voice for each dialect, and has every Arabic word of the built-in vocabulary said once (about 270 words per dialect, 21,500 characters in total). Only the app's own word list is sent — nothing about any child. `--dry` shows the numbers without sending anything, `--sample 20` makes a few MP3 files to listen to first. |
| Where the clips live | `assets/voice/<dialect>.<f|m>.pack` (the **MP3** clips one after the other, stored as text like the pictogram packs) and `src/data/voicePackIndex.ts` (which word is where, and the voice's name). Inside the app: no internet needed to speak. |
| Playing them | `src/lib/dialectVoice.ts` (TypeScript, 6 Jest tests) decides, for each Arabic word, whether the dialect pack has it; `src/lib/speech.ts` then plays the clip (`expo-audio`) instead of asking the tablet's voice. Woman / man follows Settings → Voice; the child voice plays the clip slightly faster and higher. |
| What is not covered | Words the family adds, typed text and anything not in the pack keep the tablet's standard voice — in one sentence the two voices can follow each other. A word the family recorded themselves always comes first. |
| Turning it off | Settings → Voice → *Dialect voice for the Arabic words of the board* (shown only when a pack exists for the family's dialect). |
| Telling people | Settings → About says the dialect voices are synthetic and which service made them. |
| State today | **Decided not to use them (November 2026).** 320 sample clips were generated and a native speaker listened: the dialect voices were judged bad. No pack is shipped, so the app speaks Arabic with the device's standard Arabic voice whatever the dialect (the dialect still changes the *words*). The generator and the playing code stay in the project, switched off by the empty index, in case better voices appear. |

To generate the packs (once, then again only when words change):

1. Create an Azure account and an **AI Speech** resource on the **paid** tier ("Standard S0"). The free
   tier does not give the right to ship the audio in a product. The cost is tiny: about 21,500
   characters, billed per million.
2. In your own terminal (never in a file, never in a chat): `export AZURE_SPEECH_KEY=…` and
   `export AZURE_SPEECH_REGION=…` (for example `westeurope`).
3. `npm run build:voices -- --sample 20`, and have a native speaker of each dialect listen to the
   files in `voice-samples/`. Drop a dialect whose voice reads the words badly (`--only eg,sa`).
4. `npm run build:voices`, then commit the new files in `assets/voice/` and `src/data/`.

Before selling: ask Microsoft in writing that audio generated with a paid Speech resource may be
shipped inside a paid app and used offline (their public answers say commercial use needs the paid
tier, but none covers bundled audio precisely).

## Round 13 — The back office (our own side of the app)

The back office is where **we** (the app's team) accept the therapists and read the figures that help
improve the app. It is not a second program: it is a hidden page inside the same app, opened only for
the accounts the database lists as "team".

| Feature | How it was built |
|---|---|
| Who gets in | A table `admins` in the database (**SQL**, `supabase/migrations/20261113000000_backoffice.sql`). It is filled by hand in Supabase's SQL editor, never from the app. A function `is_admin()` answers "is the signed-in person in that table?", and every back-office function starts by asking it. Hiding the page is not the lock: the database itself refuses everybody else. |
| Where it is | `src/ui/admin/BackOffice.tsx` (**TypeScript + React Native**, the same code on tablet, phone and web). After sign-in, `src/state/Session.tsx` asks the server `is_admin()`; if yes the person lands on the back office, with a button *Open the app* to use the app normally, and a button *Open the back office* in their account page to come back. |
| The team looks at the app | *Open the app* never asks the set-up questions: the first time, a ready-made test profile ("Test") is created for that team account and the board opens at once. It is a normal profile: it can be renamed or deleted in Settings → Account, and it is counted as one child in the figures. |
| Certificates | The list shows every request sent, the ones waiting first. Opening one shows who it is and the files sent. **Accept** sets the request to "verified": from that second the therapist can join a child's team. **Ask for more information** and **Refuse** need a message that the therapist reads. All of this is one database function, `admin_decide_verification`. |
| "She can start working" is a real lock | Two database **triggers** (small rules the database runs by itself before saving) refuse a professional account that is not accepted when it tries to join a team or to ask a family for a connection (error `pro_not_verified`, shown as a sentence). If an acceptance is withdrawn later, the access is suspended, not erased: accepting again gives it back. |
| Looking at a certificate | The files stay in the private storage folder `verification-docs`. A storage rule lets the team read them; the app asks for an address that stops working after 5 minutes. Just before, `admin_open_document` writes who opened which file in the history. |
| The identity document is deleted | The therapist is told at sign-up that her identity document is deleted once the check is done. So when a request is accepted or refused, the back office deletes that file and removes it from the request. |
| The therapist is told | A notification is written in the language she chose for the menus (French, English or Arabic): accepted, something missing, or refused, with our message. |
| Figures: Overview | One database function, `admin_overview`, returns every number at once as **JSON** (a text format for data). Counts only: accounts and new accounts per week, where families stop (account → child profile → linked device → use this week), devices by system and by **version of the app** (devices now tell their version, so we know when an old version can be dropped), therapists by state / profession / country and how long we take to decide, teamwork (invitations, proposals, materials), and AI calls per day (cost). |
| Figures: Use of the app | Only the families who turned on *share anonymous statistics*. Minutes and touches per day, sentence length, where the child touches (main board, folders, activity boards…), hours of the day, by age group, and how these families set the app up (Arabic dialect, languages, options). **Never a name, a word or a sentence.** |
| Nobody can be recognised | The use figures appear only from **5 children** up, and an age group only with 5 children or more. Below that the page just says how many families share. The consent sentence in the app now also mentions "the settings chosen, such as the language". |
| Messages | New: *Account → Write to the team* (idea / problem / other) for families and professionals. Stored in a table `feedback`, read only in the back office, where a message can be marked as dealt with. Limited to 10 messages a day per account. |
| History | A table `admin_log`: every decision and every certificate opened, with who and when. The app has no way to erase it. |
| Charts | The same small chart pieces as the Suivi pages (`src/ui/data/Charts.tsx`): no chart library. |
| Demo | The demo has no real users, so *Back office (demonstration)* on the first screen opens it with **invented** therapists and example figures, and says so in a banner. A request really sent on that device by a professional account appears there too, so the whole path can be tried: send a certificate → accept it → the therapist can work. |
| Tests | 63 database checks (`npm run test:db`): nobody outside the team reads or decides anything, the lock on professionals, the identity document, figures hidden under 5 children, a family that did not agree is never counted. 3 new Jest tests on the demo server and one browser walkthrough of the whole path. |

To use it on the real server: run the new migration, then add yourself to the team
(`supabase/README.md`, section 8).

**Guide checked again after this round.** Every button and setting name of the screens was compared
with the guide's text by a small script; what was missing was added in French, English and Arabic
(`src/data/guide.ts`, now 30 chapters): *Your account, children and devices*, *Professionals: your
workspace* (verification, connecting to a family, sharing materials, collaborations), ending or
removing someone's access in *The child's team*, and the optional anonymous statistics in *Data and
privacy*. The back office is not in the guide on purpose: it is for our team only. The guide test now
checks 23 more button names in the three languages.

**Where the real app can be opened in a browser.** The web version is the same code turned into a
folder of plain files (`npm run build:web`, output in `dist`: one **HTML** page, one **JavaScript**
file and the pictogram packs). A hosting service (Cloudflare) can rebuild and publish that folder
each time the code changes on GitHub; `wrangler.jsonc` is its settings file. The page talks straight
to Supabase, so the hosting service stores no data and holds no secret.

## Round 14 — Voices: standard Arabic, a better man's voice, your own recordings

| Feature | How it was built |
|---|---|
| Arabic voice | `src/lib/speech.ts` no longer asks for the voice of the family's country: Arabic is always read by the device's standard Arabic voice. Choosing a dialect only changes the words (`src/data/dialectWords.ts`). |
| A man's voice that sounds like a man | Devices do not say whether a voice is a man's or a woman's, so the app recognises voices by their names (`src/lib/voices.ts`, **TypeScript**). Among a man's voices it used to take the first by alphabetical order, and on Apple devices that was "Eddy" or "Albert": machine-like or joke voices. They are now put last (a list of about 30 such names), natural voices first ("Enhanced", "Premium", Microsoft "Natural"), then the right country. Result on an iPad: "Thomas" in French, "Daniel" in English. |
| When the device has no man's voice | The default voice is played lower. For French and English the pitch went from 0.8 to 0.7 (clearly lower); Arabic and a boy's voice did not change. Settings → Voice → *Voice used* says "approximate voice" in that case: installing a man's voice in the device's own settings is the real fix. |
| Your own recording of a word | Already there, for each language: the word editor has *Recorded voice* with one recording per language (stored in the profile as `audio.fr / audio.en / audio.ar`), and tapping a card twice offers *Record the pronunciation*. New: a tick shows which languages already have a recording, and a line says what the recording does. The recording replaces the device's voice whenever the word is touched or said in a sentence, except when grammar changes the word's form. |
| Limit | A recording stays on the device where it was made (like photos): it is not yet copied to the family's other devices. |
| Tests | 4 new Jest tests on the choice of voice (169 → 173). Nobody has listened to the result yet: a program cannot hear. |

## Round 15 — Accessibility check (WCAG 2.2 level AA)

The full report is in `docs/ACCESSIBILITY.md`. In short:

| What | How it was done |
|---|---|
| The scan | A program, **axe-core**, reads each screen like an assistive tool would and lists what breaks a WCAG rule. **Playwright** (a browser driven by a script, **JavaScript**) opens 43 screens at four sizes and in Arabic: `scripts/a11y/`, run with `npm run test:a11y`. |
| Main finding | The app told screen readers "this switch is on" the React Native way (`accessibilityState`). The web layer (react-native-web) ignores that and wants `aria-checked`. So in a browser no switch, tab or choice said its state. `src/ui/a11y.ts` (**TypeScript**) now gives both. |
| Keyboard | Panels are real dialogs in a browser (`useDialog` in `src/ui/common.tsx`): the focus goes in, Escape closes, the board behind is set aside with the browser's `inert` attribute, and the focus comes back afterwards. |
| Colours | Nine colour pairs were under the contrast rule. The blue, red and green are a little darker; fields and switches have a darker edge. A Jest test computes the contrast of 22 pairs and fails if one drops. |
| Languages | The page declares the language of the menus; each card of the board declares the language of its word, so a screen reader pronounces Arabic words as Arabic even with English menus. |
| Not done | Listening with a real screen reader, and any test on a tablet. A program finds roughly a third of accessibility problems; the rest needs people. |

## Round 16 — One magnifying glass instead of three buttons

Search, Keyboard and Model were three buttons of the bar. They are now one button (the magnifying glass)
that opens one panel with three tabs. Nothing was removed.

| What | How it was done |
|---|---|
| One panel, three tabs | `src/ui/panels/ToolsPanel.tsx` (**React Native**, **TypeScript**) draws the window, its title and the three tabs. The content of each tab is the same code as before: `SearchBody` and `KeyboardBody` in `CommPanels.tsx`, `ModelBody` in `ModelPanel.tsx`. Only the frame around them changed. |
| Which tab is open | The app already remembered "which panel is open" as one of three words: `search`, `keyboard`, `model`. Those words are kept. So the guide's "Try it" buttons and the therapist's shortcuts still open the right tab, without changing them. |
| The bar | `src/ui/UniversalBar.tsx` now lists three tools (Search, Guide, Caregiver) instead of five. With fewer buttons their names fit on shorter screens too. While a demonstration is being recorded, the magnifying glass opens directly on the Model tab. |
| The guide | `src/data/guide.ts`: the chapters about the screen, search, the keyboard and modelling now say "Search (the magnifying glass), then the tab", in French, English and Arabic. |

## Round 17 — Security review

The full story, the list of what you must do yourself and what is still open are in
`docs/SECURITY.md`. In short:

| What | How it was done |
|---|---|
| The review | Two separate readings (one of the database rules, one of the app's code), plus trying the real server as a stranger. Every finding was confirmed before being fixed: read in the code, or replayed on a throw-away copy of the database. |
| Database fixes | One new file, `supabase/migrations/20261114000000_security.sql` (**SQL**, PostgreSQL). It replaces the functions that trusted what the app sent (rights in an invitation, the type of an account, the code of a tablet) by versions that decide themselves, and uses "column permissions": the app may write a profile's name but not its owner, a request's text but not its status. |
| Limits | A small table, `rate_log`, notes who did what recently. A function refuses when someone repeats an action too often (5 wrong codes in 15 minutes, 30 invitations a day…). |
| Guards in the app | `src/lib/safety.ts` (**TypeScript**): one place that decides what a link may be (https or a known app), cleans identifiers, numbers and file names. Every profile that enters the app goes through it (`migrate` in `src/lib/storage.ts`). |
| Leaving a device | `src/lib/deviceData.ts`: signing out first sends what is not sent, then erases the children's copies, and remembers they were erased so an open board cannot write them back. |
| Caregiver code | `PinPanel` in `src/ui/panels/CommPanels.tsx` counts wrong tries on the device (30 s, then 1, 2 and 5 minutes) and makes the family choose its own code the first time. |
| Website | `public/_headers`: a text file that Cloudflare reads and turns into "browser protections" (a Content-Security-Policy and a few others). Expo copies the `public` folder into the built site. |
| Tests | `supabase/tests/security_scenario.sql` plays each attack and expects a refusal; `src/__tests__/security.test.ts` does the same for the app's guards. |

## Round 18 — Ten requests after testing on an iPad

| What | How it was done |
|---|---|
| Caregiver code | `PinPanel` (`src/ui/panels/CommPanels.tsx`): a new profile starts with the value 1234, which now only means "not chosen yet". The first time, the panel opens directly on "choose your code" (typed twice); 1234 and codes like 0000 are refused. |
| Select mode | `src/ui/Grid.tsx` and `SelectionBar` (`src/ui/panels/EditMenus.tsx`): a + case opens the word picker even while cards are being selected; the bin now works on the main board (it asks to confirm there); "Deselect all" was added. |
| Sequences | The step lists of the Schedule screen are called sequences. "New sequence" (`src/ui/panels/NewSequencePanel.tsx`) asks for a topic and proposes the steps with the same planner as a new board (`src/lib/tlaPlanner.ts`: situation library first, the AI helper if allowed). |
| Hold and slide | `src/ui/Reorderable.tsx` (**React Native**: `PanResponder` + `Animated`): a long press picks a step up, sliding shows where it will land, letting go moves it. Two small arrows do the same for people who cannot hold and slide. Used for the steps of a new board and of a new sequence. |
| Week and month | Called "schedule" instead of "plan" in English, and their two switches sit under "Schedule" in Settings → Universal bar (no separate "Plans" section, which could be mistaken for subscription plans). |
| Settings: Save | `useSettingsDraft` (`src/ui/panels/CaregiverPanels.tsx`): the page works on a copy of the settings. "Save" writes the copy into the profile, "Cancel changes" throws it away, and closing with changes waiting asks what to do. The bar with these buttons stays at the bottom of the window (`footer` of `Panel`). |
| Child voices | `src/lib/voices.ts`: tablets have no children's voices, and a man's voice made higher still sounds like a man. A boy's and a girl's voice now both start from a woman's voice, raised a little (the boy's less). "Voice height" in Settings lets the family tune any voice by ear. |
| AI on the website | `src/lib/aiPlanner.web.ts`: outside the online demo, the website now asks the app's own server function, like tablets do. One key (see `docs/API-KEYS.md`) then turns the AI on everywhere. |

## How everything is checked

| Check | What it does |
|---|---|
| `npm run typecheck` | TypeScript reads the whole code and refuses mistakes such as a missing field or a wrong type. |
| `npm test` | 191 automatic tests (Jest): grammar, search, permissions, change sets, demo server, sync and merges, set-up answers, materials, guide, communication data and consent, the four domains, card actions, the pictogram library and its licences, the back office, colour contrast. |
| `npm run test:db` | The database and its security rules on a throw-away PostgreSQL: a parent, a therapist, a teacher, a stranger, a tablet and a member of our team; then every attack found by the security review, which must fail; 95 checks. |
| `npm run test:live` | The same story on a second, empty Supabase project (never the one families use), through the app's own code: 13 steps, including devices, history undo, invitation codes, revisions and materials (needs "Confirm email" off while it runs). Last full run: before the back office (all 13 passed); **to run again once the back-office migration is on the real project**. |
| `npm run test:a11y` | Accessibility: 158 scans of 43 screens against WCAG 2.2 AA (four sizes, Arabic), then a keyboard-only run. Last run: 0 rule break. |
| Browser walkthroughs | Playwright drives the web version like a person: the parent journey, the team (invite, undo, join with a code), the professional journey (verification, tour, request, draft, proposal, approval), and the Arabic screens. |

## Not done yet (honest list)

- **Billing** (deferred).
- **Back office**: built and tested on a local database, but **not yet run on the real Supabase
  project** (the new migration must be run there, and an account added to `admins`). It lives inside
  the app, so opening it on a computer needs the app's web version online (the repository is ready
  for Cloudflare, see `supabase/README.md`; the first build there has not been seen working yet). The team's accounts have a password only: turn on two-step sign-in
  in Supabase before real certificates arrive. Certificates that are PDF files open in a new tab,
  pictures open in the page.
- **Photos and recorded sounds stay on the device that made them**: words, boards and settings
  sync, but a photo added on the parent's phone does not yet appear on the child's tablet. The
  private storage folder for it exists (`profile-media`); copying the files is the next step.
- **Google, Apple and phone sign-in** need settings in Supabase (Google OAuth client, Apple
  Developer account, an SMS provider): the steps are in `supabase/README.md`, section 9. The code is
  written (the browser goes to Google and comes back signed in; the iPad shows Apple's own sheet)
  but **has never run against a real Google or Apple set-up**. Apple is offered in the iPhone / iPad
  app only. Until they are turned on there, the app does not show those
  choices: at the sign-in screen it asks the server what is turned on (`signInMethods`) and offers
  e-mail and password only. E-mail sign-in works now: codes are sent through the app's
  Gmail account (tested: the e-mail arrived in the inbox and its code confirmed the account).
  Gmail limits how many e-mails can be sent per day; a domain and an e-mail service are better
  once many families sign up.
- **Notifications** are in-app only (no phone push yet), and their text is written in French by the
  server (except the certificate decisions, written in the person's language).
- **Communication data on several devices**: each tablet records its own days; the Suivi page adds
  them up. Days recorded while the follow-up was off are never recorded later.
- **Function recognition** is a set of simple word rules: a guide for the speech therapist, to be
  checked against observations, not an assessment.
- **AI on devices** needs the `caa-ai` function deployed with an Anthropic key (see
  `supabase/README.md`); until then the app uses the situation library. Search by drawing works in
  the browser demo only for now.
- **The team's own accounts are counted in the figures** (as a parent account, and its test profile as
  a child). Negligible once real families arrive; to be excluded in the database if exact numbers matter.
- **Accessibility**: checked by a program against WCAG 2.2 AA on the web version (`docs/ACCESSIBILITY.md`);
  not yet listened to with a real screen reader, and not tested on a tablet.
- **Switch access and eye gaze**: not available (the set-up says so).
- **Arabic texts** are a first version: to be reviewed by a native speaker.
- **Arabic dialects**: the seven dialect word lists (Syrian, Jordanian / Palestinian, Egyptian, Saudi,
  Gulf, Iraqi, Standard Arabic) were written without a native reviewer. Before selling in a country,
  have its list read by a speech therapist or a parent from there (`src/data/dialectWords.ts`).
  North African dialects (Moroccan, Algerian, Tunisian) are not included.
- **Dialect voices**: tried and dropped for now (the generated voices were judged bad by a native
  listener). Arabic is read by the device's standard Arabic voice; families record the words that do not
  sound right.
- **Pictogram words**: about 11,900 line icons (Material, Tabler, Lucide, Phosphor, Health Icons)
  are found in English only; the French and Arabic words added by our lists are marked "to review"
  and must be checked by the speech therapist and a native Arabic speaker.
- **Pictogram licences**: the check was done from the published licences, not by a lawyer. Seven
  points to show a lawyer are listed in `docs/PICTOGRAM-LICENSES.md` (app stores and CC BY-SA,
  Tawasol's contradictory licence, trademarks…). **Tawasol** (Arabic symbols) can be added once
  Mada confirms its licence in writing.

