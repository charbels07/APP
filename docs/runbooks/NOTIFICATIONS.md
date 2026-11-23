# Notifications outside the app

*Added 20 November 2026. Browser notifications of the web version; the store apps have none yet.*

## What is sent, and to whom

| Notification | Who receives it | When |
|---|---|---|
| **Reminder** ("The board has not been opened yet today…") | **Parents** (the owner of a child's profile, and a team member with the role "parent") who turned notifications on, on each of their devices | Once a day, between 12:00 and 13:00 **of that device's own time**, only if none of the family's devices (a parent's, or the child's tablet) opened the child's board since midnight. A parent with several children gets one reminder as soon as one board was not opened. |
| **A new idea to vote on** (its title) | The people the idea is asked to: **parents, professionals, or both**, as chosen when adding it in Back office → Requests | When the idea is added as "open". Changing its status or hiding it announces nothing. |

- Nobody receives anything before saying yes: the app asks once after signing in ("Turn on
  notifications?"), and the browser asks its own question after that.
- Each person changes it in the account's **Preferences**: "Notifications on this device",
  "Reminder at 12:00 if the board was not opened" (parents), "New ideas to vote on".
- A child's tablet linked with a code never receives a notification.
- A notification never carries a child's name, a word or a sentence.
- A new idea also appears as a line inside the app for everyone it is asked to, with or without
  notifications.

## What it cannot do (say it as it is)

- **iPhone and iPad**: Apple only allows a website's notifications once the site was added to the
  Home Screen (Share → Add to Home Screen) and opened from there. In a Safari tab the app shows
  that sentence instead of the switch. **This has not been tried on a real iPhone yet.**
- **A board used without internet** all morning looks "not opened" to the server: the parent may
  get the reminder although the child used the board.
- A professional looking at a child's board does not count as "the board was opened".
- The reminder is at 12:00 for everyone; the hour cannot be chosen yet.
- Android and computers (Chrome, Edge, Firefox): should work as is; **not tried on real devices
  yet** either. What was checked here: the database rules, the encryption of the messages and the
  screens.

## Turning it on (once, about 10 minutes)

1. Supabase → SQL Editor: run `supabase/migrations/20261120000000_push.sql` ("Success").
   `supabase/check-migrations.sql` then shows it as done.
2. Deploy the function **`caa-push`** exactly like `caa-mail` and `caa-purge`
   (`supabase/README.md` §10–11): Supabase → Edge Functions → Deploy a new function → Via Editor,
   name it exactly `caa-push`, paste the whole of `supabase/functions/caa-push/index.ts` over the
   example in `index.ts` (one file, nothing else), deploy, then turn **off** *Verify JWT* in the
   function's settings. With the command line: `npx supabase functions deploy caa-push --no-verify-jwt`
   (`supabase/config.toml` also says `verify_jwt = false` for it).
   No key to create or paste: the function makes its own pair of keys the first time it runs and
   the database keeps them (the private half sealed). It uses the connection already made for the
   team's e-mails (`team_mail_connect`), and needs `pg_net` and `pg_cron` like them.
3. SQL Editor: `select public.push_start();` then, a minute later, `select * from push_check();`
   "signing keys" must say **made**. From that moment the app offers notifications.

Until these three steps are done the app works exactly as before and shows nothing about
notifications outside the app (it never says "unavailable").

## Checking, later

`select * from push_check();` shows: the connection, the keys, how many devices accepted
notifications, how many notifications are waiting, and the last error returned by a notification
service.

- "waiting" stays above 0 for more than half an hour: the function is not deployed, or *Verify
  JWT* is on (Supabase → Edge Functions → caa-push → Logs).
- To try it yourself: turn notifications on in your own account, then add an idea asked to the
  group your account belongs to.

## Never do

- **Never delete the line of `push_config`** (the keys). Every device that said yes is tied to
  that pair: with a new pair, nobody receives anything until each person turns notifications off
  and on again.

## What is kept

| What | Where | How long |
|---|---|---|
| A device that accepted notifications: its address at the browser's notification service, two keys made by the browser, the menus' language, the time zone, the day of the last reminder | `push_subs` | Until the person turns it off, signs out on that device or deletes the account; removed when the browser withdraws it; 12 months without opening the app |
| A notification waiting or sent (its words) | `push_out` | 2 days |
| When a child's board was last opened by the family (one moment per child, no history) | `profile_seen` | Replaced at each opening; erased with the profile |

The notification services of the browsers (Google for Chrome and Android, Mozilla for Firefox,
Apple for Safari, Microsoft for Edge) carry each message to the device. They receive it
encrypted for that browser and cannot read it.
