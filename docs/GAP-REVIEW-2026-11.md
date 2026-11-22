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
560 passed, `npm run test:a11y` no violation (236 scans, the first keypad among them), and four real-browser runs on the demo build (below).
What was done differently from the text, or decided on the way, is written under each item. The rules are
in one file, `src/lib/caregiverCode.ts`, tested by `caregiverCode.test.ts`.

- [x] **The first "choose a code" keypad cannot be skipped on a family's board (Q9).** Done. At the first
  opening after the set-up, for someone who decides for the child (owner, co-parent who manages), the keypad
  is a state of the board, not a panel opened once: no cross, no Escape, no touch beside (`mustChooseFirst`,
  `<PinPanel first />` in `Root`); reloading the page brings it back. The bar stays usable: Help (or any
  panel opened from the bar) shows instead and the keypad returns when it closes. Once the code is chosen
  the guide opens. The rights are asked again until known (4 s, 12 s, then with each look at the server and
  when the app comes back to the front); the guide no longer opens around the keypad after 4 seconds. Never
  on a child's linked tablet, for the app's team, on a professional's boards or on the try-it preview.
  *Decided on the way (to confirm with the owner):* a board already in use that still has no code (a family
  that closed the keypad before this version; a profile handed over by a professional) is **not** covered by
  the keypad: the person opening the app is often the child, and a child without their board comes before
  a child reaching adult tools. There, "Caregiver", "Settings" and the like first ask the account's password
  (or a code sent to its mailbox), then the code is chosen: the child cannot be the one who chooses it.
- [x] **"1234" opens caregiver mode on every device that may not choose the code.** Done. While no code is
  chosen, no code is accepted (`codeAccepted`); and those devices no longer get a keypad at all but one
  sentence: the code is chosen by a parent on their own device (`t.pinNotChosen`, three languages).
  "1234" is written in no screen any more (a test checks it). *More than the text:* a tablet linked with a
  full-access code could choose the code itself (it has the parents' rights in the account): the first
  person to press "Caregiver" on the child's tablet chose it. A linked tablet never chooses the code now.
  Consequence: for a profile a professional created and has not handed over yet, a linked tablet has no
  caregiver mode until the family has its account (she edits from her workspace, with her own code).
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

An independent review of the change found six faults in its first version, all corrected before it went
live: the un-closable keypad was shown on every family board without a code, so it could cover the board
of a child opening the app alone on a tablet signed in with the parent's account (now only at the first
opening after the set-up, see above); settings thrown away with "Leave without saving" came back at the
next opening; a full-access linked tablet let anyone choose the code; on a tablet, typing in a field did
not count as a touch (five minutes of writing closed the settings); the guide of a new board was put off
to the next start when the code was chosen from the bar (the welcome card offers it now); the app's team
needed extra taps for a new word and to delete a demonstration.

Also done here because the settings' draft was being rewritten: batch 5's "Settings 'Save' writes the whole
stale draft" ("Save" writes only what the person changed; a consent withdrawn on another device is no
longer switched back on).

Tried in a real browser (demo build, Chromium, 1180 × 900), 104 checks in four runs:
- *a family's board* (62): the first keypad (no cross, Escape, a touch beside, a touch on the board behind,
  Help over it and back, the page reloaded, "1234" refused as a new code, the guide after the code, nothing
  at the next opening); five wrong codes then the countdown, the keypad again after 30 s; caregiver mode
  off when the tab is hidden, still on after 4 minutes, a touch starting the 5 minutes again, off after 5;
  an unsaved setting found again after the tab was hidden; the timer's picker (existing word without the
  code, new word behind it, "Back", the code asked again next time); a demonstration recorded and deleted
  behind the code, a sentence shown without it; the guide's "Try it" for Settings and Help with "Back";
  "Deleted words" and back with the change still waiting; the proof before "Download all my data" still
  there after the tab was hidden, closed after 5 minutes without a touch.
- *a tablet linked with a "use only" code, on a board whose code was never chosen* (16): no keypad in
  front of the child; "Caregiver", "Settings" and the timer's "Create a new word" answer with the sentence,
  with no keypad and no "Forgot the code?"; Help answers; once the family has chosen, the keypad asks the
  code, "1234" is a wrong code and the family's code works.
- *a professional with "use" access* (13): "Settings" beside the child asks her to choose her own code;
  the code field holds hers; the family's code is nowhere on the page and is a wrong code on the keypad;
  "Forgot the code?" asks for her account's password.
- *a board already in use with no code, opened with the parent's account* (13): nothing covers the board
  and the child talks; "Caregiver" and "Settings" ask the account's password before any keypad, a wrong
  password chooses nothing; after the right one the code is chosen. "Leave without saving" really throws
  the change away, and saving while leaving leaves nothing waiting.

