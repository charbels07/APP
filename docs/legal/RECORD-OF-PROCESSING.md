> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**
>
> Record of processing activities (GDPR article 30). One entry per purpose. Update it with
> every release that changes what is collected (`docs/runbooks/RELEASE-CHECKLIST.md`, section 5).

# Record of processing activities

| | |
|---|---|
| Controller | `[owner's full name]`, trading as DALETH (sole proprietorship, مؤسسة فردية), Beirut, Lebanon, `[registration number]` |
| Representative (if the company is outside the EU) | `[name]` |
| Data protection officer | `[DPO]`, `[DPO e-mail]` |
| Contact for requests | `daleth.contact@gmail.com` |
| Last update | `[date]` (first draft: 18 November 2026, from the code; services, functions and retention checked again on 23 November 2026) |
| Where the product is offered | The App Store and Google Play only. A web version is open today to chosen testers (sign-up open, no list of testers); it is not offered to families |

Processors used by several purposes (their agreements to sign or check):

| Processor | Role | Location | Agreement |
|---|---|---|---|
| Supabase | Database, sign-in, file storage, daily backups, and the server functions `caa-mail` (team e-mails), `caa-purge` (deletes the stored files of what was erased, from the queue `storage_purge`) and `caa-push` (delivers browser notifications) | EU region `[Frankfurt or Paris]`; US company | `[DPA signed? SCCs]` |
| Google (Gmail) | Sends sign-in codes and the team's e-mails | `[to confirm]` | `[to check: a free Gmail account may have no DPA]` |
| Anthropic | Not used: the AI helper is switched off and `caa-ai` is not deployed (owner's decision, November 2026). *Before it is turned on: this record, the agreement, the consent text, families asked again* | US | — |
| Cloudflare | Public pages (support, deletion, privacy) and the web version for chosen testers | Worldwide | `[DPA]` |
| `[off-site storage provider]` | Encrypted weekly copy of the database | EU `[region]` | `[DPA]` |
| Apple, Google (stores, sign-in) | Distribution, optional sign-in, taking the payment of subscriptions | — | Their terms *(controller or processor: to qualify)* |
| RevenueCat Inc. | Purchases of both stores: checks receipts, follows renewals and refunds; receives the account's id and what was bought | US | Data processing agreement `[to sign]`; standard contractual clauses `[to confirm]` |
| Expo (EAS) | Builds the apps; receives no user data | — | — |
| Google (Firebase Cloud Messaging, `fcm.googleapis.com`), Mozilla (autopush, `updates.push.services.mozilla.com`), Apple (web push, `*.push.apple.com`), Microsoft (WNS, `*.notify.windows.com`): the browsers' notification services | Carry a notification of the web version to the browser that accepted them; the message is encrypted for that browser, they cannot read it. `caa-push` posts to these four only (checked by the function and by the database) | Worldwide | Their terms *(carrier chosen by the person's browser: to qualify)* |

## Summary

| # | Purpose | People | Legal basis (to confirm) | Retention |
|---|---|---|---|---|
| 1 | Accounts and sign-in | Parents, professionals, team members | Contract | Until deletion; inactive 24 months → reviewed |
| 2 | The child's board and its sync between devices | Children, parents | Contract; explicit consent (art. 9) | Until deletion; bin 30 days; words and boards deleted on the board 30 days; unused photos and recordings 30 days; last 10 snapshots |
| 3 | Team work around a child | Parents, professionals, team members, children | Contract | History 24 months; invitations valid 30 days, not answered 60 days, decided 12 months |
| 4 | Communication follow-up and observations | Children, adults who write notes | Explicit consent of the parent | Days 24 months; sentences 12 months; device 120 days |
| 5 | Verification of professionals | Professionals | Legitimate interest (protecting children) | Identity document deleted at the decision; diploma `[to decide]` |
| 6 | Back office and the team's action log | The app's team, professionals | Legitimate interest; legal obligation | Action log 5 years |
| 7 | Messages to the team and votes | Parents, professionals | Legitimate interest | 3 years |
| 8 | Feature counters and technical problems | Children (counters per profile); none (problems) | Consent of the parent | 180 days; erased when consent is withdrawn |
| 9 | Anonymous figures for the team | Children of consenting families | Consent of the parent | Computed, not stored apart |
| 10 | AI helper: **switched off, not deployed** | — | — | Nothing collected today; the count per day would be kept 30 days |
| 11 | E-mails to the team | Professionals who apply | Legitimate interest | 90 days |
| 12 | Security of the service | Everyone | Legitimate interest; legal obligation | Rate log 2 days; logs 1–7 days |
| 13 | Backups | Everyone | Legitimate interest; legal obligation (security) | 7 days; off-site 30–90 days |
| 14 | Data rights and consents | Parents, professionals | Legal obligation | Consents: as long as the account `[proof period: to decide]`; deletion list 100 days after the files are deleted |
| 15 | Notices in the app | Account holders | Contract | 12 months |
| 16 | Subscriptions *(to come)* | Parents, professionals | Contract; legal obligation (accounting) | `[to write]` |
| 17 | Notifications outside the app, web version (reminder at 12:00 for parents, new idea to vote on) | Parents, professionals who turned them on | Consent (asked in the app, then by the browser) | Device until turned off or 12 months unused; messages 2 days; last opening of a board: one moment per child |

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
| Retention | Until the profile is deleted; then 30 days in the bin; then erased (files by the purge function `caa-purge`). Words and activity boards deleted on the board: 30 days in the profile's own bin. A photo or recording no board uses any more: 30 days (longer while an earlier version, the last 30 days of history or a waiting proposal uses it). Snapshots: last 10. On a device: until sign-out or deletion; unused files 30 days |
| Security | Row-level security; private storage per child with a fair-use quota; changes from others cleaned (`src/lib/safety.ts`); the board works offline |

