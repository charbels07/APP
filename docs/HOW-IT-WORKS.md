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

