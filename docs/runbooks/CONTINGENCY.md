# Contingency plans

What we do when something outside our control goes wrong. One short plan per situation, then
the risk register. Assessment items: 21.2, 21.13.

The first promise in every plan: **the child keeps communicating.** The board is stored on each
device and works without internet; nothing in these plans should take it away.

## 1. A provider is down

| Provider | What stops | What keeps working |
|---|---|---|
| Supabase (database, sign-in, files, server functions) | Sign-in, sync between devices, teams, invitations, follow-up sent to the server, back office, team e-mails, deleting the files of what was erased (`caa-purge`: it waits and catches up), browser notifications (`caa-push`) | The board on each device, speaking, recordings, photos already on the device; changes wait and are sent later |
| Gmail (codes by e-mail) | New accounts, password reset, "Forgot the code?" by e-mail, team e-mails | Everything else; "Forgot the code?" with the account's password |
| Google / Apple sign-in | Signing in with them | Accounts already signed in |
| Anthropic (AI helper) | Nothing today: the AI is switched off and `caa-ai` is not deployed | Everything |
| The browsers' notification services (Google FCM, Mozilla, Apple, Microsoft) | Browser notifications of the web version (tried again up to 5 times until the notification expires: 3 hours for the reminder, 2 days for a new idea) | Everything else |
| Cloudflare | The support and account-deletion pages; the testers' web version | The store apps |
| App Store / Google Play | New installs and updates | Installed apps |

**Plan.**

1. Check the provider's status page; open an incident (`INCIDENT-RESPONSE.md`) if it lasts more
   than 30 minutes or if families write.
2. Notice in the app if Supabase answers; otherwise a message on the support page
   (`public/support/index.html`, a release of the pages).
3. Do not change settings in a hurry to "help": most outages end by themselves.
4. If Supabase is down for more than a day and does not give an end time: prepare a restore
   into a new project, in another region if needed (`BACKUP-AND-RESTORE.md`, section 5). The
   server's address is built into the app: a new project means new store builds (days of
   review), unless the project uses a custom domain. **Decision to take now, calmly:** a custom
   domain for the Supabase project, so that the address can move without a new build.

**To check (risk):** at start, the app treats an answer from the server that is an error but not
a "network" error as "signed out", and then erases the board copy of that device except unsent
changes (`currentAccount` in `src/backend/supabase.ts`, then `Session.tsx`). Test what the app
does when Supabase answers with an error page (500, a paused project): the board must stay.

## 2. Data loss on the server

1. Stop writing if the damage is spreading (maintenance notice; switch off the function or rule
   at fault).
2. Find the last good copy (`BACKUP-AND-RESTORE.md`): Supabase's daily backups (7 days), then
   the weekly off-site copies (up to 90 days).
3. Save the deletion list of the damaged project first; restore; re-apply the deletions.
4. Tell families what was lost and what their devices still hold.
5. Personal data lost = a breach (availability): `DATA-BREACH.md`.

## 3. The developer is unavailable

1. The second admin of every account (`docs/ACCESS-LIST.md`) can act alone: nobody is the only
   one holding a key.
2. `docs/ARCHITECTURE.md` explains how to set up, test and release; `CLAUDE.md` holds the
   project's rules; the runbooks hold the steps.
3. A backup developer is named and has read the code once: `[backup developer]`, `[contract]`.
4. While nobody can develop: no release, no migration. The apps keep working; only fixes wait.
   Families are told if a known bug will take longer to fix.

## 4. Money runs out

1. The continuity pledge (`docs/legal/CONTINUITY-PLEDGE-DRAFT.md`) says what families keep.
2. Costs first cut: anything that is not the server (the AI helper costs nothing today: it is
   switched off).
   The Supabase plan with backups is the last cost to keep.
3. If the service must close: give families the notice period promised in the pledge, in the
   three languages; remind them how to export (the board's open file, "Download all my data",
   printed boards); keep the server long enough for them to do it.
4. **Never** delete accounts or end sessions on the server before the devices can keep their
   boards without the server: today a device whose session is refused erases its board copy
   (section 1, "To check"). A "keep this board on this device without an account" mode is
   needed before any closure.

## 5. The app is suspended from a store

