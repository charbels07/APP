# Security of Empower Communication

Written in plain words, for someone who is not a security specialist. It says what the app
protects, what was checked in November 2026, what was fixed, **what only you can do in the
dashboards**, and what is still to do before families use it for real.

## 1. What "security" means here

Only the right person can see or change each thing.

| What we protect | Why it matters |
|---|---|
| A child's profile (name, age, words, photos, how the child uses the app) | It is about a child, and about a disability. |
| Therapists' diplomas and identity papers | Identity documents are what thieves look for. |
| Accounts | Nobody should be able to enter someone else's. |
| The back office | It opens certificates and shows figures: your team only. |
| Your keys (the AI key above all) | Someone using your key spends your money. |

An attacker has five doors to try: **the database**, **the sign-in**, **the keys**, **the app on
the tablet**, **the website and its libraries**. The review went through each one.

## 2. What protects the app (and where)

| Protection | In simple words | Where |
|---|---|---|
| Row-level security | The database checks every row: "is this person the parent, on the team, or nobody?" | `supabase/migrations/` |
| Functions with their own checks | Anything delicate (join a team, link a tablet, decide a certificate) goes through a function that checks the caller first | same |
| Nothing for visitors | Someone who is not signed in cannot call any function or read any table | `…_security.sql` §13 |
| Private files | Documents and photos are in private folders, one per person or per child | `…_storage.sql`, `…_security.sql` §10 |
| Keys | The app only holds the public key. The powerful keys are never in the code (checked: nothing in the whole history) | `.env` (not on GitHub) |
| Browser protections | The website only runs its own code and only talks to its own server and two picture libraries | `public/_headers` |
| Guards in the app | Links, imported boards and other people's changes are cleaned before the app uses them | `src/lib/safety.ts` |

## 3. What the review found and what was done

Each line was confirmed (read in the code, or replayed on a throw-away copy of the database),
then fixed, then covered by an automatic test.

### Serious

| Problem | Fix |
|---|---|
| The code to link a tablet was 6 digits with unlimited tries: a program could guess one and get parent rights. | 8 letters and digits from a strong random source; one code at a time; 5 wrong tries then a pause; the family gets a notice each time a device is linked. |
| Someone with only the "invite" right could invite themselves as a parent. A connection request could carry a hidden "acts as a parent" right. A removed member could come back with an old invitation. | An invitation gives at most what its author holds. A request never carries the family's rights and approving it never makes someone a parent. Removing someone cancels their invitations. Invitations last 30 days. |
| A professional could skip the verification by changing the account from "professional" to "parent". | Nobody can change their own account type any more. |
| A link on a card could be anything, including a link that runs code in the website. Links arrived with boards shared by other people. | Only web pages (https) and known apps. A link never travels with a shared board, an imported file or a proposal. The banner shows where a link goes. |
| After "Sign out", the child's whole copy (name, words, caregiver code) stayed in the browser. | Signing out sends what was not sent, then really erases it; an open board can no longer write it back. A choice also erases photos and recordings (shared computer). |
| Caregiver code: 1234 for everyone, shown on the keypad of the real app, unlimited tries. | No hint anywhere and no code to know beforehand: the first time, the person chooses the code (typed twice). 5 wrong tries then a pause that grows. |
| A team member with editing rights could turn on "record sentences" or "share statistics". | These two choices and the caregiver code can only be changed by the family, in the database and in the app. |
| Any throw-away sign-in could use the AI helper (40 calls a day each) at your cost. | The helper is for people who look after a child here, with a ceiling for the whole service each day. (It is not deployed on the real server yet.) |

### Medium

