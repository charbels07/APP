# Incident response

What to do when something goes wrong in production: the app stops working for families, data
is lost, or someone may have reached data they should not. Assessment item: 7.16.

If personal data may be involved, open `DATA-BREACH.md` **at the same time**: the 72-hour clock
starts when we learn about it, not when we are sure.

## 1. Roles

In a small team one person may hold two roles, never all of them. Write the names on the
incident record as soon as it opens.

| Role | Does | Who (first / second) |
|---|---|---|
| **Incident lead** | Decides, keeps the record, sets the next meeting time. Does not fix things with their own hands | `[owner]` / `[second admin]` |
| **Technical lead** | Contains, investigates, fixes. Says what is known and what is guessed | `[developer]` / `[backup developer]` |
| **Communication** | Writes to families (three languages), the stores, partners | `[name]` |
| **Privacy** | Decides whether it is a personal data breach, prepares the notification | `[DPO]` |
| **Legal** | Advises on notifications and on what can be said | `[lawyer]` |

## 2. Contacts

| Who | How | When |
|---|---|---|
| Owner | `[phone]`, `[e-mail]` | Always |
| Developer | `[phone]`, `[e-mail]` | Always |
| Backup developer | `[phone]`, `[e-mail]` | Developer unreachable for 2 hours |
| DPO | `[DPO]`, `[e-mail]` | Any doubt about personal data |
| Lawyer | `[lawyer]`, `[phone]` | Before telling families or an authority |
| CNIL | Online notification form (notifications.cnil.fr) | Personal data breach (`DATA-BREACH.md`) |
| Supabase support | Dashboard → Support (paid plan: priority) | Server, database, backups |
| Cloudflare support | Dashboard → Support | Support pages, the testers' web version |
| Apple App Store Connect | `[account]` → Contact us | App review, expedited review, app removed |
| Google Play Console | `[account]` → Help → Contact us | Same |
| Anthropic | console.anthropic.com | AI key leaked or abused (only once the AI is turned on: it is switched off today) |
| Insurance (cyber) | `[insurer]`, `[policy number]` | Breach, ransom, legal costs |

## 3. Severity

| Level | Means | Examples | Response |
|---|---|---|---|
| **SEV 1** | Children cannot communicate, wrong words are spoken, data of children is exposed or lost, an attacker is inside | A release makes the board say other words; a family sees another family's child; the database was emptied; a team account was taken over | Everyone now, day or night. Record opened at once. Families told the same day if they must act |
| **SEV 2** | An important part is down, no data exposed | Sync stopped for everyone; nobody can sign in; e-mails with codes do not arrive | Within 2 hours, working hours extended. Notice in the app |
| **SEV 3** | Limited impact | One sign-in method broken; a back-office page fails; the weekly team e-mail did not leave | Next working day |

Remember: the child's board is kept on the device and works without internet. A server outage
alone is usually SEV 2, not SEV 1, **unless** devices start losing their board (see the warning
in section 5).

## 4. The steps

1. **Detect and declare.** Anyone can declare an incident. Open a record (`[place: shared
   document]`): time, who noticed, what is seen. Give it a level; it can change later.
2. **Contain.** Stop the damage before understanding it all (section 5).
3. **Keep the evidence** (section 6) before anything rotates it away.
4. **Assess.** What happened, since when, which data, how many children, families and
   professionals, which countries. Write facts and guesses in separate columns.
5. **Notify.** If personal data is involved: `DATA-BREACH.md` (CNIL within 72 hours; other
   countries; the register). Stores if the app must change in a hurry.
6. **Inform families**, in French, English and Arabic: a notice in the app (section 5) and an
   e-mail when they must act (templates in `DATA-BREACH.md`).
7. **Fix.** The real cause, with a test that would have caught it (a new attack goes in
   `supabase/tests/security_scenario.sql`; a new app bug gets a test in `src/__tests__/`). Then
   the release checklist, without skipping steps.
8. **Recover.** Restore data if needed (`BACKUP-AND-RESTORE.md`), turn back on what was
   switched off, check with families that boards are complete.
9. **Review** within two weeks, without blame: timeline, what helped, what slowed us down,
   actions with an owner and a date. Update this page and `CONTINGENCY.md`.

## 5. Containment actions for this stack

Names in the dashboards move a little between versions; look for the nearest wording.

### Keys and secrets

| Action | How | Effect on families |
|---|---|---|
| **Rotate the Supabase secret keys** (a server key leaked) | Project Settings → API Keys → Secret keys: create a new one, then delete the old one. Redeploy `caa-mail`, `caa-purge` and `caa-push` ("Verify JWT" off: `supabase/config.toml`) and check them (`select public.team_mail_test();`, `select * from push_check();`) | None if the app only holds the publishable key |
| **Rotate the JWT signing key** (tokens can be forged) | Project Settings → JWT Keys: create a standby key, rotate, then revoke the previous key. Revoking makes every access token signed with it stop working; the app gets a new one with its refresh token | Short interruption of sync |
| ⚠️ **Legacy JWT secret** | If the project still uses the legacy JWT secret and the app ships the legacy "anon" key, changing that secret **breaks every installed app** until new store builds are out (the key is built into the app). Check which key the builds use **before** an incident: it must be the publishable key | Severe |
| **Switch off the AI helper** (`caa-ai`; not deployed today, the AI is switched off) | Edge Functions → `caa-ai` → delete; or `npx supabase secrets unset ANTHROPIC_API_KEY`. Revoke the key on console.anthropic.com. The app stops showing AI buttons by itself (it asks the server whether the function exists) | AI suggestions disappear; everything else works |
| **Switch off the team e-mails** (`caa-mail`) | SQL: `delete from public.team_mail_config;` (messages wait, nothing is sent). This also stops `caa-purge` and `caa-push`, which use the same key: files to delete and notifications wait in their queues until `team_mail_connect` is run again. Remove the Gmail app password used by `SMTP_PASS` | None (files of erased things are deleted later) |
| **Gmail account compromised** | Change its password; Google Account → Security → sign out of all devices; delete every app password; make new ones; update Supabase → Authentication → SMTP and the `SMTP_PASS` secret | Sign-in codes stop arriving until SMTP is updated |

