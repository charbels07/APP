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

## How everything is checked

| Check | What it does |
|---|---|
| `npm run typecheck` | TypeScript reads the whole code and refuses mistakes such as a missing field or a wrong type. |
| `npm test` | 155 automatic tests (Jest): grammar, search, permissions, change sets, demo server, sync and merges, set-up answers, materials, guide, communication data and consent, the four domains, card actions, the pictogram library and its licences. |
| `npm run test:db` | The database and its security rules on a throw-away PostgreSQL: a parent, a therapist, a teacher, a stranger and a tablet; 35+ checks. |
| `npm run test:live` | The same story on the real Supabase project, through the app's own code: 13 steps, including devices, history undo, invitation codes, revisions and materials (needs "Confirm email" off while it runs). Last run: all 13 passed. |
| Browser walkthroughs | Playwright drives the web version like a person: the parent journey, the team (invite, undo, join with a code), the professional journey (verification, tour, request, draft, proposal, approval), and the Arabic screens. |

## Not done yet (honest list)

- **Billing** (deferred) and the **back-office** (later): the professional verification decision is
  simulated in the demo; on the real server someone must set it until the back-office exists.
- **Photos and recorded sounds stay on the device that made them**: words, boards and settings
  sync, but a photo added on the parent's phone does not yet appear on the child's tablet. The
  private storage folder for it exists (`profile-media`); copying the files is the next step.
- **Google, Apple and phone sign-in** need settings in Supabase (Google OAuth client, Apple
  Developer account, an SMS provider). E-mail sign-in works now: codes are sent through the app's
  Gmail account (tested: the e-mail arrived in the inbox and its code confirmed the account).
  Gmail limits how many e-mails can be sent per day; a domain and an e-mail service are better
  once many families sign up.
- **Notifications** are in-app only (no phone push yet), and their text is written in French by the
  server.
- **Communication data on several devices**: each tablet records its own days; the Suivi page adds
  them up. Days recorded while the follow-up was off are never recorded later.
- **Function recognition** is a set of simple word rules: a guide for the speech therapist, to be
  checked against observations, not an assessment.
- **AI on devices** needs the `caa-ai` function deployed with an Anthropic key (see
  `supabase/README.md`); until then the app uses the situation library. Search by drawing works in
  the browser demo only for now.
- **Switch access and eye gaze**: not available (the set-up says so).
- **Arabic texts** are a first version: to be reviewed by a native speaker.
- **Arabic dialects**: the seven dialect word lists (Syrian, Jordanian / Palestinian, Egyptian, Saudi,
  Gulf, Iraqi, Standard Arabic) were written without a native reviewer. Before selling in a country,
  have its list read by a speech therapist or a parent from there (`src/data/dialectWords.ts`).
  North African dialects (Moroccan, Algerian, Tunisian) are not included.
- **Pictogram words**: about 11,900 line icons (Material, Tabler, Lucide, Phosphor, Health Icons)
  are found in English only; the French and Arabic words added by our lists are marked "to review"
  and must be checked by the speech therapist and a native Arabic speaker.
- **Pictogram licences**: the check was done from the published licences, not by a lawyer. Seven
  points to show a lawyer are listed in `docs/PICTOGRAM-LICENSES.md` (app stores and CC BY-SA,
  Tawasol's contradictory licence, trademarks…). **Tawasol** (Arabic symbols) can be added once
  Mada confirms its licence in writing.

