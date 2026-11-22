# Gap review, 21–22 November 2026: what was found, what the owner decided, what to do

This file is the hand-over of a long review session. A new session reads it and does the work batch by
batch. **Nothing in the app was changed during the review.** The owner approved everything below and the
order of the batches; each batch goes live by the standing rule of `CLAUDE.md` (checks pass → pull
request into the default branch → merge), and ends by listing the database files the owner must run.

How to use it: do ONE batch per session (they are long). Start with batch 1. Before fixing an item,
re-read the code at the place given: line numbers are from 21 November and may have moved. Tick the
item here when it is live. When a decision below contradicts `CLAUDE.md`, the decision is newer: update
`CLAUDE.md` in the same change (list at the end).

How sure each finding is:
- **[ran]** reproduced (throw-away database, jest file or the demo build in a browser);
- **[read]** the code path was read and is unambiguous, not executed;
- **[plausible]** depends on something not verified (a real device, Safari, the real Supabase server).

State of the checks on 21 November (before any change): `npm run typecheck` clean, `npm test` 441
passed, `npm run test:a11y` no violation, `npm run test:db` all 12 scenarios passed. So every gap below
is in a place no test looks at: each fix comes with its test (and, for the database, its attack in a
scenario of `supabase/tests/`, a line in `scripts/test-db.sh` and in `supabase/check-migrations.sql`).

## Ground rules the owner set

1. Judge every gap as if real children's data were live. Order of importance: a child's data seen by the
   wrong person → a child without their voice or board → a child reaching adult tools → an untrue text →
   comfort.
2. The live database can be several files behind the code: every change must keep working before the
   owner runs its migration.
