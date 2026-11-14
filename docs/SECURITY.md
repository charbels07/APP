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
| The website sent no browser protections. | `public/_headers` (Cloudflare adds them): own scripts only, cannot be shown inside another site, camera and microphone for the app only. One side effect on the website only: pasting the *address* of a picture from another site is refused by the browser (pasting the picture itself, or choosing a file, works; the tablet app is not affected). |
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

## 4. What only you can do

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
| A second step (code from a phone app) to open the back office | Needs a small screen to enrol; then one line in the database makes it mandatory. |
| Asking the password again before linking a full-access device or deleting | Not possible the same way for Google accounts; to design. |
| Keeping the session in the phone's secure storage (iOS Keychain / Android Keystore) | Needs a native module and a test on real devices; do it with the first App Store build. |
| A robot check (CAPTCHA) on sign-up and on tablet sign-ins | Needs a Cloudflare Turnstile key and a small change in the app. |
| Deleting files from the server side when an account is deleted | Done from the app today (best effort); a server function with the secret key would guarantee it. |
| "Has this e-mail an account?" can still be learned by inviting or sharing | Limited to 30 invitations and 40 shares a day; hiding it fully changes how sharing answers. |
| Team members (even a use-only tablet) can read the other members' e-mail and the family code | Needs the app to stop reading whole rows. |
| A full-access device is active as soon as its code is typed | Safer: the family confirms it on their own screen. |
| Speech: the phone's dictation may send audio to Apple or Google | Texts in the app should say so, or dictation should be limited to on-device recognition where it exists. |
| A test by a security professional, and the legal side (privacy policy, where the data is hosted) | Before selling: an outside review is worth its price for an app about children. |

## 6. How it stays checked

| Command | What it proves |
|---|---|
| `npm run test:db` | 95 checks on a throw-away database: the normal story, then **every attack of this review, which must fail**. |
| `npm test` | 191 tests; `security.test.ts` covers links, other people's changes, what stays on the device, the print page, the website protections. |
| `npm audit` | Known flaws in libraries. Today: none in what ships to families (4 medium ones in build tools only). |
| `npm run test:a11y` | The screens still pass the accessibility scan after these changes. |

When a database rule changes, add the attack to `supabase/tests/security_scenario.sql` first,
see it succeed, then fix it and see it fail.
