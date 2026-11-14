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
- *Redirect URLs:* only `empowercommunication://**` (the app) and your website's address followed
  by `/**`. Nothing wider: a sign-in must only be able to come back to your app.

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

## 5. Test on a second project (optional)

`npm run test:live` plays the same story through the app's own code, with short-lived test
accounts that delete themselves at the end. It needs *Confirm email* turned **off** (test addresses
cannot receive codes; the test refuses to start otherwise, so no email is ever sent to them).

**Never turn *Confirm email* off on the project families use**, even for a few minutes: while it is
off, anyone can create an account with someone else's address and pick up the invitation waiting
for it. Create a second, empty Supabase project for tests (free), run the migrations on it, put
its address and key in `.env` only while testing, then put the real ones back. Anonymous
sign-ins must be on there.

## Security rules added in November 2026

`supabase/migrations/20261114000000_security.sql` closes what the security review found (the list
and the reasons are in `docs/SECURITY.md`). Run it once in the SQL Editor, **right after the
website was rebuilt with the same version of the app** (the app and the rules changed together:
tablet codes, account type, professionals' requests). `npm run test:db` replays every attack of
the review against these rules: each one must fail.

## Profiles created by a professional (November 2026)

`supabase/migrations/20261115000000_pro_profiles.sql` lets a verified professional prepare a
child's profile and hand it to the parents with a code (the rules are explained at the top of the
file). Run it once in the SQL Editor, after the security file above and **after the website was
rebuilt** with the same version of the app. `npm run test:db` plays the hand-over and the ways to
cheat.

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

Run `…_usage_data.sql`. (The back office, section 8, now shows these figures as charts.) Families choose what is recorded (Settings → Suivi); professionals see it
only with "See the progress data". For our own statistics, open **Table Editor → research_usage**
(or `select * from research_usage` in the SQL Editor): anonymous daily numbers, only for families
who agreed to share anonymous statistics. The app itself cannot read this view.

## 8. The back office (certificates, figures, messages)

The back office is a page of the app that only the app's team can open. Who is in the team is a
table, `admins`, that nobody can read or change from the app.

1. Run `…_backoffice.sql` in the SQL Editor.
2. Create your account in the app like anybody else (sign up, confirm the e-mail).
3. Add yourself to the team: SQL Editor → run this with your own address:

   ```sql
   insert into public.admins (user_id, note)
   select id, 'founder' from auth.users where email = 'you@example.com'
   returning user_id;
   ```

   One line in the result = done. "Success. No rows returned" = no account has that address yet
   (create the account first, then run it again).
4. Sign in to the app with that account (sign out and in again if it was already open): it opens
   on the back office. *Open the app* goes to the app itself; *Account → Open the back office*
   comes back.

The back office is a page **of the app**: it is not in the Supabase dashboard, and the demo link
cannot show the real one (the demo never talks to this server). It opens wherever the real app
runs: a tablet or phone build, or the web version (`npx expo start --web`, or the web export put
online).

### The web version online (Cloudflare)

The repository is ready to be connected to Cloudflare (*Create an app → Connect GitHub*): each
push then rebuilds and republishes the web version by itself.