| Problem | Fix |
|---|---|
| The website sent no browser protections. | `public/_headers` (Cloudflare adds them): own scripts only, cannot be shown inside another site, camera and microphone for the app only. Since pictures searched on the internet were removed (November 2026), the website only talks to its own server: two outside sites were taken off the list of allowed addresses. |
| Uploaded documents had no size or type limit; a tablet sign-in could upload. | Pictures or PDF, 10 MB, 20 files, real accounts only. A document removed from the list, and all documents when an account is deleted, are deleted from the storage too. |
| Back-office figures could show groups of fewer than 5 (one week, one platform, one choice), counted children instead of families, and included a setting of families who did not agree to share. | Every figure from children needs 5 children **of 5 families**; a week, platform or choice under 5 is left out; sharing families only. |
| A use-only tablet could write the history or overwrite figures; one odd value broke the back-office page; free text could travel inside figures. | History is written by people who can edit. Figures keep numbers and six known places only; an odd value counts as 0. |
| Notes could be rewritten or deleted by anyone allowed to see the data; signatures came from the app. | A note is changed by its author or the family; the database writes the signature. |
| A material shared "to edit" could be taken by the other person. | Content can change, the owner cannot. |
| Signing out without internet did not sign out. | The device forgets the session even offline. |
| A build made without the server's address silently became the demo. | Such a build shows "not connected" instead. The demo is asked for on purpose (`EXPO_PUBLIC_APP_MODE=demo`). |
| The print page was built from the profile without cleaning two values. | Cleaned, and the print page cannot run scripts. |
| The instructions said to turn "Confirm email" off on the real project to run a test. | Tests run on a second project. Never turn it off on the real one. |

### Small

Functions that answered a caller with no account; proposals reopened after a decision; device
names overwritten; no limits on sizes and numbers; a table export that could become a
spreadsheet formula; picture links that were not https; Android copying the app's data into
device backups. All fixed.

### Added later: a professional prepares a child's profile (November 2026)

A therapist can create a child's profile before the family has an account, then hand it over with
a code. The rules, all decided by the database (`20261115000000_pro_profiles.sql`):

| Risk | Rule |
|---|---|
| Anyone could call themselves a therapist and create children's profiles. | Only a professional whose certificate was accepted; one who is no longer accepted loses the profiles they created too (suspended, not erased). |
| A professional could record or share a child's use without the parents. | Recording and sharing are forced off at creation and cannot be turned on while a professional owns the profile. They are the parents' choices, after the hand-over. |
| The profile could be handed to the wrong person. | Only with the code the owner wrote for the parents, only to a *parent* account (not another professional, not a tablet). A team member cannot write that code. The app warns the therapist to give it to the parents only; a new code cancels the old one. |
| The therapist would keep the parents' rights or the caregiver code. | After the hand-over the therapist is an ordinary team member (edits the board, does not see the progress data unless the family allows it, cannot delete the profile), their other invitations are cancelled, and the caregiver code goes back to "not chosen" so the family chooses its own. |

One deliberate relaxation: in the professional workspace, on the professional's own account, the
family's caregiver code is no longer asked to prepare changes. That code keeps the *child* out of
the tools on the child's tablet; a signed-in professional's changes are still checked one by one
by the database (proposal, direct edit or refusal, according to the rights the family gave).

### Added later: a forgotten caregiver code (November 2026)

"Forgot the code?" on the keypad lets the family choose a new code only after proving it is the
account's owner: with the account's password (checked by signing in again as that same account,
with its own address: `checkPassword`), or by holding the account's mailbox or phone: a code is
sent there (the password-reset code) and checked by Supabase without changing the password. The rule for who may change the code does not move: only the family
or a team manager, as before (`save_profile` refuses anyone else); a linked tablet has no mailbox and
is told to do it from a parent's device. A child cannot use it: it needs the parent's password or e-mail. The proof is checked on the device
(the database cannot tell who holds the tablet); that is enough, because the code only ever kept
the adults' tools from a child's hands, and the account itself downloads the profile the code is in.

### Added later: "Keep me logged in" (November 2026)

On the log-in and sign-up forms. Ticked (the default, right for the family's own tablet or
phone), the session is kept on the device. Not ticked (a shared or borrowed computer), the
session is never written on the device: it lives for the visit only and is gone when the tab or
the app is closed; the children's copies kept on that device are erased the next time the app
opens. A tablet linked with a code always stays connected.

### Added later: Settings and the child lock in the board's bar (November 2026)

Both buttons open the caregiver code keypad first (same code, same pauses after wrong tries);
nothing of the settings is shown before the code is right, and the board does not switch to
caregiver mode behind them.

The accounts of the app's team also get a "Back office" button there (and in the professional
workspace). The button is only shown to accounts the database lists as team; showing or hiding it
changes nothing to who may read the back office (`is_admin()` decides).

