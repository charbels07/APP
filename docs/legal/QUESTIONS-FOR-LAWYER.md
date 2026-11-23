# For the owner's lawyer (a list, not decisions)

These are **questions**, not decisions. Each one says what the app does today (with the file or
function where it happens), why it matters, and the options we see. Nothing here has been changed in
the app because of these questions. The documents in `docs/legal/` (privacy policy, terms, DPIA,
record of processing, retention schedule…) are **drafts** written from the code, for a lawyer to
review; none of them is final.

Written 23 November 2026 from the gap review (`docs/GAP-REVIEW-2026-11.md`, batch 6) and the
database files in `supabase/migrations/`.

## 1. Should the proof of the parent's consent survive the account's deletion?

**Today.** Before a family creates a child's profile, or takes over one a professional prepared, the
parent ticks a statement; the database keeps who, when and which text version in the table
`consents` (`20261118000500_privacy.sql`; `give_consent`, `take_consent`; text and version in
`src/lib/consent.ts`). The row is tied to the parent's account (`user_id … on delete cascade`): when
the account is deleted (`delete_account(p_erase)` in `20261122000100_gap_batch4.sql`, which deletes the
row of `auth.users`), the consent rows are deleted with it, at once. When only the child's profile is
erased, the consent row stays as long as the parent's account (`profile_id … on delete set null`).
Database backups keep a copy for at most 90 days (`docs/runbooks/BACKUP-AND-RESTORE.md`).
`docs/legal/RETENTION-SCHEDULE.md` marks this "to decide".

**Why it matters.** After a deletion we could no longer show that the child's data was handled with
the parent's consent (in a complaint or an inspection). But keeping it means keeping something about a
person who asked to be erased.

**Options.**
- a) Keep as today: the proof goes with the account.
- b) Keep a reduced record for a fixed time after the deletion (date, text version, an identifier
  that no longer points to a live account, no name or e-mail), e.g. the time limit for a complaint.
- c) Keep the full record (who, when, which version) for that time.

## 2. How long should observations be kept?

**Today.** Observations (notes about the child's communication written by the family or the team:
utterance, function, context, partner, result, note) are in the table `observations`
(`20261111000000_usage_data.sql`). Their free texts are sealed (encrypted) in the database
(`20261118000500_privacy.sql`, `20261122000000_gap_batch3.sql`) and read only through
`list_observations`. They are kept **as long as the child's profile**: the nightly job
`retention_daily` (latest version in `20261122000000_gap_batch3.sql`) does not touch them, while the
follow-up days are kept 24 months and the child's sentences 12 months. When the author's account is
deleted, their observations on another family's child stay in that profile with their name
(`created_by … on delete set null`, `author_name` kept). `RETENTION-SCHEDULE.md`: "to decide: same 24
months?".

**Why it matters.** They are free text about a child, sometimes close to health information.

**Options.** a) As long as the profile (today); b) 24 months like the follow-up; c) a shorter time for
the free texts only (the counts stay); d) also remove the author's name when the author's account is
deleted.

## 3. How long should a professional's diplomas be kept?

**Today.** A professional who asks to be verified sends a diploma or licence and an identity document
(private storage `verification-docs`, table `verifications`). The **identity document** is deleted at
the team's decision (`admin_decide_verification`, `20261113000000_backoffice.sql`). The **diploma** and
the request (full name, profession, country, organisation) are kept **as long as the account**; when
the account is deleted, the row goes with it and the files are deleted by the server's purge queue
(`purge_account_files` in `20261118000100_storage_purge.sql`, function `caa-purge`). Files are not in
the database backups. `RETENTION-SCHEDULE.md`: "to decide".

**Why it matters.** A diploma is personal data; we may need it again if a family complains about a
professional, or if a certificate is withdrawn.

**Options.** a) As long as the account (today); b) delete the diploma once verified and keep only
"verified on (date) by (team member), document seen: diploma"; c) keep it a fixed time after the
decision, then delete.

## 4. What to do with inactive accounts?