3. Earlier decisions written in `CLAUDE.md` stay (no vibration, four voices, no online pictures…).
4. Web is tested for real (demo build + Playwright); tablets by reading, plus a hand-test list for the owner.
5. The web version is for chosen testers today; the product will be sold in the stores only. Web sign-up
   stays open (owner's choice: no tester list).

---

## Batch 1 — The child keeps their voice and their board (no database file)

**Done on 22 November 2026** (one change, no database file). Checks: `npm run typecheck` clean, `npm test`
518 passed, `npm run test:a11y` no violation (232 scans), and a real-browser run on the demo build (below). What was
done differently from the text, or decided on the way, is written under each item.

- [x] **A "use only" tablet stops receiving the family's changes for good.**
  Done as decided (Q31). `src/lib/deviceOnly.ts`: the last activity board, the sequence shown and its ticked
  steps, the welcome card and the guide's progress are left out of what is sent (`travelling`), put back on
  what is received (`withDeviceThings`), and a change of these alone sends nothing. `src/state/profileSync.ts`
  rewritten: a refused save (any reason) keeps the changes on the device and never stops `pull` / `open`;
  theirs is taken, ours put back on top; one new try at each opening, when the server's version moves, and
  every half hour while the board stays open.
  A copy an older version left "to send, refused" is unlocked at the next opening. "The board was opened
  today" is said whatever waits. Tests: `syncNeverBlocked.test.ts`.
  *On the way:* a new device starts from what the account holds; when the account holds nothing about the
  welcome card it counts as "seen" (otherwise every newly linked tablet would show it again). The first
  save after this version removes these things from the server copy: nothing to run.
- [x] **Any other refused save blocks that device's sync.** Done. `push` never throws; `too_many` waits
  like a lost connection; `consent_protected` puts the family's choices (recording, sharing, code) back as
  the server has them and sends the rest; everything else is the state "kept on this device: the account
  did not accept them" (three languages). The code field of Settings → Code and data is shown only to
  a manager, to a professional for her own code, or on a board without an account.
- [x] **Errors that are not "no session" erase the children's copies.** Done. `noSession` in
  `src/backend/supabase.ts`; everything else is `offline`. *More than the text:* the login library erases
  the stored session itself when a renewal is refused by anything but a network error, so the erase
  happened one start later; `keepSessionFetch` turns such an answer (429, an HTML page, an unknown refusal)
  into "the server cannot answer now", and the session stays. Tests: `serverDown.test.ts`.
- [x] **A server error at start shows Welcome instead of the board.** Done. Status 0 / 408 / 429 / 5xx
  are `offline` (and Safari's "Load failed"); `route()` opens the board kept on the device on any failure.
- [x] **Offline start only opens the board when `prefs.activeProfileId` is set.** Done. The device
  remembers the board that was open (`lastProfile`), `route` saves the chosen child with the account, and
  `localBoard` falls back to the first copy kept.
- [x] **Offline start with an expired session: spinner for ~25 s.** Done. `whoIsSignedIn` waits 2 s when
  the device remembers an account, then opens the board from the device and handles the server's answer
  when it comes; `ProfileSync.open` no longer waits for the server when a copy exists (2.5 s at most,
  0.3 s when the start was already offline).
- [x] **"Back" on the first step of "Add a child" signs out and erases.** Done. The set-up remembers
  where it was opened from (`onboarding.back`: the board, or the invitations page) and returns there;
  a failed request never signs out. Only an account with no child at all leaves the app from there.
- [x] **Opening a board erases a copy with unsent changes on `forbidden`.** Done, and wider than the
  text: any copy, with or without unsent changes, is erased (and the board closed) only when the removal
  is certain: someone is signed in, the two-step code is not what is missing, and the child is neither
  among the account's children nor in its bin (`removed`). Otherwise the copy stays the board ("forbidden"
  is also what the database answers when the login server could not renew the session just then).
- [x] **A damaged board must still open (Q42).** Done. `src/lib/profileShape.ts` + `migrate`: every part
  gets the shape the screens expect, what is sound is returned untouched, no word moves
  (`damagedBoard.test.ts`, and the core-layout fixture still passes). `BoardRescue` around the board:
  "Try again" and, for managers, the earlier versions. An unreadable device copy is kept under
  `caa.child.<id>.bad`. Default boards the family deleted are no longer added back; a family-made
  activity board missing from the list is put back at the end.
  *On the way:* a starting activity board that is present but not in the list is left out of the list (an
  older version had added deleted ones back into the saved profiles: listing them would bring them back).
  Found while testing in the browser: a card whose word is named like a part of every JavaScript object
  ("toString") made the board fail; such names are no longer accepted as ids.
- [x] **A tablet with no voice for the board's language is silent with no reason shown (Q35).** Done.
  One line above the board, closed with its cross, back at the next opening until a voice is installed
  (`NoVoiceNotice`). An empty voice list still shows nothing.
- [x] **A recording that cannot be played stalls the sentence.** Done. An error, or nothing loaded after
  1.5 s: the device's voice says the word (`playOne` in `src/lib/speech.ts`, `speechFallback.test.ts`).
  The browser always saves a WAV. **Not tried on an iPad** (hand-test list of batch 6).
- [x] **Usage recording can mute a touch.** Done. The call is inside try / catch, the recorder too, and
  the stored days are only taken back when they have the expected shape.
- [x] **Help is always reachable (Q36, Q50).** Done. Help is the last step of the switch scan (after the
  board's last row; lit on the bar; its name said by the spoken preview). The credits page is now a panel
  of the board, beside the bar, over the panel it was opened from (which keeps its unsaved changes); any
  other panel that opens, Help above all, takes its place. Outside a board it keeps its own window.
  The child lock was checked by reading: it never hid Help. The scan still pauses on the Schedule page and
  under panels (not asked).
- [x] **Touch mode "as soon as it touches": a touch held 0.6 s says the word twice.** Done.

Also done here because the code was being rewritten: batch 5's "Short race: `onRemote` is called after
`await writeNow()`" (the board is now told before the write).

Tried in a real browser (demo build, Chromium, 1180 × 900): the no-voice line and its cross; opening an
activity board and ticking a step leave nothing to send and the server copy untouched; the credits panel
beside the bar, Help answering over it; "Back" from "Add a child"; a board damaged in six ways opens with
its activity boards, schedule and Help; the scan lights Help and the switch opens it; a touch held one
second adds the word once; the rescue page with "Try again" and the earlier versions; an accessibility
scan of the three new screens (the no-voice line, the credits panel, the rescue page): no rule broken.

Left for the owner's hand-test list (batch 6): a "use only" tablet receiving a new word while the child
uses it; start without internet on a tablet (the board within a few seconds); a browser-made recording
played on an iPad; a tablet without an Arabic voice showing the line.

An independent review of the sync and start-up code found seven faults in the first version of this
batch, all corrected before it went live: a copy left by another account on the same device could have
been opened for the person signed in (the copies kept on a device now belong to one account:
`localOwner`); a session the login server could not renew made the database answer "forbidden" and the
clean copy was erased (see above); in a browser a recording that cannot be played was still silent (the
browser says "playing" before it has read anything); a step left ticked on the server by an older version
made a change of that sequence count as a collision; a newer version taken in the instant before the
board listens was not shown; the guide of a set-up could open on a newly linked tablet (never there now);
a login-server error such as "the confirmation e-mail could not be sent" was shown as "no internet".

Seen on the way, not changed (not in this batch): a member whose access is removed while the board is
open keeps it on screen until the app is opened again (`pull` ignores "forbidden"); worth a line in
batch 4 or 5.

## Batch 2 — What a child can reach (no database file)

**Done on 22 November 2026** (one change, no database file). Checks: `npm run typecheck` clean, `npm test`
557 passed, `npm run test:a11y` still to run on this version (work in progress), and three real-browser runs on the demo build (below).
What was done differently from the text, or decided on the way, is written under each item. The rules are
in one file, `src/lib/caregiverCode.ts`, tested by `caregiverCode.test.ts`.

- [x] **The first "choose a code" keypad cannot be skipped on a family's board (Q9).** Done, and made a
  state of the board instead of a panel opened once: whenever someone who decides for the child (owner,
  co-parent who manages) has a family's board open with no code chosen, the keypad is there, with no cross,
  no Escape, no touch beside (`mustChooseFirst`, `<PinPanel first />` in `Root`). Reloading the page brings it
  back. The bar stays usable: Help (or any panel opened from the bar) shows instead and the keypad returns
  when it closes; a demonstration plays on the board. Once the code is chosen the guide opens (new board) or
  the board is simply there. The rights are asked again until known (4 s, 12 s, then with each look at the
  server and when the app comes back to the front); the guide of a new board no longer opens around the
  keypad after 4 seconds. Never on a child's linked tablet, for the app's team, on a professional's boards or
  on the try-it preview.
  *On the way:* a family that had skipped the keypad before this version gets it at the next opening by a
  parent (that is the gap being closed: with no code, the first person to press "Caregiver" chose it).
- [x] **"1234" opens caregiver mode on every device that may not choose the code.** Done. While no code is
  chosen, no code is accepted (`codeAccepted`); and those devices no longer get a keypad at all but one
  sentence: the code is chosen by a parent on their own device (`t.pinNotChosen`, three languages).
  "1234" is written in no screen any more (a test checks it).
- [x] **Timer (Q10).** Done. Choosing an existing word stays open; "Create a new word" outside caregiver
  mode asks the code (with "Back" to the picker), then opens straight on the new-word form without turning
  caregiver mode on. At the next visit the code is asked again. The timer's display and sound choices were
  left as they are (not ruled).
- [x] **"Write to model" (Q11).** Done. "Record a demonstration" asks the code and then starts recording;
  deleting one asks the code and returns to the tab, where the deletion is confirmed as before. Typing or
  dictating a sentence, replaying and the speed stay open.
- [x] **Caregiver mode turns itself off (Q12).** Done: after 5 minutes without a touch (a key or the mouse
  wheel count in a browser), and at once when the app goes to the background or the tab is hidden. The
  adults' panels close with it (the settings and the lock opened from the bar, a new word or the
  demonstrations opened after the code, anything whose "Back" leads to the settings). The board is then
  directly usable: no keypad is put over it (a child must never find their board covered).
  *"An unsaved change is kept":* the settings' draft is now the list of what the person changed
  (`src/lib/settingsPatch.ts`) and waits in `app.settingsStash`: opening Settings again shows "Changes not
  saved" with the switches as they were left; "Save" and "Cancel changes" work as before. A word or an
  activity board half-typed in its form is not kept (those forms write when "Save" / "Create" is pressed).
  *Decided on the way:* (1) a system screen the app opens itself is not "leaving" (`outside()` in
  `src/lib/outside.ts`): camera, photo library, file chooser, share and print sheets, the microphone / camera /
  photos / dictation questions, the new e-mail of an invitation, "Test" of an app link. On Android each of
  these puts the app in the background: without this a parent could not add a photo to a word. (2) A screen
  that waits for a code the person reads elsewhere (the proof before deleting or downloading, two-step
  set-up) is not closed by leaving, or it would send a new code for ever (`waitsElsewhere`). In both cases the
  5 minutes still apply on the way back. (3) Not for the app's team (never asked a code), and not on a
  professional's material (it opens in caregiver mode inside her workspace, which is not behind a code).
- [x] **Wrong codes (Q13).** Done. The countdown is shown for the whole pause; "Wrong code" for the tries
  before it. Pauses and the list of refused codes unchanged (a test keeps them).
- [x] **A professional with "use" access sees the family's code and passes the keypad.** Done. Her own code
  is asked on every board she opens, whatever the family lets her do; "Settings" beside a child always goes
  through it; Settings → Code and data never shows the family's code on a board opened from a professional's
  workspace (`showsCodeField`: also true for the app's team, who have no code of their own there).
  "Forgot the code?" chooses again without proof only on the try-it preview; on the set-up's trial board
  (not saved yet) the signed-in person proves it is them. A material now also gets her own code if she
  leaves caregiver mode and comes back. The family's code still travels inside the profile: batch 3.
- [x] **Guide "Try it"; Settings → "Deleted words".** Done. Every panel opened by "Try it" has "Back" to the
  guide (Search and its tabs, Help, Settings, Print, New board, the keypad); for Settings, Print and New
  board the code leads to the panel that was asked instead of plain caregiver mode. "Deleted words" and
  back keeps the unsaved settings (same mechanism as above).

Also done here because the settings' draft was being rewritten: batch 5's "Settings 'Save' writes the whole
stale draft" ("Save" writes only what the person changed; a consent withdrawn on another device is no
longer switched back on).

Tried in a real browser (demo build, Chromium, 1180 × 900), 88 checks in three runs:
- *a family's board* (59): the first keypad (no cross, Escape, a touch beside, a touch on the board behind,
  Help over it and back, the page reloaded, "1234" refused as a new code, the guide after the code, nothing
  at the next opening); five wrong codes then the countdown, the keypad again after 30 s; caregiver mode
  off when the tab is hidden, still on after 4 minutes, a touch starting the 5 minutes again, off after 5;
  an unsaved setting found again after the tab was hidden; the timer's picker (existing word without the
  code, new word behind it, "Back", the code asked again next time); a demonstration recorded and deleted
  behind the code, a sentence shown without it; the guide's "Try it" for Settings and Help with "Back";
  "Deleted words" and back with the change still waiting.
