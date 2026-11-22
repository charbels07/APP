> **DRAFT prepared from the app's code — to be reviewed and completed by a lawyer / DPO before
> use. Not legal advice.**
>
> Data protection impact assessment (GDPR article 35), following the structure of the CNIL's
> PIA method: 1. context, 2. fundamental principles, 3. risks, 4. validation. The measures listed
> are those found in the code on 18 November 2026; the levels of risk are proposals for the DPO.

# Impact assessment (DPIA) — Empower Communication

| | |
|---|---|
| Controller | `[Company name]` |
| DPO | `[DPO]` |
| Written by | `[name]`, from the code and `docs/SECURITY.md` |
| Version, date | 0.1, 18 November 2026 |
| Why a DPIA | Children (vulnerable people); data that can reveal a disability (special category); a new technology used at scale; follow-up of how a child communicates. Two or more of the CNIL / EDPB criteria: a DPIA is required |

## 1. Context

### 1.1 Overview

| | |
|---|---|
| The processing | An AAC app (iPhone, iPad, Android) that gives a voice to children who cannot rely on speech. Families build the child's board; professionals join the child's team with the family's agreement; an optional follow-up shows how the child communicates |
| Purposes | See `RECORD-OF-PROCESSING.md` (16 purposes) |
| Stakes for the people | For the child: communicating at all. For the family: privacy of a disability, of family life, of what the child says |
| Controller, processors | `[Company name]`; Supabase (server, EU), Google (Gmail), Anthropic (AI helper, when on), Cloudflare (public pages), `[off-site storage]` |
| Standards followed | GDPR; CNIL recommendations on children's rights online; WCAG 2.2 AA (`docs/ACCESSIBILITY.md`) |

### 1.2 Data, processes and supports

| Data | Life cycle | Supports |
|---|---|---|
| Accounts | Created at sign-up → used → deleted on request (fresh proof first); inactive 24 months → reviewed | Supabase Auth, `accounts` |
| Child's profile (first name, age, set-up answers, board, caregiver code) | Created by a parent (or a verified professional, then handed over) → synced → deleted → 30 days in the bin → erased; snapshots: last 10 | Device (AsyncStorage), `profiles` |
| Photos, recordings | Made on a device → shared between the child's devices → deleted with the profile (purge queue) | Device files; bucket `profile-media` |
| Follow-up (use, words, sentences), observations | Recorded on the child's devices at the chosen level → sent → shown to allowed members → 24 months (sentences 12) | Device (120 days), `usage_days`, `observations` |
| Team, invitations, proposals, history | Created by the team → history 24 months | `members`, `invitations`, `proposals`, `history` |
| Professionals' documents | Uploaded → read once by the team (logged) → identity document deleted at the decision | Bucket `verification-docs`, `verifications` |
| Counters, problems (with consent) | Counted on the device → sent daily → 180 days | `feature_days`, `error_counts` |
| Messages, votes | Written by a person → read by the team → 3 years | `feedback`, `roadmap_votes` |
| Backups | Daily (7 days), weekly encrypted off-site (30–90 days) | Supabase; `[off-site storage]` |

## 2. Fundamental principles

### 2.1 Proportionality and necessity

| Principle | How the app meets it | To do / to confirm |
|---|---|---|
| Specified purposes | Each table serves one purpose (`supabase/README.md`, "What is where") | — |
| Legal basis | Contract for the service; explicit consent of the parent for the follow-up and, likely, for the health-related part of the profile; consent for counters | **Lawyer / DPO to choose** (see the privacy policy draft) |
| Minimisation | The follow-up is off by default; three levels; sentences only at the highest level; the history holds settings, never what the child said; counters are numbers from a fixed list (no text can travel); technical problems belong to nobody; the AI receives only a topic, a photo or a drawing; the team's e-mail gives no document or address | Diplomas: decide how long they are needed |
| Accuracy | The family edits the board; observations are changed by their author or the family only; signatures are written by the database | — |
| Retention | Automatic deletion jobs (`RETENTION-SCHEDULE.md`) | Decision rule for inactive accounts; diploma retention; consent proof period |

### 2.2 Rights of the people

| Right | Measure in the app |
|---|---|
| Information | Privacy points on the Account page; the "?" of every set-up question; the consent text with its version; privacy policy *(to publish)* |
| Consent | Off by default; chosen by the parent only (database rule); recorded with date and text version; asked again when what is shared grows (`SHARE_TERMS`) |
| Access, portability | "Download all my data" (one JSON file); profile export; open board format (.obz) |
| Rectification | Account page; the board in caregiver mode |
| Erasure | "Delete my account", "Delete the profile of …" (30-day bin), "Erase the recorded data"; server-side purge of files; deletions re-applied after a restore |
| Restriction, objection | Switches: follow-up level, "Help improve the app", "AI suggestions" |
| Processors | Contracts *(to sign or check: Supabase, Google, Anthropic, Cloudflare, off-site storage)* |
| Transfers | EU region for the server; US providers *(safeguards to document)* |

## 3. Risks

Scale (CNIL): severity and likelihood each **negligible, limited, significant, maximum**.

### 3.1 Measures in place (from the code)