**Today.** Accounts without a sign-in for 24 months are **only counted** for the team (Back office →
Security; `admin_retention` in `20261118000500_privacy.sql`). Nothing deletes them automatically, by
decision (`CLAUDE.md`: never delete accounts automatically unless asked). A child's board keeps working
on the device without the server.

**Why it matters.** Data should not be kept longer than needed; but deleting an account that a child's
tablet still uses could take a child's voice away, and a family may come back.

**Options.** a) Count only (today); b) warn the account (e-mail, notice) at 24 months, then delete after
a further period without answer; c) delete only the server copy and keep nothing else, telling the
family before; d) a different period for professionals' accounts.

## 5. The professional's name in the team's log for 5 years

**Today.** Every verification decision and every document the app's team opens is written in the
team's log `admin_log` (`admin_note`, called by `admin_decide_verification` and `admin_open_document`
in `20261113000000_backoffice.sql`): the professional's full name, the decision or the kind and name of
the document, the team member, the date. The log has no link to the account (`target_id` is a plain
id), so it **stays after the professional deletes the account**, and is removed after **5 years** by
`retention_daily`. Related: the e-mail that told the team about the request (name, profession, country)
stays 90 days in `team_mail` (`team_mail_tidy`, `20261116000000_team_mail.sql`) and in the team's
mailbox for a time not decided (`RETENTION-SCHEDULE.md`). The public page
`public/delete-account/` says the log is kept 5 years.

**Why it matters.** It is our proof of who was checked and who saw a document; but it keeps a named
person's data years after they asked to be erased.

**Options.** a) Keep 5 years with the name (today); b) keep the decision and the date but replace the
name after the deletion (or after a shorter time); c) a shorter period; d) decide how long the team's
mailbox keeps the request e-mails.

## 6. The payment rules (decided as rules, not built)

The owner decided these rules (gap review, "Payment: decided as rules, NOT to build now", Q28, Q44–Q46);
nothing of it exists in the app. They are copied here as the questions to check before that project
starts.

- Prices under discussion: families 9.99 $ monthly or 99.99 $ yearly; therapists 150 $ once.
- Every professional pays and is verified, invited ones included.
- A family that stops paying: days 1–7 nothing is blocked, reminder every day; days 8–14 everything is
  blocked except the child talking, reminders continue; after day 14 the board is frozen and **the child
  still talks, for good** (no new words, editing, sync, follow-up, team or backup). Paying restores
  everything at once: nothing is deleted meanwhile.
- The therapist's side of that child (her draft, materials, notes) keeps working; what she sends to the
  family's board waits until the family pays again.
- Reminders never appear on the board while the child talks: a dot on "Settings" and "Caregiver", the
  full message after the caregiver code, the daily notification to the parent's account (never a child's
  name or words). A tablet linked with a code only gets the dot.
- To check in that project: Apple's and Google's purchase rules and their own renewal notices.

**Questions to check.**
- **Store rules.** Do Apple's and Google's rules allow these prices, a one-time payment for
  therapists, and paying for a professional's access to a family's profile? Must every purchase go
  through the store's own payment inside the app? What do their own renewal and cancellation notices
  already tell the family, and does our reminder have to match them? What do their rules for apps in the
  children's category say about payment screens (here, only behind the caregiver code)?
- **Freezing a non-paying family's board while the child still talks.** Is it allowed to block
  editing, sync, the team and backups of a disabled child's communication tool after 14 days? Is "the
  child still talks, for good" enough, or must more stay open (e.g. the family's own export of the
  board, "Download all my data", deleting the account)? Must the terms say it in advance, and in which
  words? Is a professional's work for that child (which keeps working) affected?
- **Data while frozen.** "Nothing is deleted meanwhile": for how long can a frozen account's data be
  kept before the retention rules (or question 4) apply?
- **Reminders.** Daily reminders for 14 days, then a dot and a daily notification "for good": is that
  acceptable to consumer law (pressure, frequency)? The notification never names the child; is a daily
  message to a parent's account allowed without a separate agreement?
- **Professionals.** Can verification depend on payment ("every professional pays and is verified")?
  What happens to a family's team when an invited therapist does not pay?
- **Company and accounts.** Which company sells (the company's bank account and the store accounts must
  belong to it), and which taxes apply in each country?