- *a tablet linked with a "use only" code, on a board whose code was never chosen* (16): no keypad in
  front of the child; "Caregiver", "Settings" and the timer's "Create a new word" answer with the sentence,
  with no keypad and no "Forgot the code?"; Help answers; once the family has chosen, the keypad asks the
  code, "1234" is a wrong code and the family's code works.
- *a professional with "use" access* (13): "Settings" beside the child asks her to choose her own code;
  the code field holds hers; the family's code is nowhere on the page and is a wrong code on the keypad;
  "Forgot the code?" asks for her account's password.

Left for the owner's hand-test list (batch 6): on an Android tablet and an iPad, in caregiver mode, take a
photo for a word, pick one from the library, record a word (first time: the microphone question), share a
PDF, print — caregiver mode must still be on afterwards; then press Home and come back — it must be off.

## Batch 3 — Database holes (one or more migration files + scenarios)

- [ ] **Recording and sharing can be turned on while a professional owns the profile, with no parent
  consent.** [ran, twice] `save_profile` (`20261115000000_pro_profiles.sql` ~110) only blocks "caller is
  the owner and is a pro". She makes a full pairing code, redeems it from an anonymous session, and that
  session saves `dataCollection` / `shareStats` / `shareTerms`; `save_usage_day` and `save_feature_day`
  then store days; `consents` stays empty. Fix: refuse any change of those three when
  `is_pro(owner_id)`, whoever calls (also `guard_share_terms`); the two save functions refuse when the
  owner is a pro.