| Area | Measure |
|---|---|
| Access control | Row-level security on every table; delicate actions through SQL functions that check the caller first; nothing executable by visitors; anything repeatable is rate-limited (`docs/SECURITY.md`) |
| Accounts | Two-step sign-in (required for the team, offered to parents); a fresh proof (password or e-mailed code) before deleting an account or a profile, linking a full-access device, or downloading all data; session in iOS Keychain / Android Keystore; "Keep me logged in" can be unticked on a shared device |
| Devices | Codes to link a tablet: 8 characters, one at a time, 10 minutes, 5 wrong tries then a pause; the family is told each time a device is linked; a tablet linked with a code cannot create anything new |
| Professionals | Verified before joining a team; rights given by the family; cannot change their account type; lose access if no longer verified; recording and sharing forced off while they own a profile; they never see the family's caregiver code |
| Team members | No longer see each other's e-mail or the family's connection code (family and managers only) |
| The app's team | List unreadable from the app; every `admin_` function checks `is_admin()`; every decision and document opened is logged; figures about use need 5 children of 5 families among those who agreed (never a number below) |
| Data from others | Links, imported boards, proposals and shared materials cleaned before use (`src/lib/safety.ts`); links never travel with shared content |
| Files | Private buckets; size and type limits; identity documents deleted at the decision; server-side purge after deletion |
| Device | Sign-out erases the children's data from the device; Android device backups excluded (`allowBackup: false`) |
| Web pages | Strict browser protections (`public/_headers`, tested) |
| Resilience | The board works offline; snapshots; bin; daily and off-site backups; restore tests |
| Retention | Automatic jobs for each kind of data |
| Testing | `npm run test:db` replays every known attack; `npm test`; accessibility scan |

### 3.2 Risk 1 — Illegitimate access to data

| | |
|---|---|
| Main threats | A stranger guesses a code or takes over an account; a team member reads more than allowed; a professional who is not one; a flaw in a database rule; a stolen device; a team account on a child's tablet; a leaked server key |
| Sources | External attackers; curious insiders (team members, the app's team); careless use |
| Impacts | Disclosure of a child's disability, words, sentences, photos; discrimination; distress of the family |
| Measures | 3.1: access control, accounts, devices, professionals, team, testing |
| **Severity** | Significant to maximum (children, health-related) |
| **Likelihood** | Limited (after the measures) |
| Residual actions | An outside security test before selling; CAPTCHA on sign-up (`docs/SECURITY.md`, section 5); "has this e-mail an account?" can still be learned by inviting (limited to 30 a day) |

### 3.3 Risk 2 — Unwanted change of data

| | |
|---|---|
| Main threats | A team member changes the board badly; a merge of two edits; a bad release; an attacker with edit rights |
| Impacts | The child cannot find a word, or a wrong word is spoken: **communication harmed** |
| Measures | Core positions always need the parent's approval; proposals; history with undo; snapshots with one-tap restore; motor-plan tests; phased releases (`docs/runbooks/RELEASE-CHECKLIST.md`) |
| **Severity** | Significant |
| **Likelihood** | Limited |

### 3.4 Risk 3 — Disappearance of data

| | |
|---|---|
| Main threats | Server loss; deletion by mistake; a device lost; the service stops |
| Impacts | Loss of the child's board (the child's voice), of photos and recordings |
| Measures | Board stored on each device and working offline; photos and recordings shared between the child's devices; bin of 30 days; snapshots; daily backups (7 days) and weekly encrypted off-site copies; quarterly restore test; continuity pledge; exports (JSON, .obz, print) |
| **Severity** | Significant to maximum |
| **Likelihood** | Limited |
| Residual actions | Storage files are not in the database backups (decide an off-site copy); test what a device does when the server refuses its session (it may erase its board copy: `docs/runbooks/CONTINGENCY.md`) |

### 3.5 Other points for the DPO

- **Dictation:** the device's speech recognition may send the adult's voice to Apple or Google
  unless it runs on the device; the app uses on-device recognition where the system offers it.
  Say it in the privacy policy (done in the draft).
- **The caregiver code** is kept in the child's profile: it is a gate against the child, not a
  password, and is readable by those who can read the profile.
- **Free text** exists in a few places (messages to the team, observations' notes, invitation
  messages, the reason of a decision): people are reminded not to write medical information
  there; the team reads only the messages sent to it.
- **Counters are stored per child** until they are added up: they are personal data; the
  5-children rule protects what the team sees, it is not a proof of anonymity.
- **Children's own voice:** how the child is informed, at an age where they can understand.

## 4. Validation

### 4.1 Action plan

| Action | Owner | Due |
|---|---|---|
| Choose the legal bases; write the consent text (explicit, from a parent) | `[DPO]`, `[lawyer]` | Before launch |
| Sign or check the data processing agreements (Supabase, Google, Anthropic, Cloudflare, off-site storage) | `[owner]` | Before launch |
| Publish the privacy policy (three languages) and fill the store privacy forms | `[owner]` | Before launch |
| Outside security test | `[owner]` | Before launch |
| Decide the retention of diplomas, consent proofs and inactive accounts | `[DPO]` | Before launch |
| Off-site copy of the storage files, or accept the risk in writing | `[owner]` | `[date]` |
| Test the device's behaviour when the server refuses a session; build an offline-only mode | `[developer]` | `[date]` |
| Check the rules of non-EU countries where the app will be sold | `[lawyer]` | Before each country |

### 4.2 Opinions

| | |
|---|---|
| DPO's opinion | `[to write]` |
| Opinion of the people concerned (families, professionals, an association of families of children who use AAC) | `[to collect: how, when]` |
| Decision of the controller | `[accepted / accepted with the action plan / prior consultation of the CNIL needed]`, `[date]`, `[signature]` |

Review this DPIA at least once a year and at every change of what is collected.