Left for the owner's hand-test list (batch 6): on an Android tablet and an iPad, in caregiver mode, take a
photo for a word, pick one from the library, record a word (first time: the microphone question), share a
PDF, print — caregiver mode must still be on afterwards; then press Home and come back — it must be off.

## Batch 3 — Database holes (one migration file + its scenario)

**Done on 22 November 2026.** One database file, `supabase/migrations/20261122000000_gap_batch3.sql`,
its attacks in `supabase/tests/gap3_scenario.sql` (in `scripts/test-db.sh`; line added to
`supabase/check-migrations.sql`), the same rules in the demo server (`gapBatch3.test.ts`). Checks:
`npm run typecheck` clean, `npm test` 574 passed, `npm run test:db` 13 scenarios passed (429 checks),
`npm run test:a11y` no violation (236 scans), and a real-browser run on the demo build (below). What was done differently
from the text, or decided on the way, is written under each item.

**For the owner: one file to run**, `20261122000000_gap_batch3.sql`, in Supabase → SQL Editor, AFTER this
version of the app is published (the app reads a profile through a new function and falls back to the old
way until the file has run; the file then closes the old way, so a page still open on the older version
shows the board from the device until it is reloaded). The file also erases the follow-up days and counters
that were stored for profiles still owned by a professional, and turns their switches off.

- [x] **Recording and sharing can be turned on while a professional owns the profile, with no parent
  consent.** Done. While `is_pro(owner_id)`: `save_profile` and `guard_share_terms` refuse any change of the
  three (whoever calls), a trigger keeps them off however the row is written, `shares_product` is false,
  `save_usage_day` and `save_feature_day` refuse.
- [x] **Hand-over cleans the team (Q15).** Done in `join_profile`: pairing codes deleted, every waiting
  invitation and request cancelled, `device` members revoked (their devices marked removed), manager /
  changeAccess / invite / manageDevices / viewData false on everyone left, and a notice to the new owner
  naming the team (three languages in `src/lib/notices.ts`). The guide says it to the professional.
- [x] **Someone removed can come back.** Done. One routine, `remove_from_team`, for `revoke_member`,
  `cancel_invitation` (of an accepted invitation) and `revoke_device` (a tablet): the access ends with the
  waiting invitations from and to the person and the tablet codes they made. `respond_invitation` refuses
  one's own invitation; `expires_at` is kept on re-join; a member who may invite cannot invite a "parent"
  (owner only) nor a "device"; a request cannot ask for "parent" or "device"; tablets are refused in
  `accept_invitation_code` and `respond_invitation`.
  *Decided on the way:* "keep `expires_at`" applies to an invitation that was already waiting when the
  access ended; an invitation written after the end date is a new decision and starts without one
  (otherwise a family that invites someone again would see them join with no access). The invitation by
  which the parents took a profile over cannot be "cancelled" to remove them.
