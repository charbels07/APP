# UX backlog — accounts, onboarding, collaboration (from the product owner)

Collected from the family's requirements, in the order they were given. **Nothing here is built
yet.** Items marked **DEFERRED** wait for an explicit go from the product owner.

Most of this needs a **backend** (accounts, verification codes, Google/Apple sign-in, sync,
collaboration, subscriptions). Until now the app is local-first with no server: an order of work
and a technical plan must be agreed before building.

---

## 1. First launch, before any account

1. **Welcome page:** a short sentence about the app and a *Continue* button. It comes first.
2. **Board preview without signing up:** after the welcome page, anyone can look at (and try) a
   sample board without creating an account.
3. **Choose the profile type: professional or parent** (the two may become different versions of
   the app).

## 1b. Professionals: verification (free access once verified)

The first steps are the same as for parents (welcome, preview, sign up / sign in). After choosing
**professional**, the person verifies their identity and practice. **Verified professionals get
access without paying.** Four-step flow with a progress bar (1/4 … 4/4) and Back / Continue:

1. **Tell us about your professional practice**
   - Full legal name
   - Country of professional registration or practice
   - Profession (list, e.g. *Speech-language therapist / Orthophoniste*)
   - Organisation / workplace (optional). Note shown: workplace affiliation can help verify an
     applicant but is not sufficient evidence of a professional qualification.
2. **Professional licence or certificate:** securely submit evidence of a professional credential
   or a university diploma.
3. *(Step 3 not detailed yet: identity check, to be confirmed with the product owner.)*
4. **Verification status**, one of:
   - **Pending review:** "Application under review. You may explore the demonstration workspace
     while your credentials are being reviewed."
   - **Verified**
   - **More information needed**
   - **Not approved**

This needs a back-office: someone reviews the documents and sets the status. Uploaded diplomas and
IDs are sensitive personal data (secure storage, retention period, deletion once verified).

## 2. Sign up / sign in (parents)

- Methods: **Google**, **Apple**, **email + password**, **phone number + password**.
- **Verification code** sent by email or SMS.

## 3. Create the child's profile

At the beginning: the child's **name** and **age**. Then:

- **Default settings** for the child.
- **Voice:** adult / child, female / male.
- **Languages:** several languages possible at once, and **communication language separate
  from navigation language**.
- **Favourite activities** of the child, to personalise the board (optional).
- **Communication today**
  - *How does your child currently communicate?* (one choice)
    - Doesn't currently use speech
    - Uses some words or short phrases
    - Uses speech but may need additional support
    - Speech varies depending on the situation
    - I'm not sure how to describe it
  - *What other ways does your child communicate?* (select all that apply)
    - Gestures / pointing
    - Pictures or communication cards
    - Another AAC app or device
    - Typing / writing
    - Facial expressions / body language
    - Other methods
  - *Has your child used AAC before?* (one choice)
    - No, we're new to AAC
    - Yes, picture cards or communication boards
    - Yes, a communication app or device
    - I'm not sure
  - **The first board is adapted to the child's level** according to these answers.
- **Visual presentation:** Standard / Larger buttons and text / High contrast / Not sure.
- **Sounds and animation:** Standard feedback / Reduced sounds and animations / Decide later.
- **Review of the profile** before continuing.

## 4. Set-up journey (after the child's profile)

1. **Starting vocabulary:** select or preserve an AAC vocabulary system.
2. **Language and voice:** already chosen in the child's profile (skip, or show for review only).
3. **Board layout:** pictogram size, how many pictograms per board (grid), visual presentation.
4. **Access method:** how the child selects symbols.
5. **Try the board:** preview, test and confirm; **the full app is available** at this step.

Then the **guide opens, tailored to the board and settings they chose**.

## 5. Settings: three pages

1. **Board settings:** the current *Réglages*.
2. **Collaborate:** see section 6.
3. **Account:** subscriptions, email, password and account settings; see section 7.

## 6. Collaborate ("Parent UX — Step 8")

**Principle:** one communication profile, multiple communication partners, different permissions.
Parents connect therapists, teachers and caregivers without conflicting changes and without
compromising the child's privacy.

