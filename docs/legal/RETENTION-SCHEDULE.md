> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**

# Retention schedule

How long each kind of data is kept, where, and what deletes it. "Built" means the deletion is
done by the code (a job of the database, a function, or the app); "to decide" means no rule
exists yet. Values checked against the code on 23 November 2026 (`retention_daily` as last written
in `supabase/migrations/20261122000000_gap_batch3.sql`, the bin, the purge queue, the
notifications and the files of `20261122000200_gap_batch5.sql`); the lines marked *(Nov. 2026)*
come from the work of that month (automatic retention, the bins, snapshots, purge, notifications).
The nightly job `retention_daily` runs at 03:25 UTC; the bin is emptied at 03:10 UTC
(`erase_old_bin`), the notifications are tidied at 03:50 UTC (`push_tidy`).

## On the server

| Data | Table or place | Kept | How it is deleted | Status |
|---|---|---|---|---|
| Account | `auth.users`, `accounts` | Until the person deletes it | "Delete my account" (fresh proof first); everything that belongs to it follows | Built |
| Inactive account | same | 24 months without sign-in → **counted** in the back office for a decision; not deleted automatically | By hand, after a decision | Counting built *(Nov. 2026)*; decision rule **to decide** |
| Child's profile | `profiles` | Until it is deleted | "Delete the profile of …" (fresh proof first) | Built |
| Deleted child's profile | The family's bin (`profiles.deleted_at`) | **30 days**, can be restored, then erased with everything that belongs to it | Nightly job `erase_old_bin`; its files through the purge queue | Built *(Nov. 2026)* |
| Words and activity boards deleted on a board | The profile's own bin (inside the profile) | **30 days** (100 items at most), can be put back | Dropped by the app after 30 days (`src/lib/wordBin.ts`) | Built *(Nov. 2026)* |
| Board snapshots | Snapshots | The **last 10** (weekly and before big changes) | The oldest goes when an 11th is made | Built *(Nov. 2026)* |
| Photos and recordings shared between the child's devices | Bucket `profile-media` | As long as the profile; a file no board uses any more stays **30 days** after it was sent, and as long as the profile, an earlier version of the board, the last 30 days of its history, a name a save stopped using in the last 30 days or a waiting proposal uses it; fair-use quota | Removed by a manager's device after that (the database refuses earlier: `media_in_use`); server-side purge when the profile is erased (purge queue + `caa-purge`) | Built *(Nov. 2026)* |
| Names of the files a save stopped using (random file names only) | `media_dropped` | **60 days** at most (cleaned at the profile's next save); with the profile | Trigger `note_media_dropped` | Built *(Nov. 2026)* |
| Follow-up days | `usage_days` | **24 months**, rolling | Automatic job | Built *(Nov. 2026)* |
| Sentences of the follow-up (level "Use, words and sentences") | inside `usage_days` | **12 months** | Automatic job | Built *(Nov. 2026)* |
| All the follow-up of a child | `usage_days` | — | "Erase the recorded data" (Progress page), at any time | Built |
| Observations | `observations` | As long as the profile `[to decide: same 24 months?]` | With the profile | **To decide** |
| Change history | `history` | **24 months** | Automatic job | Built *(Nov. 2026)* |
| Invitations and connection requests | `invitations` | Valid **30 days** (refused after). Not answered: erased **60 days** after it was written (it can be sent again meanwhile). Decided (accepted, declined or cancelled): erased **12 months** after it was written | Automatic job (`retention_daily`); also with the profile or account | Built *(Nov. 2026)* |
| Codes to link a device | `pairing_codes` | Valid **10 minutes** | Removed when used, when its author makes a new one, or when anyone makes a code after it expired; with the profile | Built |
| Notices | `notices` | **12 months** | Automatic job | Built *(Nov. 2026)* |
| Devices that accepted notifications (address at the browser's notification service, its two keys, language, time zone) | `push_subs` | Until turned off, sign-out on that device or account deletion; **12 months** without opening the app | By the person; automatic job (`push_tidy`); removed when the browser withdraws it | Built *(Nov. 2026)* |
| Notifications waiting or sent | `push_out` | **2 days** | Automatic job (`push_tidy`) | Built *(Nov. 2026)* |
| When a child's board was last opened (one moment per child) | `profile_seen` | Replaced at each opening | With the profile | Built *(Nov. 2026)* |
| Messages to the team | `feedback` | **3 years** | Automatic job | Built *(Nov. 2026)* |
| Votes | `roadmap_votes` | As long as the account | With the account | Built |
| Team's action log | `admin_log` | **5 years** | Automatic job | Built *(Nov. 2026)* |
| Feature counters | `feature_days` | **180 days**; erased at once when the family stops sharing | Automatic job (`retention_daily`), trigger `forget_product` | Built |
| Technical problems (linked to nobody) | `error_counts` | **180 days** | Automatic job (`retention_daily`) | Built |
| Recent actions (to refuse repeats) | `rate_log` | **2 days** | Automatic job (`retention_daily`) | Built |
| AI calls per day, and the service's daily ceiling | `ai_calls`, `ai_budget` | **30 days**. Nothing is written today: the AI helper is switched off (`caa-ai` not deployed) | Automatic job (`retention_daily`) | Built |
| E-mails written for the team | `team_mail` | **90 days** | Weekly job `team-mail-tidy` | Built |
| Details of the scheduled jobs | `cron.job_run_details` | **14 days** | Same job | Built |
| Identity documents of professionals | `verification-docs`, `verifications` | Until the decision (accepted or refused) | Deleted at the decision | Built |
| Diplomas, the verification request | same | As long as the account `[to decide]` | With the account | **To decide** |
| Parent's consent (date, text version) | `consents` | Today: as long as the parent's account (kept when only the profile is deleted). `[proof period after the account is deleted: to decide]` | With the account | Recording built *(Nov. 2026)*; retention **to decide** |
| Deletion list: the folders and files to erase from storage (a person's or a child's ID, a file name, the reason, the dates) | Purge queue `storage_purge` | Until `caa-purge` has deleted the files, then **30 days** | Automatic job (`retention_daily`) | Built *(Nov. 2026)*. *Reviewer: the off-site copies are kept up to 90 days, longer than this list; see `docs/runbooks/BACKUP-AND-RESTORE.md`, section 6* |
| Supabase logs | Supabase | **1 day** (free plan) / **7 days** (Pro) | Supabase | Provider |
| Daily backups | Supabase | **7 days** (Pro) | Supabase | Provider |
| Encrypted weekly copies | `[off-site storage]` | **30 to 90 days** (`BACKUP_KEEP_DAYS`, 60 by default) | `scripts/backup-offsite.sh` or the bucket's lifecycle rule | Built |
| Subscriptions *(to come)* | — | `[accounting duty: to write]` | — | **To write** |

## On the devices

| Data | Kept | How it is deleted |
|---|---|---|
| Copy of each child's profile | While the account is signed in on the device | Sign-out, deletion, or the session ending elsewhere (`src/lib/deviceData.ts`) |
| Follow-up days not sent yet | **120 days** (`KEEP_DAYS` in `src/state/usageTracker.ts`) | Automatic; also on sign-out |
| Photos and recordings | 30 days after the board stops using them (changed word, deleted profile, reset) | Erased then if no board kept on the device uses them; with the account when it is deleted; at sign-out unless the person unticks it (ticked by default) |
| Session | Until sign-out; or for the visit only when "Keep me logged in" is unticked | Sign-out |
| Files made to print or share | Temporary | Sign-out (`clearExports`) |

## With outside services

| Data | Where | Kept |
|---|---|---|
| AI requests | Anthropic | Nothing is sent: the AI helper is switched off and its server function is not deployed. *Before it is turned on: what is sent, its retention, the consent text, and families asked again* |
| Notifications outside the app (web version, if turned on) | The browser's notification service (Google FCM, Mozilla, Apple, Microsoft) | Carried encrypted until delivered, at most the message's lifetime (3 hours for the reminder, 2 days for a new idea); their own policies |
| Dictation audio | Apple or Google, when not on the device | Their own policies |
| E-mails to the team | The team's mailbox (Gmail) | `[to decide]` |
| Requests received by e-mail | `empowerhub.me@gmail.com` | `[to decide]` |

Review this schedule with the DPIA, once a year and at every release that adds a kind of data.
