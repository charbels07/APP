# The real server (Supabase)

Until this is set up, the app uses its built-in demo server (`src/backend/local.ts`), so
everything works on one device. Follow these steps to switch to the real server.

## 1. Create the project

1. Create a free account on supabase.com and a **new project**. Pick a **European region**
   (Frankfurt or Paris): children's data stays in the EU, which simplifies GDPR.
2. Open **SQL Editor** and run, in order, the files in `supabase/migrations/`.
   (Or, with the Supabase CLI: `supabase link` then `supabase db push`.)

## 2. Turn on the sign-in methods (Authentication → Providers)

- **Email:** on, with **Confirm email** on. The app asks for the code sent by e-mail (6 or 8
  digits, see *Email OTP Length*), not a link.
- **Sending e-mails (custom SMTP):** Supabase's own sender only reaches your team and won't let you
  edit the templates. *Authentication → Emails → Set up SMTP* with a Gmail account made for the
  app: 2-Step Verification on, then an **app password** (Google Account → Security → App
  passwords); host `smtp.gmail.com`, port `465`, username and sender = that Gmail address,
  password = the app password (never commit it). Later, a domain and an e-mail service (Resend,
  Brevo…) deliver better than Gmail.
- **Templates:** *Emails → Templates → Source*: paste `email-templates/confirm-signup.html` into
  *Confirm signup* and `email-templates/reset-password.html` into *Reset password*
  (`{{ .Token }}` is where Supabase writes the code).
- **Phone:** on, with an SMS provider (Twilio or MessageBird account; SMS are paid).
- **Google:** create an OAuth client in Google Cloud Console and paste its ID and secret.
- **Apple:** needs the Apple Developer account (Sign in with Apple service ID and key).
- **Anonymous sign-ins:** on. A new tablet linked with a pairing code uses one.
- *Redirect URLs:* add `caa://auth` (the app) and the demo website's address.

## 3. Connect the app

Create a `.env` file at the root of the project (never commit it):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=the "anon public" key from Project Settings → API
```

The "anon" key is meant to be inside apps: the security rules in the database decide what
each person can do. **Never** put the "service_role" key in the app.

## 4. Check the security rules

`npm run test:db` runs the migrations on a throw-away local PostgreSQL and plays a scenario
(a parent, a therapist, a teacher, a stranger, a tablet) to check that everyone sees and changes
only what they are allowed to.

## 5. Test the real project (optional)

`npm run test:live` plays the same story against the project named in `.env`, through the
app's own code, with short-lived test accounts that delete themselves at the end. While it runs,
turn **off** *Authentication → Sign In / Providers → Email → Confirm email* (test addresses cannot
receive codes; the test refuses to start otherwise, so no email is ever sent to them), then turn it
back **on**. Anonymous sign-ins must be on.

## Adding a database change later

Never edit a migration that already ran on the project: add a new file in `supabase/migrations/`
(named with the date) and run only that new file in the SQL Editor.

## 6. The AI helper (Photo → activity board, word suggestions)

The app never holds the Anthropic key: a small server function asks Claude for it.

1. Create an API key on console.anthropic.com (an organisation for the app, with a monthly spend
   limit). Never paste it in the app, in `.env` or in a chat.
2. Install the Supabase CLI, then from the project folder: `supabase link`, then
   `supabase secrets set ANTHROPIC_API_KEY=…` (typed in your own terminal),
   then `supabase functions deploy caa-ai`.
3. Run the migration `…_ai_calls.sql` (daily limit: 40 calls per account; change `DAILY_LIMIT` in
   `functions/caa-ai/index.ts`).

Only the topic, the photo or the drawing is sent — never the child's name, words or sentences.

## 7. Communication data (Suivi) for the app's team

Run `…_usage_data.sql`. Families choose what is recorded (Settings → Suivi); professionals see it
only with "See the progress data". For our own statistics, open **Table Editor → research_usage**
(or `select * from research_usage` in the SQL Editor): anonymous daily numbers, only for families
who agreed to share anonymous statistics. The app itself cannot read this view.

## What is where

| Table | Contents |
|---|---|
| `accounts` | role (parent / pro), display name, preferences |
| `profiles` | each child's AAC profile (one JSON document + a version number) |
| `members` | who works on which profile, with role, level and permissions |
| `invitations` | invitations from families and connection requests from professionals |
| `proposals` | suggested changes waiting for the parent |
| `history` | configuration changes (never what the child said), with undo |
| `devices`, `pairing_codes` | tablets and phones linked to a profile |
| `verifications` | professionals' verification requests (status set by the back-office) |
| `notices` | in-app notifications |
| `resources`, `resource_shares` | professionals' libraries and what they share |
| `usage_days` | communication data, one row per child, device and day (only what the family allowed) |
| `observations` | adults' notes on communication moments (function, context, partner, autonomy, result) |
| `research_usage` (view) | anonymous daily numbers for the app's team, consenting families only |
| `ai_calls` | how many AI requests each account made today (daily limit) |

Storage buckets: `verification-docs` (diplomas, private to their owner) and `profile-media`
(a child's photos and recordings, private to the child's team).
