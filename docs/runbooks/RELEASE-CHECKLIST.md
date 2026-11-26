# Release checklist

What to do **before each release** of the iPhone, iPad and Android apps (and of the store pages
on Cloudflare). One person leads the release; a second person checks the result and signs at
the end. Assessment items: 19.10, 14.8.

A child speaks with this app. A release that moves a word, says the wrong word or loses a
board takes a child's voice away. When in doubt, do not release.

## 0. Bug severity

Every bug found while testing gets one of these levels. The level decides what happens to the
release.

| Level | What it means | Examples | Release |
|---|---|---|---|
| **Critical** | Communication impossible, wrong word spoken, data loss, privacy leak | The board does not open; touching "want" says another word; a core word changed place; a child's profile, photos or recordings lost; a family sees another family's child; a professional sees data the family did not allow | **Stop.** No release. If the bug is already live: pause the phased release (section 7) and open an incident (`INCIDENT-RESPONSE.md`) |
| **High** | An important feature broken, with a way around it | Sync stops; a recording does not play; one sign-in method fails; the caregiver code keypad blocks a parent | No release until fixed |
| **Medium** | A feature works badly, nobody is blocked | A label is cut on a phone; a slow screen; a wrong word in a menu | May ship; fix in the next release; write it in the release notes if families will notice |
| **Low** | Cosmetic | A colour, an alignment | Backlog |

A bug in Arabic, in French or on Android is not "smaller" than the same bug in English on an iPad.

## 1. Automatic checks

Run all of them on the commit that will be built. Each must end without a failure.

| Command | What it proves | Where it runs |
|---|---|---|
| `npm ci` | The libraries install exactly as locked | On every pull request (`.github/workflows/checks.yml`) |
| `npm run typecheck` | TypeScript finds no mistake in the whole code | Pull requests |
| `npm test` | The automatic tests (Jest): grammar, search, permissions, sync, guide, notices, security of the app, colour contrast… | Pull requests (`npx jest`) |
| `npm run test:db` | Every database rule on a throw-away PostgreSQL, then every attack of the security reviews, which must fail | Pull requests |
| `npm run test:a11y` | 57 screens scanned against WCAG 2.2 AA at four sizes and in Arabic, then keyboard only (about 10 minutes; needs Playwright) | **On your computer only** (not in the automatic checks) |
| Core layout: `npx jest src/__tests__/data.test.ts src/__tests__/wordPlaces.test.ts src/__tests__/profileDiff.test.ts` | Changing the language never moves a word ("stable motor plan"); the board "without holes" never changes the stored places; core positions always need the parent's approval | Inside `npm test`; run it on its own too and read the names of the tests that passed |
| `npm audit --omit=dev` | No known flaw in the libraries that ship to families | Your computer; Dependabot also opens pull requests every week |

Also check, by reading the change list (`git log` since the last release):

