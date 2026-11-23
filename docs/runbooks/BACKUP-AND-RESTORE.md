# Backup and restore

How the server's data is copied, how long the copies live, and how to bring them back.
Assessment items: 2.13, 21.3, 21.4, 6.17.

**The child's board does not depend on these copies to work**: each device keeps its own copy
of the board and works without internet. Backups protect what lives on the server: accounts,
children's profiles, teams, history, follow-up, the back office.

## 1. Three layers

| Layer | What | How often | Kept | Where | Who checks |
|---|---|---|---|---|---|
| 1 | Supabase's own backups (Pro plan or higher) | Every day, by Supabase | 7 days on Pro | Supabase, same region as the project | `[owner]`, every week: Database → Backups shows one backup per day |
| 2 | Encrypted copy away from Supabase (`scripts/backup-offsite.sh`) | Every week | 90 days (`BACKUP_KEEP_DAYS`, 90 by default) | Another provider, in the EU: `[off-site storage provider and region]` | `[owner]`; the script prints what it did |
| 3 | Restore test into a separate project | Every quarter | — (the test project is deleted after) | A new, empty Supabase project | `[owner]` + `[second admin]` |

The free Supabase plan keeps no backup at all: the project must be on a paid plan before real
families use it (`docs/SECURITY.md`, section 4).

## 2. What is in the copies, and what is not

| In the copies | Not in the copies |
|---|---|
| Every table of the database (`supabase/README.md`, "What is where"), including the accounts of Supabase Auth (passwords are stored scrambled), consents, the bin of deleted profiles, the deletion list | **Files** in Storage: photos and recordings (`profile-media`), professionals' diplomas (`verification-docs`). Supabase's database backups do not hold them, and neither does `pg_dump`. Photos and recordings also stay on the family's devices |
| | The settings of the dashboards (sign-in providers, SMTP, URL configuration, secrets of the server functions). Keep a written list of the settings (not the secrets) in `docs/ACCESS-LIST.md` |
| | What lives only on devices: the child's copy of the board, the follow-up days not sent yet (`src/lib/deviceData.ts`) |

**To decide (`[owner]`):** whether the Storage files need an off-site copy too. It would need
an access key to Supabase Storage (S3 protocol) on the backup machine. Until then, a lost
project loses the copies of photos and recordings that are not on any device any more.

## 3. Layer 2: the weekly encrypted copy

### Set up once

1. **The key pair.** On a computer that is not connected to the team's accounts:
   `age-keygen -o empower-backup-key.txt`. The line `# public key: age1…` is the public key.
   - The **private key** (the file) is printed on paper and kept in two places: `[place 1:
     owner]`, `[place 2: second admin]`. Also in the password manager of each of them. Never
     on the backup machine, never in GitHub, never in an e-mail or a chat.
   - The **public key** (`age1…`) is not a secret: it only allows making copies.
   - (`gpg` works too: `BACKUP_GPG_RECIPIENT` with a public key in the keyring.)
2. **The storage place.** An account with an object storage provider other than Supabase, with
   a bucket in the EU: `[provider]`, `[bucket]`. Turn on versioning or "object lock" if offered,
   so that a stolen backup machine cannot erase the copies. Give the backup machine a key that
   can write and list but, if the provider allows it, not delete; then old copies are removed
   by a lifecycle rule of the bucket (same 30–90 days) instead of by the script, and the
   script runs with `BACKUP_PRUNE=no`.
3. **rclone** on the backup machine: `rclone config` → a remote named, for example, `offsite`
   pointing to that bucket. Its keys stay in rclone's own config file.
4. **The database address**: Supabase → Project Settings → Database → Connection string (the
   "session" connection). It contains the database password: keep it in the password manager.
   `pg_dump` on the backup machine must be the same major version as the server or newer.

### Every week (`[day]`, `[person]`)

```bash
DATABASE_URL='…from the password manager…' \
BACKUP_AGE_RECIPIENT=age1… \
BACKUP_RCLONE_REMOTE=offsite:empower-backups \
bash scripts/backup-offsite.sh
```

The script refuses to start if a setting is missing. It dumps the database, encrypts it on the
fly (nothing unencrypted is written to disk), sends it, checks the size at the other end, and
deletes the copies older than `BACKUP_KEEP_DAYS` (30 to 90). Copy its last line into the backup
log (section 7).

Do not run it from GitHub Actions for now: GitHub would then hold the password of a database
full of children's data.

## 4. Layer 3: the quarterly restore test

A backup that was never restored is a hope, not a backup. Every quarter (`[months]`), two people:

1. Create a **new, empty Supabase project** in the EU (name: `restore-test-YYYY-MM`). Never
   restore into the project families use.
2. Run the files of `supabase/migrations/` on it, in order (as in `supabase/README.md`,
   section 1).
3. Take the latest off-site copy and decrypt it on the computer that holds the private key:

   ```bash
   rclone copyto offsite:empower-backups/empower-db-….dump.age ./copy.dump.age
   age --decrypt --identity empower-backup-key.txt copy.dump.age > copy.dump
   pg_restore --list copy.dump | head
   ```