### Journey

1. Open *My Child's Team*: everyone connected to the child's profile.
2. Invite a collaborator: therapist, teacher, caregiver or family member.
3. Define permissions: exactly what that person can do.
4. The collaborator accepts and joins securely.
5. Work together: vocabulary, TLA, schedules and other supports.
6. Review suggested changes: approve, reject or request adjustments.
7. Manage access: change permissions, review activity, revoke access.

### Screen 1 — My Child's Team

List of people with their role and status (Active / Invitation pending), and an
*Invite collaborator* button. Parents must see at once who has access, what each person can do
and which invitations are pending.

### Screen 2 — Invite (under a minute)

By email or temporary invitation link. Steps: name (optional) and email → role (Therapist / AAC
professional; Teacher / school staff; Caregiver / family member; Other communication partner) →
permissions → send. Permissions are chosen before sending.

### Permission presets (adjustable by the parent; not rigid rules by job title)

| Action | Parent / guardian | Therapist | Teacher | Caregiver |
|---|---|---|---|---|
| Use AAC with the child | Yes | Yes | Yes | Yes |
| View approved vocabulary and TLA | Yes | Yes | Yes | Yes |
| Create TLA or visual schedules | Yes | Yes | With permission | With permission |
| Propose new vocabulary | Yes | Yes | With permission | With permission |
| Modify existing core vocabulary | Protected | Explicit approval | No by default | No by default |
| Change access / voice settings | Yes | With permission | No by default | No by default |
| Invite other collaborators | Yes | No by default | No | No |
| View private message history | No by default | No by default | No by default | No by default |
| Manage devices and permissions | Yes | No | No | No |

The UX should also support the child's own preferences and growing autonomy.

### Collaboration levels

- **Level 1 — Use:** use the approved tools and model language; no changes to the profile.
- **Level 2 — Contribute:** create materials and suggest vocabulary changes; approval required
  before publication.
- **Level 3 — Manage selected content:** directly edit specific shared materials or settings
  explicitly delegated by the profile owner.

**Defaults:** Level 2 for therapists, Level 1 or a restricted Level 2 for teachers, Level 1 for
other caregivers. Parents can customise them.

### Screen 3 — Proposals and parent approval

