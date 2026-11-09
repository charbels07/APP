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
| Logins | Supabase Auth handles passwords (stored scrambled, never readable), 6-digit email/SMS codes, Google and Apple; the app talks to it through `supabase-js`, the official TypeScript library. |
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
| Sign-in | `AuthScreen.tsx`: Apple and Google buttons (drawn following each company's rules), e-mail or phone + password. Supabase Auth checks the password and sends the 6-digit code; the demo server shows the code on screen instead. Forgotten password = code + new password. |
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
| Favourite activities | Chosen from pictures, or typed: a typed activity gets a pictogram from the offline ARASAAC library when one matches. They go in the « mes mots » folder, in free slots only. |
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

## How everything is checked

| Check | What it does |
|---|---|
| `npm run typecheck` | TypeScript reads the whole code and refuses mistakes such as a missing field or a wrong type. |
| `npm test` | 93 automatic tests (Jest): grammar, search, permissions, change sets, demo server, sync and merges, set-up answers, materials, guide. |
| `npm run test:db` | The database and its security rules on a throw-away PostgreSQL: a parent, a therapist, a teacher, a stranger and a tablet; 35+ checks. |
| `npm run test:live` | The same story on the real Supabase project, through the app's own code (needs "Confirm email" off while it runs). |
| Browser walkthroughs | Playwright drives the web version like a person: the parent journey, the team (invite, undo, join with a code), the professional journey (verification, tour, request, draft, proposal, approval), and the Arabic screens. |

## Not done yet (honest list)

- **Billing** (deferred) and the **back-office** (later): the professional verification decision is
  simulated in the demo; on the real server someone must set it until the back-office exists.
- **Photos and recorded sounds stay on the device that made them**: words, boards and settings
  sync, but a photo added on the parent's phone does not yet appear on the child's tablet. The
  private storage folder for it exists (`profile-media`); copying the files is the next step.
- **Google, Apple and phone sign-in** need settings in Supabase (Google OAuth client, Apple
  Developer account, an SMS provider). E-mail sign-in works now. Before launch, connect a real
  e-mail service (Supabase's free sender only sends a few e-mails per hour, to your own team).
- **Notifications** are in-app only (no phone push yet), and their text is written in French by the
  server.
- **Observations & outcomes** in the professional's per-child page: not built (needs your
  specification; it is sensitive data).
- **Switch access and eye gaze**: not available (the set-up says so).
- **Arabic texts** are a first version: to be reviewed by a native speaker.
- The newest server calls (devices, history undo, invitation codes, revisions, materials) are in
  the live test but have not run on the real project yet: it needs "Confirm email" off for a few
  minutes.

