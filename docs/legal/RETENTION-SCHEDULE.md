> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**

# Retention schedule

How long each kind of data is kept, where, and what deletes it. "Built" means the deletion is
done by the code (a job of the database, a function, or the app); "to decide" means no rule
exists yet. Values checked in the code on 18 November 2026; the lines marked *(Nov. 2026)* come
from the work of the same round (automatic retention, the bin, snapshots, purge).

## On the server

| Data | Table or place | Kept | How it is deleted | Status |
|---|---|---|---|---|
| Account | `auth.users`, `accounts` | Until the person deletes it | "Delete my account" (fresh proof first); everything that belongs to it follows | Built |
| Inactive account | same | 24 months without sign-in → **counted** in the back office for a decision; not deleted automatically | By hand, after a decision | Counting built *(Nov. 2026)*; decision rule **to decide** |
| Child's profile | `profiles` | Until it is deleted | "Delete the profile of …" (fresh proof first) | Built |
| Deleted child's profile | The bin | **30 days**, can be restored, then erased | Automatic | Built *(Nov. 2026)* |
| Board snapshots | Snapshots | The **last 10** (weekly and before big changes) | The oldest goes when an 11th is made | Built *(Nov. 2026)* |
| Photos and recordings shared between the child's devices | Bucket `profile-media` | As long as the profile; fair-use quota | Server-side purge when the account or profile is deleted (purge queue + server function) | Built *(Nov. 2026)* |
| Follow-up days | `usage_days` | **24 months**, rolling | Automatic job | Built *(Nov. 2026)* |
| Sentences of the follow-up (level "Use, words and sentences") | inside `usage_days` | **12 months** | Automatic job | Built *(Nov. 2026)* |
| All the follow-up of a child | `usage_days` | — | "Erase the recorded data" (Progress page), at any time | Built |
| Observations | `observations` | As long as the profile `[to decide: same 24 months?]` | With the profile | **To decide** |
| Change history | `history` | **24 months** | Automatic job | Built *(Nov. 2026)* |
| Invitations | `invitations` | Valid **30 days** (refused after). Not answered: erased **60 days** after it was written (it can be sent again meanwhile). Answered or cancelled: **12 months** | Automatic job (`retention_daily`); also with the profile or account | Built *(Nov. 2026)* |
| Codes to link a device | `pairing_codes` | **10 minutes** | Removed when used or when a new one is made | Built |
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
| AI calls per day | `ai_calls` | **30 days** | Automatic job (`retention_daily`) | Built |
| E-mails written for the team | `team_mail` | **90 days** | Weekly job `team-mail-tidy` | Built |
| Details of the scheduled jobs | `cron.job_run_details` | **14 days** | Same job | Built |
| Identity documents of professionals | `verification-docs`, `verifications` | Until the decision (accepted or refused) | Deleted at the decision | Built |
| Diplomas, the verification request | same | As long as the account `[to decide]` | With the account | **To decide** |
| Parent's consent (date, text version) | Consent records | `[as long as the profile, plus the proof period: to decide]` | `[to decide]` | Recording built *(Nov. 2026)*; retention **to decide** |
| Deletion list (IDs and dates only, for restores) | Purge queue | **90 days** (as long as the oldest backup) | `[to confirm]` | **To confirm** |
| Supabase logs | Supabase | **1 day** (free plan) / **7 days** (Pro) | Supabase | Provider |
| Daily backups | Supabase | **7 days** (Pro) | Supabase | Provider |
| Encrypted weekly copies | `[off-site storage]` | **30 to 90 days** (`BACKUP_KEEP_DAYS`, 60 by default) | `scripts/backup-offsite.sh` or the bucket's lifecycle rule | Built |
| Subscriptions *(to come)* | — | `[accounting duty: to write]` | — | **To write** |

## On the devices

| Data | Kept | How it is deleted |
|---|---|---|
| Copy of each child's profile | While the account is signed in on the device | Sign-out, deletion, or the session ending elsewhere (`src/lib/deviceData.ts`) |
| Follow-up days not sent yet | **120 days** (`KEEP_DAYS` in `src/state/usageTracker.ts`) | Automatic; also on sign-out |
| Photos and recordings | Until the word is changed or the profile deleted | Deleted with the profile or the account; on sign-out only if the person ticks it (shared computer) |
| Session | Until sign-out; or for the visit only when "Keep me logged in" is unticked | Sign-out |
| Files made to print or share | Temporary | Sign-out (`clearExports`) |

## With outside services

| Data | Where | Kept |
|---|---|---|
| AI requests (topic, photo, drawing) | Anthropic | Not kept by us; Anthropic's own retention under its API terms `[to check]` |
| Dictation audio | Apple or Google, when not on the device | Their own policies |
| E-mails to the team | The team's mailbox (Gmail) | `[to decide]` |
| Requests received by e-mail | `[privacy e-mail]` | `[to decide]` |

Review this schedule with the DPIA, once a year and at every release that adds a kind of data.