The product is sold in the stores only (the owner's choice, November 2026); the web version is
for chosen testers, not for families: a suspension stops new installs and updates in that store.

1. Read the reason; answer in the store's console within a day. Most suspensions are about
   privacy forms, account deletion, children's category rules or sign-in.
2. Check the usual points: the privacy policy URL works; account deletion is in the app and on
   the web (`public/delete-account/index.html`); the App Privacy / Data safety forms match
   `docs/legal/RECORD-OF-PROCESSING.md`; Sign in with Apple is offered where Google is.
3. Installed apps keep working: tell families, in a notice, not to delete the app.
4. If it lasts: the owner decides whether to open a temporary way for existing families (the
   web version exists, for testers; it is not offered to families today).

## 6. A regulator or a lawyer challenges us

1. Answer within the deadline given; `[DPO]` and `[lawyer]` lead.
2. Have ready: `docs/legal/` (policy, record of processing, DPIA, retention), `docs/SECURITY.md`,
   the breach register, the consent records.
3. If a processing must stop at once, the switches that exist: team e-mails, file deletion and
   browser notifications together (`delete from public.team_mail_config;`: `caa-mail`, `caa-purge`
   and `caa-push` use the same key; the work waits in its queue), notifications alone (delete the
   function `caa-push`), product counters and anonymous figures
   (families' choices; the server checks them). Communication itself (the board) never needs to
   stop.

## 7. A breach

`INCIDENT-RESPONSE.md`, then `DATA-BREACH.md`. Nothing else here.

## 8. Risk register

Likelihood and impact: low / medium / high. Reviewed every quarter with the access list
(`docs/ACCESS-LIST.md`) and after every incident or table-top exercise.

| # | Risk | Likelihood | Impact | Response | Owner | Last review |
|---|---|---|---|---|---|---|
| 1 | A release moves a core word or speaks the wrong word | Low | High | Motor-plan tests, manual check in three languages, phased release (`RELEASE-CHECKLIST.md`) | `[developer]` | `[date]` |
| 2 | A family's or a team account is taken over | Medium | High | Two-step sign-in (required for the team, offered to parents), fresh proof before deleting or linking a full-access device, rate limits | `[owner]` | `[date]` |
| 3 | A database rule lets someone read another family's child | Low | High | Rules in the database, `npm run test:db` with every known attack, an outside security test before selling | `[developer]` | `[date]` |
| 4 | Supabase outage of more than a day | Low | Medium | Offline boards; restore plan; custom domain (to decide) | `[owner]` | `[date]` |
| 5 | Server data lost | Low | High | Daily backups, weekly off-site copy, quarterly restore test | `[owner]` | `[date]` |
| 6 | The device erases its board when the server refuses the session (outage answer, closure) | To test | High | Test it (section 1); build an offline-only mode before any closure | `[developer]` | `[date]` |
| 7 | The developer is unavailable | Medium | High | Second admin on every account, documentation, backup developer | `[owner]` | `[date]` |
| 8 | Money runs out | Medium | High | Continuity pledge, cost order, notice period | `[owner]` | `[date]` |
| 9 | Store suspension | Medium | High | Store rules checked at each release; deletion page; privacy forms kept true | `[owner]` | `[date]` |
| 10 | Regulatory challenge (children's and health-related data) | Medium | High | DPIA, record of processing, lawyer and DPO review before launch | `[DPO]` | `[date]` |
| 11 | A secret key leaks (Supabase secret, AI key, Gmail app password) | Low | Medium | Keys only in provider pages, secret scanning on GitHub, spending limit on the AI key, rotation steps (`INCIDENT-RESPONSE.md`) | `[developer]` | `[date]` |
| 12 | Gmail limits or blocks the sign-in codes | Medium | Medium | Move to a mail service with a domain (`docs/API-KEYS.md`) | `[owner]` | `[date]` |
| 13 | A library used by the app has a known flaw | Medium | Medium | Dependabot every week, `npm audit` at each release | `[developer]` | `[date]` |
| 14 | A pictogram licence is challenged | Low | Medium | Only verified libraries (`docs/PICTOGRAM-LICENSES.md`), lawyer's review of the open points | `[owner]` | `[date]` |
| 15 | The backup private key is lost or stolen | Low | High | Two paper copies in two places; if stolen, new key pair and delete the old copies | `[owner]` | `[date]` |

First version: 18 November 2026, written from the code; not yet reviewed by the team.