- [ ] No change in `src/data/defaults.ts` moves a core cell (positions are the child's motor plan).
- [ ] A new database rule came with its attack in `supabase/tests/security_scenario.sql`.
- [ ] A new counter for the team was added in both `src/lib/product.ts` and the database list (`product.test.ts` compares them).
- [ ] A new notice has its three versions in `src/lib/notices.ts`.
- [ ] Nothing new sends a word, a sentence, a child's name or free text to the team or to the AI helper.

## 2. Manual check: 30 minutes on three devices

Use the **build that will go to the stores** (TestFlight for Apple, internal testing for Google
Play), not a development build. Three devices at the same time: **an iPad, an Android tablet and
a phone** (iPhone or Android). Use a test family account and a test child, never a real family.

| # | What to do | What must happen |
|---|---|---|
| 1 | Install over the previous version (do not delete it first) | The child's board opens as before; words, photos, recordings and settings are all there |
| 2 | Touch ten core words, in French, English and Arabic | Each touch says the right word in the right language; nothing moved between languages |
| 3 | Build a sentence, read it, delete a word, clear, undo | The sentence strip behaves as before |
| 4 | Open a folder, an activity board, the schedule, the timer, the Help button | Each opens and comes back |
| 5 | Try the four voices (Woman, Man, Girl, Boy) and the speed | Each speaks; a family's recording of a word always wins |
| 6 | Bar → Settings: type the caregiver code; change a setting; Save | The code is asked first; the change is kept after closing |
| 7 | Bar → Lock → code → **Open the device's settings** | Android: the Security page (app pinning); iPad: Settings on Daleth AAC's page. In a browser: no button, one sentence |
| 8 | Change a word on the phone | It appears on the tablet within a minute (an open board looks every 30 s) |
| 9 | Add a photo and record a word on the phone | They reach the child's tablet |
| 10 | Switch scanning and dwell selection (if the release touches the board) | A switch and a dwell select the right card |
| 11 | Menus in Arabic | Menus read right to left; **the board is never mirrored** |
| 12 | Restore a board snapshot; delete the test child's profile, then restore it from the bin | Both come back complete |
| 13 | Export the board (.obz) and "Download all my data" | Both files open and hold what they should |
| 14 | Team account with two-step sign-in: sign in, open the back office | The authenticator code is asked |
| 15 | Sign out, sign in again (with and without "Keep me logged in") | As described in the guide; the child's copy leaves the device on sign-out |

Write every problem in the release record with its level (section 0).

## 3. Offline check

On the child's tablet:

- [ ] Airplane mode on. Close the app completely, open it again: the board opens and speaks.
- [ ] Recordings play; photos show; the caregiver code still works.
- [ ] Change a word while offline. Airplane mode off: the change reaches the server and the other devices.
- [ ] Dictation offline: write down what happens on each device (the system recognises speech on
      the device only where it offers it). Whatever happens, the board keeps working.

## 4. Database changes (migrations)

A migration is a new file in `supabase/migrations/`. A file that already ran on a project is
**never** edited.

1. **The previous app version must keep working** with the new database: people update their
   apps slowly, and a store build cannot be pulled back. Add columns and functions; remove them
   one release later.
2. Write the "undo" SQL of the migration before release, and keep it with the release record.
3. **Back up production first**: check that today's Supabase backup exists (Database → Backups)
   and run `scripts/backup-offsite.sh` (see `BACKUP-AND-RESTORE.md`).
4. Apply the migration to the **test project** (the second Supabase project, never the one
   families use). Run `npm run test:live` against it.
5. Apply it to **production** (SQL Editor, only the new file), at a quiet time (night in Europe
   and the Middle East).
6. Check the Security Advisor and the logs for errors in the next hour.

Migrations are not published by a merge on GitHub: someone runs them by hand. Write in the
release record which file ran where and when.

## 5. Words and texts (three languages)

- [ ] The in-app guide (`src/data/guide.ts`) describes every change a user can see, in French,
      English and Arabic, with the names written on screen (`guide.test.ts`).
- [ ] New notices have their three versions (`src/lib/notices.ts`).
- [ ] A new question of the set-up has its "?" help (`src/data/setupHelp.ts`).
- [ ] If what is shared with the team grows: `SHARE_TERMS` raised and `shareNote` updated, so
      families are asked again.
- [ ] If the data collected changed: the privacy policy, the store privacy forms (App Store
      "App Privacy", Google Play "Data safety") and `docs/legal/RECORD-OF-PROCESSING.md`.
- [ ] Arabic texts read by a native speaker when they are new.

## 6. Store release

- [ ] Version number raised in `app.json` (and the build numbers for each store).
- [ ] Release notes written in the three languages. Short, plain words, what changes for the
      family. Example: "Words can now be restored from an earlier copy of the board."
- [ ] Screenshots updated if a main screen changed.
- [ ] The support and account-deletion pages still answer:
      `https://[website]/support/` and `https://[website]/delete-account/`.
- [ ] Apple review notes: a test account and how to reach the board (the reviewer needs a code).

## 7. Phased release

Never release to everyone on day one.

| Store | How | What we watch |
|---|---|---|
| App Store | "Phased release for automatic updates": 7 days (1 %, 2 %, 5 %, 10 %, 20 %, 50 %, 100 %). It can be paused (up to 30 days in all) | Back office → Bugs (technical problems from families who agreed); messages in "Help us improve Daleth AAC"; store reviews; crash reports in App Store Connect |
| Google Play | Staged rollout: 5 %, then 20 %, then 50 %, then 100 %, at least one day each | The same, plus Android vitals in Play Console |

Go to the next step only if no critical or high bug appeared.

## 8. Rollback plan

A store build cannot be taken back from the devices that installed it. Plan for this **before**
releasing.

| Problem found | What to do |
|---|---|
| Critical bug during the phased release | Pause the phased release (App Store) / halt the rollout (Google Play) at once. Families who did not update stay safe |
| The bug is on devices already | Fix it, build again, submit with a request for an expedited review (Apple) and a fast rollout (Google). Tell families in a notice what to avoid meanwhile |
| A migration broke something | Run the "undo" SQL written in section 4. Never restore a whole backup for this unless data was lost (`BACKUP-AND-RESTORE.md`: a restore loses what happened since) |
| Data was lost or exposed | `INCIDENT-RESPONSE.md`, then `DATA-BREACH.md` |
| The support pages broke | Cloudflare → Workers & Pages → the project → Deployments → roll back to the previous one |

## 9. Sign-off

| | Name | Date | Signature |
|---|---|---|---|
| Release lead | | | |
| Second check | | | |
| Open bugs left (level and number) | | | |
| Migrations run (file, project, time) | | | |