- [ ] **Hand-over cleans the team (Q15).** [ran, twice] `join_profile` only demotes the pro's own row.
  At hand-over: delete the profile's `pairing_codes`; cancel every pending invitation; revoke members
  with role `device`; set manager / changeAccess / invite / manageDevices / viewData to false on every
  remaining member; notice to the new owner listing who is on the team (three languages in
  `src/lib/notices.ts`).
- [ ] **Someone removed can come back.** [ran by reviewer] One shared "remove" routine for
  `revoke_member` and `cancel_invitation`: cancel pending invitations from and to that person, delete
  pairing codes they created. `respond_invitation`: refuse one's own invitation; keep `expires_at` on
  re-join; limit `p_role` for non-managers; refuse tablets (`is_tablet()`) in `accept_invitation_code`
  and `respond_invitation`.
- [ ] **A full-access tablet is allowed only what its screen shows (Q18).** Today it is a full parent in
  the database (removes the other parent, changes rights, erases follow-up) [ran by reviewer]. Keep:
  board, board settings, the code, devices and "use" codes. Refuse: removing members, changing rights,
  approving requests, erasing follow-up, the family code.
- [ ] **The family's code is not sent to professionals (Q19).** Today `settings.pin` travels in
  `profiles.data` to every member and is in "Export profile". The server must stop sending it to members
  whose role is professional; parents, family members and the child's tablets keep it. The app must cope
  with a profile that has no code in it (her own code, `useOwnCode`).