A professional proposes (add a word to a category, create a TLA for an activity, prepare a
schedule, change a symbol's picture, suggest an access change). Workflow:

1. The professional prepares the change in their own workspace or companion app.
2. It is sent as a **proposal**, not applied to the child's system.
3. The parent receives a notification.
4. The parent reviews it with a **visual before/after preview**, its location and purpose.
5. Approve, decline, or request a revision.
6. If approved, it syncs to authorised devices.
7. The change is recorded, with **undo**.

Core vocabulary changes need extra safeguards (positions are the child's motor plan).

### Everyday contexts

- **School:** a teacher prepares a TLA for a lesson linked to the school schedule; the main board
  stays unchanged.
- **Therapy:** the therapist suggests vocabulary and prepares modelling with the same system as home.
- **Family / caregivers:** use approved materials and schedules without changing vocabulary or
  seeing private conversations.

### Edge cases

| Situation | Expected behaviour |
|---|---|
| Invitation not accepted | Stays pending; parent can cancel or resend |
| Sent to the wrong email | Parent can revoke before or after acceptance |
| Two professionals edit the same element | Version conflict flagged for review |
| Child's tablet offline | AAC keeps working; approved changes sync later |
| Parent rejects a proposal | No change to the live profile |
| Therapist stops working with the child | Parent revokes access immediately |
| School staff changes | Access tied to individual accounts, never a shared classroom password |
| Collaborator loses their device | Sessions / device access can be revoked |
| Parent approves by mistake | Previous version can be restored |
| Child becomes more independent | Permissions can be transferred or delegated |

Revoking access blocks future sync and server access; content already downloaded or printed
cannot necessarily be erased remotely.

### Additional features recommended

- **Shared materials library:** approved TLA, schedules and visual supports, without private
  communication history.
- **Modelling companion mode:** a teacher or therapist locates words on the child's board from
  their own device.
- **Simple change history:** who changed what, when and why, with rollback; vocabulary and
  settings only, never the child's messages.

### Acceptance criteria

| Task | Criterion |
|---|---|
| Invite a collaborator | Clear flow, permissions set before sending |
| Accept an invitation | Recipient identity confirmed |
| Review permissions | Visible from the main Team screen |
| Approve a TLA | Preview before applying |
| Reject a vocabulary change | Live vocabulary unchanged |
| Revoke a collaborator | New server access blocked immediately |
| Conflicting edits | No silent overwrite |
| Use AAC offline | Communication remains functional |
| Collaboration history | Configuration changes visible, never message content |

Next stage mentioned by the product owner: **Review & Adapt** (what information helps parents
judge whether the AAC system is accessible and useful, without turning data into surveillance).

## 7. Manage account ("Parent UX — Step 10")

**Principle:** administrative actions must never interrupt the child's ability to communicate.
Reached from the parent dashboard, separate from the child's communication interface.

### Main screen: six categories

My account · Devices & Sync · Permissions & Sharing · Subscription & Billing · Privacy & Data ·
App Preferences.

### Devices & Sync

Show every authorised device (e.g. the child's iPad as primary communication device, a school
tablet as secondary, the parent's iPhone as companion) with last-synced time. Parents can:

- add a device through secure pairing;
- see which devices have access and which is primary or companion;
- check backup and sync status, distinguishing **last synced** from **last backed up**;
- see pending changes on an offline device;
- revoke a lost or stolen device;
- restore the profile on a replacement tablet;
- view and resolve sync conflicts.

### Permissions & Sharing

People with access, their role, access level and duration. Detail screen: change access, review
their proposals, set an expiry date, revoke. An invitation must never grant access just because
someone knows the child's name or email.

### Subscription & Billing — **DEFERRED** (keep for later)

- Show the subscription only after parents have explored the app and set up the child's profile.
- The page shows the plan name, price and currency, billing period, renewal date, payment
  status, included features, and a link to manage the subscription.
- Decide: per child, per family, per device, or professional / institution.
- **Critical:** expiry, payment failure or cancellation must never leave the child unable to
  communicate. Define a continuity policy (offline access, export, an essential communication
  mode).
- Billing and cancellation must follow the real store or payment provider (Apple in-app
  purchase, Paddle…).

### Privacy & Data

Toggles: communication history (local, **off by default**); optional usage analytics (no message
content, appropriate authorisation); synchronise personal photos; account notifications. Actions:
export profile data; delete profile or account. A toggle alone is not valid GDPR consent: the
legal basis is decided separately.

Principles to keep: message history off by default; no routine remote access to the child's
conversations; personal photos local by default, with explicit sync choices; logs and analytics
without communication content; export and delete; revocable collaborators and devices.
Distinguish anonymous operational statistics from individual communication analytics, which are
sensitive.

### My account & App preferences

| Section | Fields / actions |
|---|---|
| My account | Display name, email, sign-in method |
| Security | Change password, sign-in methods, active sessions |
| Interface language | French, English, Arabic, others |
| Notifications | Invitations, suggested changes, sync issues, billing |
| Accessibility | Text size, contrast, parent-interface preferences |
| Help & support | Tutorials, FAQ, contact, report a problem |
| Legal | Terms, privacy policy, licences, version |

The child's communication language, voice, vocabulary, grid and access method stay under
**Child profile → AAC settings**, not in the parent's account.

### Error states

| Situation | UX response |
|---|---|
| No internet | Clear offline mode; AAC still works |
| Sync fails | Show pending changes and a retry option |
| Payment fails | Explain next steps; keep the continuity policy |
| Unknown device login | Security alert and revoke option |
| Forgotten password | Secure recovery |
| Conflicting edits | Show both versions; an authorised person resolves |
| Lost device | Revoke and offer profile restoration |
| Profile deleted by mistake | Identity confirmation and clear explanation before deleting |
| Cloud backup unavailable | Show backup status; never claim data is protected when it isn't |

### Navigation

Parent Dashboard → Account & Settings → My Account · Devices & Sync · Permissions · Subscription ·
Privacy & Data · Preferences.

### Open decisions

1. Subscriptions: per child / one family plan for several profiles / family and institution plans.
2. Devices per profile: no fixed limit / a fixed number per plan.
3. When a subscription expires: essential communication stays available (recommended) / grace
   period then an essential mode.
4. One parent, several children: yes, independent profiles (recommended) / one profile per account.

## 9. Professional workspace ("Professional UX — Step 3")

After sign-up and verification, the professional enters their workspace. **One professional
account can be connected to several AAC users** (a parent account is tied to one child).

### Dashboard

"Welcome back — What would you like to work on today?" Counters (connected AAC users, pending
proposals), quick actions (**My AAC Users**, **Create Materials**, **My Library**, **Connect a
User** — accept or request access) and recent activity (e.g. proposal approved, new invitation).
Collaboration, notifications and account stay easy to reach without cluttering the workspace.

**Navigation:** Professional Dashboard · My AAC Users · Create Materials · My Library ·
Collaborations · Learning Center · Account & Licence.

### My AAC Users

List with filters (All / Active / Pending) and search. Each user shows a short context and the
access level (e.g. Contribute, Use & suggest, Pending), with no unnecessary sensitive information.

Opening a user gives a dedicated workspace; every section is limited by the actual permissions:

| Section | Purpose |
|---|---|
| Communication board | View and use the existing AAC system |
| Vocabulary | Review, personalise or propose additions |
| Accessibility | Review permitted access settings and suggest adjustments |
| TLA | Create, edit and share activity boards |
| Visual supports | Schedules, First–Then, timers |
| Modelling | Locate words and model communication |
| Observations & outcomes | Record authorised assessment or participation information |
| Team | Collaborators and their permissions |
| Suggested changes | Pending, approved and rejected proposals |

Never the AAC user's private message history, even when authorised to work on vocabulary.

### Create Materials

Types: **TLA**, **Visual schedule**, **First–Then**, **Visual timer**, **Picture cards**, **From a
photo / file**. Journey: choose the type → template or blank (assisted generation later) →
configure vocabulary, symbols, text, language and layout → preview and test → save to the library
→ print / export, or propose it to an authorised AAC profile. Generic materials can be created
without any AAC user; client-specific materials stay in a protected space.

### My Library

| Section | Content |
|---|---|
| My Templates | Generic reusable materials |
| Shared With Me | Materials explicitly shared by families or colleagues |
| AAC User Materials | Individualised resources linked to authorised profiles |

Search, filter, duplicate, edit, preview, export, print, authorised sharing. Example: a generic
*Dentist visit* TLA is duplicated and personalised for one child without changing the template.

### Collaborations & notifications

Invitations (accept / decline) · My proposals (awaiting family approval) · Review requests
(feedback on suggested materials) · Change history (within permissions). Notifications only for
invitations, proposal decisions, requested revisions, access changes and sync problems, and never
with message content.

### Learning Center

Interactive demo board, "Show me where" exercises, vocabulary configuration tutorials, modelling
guidance and partner strategies, TLA and visual supports, access methods and devices,
multilingual / Arabic dialect features, release notes. Technical tutorials stay separate from
clinical education; finishing a tutorial does not certify competence.

### Account & professional licence

Verified status, licence type, number of AAC user connections; credentials, verification renewal,
security, devices, data controls, and billing if applicable (**billing DEFERRED**).

### Rules

1. One professional account, several AAC users, no artificial limit.
2. Each AAC profile is permissioned individually; a verified credential gives no automatic access.
3. Generic and personal resources are separate; templates never carry child-identifying data.
4. Communication comes first: preparing materials never blocks the user's board.
5. Vocabulary changes follow the approval process.
6. Privacy by default: no access to private conversation history.
7. Professionals can work without any connected child (generic resources, learning).
8. Works for private practice, schools, clinics and multidisciplinary services.

## 8. Back-office — **LATER** (the product owner will specify it)

An admin back-office is planned, with "a lot of data" in it (details to come). It will at least
handle professional verification (review documents, set the status). Any statistics shown there
must follow the privacy principles above: no message content, and anonymous operational figures
kept separate from individual communication data.
