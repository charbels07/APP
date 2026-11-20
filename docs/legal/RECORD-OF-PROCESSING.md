> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**
>
> Record of processing activities (GDPR article 30). One entry per purpose. Update it with
> every release that changes what is collected (`docs/runbooks/RELEASE-CHECKLIST.md`, section 5).

# Record of processing activities

| | |
|---|---|
| Controller | `[Company name]`, `[address]`, `[registration number]` |
| Representative (if the company is outside the EU) | `[name]` |
| Data protection officer | `[DPO]`, `[DPO e-mail]` |
| Contact for requests | `[privacy e-mail]` |
| Last update | `[date]` (first draft: 18 November 2026, from the code) |

Processors used by several purposes (their agreements to sign or check):

| Processor | Role | Location | Agreement |
|---|---|---|---|
| Supabase | Database, sign-in, file storage, server functions, daily backups | EU region `[Frankfurt or Paris]`; US company | `[DPA signed? SCCs]` |
| Google (Gmail) | Sends sign-in codes and the team's e-mails | `[to confirm]` | `[to check: a free Gmail account may have no DPA]` |
| Anthropic | AI helper (`caa-ai`), when switched on | US | `[DPA, SCCs]` |
| Cloudflare | Public pages (support, deletion, privacy) | Worldwide | `[DPA]` |
| `[off-site storage provider]` | Encrypted weekly copy of the database | EU `[region]` | `[DPA]` |
| Apple, Google (stores, sign-in) | Distribution, optional sign-in, subscriptions *(to come)* | — | Their terms *(controller or processor: to qualify)* |
| Expo (EAS) | Builds the apps; receives no user data | — | — |
| Google (FCM), Mozilla, Apple, Microsoft (the browsers' notification services) | Carry a notification to the browser that accepted them; the message is encrypted for that browser, they cannot read it | Worldwide | Their terms *(carrier chosen by the person's browser: to qualify)* |

## Summary

| # | Purpose | People | Legal basis (to confirm) | Retention |
|---|---|---|---|---|
| 1 | Accounts and sign-in | Parents, professionals, team members | Contract | Until deletion; inactive 24 months → reviewed |
| 2 | The child's board and its sync between devices | Children, parents | Contract; explicit consent (art. 9) | Until deletion; bin 30 days; last 10 snapshots |
| 3 | Team work around a child | Parents, professionals, team members, children | Contract | History 24 months; invitations valid 30 days |
| 4 | Communication follow-up and observations | Children, adults who write notes | Explicit consent of the parent | Days 24 months; sentences 12 months; device 120 days |
| 5 | Verification of professionals | Professionals | Legitimate interest (protecting children) | Identity document deleted at the decision; diploma `[to decide]` |
| 6 | Back office and the team's action log | The app's team, professionals | Legitimate interest; legal obligation | Action log 5 years |
| 7 | Messages to the team and votes | Parents, professionals | Legitimate interest | 3 years |
| 8 | Feature counters and technical problems | Children (counters per profile); none (problems) | Consent of the parent | 180 days; erased when consent is withdrawn |
| 9 | Anonymous figures for the team | Children of consenting families | Consent of the parent | Computed, not stored apart |
| 10 | AI helper | Account holder who uses it | Contract | Count per day 30 days; content not stored |
| 11 | E-mails to the team | Professionals who apply | Legitimate interest | 90 days |
| 12 | Security of the service | Everyone | Legitimate interest; legal obligation | Rate log 2 days; logs 1–7 days |
| 13 | Backups | Everyone | Legitimate interest; legal obligation (security) | 7 days; off-site 30–90 days |
| 14 | Data rights and consents | Parents, professionals | Legal obligation | Consents `[as long as the profile + proof period]`; deletion list 90 days |
| 15 | Notices in the app | Account holders | Contract | 12 months |
| 17 | Notifications outside the app (reminder at 12:00 for parents, new idea to vote on) | Parents, professionals who turned them on | Consent (asked in the app, then by the browser) | Device until turned off or 12 months unused; messages 2 days; last opening of a board: one moment per child |
| 16 | Subscriptions *(to come)* | Parents, professionals | Contract; legal obligation (accounting) | `[to write]` |