**The team is never asked the caregiver code** (the owner's decision, November 2026): on a board
opened with a team account, caregiver mode, the settings, the child lock and the back office open
at once. The caregiver code only ever protected against a child's hands, not against a person with
the account, so nothing new can be read by someone who is not in the team. But a tablet signed in
with a team account must not be handed to a child: one tap opens the back office, where the
professionals' certificates are. Use an ordinary family account on any tablet a child uses.

### Added later: e-mails to the app's team (November 2026)

The database writes the messages (a professional applied; the figures of the week) and a server
function sends them. What keeps it safe:

- the tables `team_mail` and `team_mail_config`, and every `team_mail_*` function, are closed to
  the app (signed in or not): they cannot be read, written, sent or pointed somewhere else;
- the function is called by the database only, which shows a key it made itself; the key is
  checked **by the database** (`team_mail_take`), and it can only ever be shown to the project's
  own `…supabase.co/functions/v1/caa-mail` address;
- the function cannot choose what is sent or to whom: subject and text come from the database,
  the address is a secret of the function;
- the request e-mail gives the professional's name, profession and country (the owner asked for
  the name: it sits in the team's mailbox, so that mailbox needs two-step sign-in); never a
  document, an address or a phone number, and no name in the subject;
- the weekly figures hold counts only: no name, no word, no sentence; the use of the boards
  follows the back-office rule (consenting families, 5 children or more);
- one e-mail a day for the same professional, 30 a day in all; a failure never blocks the request.

`supabase/tests/team_mail_scenario.sql` plays each of these.

### Added later: figures for the team, technical problems, requests (November 2026)

The back office can now show how the features are used and which technical problems happen
(`supabase/migrations/20261117000000_product.sql`, `src/lib/product.ts`). What keeps it safe:

- **the family's agreement, checked by the database**: `save_feature_day` and `report_problems`
  refuse a child whose family did not turn on "Help improve the app" *and* agree to the list that
  mentions these counters (`shareTerms` 2). An older agreement is not enough. Only the family can
  change it (`guard_share_terms`), and a new profile cannot arrive "already agreed";
- **known names and numbers only**: a counter has one of 30 names and a whole number; a problem
  has a kind, an error type, a screen and a system from fixed lists, a version, and a place in
  the code as digits. Anything else is dropped by the database, so no text can travel
  (the error's message is never even read by the app);
- **not from professionals or the team**: their accounts are refused;
- **problems belong to nobody**: the table `error_counts` has no column for a child, an account
  or a device;
- **nothing shown under 5 children of 5 families**, and a group of 1 to 4 children is never given
  as a number (`admin_product`);
- **withdrawal erases**: turning sharing off deletes the child's counters (trigger
  `forget_product`); everything is deleted after 180 days;
- **votes**: one per account, not from a child's tablet; only the team adds or hides an idea, and
  that is written in the team's history;
- the tables are closed to the app; every `admin_` function checks `is_admin()`.

`supabase/tests/product_scenario.sql` plays each of these.

**To confirm with a lawyer or a data-protection officer** (this review is technical, not legal):

1. A written privacy policy that lists these counters, the technical problems and the messages,
   why they are collected, for how long, where they are stored, and how to ask for access or
   deletion. The texts in the app are explanations, not a legal policy.
2. The wording of the agreement. A child's use of a communication aid can be read as
   information about a disability (a "special category" under the GDPR): the consent may need to
   be explicit in a stricter sense, and it must come from a parent.
3. Whether an impact assessment (DPIA) is required: children plus health-related data usually
   means yes.
4. Where the data lives: the region of the Supabase project, and the contracts with the
   services used (Supabase, Cloudflare, the mailbox that sends the codes).
5. The laws of the countries where families live outside the EU (Lebanon, Saudi Arabia, Jordan…).
6. Until they are added up, the counters are personal data (they are stored per child): the
   "5 children" rule protects what the team sees, it is not a legal proof of anonymity.
7. Messages written to the team carry a name and an e-mail address: who answers access and
   deletion requests, and how long they are kept.

### Added later: second round (18 November 2026)

The items of the honest list below (§5) that could be built without a store build or a key are
built, each with its attack replayed by `npm run test:db`:

| What | How it protects | Where |
|---|---|---|
| **Two-step sign-in** (a 6-digit code from an authenticator app) | Offered to everyone (Settings → Account → My account), **required for the back office**: `is_admin()` now also needs the code typed in this session ("aal2"). Once a person turns it on, the database shows nothing of the children until the code is typed (`mfa_ok` in `access_of`, `owns_profile`, `list_profiles`, plus a "restrictive" rule on every table). A stolen password alone opens nothing. | `…20261118000000_security_2.sql`, `src/ui/TwoStep.tsx` |
| **A fresh proof before what cannot be undone** | Deleting the account or a child's profile, linking a device with **full access**, downloading all the data: the database asks for a sign-in, a password, an e-mailed code or an authenticator code from the last 10 minutes (`fresh_proof`). A borrowed, unlocked phone cannot do these. A linked tablet never can. | same, `src/ui/ProveItsYou.tsx` |
| **Team members no longer read each other's e-mail, nor the family's connection code** | Column rights: the address only for the family, the team's managers and the person themself (`list_members`); the family code only through `connection_code()` (managers). | same |
| **The session in the iOS Keychain / Android Keystore** | On phones and tablets the sign-in session is in the system's secure storage, readable after the first unlock, never copied to another device. A copy of the app's files holds no usable session. | `src/lib/deviceVault.ts` |
| **Files deleted by the server** | When an account, a child's profile or a professional's document is erased, the database queues its files and the server function `caa-purge` deletes them with the server's key, whatever the device did. | `…20261118000100_storage_purge.sql`, `supabase/functions/caa-purge` |
| **Nothing disappears by one mistake** | A deleted child's profile stays 30 days in the family's bin (hidden from everybody), then is erased with its files. The server keeps copies of the board (weekly, before a big change, by hand; 10 per child) that the family puts back in one touch. | `…20261118000200_bin_snapshots.sql` |
| **The parent's consent kept as a record** | Before a family creates a child's profile, or takes over one a professional prepared, the parent ticks a statement; the database keeps who, when and which text version, and refuses the profile without it. | `…20261118000500_privacy.sql`, `src/lib/consent.ts` |
| **Data kept no longer than needed** | Every night: follow-up 24 months (the children's sentences 12), history 24 months, notices 12 months, messages to the team 3 years, the team's log 5 years. Inactive accounts are counted for the team (Back office → Security), not deleted. | same |
| **"Download all my data"** | One file with everything the server keeps about the account and its children (GDPR access and portability), after a fresh proof. | same, `src/ui/settings/DownloadMyData.tsx` |
| **Dictation on the device** | When the language is installed for it, dictation runs on the device and no audio leaves it; otherwise a line says that Apple's or Google's service hears the sentence. | `src/ui/VoiceButton.tsx` |
| **A server error is not a sign-out** | A server that cannot answer (down, paused, overloaded) no longer makes the app erase the child's copy: only a clear "this session does not exist" signs out. | `src/backend/supabase.ts`, `src/state/Session.tsx` |
| **Links out of the app behind the code** | On the tablet apps, a pictogram that opens another app (YouTube…) first asks the caregiver code (store rules for children's apps). | `src/lib/appLinks.ts` |

What these need on the server is in §4 ("After the update of 18 November 2026").

## 4. What only you can do

### After the update of 18 November 2026 (about 20 minutes)

1. **Run the new database files**, in this order, in Supabase → SQL Editor (each answers "Success"):
   `20261118000000_security_2.sql`, `20261118000100_storage_purge.sql`,
   `20261118000200_bin_snapshots.sql`, then the other `20261118…` files in the order of their
   names. Until they run, the app keeps working with the older rules (it falls back), but the new
   protections are not active on the server.
2. **Deploy the function `caa-purge`** exactly like `caa-mail` (supabase/README.md §11), with
   *Verify JWT* turned **off**. It uses the connection already made for the team's e-mails.
3. **Turn on two-step sign-in for every team account**: sign in to the app with it; the back
   office now shows "Turn on" first (Settings → Account → My account works too). Keep the
   authenticator on a phone that is not shared. A lost phone: Supabase → Authentication → Users →
   the person → remove the factor, after checking it is them.
4. Check that **TOTP** is enabled in Authentication → Multi-Factor (it is by default).


### Now (10 minutes)

1. **Wait for Cloudflare** to rebuild the site after this change (Workers & Pages → your
   project → Deployments: the last one is green).
2. **Run the new database file.** Supabase → SQL Editor → New query → paste the whole content of
   `supabase/migrations/20261114000000_security.sql` → Run. It answers "Success. No rows
   returned". Do it right after step 1: the new app and the new rules go together.
3. **Turn on 2-step verification** on the four accounts that can open everything: Supabase,
   GitHub, Cloudflare, and the Google account that owns the Google sign-in project. This is the
   most useful thing on this page: whoever enters your Supabase account sees every child.

### This week (Supabase dashboard)

Names move a little between versions of the dashboard; look for the nearest wording.

| Where | What | Why |
|---|---|---|
| Authentication → Sign In / Providers → Email | Minimum password length **8** (the app already asks for 8). "Confirm email" stays **on**. Turn on "Secure email change" and "Secure password change" if shown. | The server is the one that really enforces it. |
| same page | "Prevent use of leaked passwords", if your plan shows it | Refuses passwords known from leaks. |
| Authentication → URL Configuration | Site URL = your site's address. Redirect URLs: only your site's address and `empowercommunication://**`. Remove anything else (old `caa://` lines, wide `*`). | A sign-in can only come back to your app. |
| Authentication → Rate Limits | Leave the defaults; do not raise "anonymous sign-ins". | Limits robots creating sessions. |
| Advisors → Security Advisor | Open it and send me what it lists. | Supabase's own checklist for your project. |
| Project Settings → Database → backups | Before real families: a plan with daily backups. | The free plan keeps none. |

### GitHub and Google

- GitHub → the repository → Settings → Code security: turn on **secret scanning**, **push
  protection** and **Dependabot alerts**.
- Google Cloud → the sign-in project → "Audience": publish it before real families sign in
  (already on your list).

### Habits

- A key or password pasted in a chat, an e-mail or a screenshot is considered lost: make a new one.
- Team accounts for the back office: one per person, never shared, removed when someone leaves
  (`delete from admins where …`).
- When a therapist's certificate is refused or withdrawn, their access stops by itself.

## 5. Not done yet (honest list)

| What | Why it waits |
|---|---|
| A robot check (CAPTCHA) on sign-up and on tablet sign-ins | Needs a Cloudflare Turnstile key, and on the store apps a web view (native module) or the stores' own checks (App Attest, Play Integrity): to do with the first store builds. Supabase's rate limits and the confirmed e-mail hold meanwhile. |
| "Has this e-mail an account?" can still be learned by inviting or sharing | Limited to 30 invitations and 40 shares a day; hiding it fully changes how sharing answers. |
| A full-access device is active as soon as its code is typed | Making the code now asks a fresh proof of the parent (above), which removes the main risk (a borrowed phone). A confirmation on the parent's screen remains possible later. |
| Field-level encryption of the children's sentences and of the observations | Supabase encrypts disks and backups; the sentences are now erased after 12 months. Encrypting the column itself (key in Supabase Vault) is planned for the first six months. |
| A test by a security professional, and the legal side (privacy policy, DPIA, contracts) | Before selling: drafts are in `docs/legal/`, to be completed by a lawyer; an outside test is worth its price for an app about children. |

## 6. How it stays checked

| Command | What it proves |
|---|---|
| `npm run test:db` | 176 checks on a throw-away database: the normal story, then **every attack of this review, which must fail**, then the hand-over of a profile created by a professional, then the e-mails to the team, then the figures for the team, the technical problems and the votes. |
| `npm test` | 300 tests; `security.test.ts` covers links, other people's changes, what stays on the device, the print page, the website protections. |
| `npm audit` | Known flaws in libraries. Today: none in what ships to families (4 medium ones in build tools only). |
| `npm run test:a11y` | The screens still pass the accessibility scan after these changes. |

When a database rule changes, add the attack to `supabase/tests/security_scenario.sql` first,
see it succeed, then fix it and see it fail.