- [ ] **A professional whose acceptance was withdrawn still downloads the children she created.**
  [ran by reviewer] `export_my_data` (`20261120000000_push.sql` ~437): add `pro_cleared(me)`. Also: a
  removed therapist's export still holds what the child said (~460).
- [ ] **Two-step does not cover the professionals' document folder.** [ran by reviewer] Add
  `and public.mfa_ok()` to the own read / upload / delete rules of `verification-docs`.
- [ ] **Weekly team e-mail** [ran by reviewer]: `team_week_figures` tests 5 children, not 5 families, and
  prints the exact number under 5.
- [ ] **Figures (Q23).** Plain totals (profiles, with tablet, with team) stay for all families. Everything
  about use (used in 7 / 30 days, edited in 30 days, "boards used this week", sub-groups) follows
  "consenting families only, at least 5 children of 5 families"; groups of 1–4 are never a number
  (`admin_product` "children": 3, `admin_overview`). Correct the privacy draft and the `CLAUDE.md` line.
- [ ] **A member can overwrite a tablet's follow-up day.** [ran by reviewer] `save_usage_day` must
  require `devices.user_id = auth.uid()` (or manager); strip `deviceId` in `clean_usage`.
- [ ] `usage_of` / `list_observations` return nothing instead of `forbidden` to someone without
  "see the progress data": the screen then shows empty charts (raise `forbidden`). Observations: show
  edit / delete only to the author or a manager; mirror the rule in `LocalBackend`. Remove `profile_id`
  from the observations update grant (a note can be moved to another child) and from the app's update
  row (`supabase.ts` ~1195: refused today until the privacy migration is run).