## 1. Accounts and sign-in

| | |
|---|---|
| Purpose | Create an account, sign in, protect it |
| People | Parents, professionals, other team members; children's tablets linked with a code (an account without e-mail) |
| Data | E-mail or phone, scrambled password, display name, account type, preferences (menus' language, a professional's own caregiver code), Google or Apple identity if used, two-step factors, sign-in times |
| Source | The person; Google or Apple when chosen |
| Recipients | Supabase; Google (Gmail) for the codes; Google or Apple sign-in |
| Transfers | Supabase Inc. (US) support access; Google; Apple `[safeguards]` |
| Retention | Until the account is deleted. 24 months without sign-in: counted in the back office for a decision, not deleted automatically |
| Security | Supabase Auth; two-step sign-in (required for the team, offered to parents); session in Keychain / Keystore; "Keep me logged in" choice; fresh proof before sensitive actions; rate limits |

## 2. The child's board and its sync

| | |
|---|---|
| Purpose | Provide the AAC board on every device of the child and to the team |
| People | Children; parents |
| Data | First name, age, set-up answers (how the child communicates, other ways, AAC before, activities), the board (words, pictures, settings, caregiver code), photos and recordings, snapshots, the bin |
| Special category | Yes, likely (disability can be inferred) |
| Source | Parents; professionals allowed by the parents |
| Recipients | The child's team, within the rights given; Supabase |
| Transfers | Supabase Inc. support access `[safeguards]` |
| Retention | Until the profile is deleted; then 30 days in the bin; then erased (files by the purge function). Snapshots: last 10. On a device: until sign-out or deletion |
| Security | Row-level security; private storage per child with a fair-use quota; changes from others cleaned (`src/lib/safety.ts`); the board works offline |

## 3. Team work around a child

| | |
|---|---|
| Purpose | Invite people, give rights, suggest and approve changes, undo |
| People | Parents, professionals, team members, children (the profile concerned) |
| Data | Members (name, role, level, rights; their e-mail visible to the family and managers only), invitations (e-mail, name, message, code), proposals, change history (never what the child said), notices, shared materials |
| Recipients | The team, according to rights; Supabase |
| Retention | History 24 months; invitations valid 30 days; notices 12 months |
| Security | An invitation gives at most what its author holds; removing someone cancels their invitations; rate limits (30 invitations, 40 shares a day) |

## 4. Communication follow-up and observations

| | |
|---|---|
| Purpose | Follow the child's progress with the team |
| People | Children; adults who write observations |
| Data | Per day and device, at the level the parent chose: use (sessions, times, touches, sentences, pages, device); words touched or searched; sentences said. Observations: moment, context, partner, autonomy, result, note, author |
| Special category | Yes, likely |
| Legal basis | Explicit consent of the parent (off by default; level chosen by the parent) |
| Recipients | The parent and the members allowed to "See the progress data"; Supabase |
| Retention | Server: days 24 months rolling, sentences 12 months; device: 120 days; erased when the parent chooses "Erase the recorded data" |
| Security | The server keeps nothing beyond the level chosen (`src/lib/usageConsent.ts` and the database); nothing recorded while an adult edits or models |

## 5. Verification of professionals

| | |
|---|---|
| Purpose | Check that a professional is qualified before she joins a child's team |
| People | Professionals |
| Data | Full name, country, profession, organisation, diploma or licence, identity document, status, note of the decision |
| Recipients | The app's team (back office); Supabase. The team's e-mail gives the name, profession and country only |
| Retention | Identity document: deleted at the decision (accepted or refused). Diploma and request: `[to decide: while the account exists?]` |
| Security | Private bucket; pictures or PDF, 10 MB, 20 files; each document opened is written in the action log; links that expire |

## 6. Back office and the team's action log