| Field in Cloudflare | Value |
|---|---|
| Project name | `empower-communication` (the same as `name` in `wrangler.jsonc`) |
| Build command | `npm run build:web` |
| Deploy command | `npx wrangler deploy` (the default) |
| Build variables | `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the project's address and its *publishable* key: both are public, they ship inside every copy of the app) |

`npm run build:web` refuses to build if the two variables are missing, because the result would
quietly be the demo instead of the real app. `wrangler.jsonc` tells Cloudflare to serve the `dist`
folder as plain files. Never put the service-role / secret key in these variables.

To remove someone: `delete from public.admins where user_id = (select id from auth.users where email = '…');`
To see who is in the team: `select u.email, a.added_at from public.admins a join auth.users u on u.id = a.user_id;`

What changes for professionals: an account created as "professional" can join a child's team or ask a
family for a connection only once its request was **accepted** in the back office. Accepting or
refusing deletes the identity document (the therapist was promised so). Every decision and every
certificate opened is kept in `admin_log`.

The figures about how children use the app only cover families who turned on "share anonymous
statistics", and only appear from 5 children up.

Before real certificates arrive: use a long, unique password for the team accounts and turn on
two-step sign-in (Authentication → Sign In / Providers → Multi-Factor).

`npm run test:live` can also play the real decision if a team account is given in the environment
of your own terminal (never in a file): `LIVE_ADMIN_EMAIL` and `LIVE_ADMIN_PASSWORD`.

## 9. Google and Apple sign-in

The app only shows a sign-in method that is turned on here: it asks the project at the sign-in
screen (`signInMethods` in `src/backend/supabase.ts`). Nothing to change in the code.

### Google (free; works on the website and in the tablet app)

1. **Supabase → Authentication → URL Configuration.** *Site URL*: the address of the website
   (`https://….workers.dev`). *Redirect URLs*: add that address followed by `/**`, and
   `empowercommunication://**` (the way back into the tablet app; the scheme is in `app.json`).
2. **console.cloud.google.com** → create a project → *Google Auth Platform*:
   - *Branding*: the app's name and a contact e-mail (shown to people when they sign in).
   - *Audience*: External. While it says "Testing", only the test users listed there can sign in:
     publish it ("In production") before real families use it.
   - *Data access*: the three basic scopes only (`openid`, `.../auth/userinfo.email`,
     `.../auth/userinfo.profile`).
   - *Clients* → create a client of type **Web application**. *Authorized JavaScript origins*: the
     website's address. *Authorized redirect URIs*: `https://<project ref>.supabase.co/auth/v1/callback`.
3. **Supabase → Authentication → Sign In / Providers → Google**: turn it on and paste the client ID
   and the client secret. The secret goes there and nowhere else (never in the app, `.env` or a chat).

Google's page says "continue to `<project ref>.supabase.co`" unless the project has a custom
domain (a paid Supabase option).

### Apple (needs the paid Apple Developer Program; iPhone / iPad app only for now)

Apple asks any iOS app that offers Google sign-in to offer Sign in with Apple too.

1. Choose the app's identifier (`ios.bundleIdentifier` in `app.json`): it cannot change once the
   app is on the App Store.
2. developer.apple.com → Identifiers → that App ID → turn on **Sign in with Apple** (an EAS build
   does this by itself: `ios.usesAppleSignIn` is set in `app.json`).
3. **Supabase → Authentication → Sign In / Providers → Apple**: turn it on and put the identifier
   in *Client IDs*. No secret is needed for the app.

In a browser the Apple button is not shown: that way needs a "Services ID" and a secret that has
to be renewed every six months. To offer it later, do that set-up, put the Services ID first in
*Client IDs*, and remove the `Platform.OS === 'ios'` condition in `src/ui/start/AuthScreen.tsx`.

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
| `verifications` | professionals' verification requests (status set by the back office) |
| `admins` | the accounts of the app's own team (filled by hand, unreadable from the app) |
| `admin_log` | what the team did in the back office: decisions, certificates opened |
| `feedback` | messages written from the app ("Write to the team") |
| `bo_people`, `bo_child_days` (views) | what the back-office figures are computed from; not reachable from the app |
| `notices` | in-app notifications |
| `resources`, `resource_shares` | professionals' libraries and what they share |
| `usage_days` | communication data, one row per child, device and day (only what the family allowed) |
| `observations` | adults' notes on communication moments (function, context, partner, autonomy, result) |
| `research_usage` (view) | anonymous daily numbers for the app's team, consenting families only |
| `ai_calls` | how many AI requests each account made today (daily limit) |

Storage buckets: `verification-docs` (diplomas, private to their owner and the app's team) and `profile-media`
(a child's photos and recordings, private to the child's team).