- [ ] `my_name()` and `join_profile` fall back to the whole e-mail address as display name: use "—".
- [ ] `register_device`: count only "not revoked", add `rate_limit`; do not overwrite the name and kind
  of an existing row (`Stages.tsx` ~200 renames every linked tablet "iPad").
- [ ] Ceilings: count limit on `resources`; size limit on `accounts.prefs` and `display_name`;
  `rate_limit` in `add_history` and `update_proposal`. `resources.profile_id` can be set to any profile.
- [ ] Free text about a child not sealed: `observations.context / partner / result` (CLAUDE.md rule).
- [ ] `save_feature_day` uses `is_admin()` where `is_team()` is meant; `report_problems` has no
  professional / team test.
- [ ] `usageTracker.ts` ~252 stops at the first refused day and retries it for ever: drop a day refused
  with `invalid`, continue.
- [ ] Retention: `feature_days`, `error_counts`, `rate_log`, `ai_calls` are only cleaned by chance; put
  them in `retention_daily`. Pending invitations past their 30 days are never deleted.
- [ ] AI ceiling (`count_ai_call` adds to the shared budget before the per-account limit): **waits**
  until the owner turns the AI on (Q33).

## Batch 4 — People and rights (database + screens)

- [ ] **Second parent (Q16):** an "Acts as a parent" switch on a team member, owner only, behind
  `fresh_proof`. Today `INVITE_ROLES` has no parent and nothing sets `manager` (`TeamTab.tsx` ~39). The
  switch "Manage devices and rights" (`manageDevices`) is read by no SQL: wire it or remove it.
  `AccountTab.tsx` ~254 prints the raw word "forbidden": use `errorText`.
- [ ] **The owner deletes their account (Q17):** today every profile they own is erased at once for the
  whole team and every tablet (cascade), no bin, no notice. The screen must name who loses the board,
  offer to hand the child to another parent first (ownership transfer between parents does not exist
  yet: build it), and only then erase. Also: `deleteAccount` (`supabase.ts` ~568) removes a
  professional's documents BEFORE the proof is given: remove the client-side deletions (the purge queue
  does it).
- [ ] **Leave a team; a new request after a refusal (Q20).** Both are dead ends today.
- [ ] **Rename a child, change the age (Q21):** owner, Account → Children. No Backend method today.
- [ ] **Invited professionals must be verified (Q26, Q27):** an invitation with role therapist or teacher
  needs a verified `pro` account before any access; family, caregiver and other do not. Existing
  unverified ones lose access until verified. Never touches the child's board or the family's access.
  A place for "has paid" is prepared (decided by the database, open for now): see Payment below.
- [ ] `ProHome.tsx` ~19: an offline professional is sent to the verification form
  (`getVerification().catch(() => null)`).
- [ ] "Change password" with two-step on probably drops the session to one step [plausible]: prove with
  the authenticator code for those accounts.
- [ ] Approving a proposal can apply it twice (`TeamTab.tsx` ~543: no busy state, board changed before
  the status call succeeds). "Undo" applies `inverse` from the history without `foreignOps`.
- [ ] Invitations: consent recorded even when the person declines (`InvitationsScreen.tsx` ~38); expired
  invitations still shown as pending; a load failure shows "no invitations".

## Batch 5 — Files and merging

- [ ] **Pictures and recordings added by a professional never reach the family.** [read] `MediaSync` is
  only opened in `Stages.tsx` ~182; a `pro` account never reaches that stage. And every pick from
  "App's library" is copied into the media store (`pictoToMedia`: `CaregiverPanels.tsx` ~419, ~682,
  `NewTlaPanel.tsx` ~94, ~110) instead of being stored as `{ kind: 'picto', key }`. Fix both: library
  picks as `picto` references; a send-only MediaSync for the profile a professional edits.