### People and devices

| Action | How | Effect |
|---|---|---|
| **Remove a team member from the back office** | SQL: `delete from public.admins where user_id = (select id from auth.users where email = '…');` then end their sessions (below) | They lose the back office at once (`is_admin()` reads the table each time) |
| **Sign one person out** | SQL: `delete from auth.sessions where user_id = '…';` | That person signs in again |
| **Sign everyone out** | Only for a SEV 1 that needs it. Sign out every real account but **not** the children's linked tablets: `delete from auth.sessions where user_id in (select id from auth.users where not is_anonymous);` Then revoke the JWT signing key (above) so current tokens stop too | Every parent and professional signs in again (two-step sign-in where it is on) |
| **Revoke a device** | Ask the family: Settings → Account → Devices → Remove. Or SQL, for the profile and device concerned: `update public.devices set revoked = true where profile_id = '…' and id = '…';` and `update public.members set status = 'revoked' where profile_id = '…' and user_id = '…' and role = 'device';` | That tablet loses its access to the child's profile |

⚠️ **Why the tablets are left out of "sign everyone out".** A tablet linked with a code signs in
without an e-mail (an "anonymous" account): it cannot sign in again by itself. And when the app
starts without a session, it erases the board copy kept on that device, except changes that
were never sent (`forgetEverything({ keepUnsent: true })` in `src/state/Session.tsx`). Ending
the tablets' sessions therefore leaves children **without their board** until a parent links
the tablet again with a new code. Do it only if the tablets themselves are the problem, and tell
the families first.

The same is true, for a shorter time, of a child's tablet signed in with a **parent's own
account**: when that parent is signed out, the board leaves that tablet until the parent signs
in on it again. Before signing everyone out, send the maintenance notice (below) so that parents
know they must sign in again on the child's device.

### The app, the pages, the code

| Action | How |
|---|---|
| **Maintenance notice in the app** | Notices are in-app only. Since 18 November 2026: in the SQL editor, `select public.admin_broadcast('[FR] …', '[EN] …', '[AR] …');` — each account receives the message in its own menu language (5 a day at most, written in the team's log). Before that database file is run: `insert into public.notices (user_id, kind, text) select id, 'access', '[FR] … / [EN] … / [AR] …' from auth.users where not is_anonymous;` |
| **Pause a store release** | App Store Connect: pause the phased release. Play Console: halt the rollout (`RELEASE-CHECKLIST.md`, section 8) |
| **Take back the store pages** | Cloudflare → Workers & Pages → the project → Deployments → roll back |
| **GitHub** | Revoke personal access tokens and deploy keys that are not needed; check the audit log; check the Cloudflare and Expo connections to the repository |
| **Database rule broken** | A migration that closes the hole, run in the SQL Editor (it is not published by a merge), with its attack added to `supabase/tests/security_scenario.sql` |

## 6. Keep the evidence

Logs do not wait: **Supabase keeps its logs 1 day on the free plan and 7 days on Pro.** In the
first hour:

| Where | What to save |
|---|---|
| Supabase → Logs (API, Postgres, Auth, Storage, Edge Functions) | Export the period concerned (CSV or JSON) |
| SQL: `select * from public.admin_log order by created_at desc limit 1000;` | What the team did in the back office |
| SQL: `select * from auth.audit_log_entries order by created_at desc limit 1000;` | Sign-ins, sign-ups, password changes |
| Cloudflare → the project → logs and analytics | Requests to the store pages |
| GitHub → Settings → Audit log (organisation) / Security log (account) | Who changed what |
| Google Account (Gmail) → Security → Recent activity | Sign-ins to the mailbox |
| Apple, Google Play, Anthropic, Expo consoles | Access and activity of the period |

Store the exports in `[place with restricted access]`, write their sha256 in the record, and
keep them with the incident record (as long as the breach register, `DATA-BREACH.md`). They may
contain personal data: only the incident team reads them.

## 7. Incident record (template)

| Field | |
|---|---|
| Number, level | |
| Opened (date, time, time zone), by | |
| Roles (lead, technical, communication, privacy) | |
| What was seen | |
| Timeline (time — fact — who) | |
| Containment done | |
| Evidence saved (where, sha256) | |
| Data concerned, people concerned (children / adults), countries | |
| Personal data breach? Decision and who decided | |
| Notifications (authority, date, reference) | |
| Families informed (how, when, languages) | |
| Fix (commit, migration, release) | |
| Closed (date), review date | |

## 8. Yearly table-top exercise

Once a year (`[month]`), two hours, the whole team, no real system touched. One person plays
the scenario, the others say what they do, step by step, with this page open. Rotate the
scenarios:

1. A professional's account is taken over and reads the follow-up of three children.
2. A release makes "eat" say "drink" on Android tablets in Arabic.
3. The Supabase project is unreachable for a whole day.
4. The AI key appears in a public GitHub repository.
5. A laptop with the backup private key is stolen.

Write what was missing (a phone number, an access, a step) and fix it within a month. Note the
date of the exercise in `CONTINGENCY.md` (risk register, "last review").
