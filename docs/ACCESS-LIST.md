# Who can reach production

Every account that can open, change or publish something of the live app. Whoever holds one of
these can reach children's data or put code in front of families. Assessment items: 7.6, 7.7,
14.11.

Rules for every line:

- **Two people** can open each account (an owner and a second admin), so that nobody is the only
  key, and nobody shares a password: each person has their own access.
- **Two-step sign-in on**, with an authenticator app or a security key (not SMS where there is a
  choice).
- Passwords and recovery codes live in the team's password manager (`[password manager]`), never
  in a document, an e-mail or a chat.
- Reviewed every quarter (section 2). Fill the table at the first review.

## 1. The list

| Account | What it opens | Owner | Second admin | 2-step on? | Last review |
|---|---|---|---|---|---|
| **Supabase organisation** (`[org name]`) | The database with every child's profile, sign-in, files, server functions, their secrets, backups, logs | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Back-office team accounts** (table `admins` in the database) | The back office in the app: professionals' certificates, figures, messages | Each person their own account | — | Required by the app (two-step sign-in for the team) | `[date]` |
| **GitHub** (the repository and its organisation) | The code; a push to the default branch rebuilds the store pages on Cloudflare | `[owner]` | `[developer]` | `[yes/no]` | `[date]` |
| **Cloudflare** | The support, account-deletion and privacy pages (and, today, the web version) | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Google Cloud** (the sign-in project) | "Continue with Google": the client ID and secret, the consent screen | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Gmail** (the app's mailbox) | Sends the sign-in codes (Supabase SMTP) and the team e-mails (`caa-mail`); its app passwords | `[owner]` | `[second admin]` | Required (app passwords need it) | `[date]` |
| **Team mailbox** (`MAIL_TO`, if different) | Professionals' requests (with their names), weekly figures | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Apple Developer / App Store Connect** | Publishing the iPhone and iPad app, Sign in with Apple, TestFlight | `[owner]` (account holder) | `[developer]` (admin role) | Required by Apple | `[date]` |
| **Google Play Console** | Publishing the Android app | `[owner]` | `[developer]` | Required by Google | `[date]` |
| **Anthropic console** | The AI key of `caa-ai` and its spending limit | `[owner]` | `[developer]` | `[yes/no]` | `[date]` |
| **Expo / EAS** | Building the apps in the cloud; signing credentials of the builds | `[owner]` | `[developer]` | `[yes/no]` | `[date]` |
| **Domain registrar** (`[registrar]`, `[domain]`) | The website's address; whoever holds it can redirect the pages and the e-mails | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Off-site backup storage** (`[provider]`) | The encrypted weekly copies (`docs/runbooks/BACKUP-AND-RESTORE.md`) | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |
| **Backup private key** (paper + password manager) | Reading the off-site copies | `[owner]` | `[second admin]` | — (offline) | `[date]` |
| **Password manager** | Everything above | `[owner]` | `[second admin]` | `[yes/no]` | `[date]` |

### Settings to keep in writing (no secrets)

So that a new person, or a restore into a new project, can set things up again:

| Where | Setting | Value |
|---|---|---|
| Supabase | Region | `[Frankfurt or Paris]` |
| Supabase → Authentication → Providers | E-mail (Confirm email on), phone, Google, Apple, anonymous sign-ins | `[on/off each]` |
| Supabase → Authentication → URL Configuration | Site URL, redirect URLs | `[website]`, `empowercommunication://**` |
| Supabase → Authentication → SMTP | Host, port, user | `smtp.gmail.com`, `465`, `[mailbox]` |
| Supabase → Edge Functions | Deployed functions; "Verify JWT" off for `caa-mail` | `[list]` |
| Supabase → Edge Functions → Secrets | Names only: `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`, `ANTHROPIC_API_KEY` | — |
| Cloudflare | Build command, build variables (names only) | `npm run build:web`; `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

## 2. Quarterly review (`[months]`)

Two people, one hour. Write the date in the last column of every line.

1. For each account in the table: open its members or users page. Everyone listed is still in
   the team and still needs it; their role is the smallest that works.
2. Two-step sign-in is on for each person (most consoles show it on the members page).
3. The back-office team, in the SQL Editor:

   ```sql
   select u.email, a.added_at, a.note from public.admins a join auth.users u on u.id = a.user_id;
   ```

   Every line is a current team member. Nobody else.
4. Keys and tokens: list the API keys of Supabase, the personal access tokens and deploy keys of
   GitHub, the app passwords of Gmail, the keys of Anthropic and Expo. Delete the ones nobody
   can explain.
5. GitHub → Settings → Code security: secret scanning, push protection and Dependabot alerts
   are on; the Dependabot pull requests are not piling up.
6. Supabase → Advisors → Security Advisor: nothing new.
7. Update `docs/runbooks/CONTINGENCY.md` (risk register, "last review").

## 3. Someone leaves (same day)

Do it on the day they leave, even if they leave on good terms.

- [ ] **Back office:** `delete from public.admins where user_id = (select id from auth.users where email = '…');`
      then end their sessions: `delete from auth.sessions where user_id = (select id from auth.users where email = '…');`
- [ ] **Remove them** from every organisation of the table: Supabase, GitHub, Cloudflare,
      Google Cloud, App Store Connect, Google Play Console, Anthropic, Expo, the backup storage,
      the password manager, the registrar.
- [ ] **Rotate what they could see**, starting with what reaches children's data:

| Key | Where to rotate | Then |
|---|---|---|
| Supabase secret key(s) | Project Settings → API Keys | Check `caa-ai` and `caa-mail` still work |
| Database password (used by the backup) | Project Settings → Database | Update the password manager entry used for `DATABASE_URL` |
| Gmail password and app passwords | Google Account → Security | Update Supabase SMTP and the `SMTP_PASS` secret |
| Anthropic API key | console.anthropic.com | `npx supabase secrets set ANTHROPIC_API_KEY=…` (typed in your own terminal) |
| Google sign-in client secret | Google Cloud → the client | Paste it in Supabase → Providers → Google |
| Expo / EAS tokens | expo.dev → access tokens | — |
| Backup storage keys | The provider | `rclone config` on the backup machine |
| Backup private key (if they held a copy) | New key pair (`age-keygen`) | New public key in the weekly command; old copies expire within 90 days |

- [ ] If they had a personal account in the app: it stays a normal family or professional
      account (their own children, their own data). Only the team rights are removed.
- [ ] Write the date and what was done in the access review log.

## 4. Someone joins

- [ ] Their own account on each service they need, with the smallest role; never a shared login.
- [ ] Two-step sign-in on before access is given.
- [ ] Back office only if needed: `insert into public.admins (user_id, note) select id, '[name, role]' from auth.users where email = '…';`
      A team account is never used on a tablet a child uses (`docs/SECURITY.md`).
- [ ] They read `CLAUDE.md`, `docs/SECURITY.md` and `docs/runbooks/`.
- [ ] Add them to the table above.