## 3. Team work around a child

| | |
|---|---|
| Purpose | Invite people, give rights, suggest and approve changes, undo |
| People | Parents, professionals, team members, children (the profile concerned) |
| Data | Members (name, role, level, rights; their e-mail visible to the family and managers only), invitations (e-mail, name, message, code), proposals, change history (never what the child said), notices, shared materials |
| Recipients | The team, according to rights; Supabase |
| Retention | History 24 months; invitations valid 30 days, erased 60 days after they were written if not answered, 12 months after if decided (accepted, declined or cancelled); notices 12 months |
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
| Purpose | Answer people and improve the app ("Help us improve Daleth AAC") |
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
| Security | Consenting families only; at least 5 children of 5 families (a group of 1 to 4 is never given as a number, in the back office and in the weekly e-mail); no name, word or sentence. Plain totals (accounts, profiles, linked devices, teams) count every family |

## 10. AI helper (switched off)

| | |
|---|---|
| State | **Not in use.** The owner switched the AI off (November 2026): the server function `caa-ai` stays in the code but is not deployed, and nothing is sent to Anthropic |
| Before it is turned on | This entry is written for what is really sent, with its legal basis, recipient, transfer and retention; the daily ceiling is finished in the database; the consent text changes and families are asked again |

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
| Retention | 7 days (Supabase); 90 days off-site |
| Security | Encrypted to a key kept offline by two people; quarterly restore test; deletions re-applied after a restore (`docs/runbooks/BACKUP-AND-RESTORE.md`) |

## 14. Data rights and consents

| | |
|---|---|
| Purpose | Prove agreements; answer access, deletion and portability requests |
| Data | The parent's agreement at profile creation (date, text version); requests received; the deletion list (the folder or file to erase: a person's or a child's ID, a file name, the reason, the dates) |
| Retention | Consents: today as long as the parent's account (they are deleted with it; kept when only the profile is deleted) `[proof period: to decide]`; deletion list (`storage_purge`): until `caa-purge` deleted the files, then 100 days (longer than the oldest off-site copy); requests `[to decide]` |

## 15. Notices in the app

| | |
|---|---|
| Purpose | Tell people what happened (invitations, decisions, devices linked) |
| Data | A sentence, the account, sometimes the child's profile |
| Retention | 12 months |

## 16. Subscriptions and the professional's licence *(built November 2026, off until switched on)*

| | |
|---|---|
| Purpose | Selling the family's subscription and the professional's licence in the App Store and Google Play; deciding what a board may change (free week, 7 days after an ended subscription, paused, frozen: the child always talks) |
| Data | The account's id (sent to RevenueCat as its user id), what was bought (family or licence), its end date, renewing or not, the store and the product name. **Never** a card, a bank detail, a receipt or anything about the child |
| Source | Apple or Google, through RevenueCat, read by the server function `caa-billing` (never what the app says) |
| Recipients | RevenueCat (US) as the purchases processor; Apple or Google (who take the payment, under their own terms); Supabase |
| Transfers | RevenueCat Inc. (US) `[safeguards: data processing agreement, standard contractual clauses: to confirm]` |
| Retention | As long as the account (`billing_entitlements`); the stores and RevenueCat keep payment records under their own rules `[accounting retention of the company's own records: to confirm with the accountant]` |
| Rights | "Download all my data" lists the purchases; cancelling is done in the store (deleting the account does not stop a subscription: the app and the deletion page say so) |

## 17. Notifications outside the app (web version)

| | |
|---|---|
| Purpose | Remind a parent at 12:00 (the device's time) when the child's board was not opened that day; tell people about a new idea to vote on |
| People | Parents and professionals who turned them on; never a child's tablet |
| Data | The browser's notification address and its two keys, the language and time zone of the device, the day of the last reminder; the notifications waiting (title, text, already worded by the database); for each child, the moment the board was last opened (`profile_seen`) |
| Legal basis | Consent (asked once in the app, then by the browser; switches in the account's preferences) |
| Recipients | Supabase (`caa-push` sends); the browser's notification service (Google FCM, Mozilla, Apple, Microsoft), which carries the message encrypted for that browser |
| Transfers | The notification services are worldwide `[safeguards]` |
| Retention | Registration: until turned off, sign-out on that device or account deletion; 12 months without opening the app. Notifications: 2 days. Last opening: one moment per child, replaced at each opening, gone with the profile |
| Security | Never a child's name, word or sentence; the database decides and words everything; `caa-push` only posts to the four notification services (`isPushService`, `push_endpoint_ok`); the signing key's private half is sealed |