- [ ] **Replaced pictures and recordings are kept 30 days (Q38).** Today `setSymbol`
  (`CaregiverPanels.tsx` ~374) and the Recorder (~65, ~90) delete at once, the account copy ~2 s later;
  "Undo" and "Earlier versions" then point to nothing. Files leave only through the sweep; names used
  by the server copies and the last 30 days of history count as "in use". Same for a profile in the bin
  (`eraseMediaOf`, `AccountTab.tsx` ~354) and for one file used by a duplicated board or a sibling.
- [x] **Settings "Save" writes the whole stale draft.** Done with batch 2 (`src/lib/settingsPatch.ts`).
- [ ] **Merging (Q39).** [ran by reviewer] A swap against a delete loses a word (in nobody's bin); two
  people each adding an activity board: the second is not listed (`tlaOrder` is one op,
  `src/lib/profileDiff.ts`); `demos`, `bin` are not merged at all. Decision: a word is merged part by
  part (picture, recording, labels); the message names what was not kept; `tlaOrder` merges as a list;
  a conflicting move / swap is dropped whole; `demo` and `bin` ops by id. Core cells never move.
- [ ] **Export becomes a real backup (Q40):** one archive with the pictures and sounds, without the
  caregiver code. The file name must survive a "/" in the child's name (`platform.ts` ~36).
- [ ] **Import (Q41, Q49):** presented as "from another caregiver"; an imported file always arrives with
  no code, no links, no help contact, no demonstrations, no bin (`Onboarding.tsx` ~216). The set-up says
  beside it that the same family on another device simply signs in, or links the tablet with a code.
- [ ] **Reset profile (Q32):** asks the same proof as deleting; keeps the code and the family's choices
  (follow-up, sharing); files kept 30 days. Today: two taps, code back to "not chosen", files removed.
- [ ] **Photos left on a device (Q43):** "Also erase the photos and recordings made on this device" is
  ticked by default at sign-out; after a successful `listProfiles`, `forgetChild` every stored child the
  account can no longer open (and not dirty).
- [ ] Follow-up kept on a tablet is not erased when follow-up is turned off from another device
  (`Stages.tsx` ~281: call `tracker.forget()` / `product.forget()` in `onRemote` too).
- [ ] Storage write failures are swallowed (`.catch(() => {})` in profileSync, usageTracker,
  productCounters, mediaSync): show "this device is full", drop uploaded usage days first; add
  `tx.onabort` in `media.web.ts`.
- [x] Short race: `onRemote` is called after `await writeNow()` (`profileSync.ts` ~223, ~192). Done with batch 1.
- [ ] The notification subscription survives every sign-out except the button (`Session.tsx` ~229).

## Batch 6 — Texts and documents

- [ ] **Recording becomes optional (Q48):** remove "record before Save" from "Create a new word"
  (`PickerPanel`, `t.recordRequired`); "Record" stays as an option; correct the guide and `CLAUDE.md`.
- [ ] **AI switched off, code kept (Q47):** the server function stays undeployed. Remove from the
  screens: the "AI suggestions" switch and its note (`CaregiverPanels.tsx` ~1442), the sentence under
  "Draw" about the AI "to be set up" (`SearchBox.tsx` ~181, `ui.ts`), "Draw" ignoring that switch.
  Nothing on screen mentions AI. The consent text does not change now. (When the AI is turned on later:
  the ceiling in SQL, the consent text and documents saying what is sent, families asked again.)
- [ ] **Untrue sentences:** a recording "stays on this device" (`ui.ts` ~186, ~221, ~619, ~652, ~1051,
  ~1300; `guide.ts` ~366): recordings are copied through the account. The dictation failure message
  speaks of "the online demo" for every cause (`VoiceButton.tsx` ~62). On web the line "Apple's or
  Google's service hears it" is never shown (`VoiceButton.tsx` ~97).
- [ ] **Support and delete-account pages** (`public/support/`, `public/delete-account/`, three
  languages): support e-mail `empowerhub.me@gmail.com`, company "Empower Hub", address "Beirut, Lebanon";
  take OUT the privacy e-mail and the "[number] working days" lines; check the remaining brackets
  ("[link]", "[60] days") and the backup sentence against `docs/SECURITY.md`.
- [ ] **Name and version (Q51):** "Empower Communication" everywhere, under the icon included
  (`app.json` name "CAA", slug, the web page title); one version number (`app.json` 0.1.0 vs
  `package.json` 1.0.0). No `ios.bundleIdentifier` / `android.package` / `eas.json` yet: ask the owner.
- [ ] **Documents (Q24, Q52):** `docs/ARCHITECTURE.md` and the legal drafts say "web for chosen testers
  today, sold in the stores only"; add caa-purge, caa-push and the browser push services; retention
  documents follow the code (deletion list 30 days, decided invitations 12 months);
  `docs/SECURITY.md` counts; `docs/ACCESS-LIST.md` secrets (`PUSH_CONTACT`, `SMTP_HOST`); README
  figures. Add `supabase/config.toml` with `verify_jwt = false` for caa-mail, caa-purge, caa-push.
- [ ] **For the owner's lawyer** (a list, not decisions): should the proof of consent survive account
  deletion (today deleted with it); retention of observations, diplomas, inactive accounts; the
  professional's name kept in the team's log 5 years after deletion; the payment rules below.
- [ ] **Hand-test list for real tablets** (nothing here was tried on a device): speech and the four
  voices, recordings (and a browser-made recording played on an iPad), child lock, links behind the code,
  offline start, a linked "use only" tablet receiving a new word, Arabic long sentence scrolling; from
  batch 2: in caregiver mode, a photo taken or picked, a word recorded, a PDF shared, a page printed must
  leave caregiver mode on, and Home then back must find it off.
- [ ] Small ones: hard-coded texts (`ModelPanel.tsx` ~38, `NewTlaPanel.tsx` ~360, "up" / "down" /
  "-" / "+" labels), `Pressable`s without a role (`CaregiverPanels.tsx` ~481, ~739, ~855,
  `Workspace.tsx` ~180, `ScheduleScreen.tsx` ~109), colour #98A2B3 on white, print failure shows
  nothing, empty states of Schedule and Activity boards, dead `LangPanel`, `expo-constants` imported
  but not in `package.json`.

---

## Payment: decided as rules, NOT to build now (Q28, Q44–Q46)

A separate project, after the owner has settled the legal side (company bank account, store rules).
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

## Left as it is, on purpose

- The list of refused codes (Q14); the wrong-code pauses (Q13).
- Web sign-up open (Q30).
- New activity boards and sequences create words without asking anything (Q37, moot after Q48).
- In a browser, links open with one tap (tablets ask the code): the written rule.
- The Help panel shows "how I communicate" and the emergency contact to whoever opens it.
- The noon reminder means "the board was open and online today", per device time zone.

## `CLAUDE.md` lines to update when the matching batch ships

- "With a child's voice, 'Create a new word' requires a recording…" → optional (batch 6).
- "The scan never covers the universal bar" → except Help (batch 1).
- The back-office figures rule → totals for all, use for consenting families of 5+ (batch 3).
- Caregiver code: the first keypad cannot be closed; caregiver mode turns itself off (batch 2: done).
- Professionals: invited therapists and teachers must be verified; the family's code is not sent to them
  (batches 3–4).
- Sync: device-only things never travel (batch 1). Media: replaced files kept 30 days (batch 5).
- Import / export rules (batch 5). Payment rules above (new section).
- Publishing rule mentions the web app as "live": say "for chosen testers" (batch 6).