| | |
|---|---|
| Purpose | Run the service: decide verifications, read figures and messages |
| People | The app's team; professionals (decisions) |
| Data | Team list (`admins`), action log (who decided what, which document was opened) |
| Retention | Action log 5 years |
| Security | Every `admin_` function checks `is_admin()`; two-step sign-in required; the list is unreadable from the app |

## 7. Messages to the team and votes

| | |
|---|---|
| Purpose | Answer people and improve the app ("Help us improve Empower") |
| People | Parents, professionals |
| Data | Subject, text, app version, system, account; votes (one per account, with the account type) |
| Recipients | The app's team |
| Retention | Messages 3 years |
| Security | Reminder on screen: no personal or medical information; 10 messages a day; not from a child's tablet |

## 8. Feature counters and technical problems

| | |
|---|---|
| Purpose | Know which features are used and which problems happen |
| People | Children (counters are stored per profile); nobody (problems) |
| Data | Counts per day from a fixed list of names; system, form, version. Problems: kind, error type, screen, system, version, place in the code as digits |
| Legal basis | Consent of the parent ("Help improve the app", latest version of the list) |
| Retention | 180 days; counters erased at once when the parent stops sharing |
| Security | Checked by the database; no text can travel; not from professionals or the team; never shown under 5 children of 5 families |

## 9. Anonymous figures for the team

| | |
|---|---|
| Purpose | Improve the app |
| People | Children of families who agreed |
| Data | Numbers computed from the follow-up and settings (views `research_usage`, `bo_child_days`) |
| Retention | Not stored apart: computed from purposes 4 and 2 |
| Security | Consenting families only; at least 5 children of 5 families; no name, word or sentence |

## 10. AI helper (when switched on)

| | |
|---|---|
| Purpose | Suggest words for a new board, read a photo, guess a drawing |
| People | The account holder who uses it |
| Data | The topic typed, the photo or drawing sent; count of calls per day |
| Recipients | Anthropic (processor) |
| Transfers | US `[safeguards]` |
| Retention | Content: not stored by us; count: 30 days |
| Security | Only people who look after a child; 40 calls a day per account and a daily ceiling; never the child's name, words or sentences; the family can turn "AI suggestions" off |

## 11. E-mails to the team

| | |
|---|---|
| Purpose | Tell the team that a professional applied; weekly figures |
| People | Professionals who apply |
| Data | Name, profession, country (no document, no address); weekly counts only |
| Recipients | The team's mailbox, through Gmail |
| Retention | 90 days in the database; the mailbox `[to decide]` |
| Security | Closed to the app; one e-mail a day per professional, 30 a day in all |

## 12. Security of the service

| | |
|---|---|
| Purpose | Protect accounts and data; refuse abuse |
| Data | Recent actions per account (rate log), wrong code attempts, server logs, linked devices, codes to link a device (10 minutes) |
| Retention | Rate log 2 days; Supabase logs 1 day (free) or 7 days (Pro); scheduled jobs' details 14 days |

## 13. Backups

| | |
|---|---|
| Purpose | Restore the service after a loss |
| Data | The whole database (not the files) |
| Recipients | Supabase; `[off-site storage provider]` (encrypted, the key is not with them) |
| Retention | 7 days (Supabase); 30 to 90 days off-site |
| Security | Encrypted to a key kept offline by two people; quarterly restore test; deletions re-applied after a restore (`docs/runbooks/BACKUP-AND-RESTORE.md`) |

## 14. Data rights and consents

| | |
|---|---|
| Purpose | Prove agreements; answer access, deletion and portability requests |
| Data | The parent's agreement at profile creation (date, text version); requests received; the deletion list (IDs and dates only) |
| Retention | Consents: `[as long as the profile, plus the proof period]`; deletion list 90 days; requests `[to decide]` |

## 15. Notices in the app

| | |
|---|---|
| Purpose | Tell people what happened (invitations, decisions, devices linked) |
| Data | A sentence, the account, sometimes the child's profile |
| Retention | 12 months |

## 16. Subscriptions *(to come)*

`[To write with billing: what the stores send us, accounting retention.]`
