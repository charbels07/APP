# The real server (Supabase)

Until this is set up, the app uses its built-in demo server (`src/backend/local.ts`), so
everything works on one device. Follow these steps to switch to the real server.

## 1. Create the project

1. Create a free account on supabase.com and a **new project**. Pick a **European region**
   (Frankfurt or Paris): children's data stays in the EU, which simplifies GDPR.
2. Open **SQL Editor** and run, in order, the files in `supabase/migrations/`.
   (Or, with the Supabase CLI: `supabase link` then `supabase db push`.)

## 2. Turn on the sign-in methods (Authentication → Providers)

- **Email:** on. In *Email Templates → Confirm signup* and *Reset password*, use the code
  `{{ .Token }}` in the message: the app asks for a 6-digit code, not a link.
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

Storage buckets: `verification-docs` (diplomas, private to their owner) and `profile-media`
(a child's photos and recordings, private to the child's team).
