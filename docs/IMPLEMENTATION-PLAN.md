# Implementation plan — accounts, onboarding, collaboration, professional workspace

Source of the requirements: `docs/UX-BACKLOG.md`. Billing and the back-office are **deferred**.
Simple explanations for the family: `docs/HOW-IT-WORKS.md`.

## Architecture decisions

- **Backend interface** (`src/backend/Backend.ts`) with two implementations:
  - `LocalBackend` (`src/backend/local.ts`): a "server" simulated on the device (AsyncStorage /
    browser storage). Used by the demo and whenever no real server is configured. Verification
    codes are shown on screen, and several accounts can live on one device so collaboration can be
    tried by signing out and in again.
  - `SupabaseBackend` (`src/backend/supabase.ts`): the real server (PostgreSQL database, logins,
    file storage). Turned on when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
    are set. The schema and its security rules are in `supabase/migrations/`, tested against a
    local PostgreSQL 16.
- **The AAC profile stays one JSON document** (the existing `Profile` type), stored with a version
  number. Every device keeps a local copy, so communication works offline; changes are pushed
  when online, with a version check against overwriting someone else's change.
- **Proposals are differences ("ops")** between the profile as it was and a draft copy that the
  professional edited with the normal editors (`src/lib/profileDiff.ts`). Each op remembers the
  value it replaces: applying it after someone else changed the same thing is a **conflict**, and
  every applied change can be **undone** (inverse ops in the history).
- **Permissions:** role presets (therapist, teacher, caregiver, family member, other) and three
  levels — 1 Use, 2 Contribute (proposals), 3 Authorised editing (direct, except core vocabulary
  positions, which always go through a proposal) — in `src/lib/permissions.ts`. The database
  enforces the same rules with row-level security.
- **App stages** (`src/state/Session.tsx`): welcome → preview → role → sign-in → (parent: child
  profile → set-up → try the board → guide → app) / (pro: verification → workspace + tour).

## Phases (all six done — see `docs/HOW-IT-WORKS.md` for what each part does)

1. Backend foundation: types, interface, local + Supabase backends, SQL schema + RLS, diff engine,
   permissions.
2. Welcome, board preview, pro/parent choice, sign-in (email, phone, Google, Apple), codes.
3. Child profile questionnaire, set-up journey, level-adapted first board, tailored guide.
4. Settings in three pages: Board, Collaborate (team, invite, permissions, proposals, history),
   Account (my account, devices & sync, permissions & sharing, privacy & data, preferences;
   subscription shown as "coming later"); several children per parent.
5. Professional: verification, workspace, my AAC users, create materials, library,
   collaborations, learning center, account & licence, interactive tour.
6. Explanations, tests, browser checks, demo, push.