- [x] **A full-access tablet is allowed only what its screen shows (Q18).** Done: the team is run by the
  family signed in as itself (`manages_team`). Kept for the tablet: the board, its settings, the code,
  the devices, "use" codes. Refused: removing members, changing rights, approving or declining requests,
  inviting, cancelling or re-sending invitations, the family code, full-access codes, erasing the
  follow-up. *More than the text, same principle (its screens have no Team and no Progress page):* it no
  longer reads the follow-up or the observations, the invitations (with their codes) or the team's e-mail
  addresses; it cannot change the recording and sharing choices; among the devices it removes other
  tablets only (removing a parent's phone locked that parent out of the device).
- [x] **The family's code is not sent to professionals (Q19).** Done. A profile's content is read through
  `read_profile`, which leaves `settings.pin` out for a professional; the `data` column can no longer be
  read from the table; `save_profile` ignores the code a professional sends and its "too late" answer has
  none; her "Download all my data" has none. *Who is "professional":* a `pro` account, and a member whose
  role is therapist or teacher even with a family-type account (until batch 4 makes them `pro` accounts):
  on the family's board she is now asked her own code (`useOwnCode(true)` in `BoardStage`), as in a
  professional's workspace. Caregivers, family members, "other" and the child's tablets keep the code.
  Export from a professional's device therefore has no family code (the export itself: batch 5).
- [x] **A professional whose acceptance was withdrawn still downloads the children she created.** Done
  (`pro_cleared(me)`); and an observation is in a person's file only for a profile she owns or while she may
  still read that child's follow-up.
- [x] **Two-step does not cover the professionals' document folder.** Done (read, upload, delete).
- [x] **Weekly team e-mail.** Done: 5 families (which are always at least 5 children), no number below.
- [x] **Figures (Q23).** Done. Totals for all families: accounts, profiles, with tablet, with team, devices
  linked, team roles, invitations, proposals, materials. Among consenting families only, from 5 children of
  5 families, never 1–4 as a number (`shown_n` answers `null`, the screens write "fewer than 5"): used in
  7 / 30 days, edited in 30 days, "boards used this week", how many share (`sharing`, `agreed`, "children":
  3), and every sub-group. *Decided on the way (say if it is too strict):* the devices seen in 7 / 30 days,
  the devices waiting to send, their systems and app versions, and "board changes this month" are figures
  about use too: same rule. The privacy draft, the record of processing and `CLAUDE.md` say it.
- [x] **A member can overwrite a tablet's follow-up day.** Done: the device must be the caller's (or the
  family taking a device over); the device's name and the day kept inside the row are the server's. Same
  for the feature counters.
- [x] `usage_of` / `list_observations` raise `forbidden`. Observations: edit / delete shown to the author
  or a manager only (and refused otherwise by the database and the demo server); `profile_id` out of the
  update grant and of the app's update row.
- [x] `my_name()` and `join_profile`: "—" instead of an e-mail address or a phone number (the demo server too).
- [x] `register_device`: counts "not revoked", 300 a day, keeps the name and kind of an existing device.
- [x] Ceilings: 500 materials per person; preferences 20 KB, name cut at 80 characters; `add_history` 2000
  a day, `update_proposal` 60 a day; a material is tied to a child of one's own teams only.
- [x] Free text about a child sealed: `observations.context / partner / result` (existing rows sealed by the file).
- [x] `save_feature_day`: `is_team()`; `report_problems` refuses a professional and the app's team.
- [x] `usageTracker.ts`: a day refused with `invalid` (or `too_large`) leaves the list, the next ones are sent.
- [x] Retention: `feature_days`, `error_counts` (180 days), `rate_log` (2 days), `ai_calls` (30 days) in
  `retention_daily`. *Decided on the way:* an invitation nobody answered is erased 60 days after it was
  written (30 valid, 30 more during which the family can send it again); `RETENTION-SCHEDULE.md` says so.
- [ ] AI ceiling (`count_ai_call` adds to the shared budget before the per-account limit): **waits**
  until the owner turns the AI on (Q33).

An independent review of the database file found ten faults in its first version. Corrected before it went
live: a full-access tablet could make a parent's phone "its own" by registering under its device name, then
write over its follow-up day or remove it (a device another account used now passes to a person, never to
or from a tablet); a full-access code typed from a person's account made that person a manager (a tablet's
code now only works on a tablet's own sign-in); one product table still showed a group of 5 children of one
family; a professional who may invite could invite a "family member" account that receives the code (she
invites therapists and teachers only); a professional given the manager right could link a tablet that
receives the code, change her own role, or save the settings as something that is not a list of settings
and so wipe the code (all three refused); a damaged `settings` made the profile unreadable for professionals.
Also from that review: a member signed in on a phone another account had used could no longer send follow-up
(the device now passes to them).

Left open, for the owner to decide:
- A tablet linked by a co-parent stays linked when that co-parent is removed from the team (the tablet is
  the child's: unlinking it would take the board away). The family sees it under Account → Devices and can
  remove it. To decide with batch 4.
- An app that was not updated cannot open a board for the first time, nor create a profile, once the file
  has run. Today the web version is the only one published: run the file after this version is live.
- Counted for all families although they can be small numbers: team members by role, invitations,
  proposals, materials, shares, observations written, AI users. Say if any of these should follow the
  "5 families" rule too.

Tried in a real browser (demo build, Chromium, 1180 × 900): 17 checks. A parent invites a
teacher by e-mail; the teacher signs up with a family-type account and accepts: her board opens with
nothing over it, the copy on her device holds no family code, "Caregiver" asks her to choose her own code
with its explanation, the family's code is a wrong code for her, her settings never show it; back on the
family's side her code is a wrong code, the family's code works and the teacher is on the team. Back
office (demonstration figures): "Devices waiting to send" reads "fewer than 5", the use figures say they
count the families who share, no page shows "null". Not tried in a browser (demo server and database tests
only): the hand-over notice, a full-access tablet's refusals, the observation rules.

Seen on the way, not changed (not in this batch):
- A pairing code typed while signed in with a personal account (not on a fresh tablet) makes that account
  a "device" member; an existing member keeps their role and takes the code's rights. Full-access codes
  need the family's fresh proof, so it is the family's own act; worth a look with batch 4 (rights).
- Any co-manager can still give the "manager" right to someone else (`update_member`): batch 4 ("Acts as a
  parent", owner only).
- `deleteAccount` in the app still removes a professional's documents before the proof (batch 4).

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
- The back-office figures rule → totals for all, use for consenting families of 5+ (batch 3: done).
- Caregiver code: the first keypad cannot be closed; caregiver mode turns itself off (batch 2: done).
- Professionals: invited therapists and teachers must be verified (batch 4); the family's code is not sent
  to them (batch 3: done).
- Sync: device-only things never travel (batch 1). Media: replaced files kept 30 days (batch 5).
- Import / export rules (batch 5). Payment rules above (new section).
- Publishing rule mentions the web app as "live": say "for chosen testers" (batch 6).