4. Restore the accounts first, then the app's tables. Triggers are paused during the restore
   (`session_replication_role = replica`), so that no notice or account is created twice:

   ```bash
   export PGOPTIONS='-c session_replication_role=replica'
   pg_restore --data-only --no-owner --dbname="$TEST_DATABASE_URL" --schema=auth --table=users --table=identities --table=mfa_factors copy.dump
   pg_restore --data-only --no-owner --dbname="$TEST_DATABASE_URL" --schema=public copy.dump
   unset PGOPTIONS
   ```

   The first test will show what this page gets wrong for the current Supabase version: correct
   this page right after.
5. Compare with production on the day of the copy: number of accounts, profiles, members,
   usage days. A few lines of SQL in both projects:

   ```sql
   select (select count(*) from auth.users) users, (select count(*) from public.profiles) profiles,
          (select count(*) from public.members) members, (select count(*) from public.usage_days) days;
   ```

6. Delete `copy.dump`, `copy.dump.age` and the test project. Write the result in the log
   (section 7): date, copy used, counts, time taken, problems.

Once a year, also test layer 1: Supabase → Database → Backups → restore to a new project (if
the plan offers it), and compare the same counts.

## 5. Restoring for real

Only when data on the server is lost or damaged, never to undo a bad release
(`RELEASE-CHECKLIST.md`, section 8). It is an incident: follow `INCIDENT-RESPONSE.md`.

1. Decide which copy: the most recent one before the damage. Everything that happened on the
   server after it is lost; write down that moment.
2. **Before anything else, save the deletion list** of the damaged project if it can still be
   read (section 6).
3. Prefer restoring into a **new project**, then switch: the app's builds hold the server's
   address, so switching projects needs new store builds unless the project has a custom domain.
   Restoring into the same project (Supabase → Database → Backups) keeps the address.
4. Re-apply the deletions (section 6). Then the files purge for those IDs.
5. Tell families in the app (a notice, three languages) what was lost: changes made on the
   server between the copy and the restore. Their devices still hold their own copy of each
   board. **To check at the first restore test:** what a device does when the server's version
   of a board is older than its own (it should send its copy again; it must never lose it).

## 6. Deletions must stay deleted

When a family deletes an account or a child's profile, it must not come back with a restore.

- The server keeps a **deletion list**: the IDs (never names) of the accounts and profiles
  deleted, with the date. It is filled by the server-side deletion (its purge queue,
  `storage_purge`: the folder `<id>/` of the account or the profile, the reason, the dates).
  Profiles erased at the end of their 30 days in the bin are on it too.
- The deletion list is copied with the database every week (layer 2), and must be read from the
  **damaged project** before a restore when it is still readable: it is newer than any backup.
  The database removes a line **100 days** after its files were deleted (`retention_daily`, owner's
  decision of 23 November 2026), longer than the oldest off-site copy (90 days at most): the deletion
  list of the damaged project (or of the newest copy) covers every deletion made after any copy.
- If the damaged project cannot be read at all: use the newest off-site copy's deletion list,
  plus the deletion requests received by e-mail at `empowerhub.me@gmail.com` since that copy.

After the restore, in the SQL Editor of the restored project, with the IDs deleted **after the
date of the copy**:

```sql
-- accounts deleted after the copy: everything that belongs to them follows (on delete cascade)
delete from auth.users where id in ('…', '…');
-- children's profiles deleted after the copy
delete from public.profiles where id in ('…', '…');
```

Then let the purge function delete their files, and write in the log how many IDs were
re-deleted.

## 7. Backup log

Kept by `[owner]` in `[place]`. One line per run, per test, per restore.

| Date | What (weekly copy / restore test / real restore) | Copy | Size / sha256 | Result | Who |
|---|---|---|---|---|---|
| | | | | | |

## 8. Retention of the copies

| Copy | Lives | Why |
|---|---|---|
| Supabase daily backups | 7 days (Pro) | Set by Supabase |
| Off-site encrypted copies | 90 days (`BACKUP_KEEP_DAYS`, 90 by default; never more than the deletion list's 100 days) | Long enough to notice a slow problem; short enough that deleted data does not live on for long |
| Restore test projects | Deleted the same day | They hold real data |
| Decrypted files (`copy.dump`) | Deleted right after use | They are readable |

The privacy policy and the account-deletion page tell families these numbers.

## The key of the sealed sentences (since 18 November 2026)

The children's sentences and the observations' texts are encrypted in the database with a key kept in
Supabase Vault (`caa_field_key`). Supabase's own backups restore it with the project. A `pg_dump` copied
to **another** project cannot read it (Vault secrets are encrypted with the project's own root key), so:

1. Once, after running `20261118000500_privacy.sql`: in the SQL editor,
   `select decrypted_secret from vault.decrypted_secrets where name = 'caa_field_key';`
   and store the value in the company password manager (two people can open it). Never paste it in a chat,
   an e-mail or a ticket.
2. When restoring into a new project: before anything reads the follow-up, create the same secret there:
   `select vault.create_secret('<the value>', 'caa_field_key');`
3. Never delete or change that secret: the sealed sentences and notes would become unreadable.
