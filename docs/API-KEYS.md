# Keys and outside services

Everything in the app that needs an account or a key somewhere else: what it is for, whether
the app works without it, where the key goes, and where things stand today (November 2026).

**Rule for every key below:** a secret key is typed in the provider's own page or with the
command shown, never in a chat, an e-mail, the app's code or GitHub. Only the two "public"
Supabase values are allowed inside the app.

## 1. Needed for the app to work at all

| Service | What it does | Key | Where it goes | Today |
|---|---|---|---|---|
| **Supabase** (server) | Accounts, children's profiles, teams, files, back office | Project address + *publishable* key (public) | `.env` on your computer and the two build variables in Cloudflare | Done |
| Supabase *secret* key | Full access to the database | Secret | Nowhere in the app. Only in Supabase itself: it hands it to the server functions by itself (`SUPABASE_SECRET_KEY`; the older `SUPABASE_SERVICE_ROLE_KEY` is retired in early 2027, the functions read the new one first) | Never used by the app |
| **Cloudflare** | Hosts the support, account-deletion and privacy pages, and the web version for chosen testers (the product is sold in the App Store and Google Play only) | Your Cloudflare account | Connected to the GitHub repository | Done |
| **E-mail sender** (confirmation codes, password reset) | Sends the app's e-mails | SMTP user + password | Supabase → Authentication → SMTP settings | Done with a Gmail app password. For real families, a mail service (Resend, Brevo, SendGrid…) delivers better and sends more per hour |

### E-mails to the team (optional)

| Service | What it does | Key | Where it goes | Today |
|---|---|---|---|---|
| **Server function `caa-mail`** | Sends the team an e-mail when a professional applies, and the figures of the week every Monday | The same Gmail address and an app password of its own (`SMTP_USER`, `SMTP_PASS`), plus the team's address (`MAIL_TO`, optional); `SMTP_HOST` only for another provider than Gmail (default `smtp.gmail.com`, port 465) | Supabase → Edge Functions → Secrets (never in the app) | On since 15 November 2026: the test e-mail arrived in the team's mailbox (`supabase/README.md`, section 10) |

### Server functions with nothing to buy

| Function | What it does | Key | Today |
|---|---|---|---|
| **`caa-purge`** | Deletes the stored files of an erased account, child's profile or professional's document (queue `storage_purge`) | None: Supabase hands it its server key (`SUPABASE_SECRET_KEY`) | To deploy with the database files of 18 November (`supabase/README.md`, section 11) |
| **`caa-push`** | Delivers the browser notifications of the web version, only to the browsers' own notification services (Google FCM, Mozilla, Apple, Microsoft) | None to buy: it makes its own pair of signing keys, kept by the database. Optional secret `PUSH_CONTACT` (`mailto:…`, an address those services may write to; else `SMTP_USER`) | To turn on: `docs/runbooks/NOTIFICATIONS.md` |

### Payment (`docs/runbooks/STORE-BUILDS.md`)

| Service | What it does | Key | Where it goes | Today |
|---|---|---|---|---|
| **RevenueCat**, public SDK keys | The tablet and phone apps show the stores' prices, buy, restore (`src/lib/purchases.ts`) | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`), `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`): public | expo.dev → the project → Environment variables (`preview`, `production`); a store build without its key stops (`scripts/check-store-env.js`) | Code ready; waits for the RevenueCat and store accounts |
| **Server function `caa-billing`** | Writes who has paid, from RevenueCat's own answer: its webhook, or the app right after a purchase (the person's own account only) | `REVENUECAT_SECRET_KEY` (a secret v1 key), `REVENUECAT_WEBHOOK_AUTH` (a long random text, the same in RevenueCat's webhook settings) | Supabase → Edge Functions → Secrets; deployed with "Verify JWT" off (it checks both callers itself) | Code ready, not deployed. Payment stays off until `select public.billing_go_live();` |

The three functions above are called by the database only, with a key the database made (header
`x-mail-key`); they are deployed with "Verify JWT" off (`supabase/config.toml`).

## 2. Sign-in

| Service | What it does | Key | Where it goes | Today |
|---|---|---|---|---|
| **Google sign-in** | "Continue with Google" | Client ID + client secret | Supabase → Authentication → Providers → Google | Done. Publish the "Audience" in Google Cloud before real families |
| **Apple sign-in** | "Continue with Apple" (Apple asks for it when another sign-in such as Google is offered on iPhone/iPad) | iPhone and iPad only (the app shows the button nowhere else): no key, only the bundle ID `com.daleth.aac` as "Client IDs". A Services ID and a key file (.p8) only if it is one day offered in a browser (that secret expires every 6 months) | Supabase → Providers → Apple | Apple Developer account opened (27 November 2026); to switch on with the first iPhone build (`docs/runbooks/STORE-BUILDS.md`, section 3) |
| **Phone sign-in (SMS)** | Sign in with a phone number | An SMS provider (Twilio or similar), paid per message | Supabase → Providers → Phone | Off. Optional |

## 3. AI: switched off

**Owner's decision (November 2026): the AI is switched off.** The server function `caa-ai` stays in
the code but is not deployed, and no key is set; nothing is sent to an AI service. Before it is
turned on: the daily ceiling finished in the database, the consent text and the legal documents
saying what is sent, and families asked again. What follows says what the key would change.

One key would cover all four lines: an **Anthropic API key**, kept in the server function
`caa-ai`. The app itself never holds it.

| Feature | Without the key | With the key |
|---|---|---|
| **New board: suggested words** | The built-in library of about 45 situations, then the pictogram library's categories | Any topic: words and steps written for that topic, in the family's Arabic |
| **New sequence: suggested steps** | Steps only for the situations the library knows | Steps for any topic |
| **Photo → board** (a menu, a game box) | Not available | Reads the photo and proposes the words |
| **Search by drawing** | Not available | Guesses what the child drew. On the website only for now; on tablets the drawing still has to be sent as a picture (to do) |

How it would be turned on (only after the owner's decision):

1. Create a key on console.anthropic.com and **set a monthly spending limit** there.
2. In a terminal, in the project:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <your project ref>
```

```bash
npx supabase secrets set ANTHROPIC_API_KEY=<the key>
```

```bash
npx supabase functions deploy caa-ai
```

Today: **not deployed** on the real server, so the real app uses the built-in library only.
Until it is deployed the app shows no AI button and no message about it (it asks the server once
whether the function exists). The day you deploy it, the AI buttons appear by themselves.
The online demo is different: it borrows the AI of the claude.ai page it sits in, with no key
of yours.

Limits already built in: 40 calls a day per account, a ceiling for the whole service each
day, only people who look after a child, and only the topic, the photo or the drawing is sent
(never the child's name, words or sentences).

## 4. Voice: works without a key, better with one

| Feature | Without a key (today) | With a key |
|---|---|---|
| **The voice that speaks** | The voices of the tablet or the browser (free, work offline). No real child voice, and one standard Arabic voice | A cloud voice service (Microsoft Azure Speech, ElevenLabs, Google) gives real children's voices and more natural ones. Two ways: (a) prepare sound files once for the built-in words — the code exists (`npm run build:voices`, reads `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` on your computer), it was tried for Arabic dialects and judged not good enough; (b) ask the service live through a server function, which costs per sentence and needs internet. **Decision of November 2026: no paid voice service.** (b) was built with Microsoft Azure and removed the same day; the app only uses the device's voices and the family's recordings |
| **Dictation** (say a word to search, dictate a sentence to model) | The tablet's or browser's own speech recognition (Apple, Google): free, no key | A cloud recognition service (Azure Speech, Google, OpenAI) understands dialects and children better. It needs a server function and sends the recording to that service (not built; to decide with the privacy rules) |
| **A family's own recording of a word** | Works, no key: recorded on the device, it always wins over any voice | — |

## 5. Pictures

| Feature | Key | Today |
|---|---|---|
| The pictograms (about 24,100) | None: they are inside the app | Done |

## 6. Publishing on the stores

| Service | What it is for | Today |
|---|---|---|
| **Apple Developer Program** (yearly fee) | Publishing on the App Store, Apple sign-in, test builds on iPads | Opened 27 November 2026; next steps in `docs/runbooks/STORE-BUILDS.md` |
| **Google Play Console** (one-time fee) | Publishing on Android | To open |
| **Expo / EAS account** | Builds the iOS and Android apps in the cloud (`eas.json`: development, preview, production) | To create; then `npx eas-cli init` (`docs/runbooks/STORE-BUILDS.md`) |
| **RevenueCat** | Purchases on both stores (free up to 2,500 $ of monthly revenue, then 1 %) | To create once the stores' accounts exist |

## 7. Not in the app yet, would need a key if added

| Idea | Service |
|---|---|
| **Invitation e-mails sent by the app itself** | An e-mail sending service (Brevo, Resend, Mailgun…) and a small server function holding its key. The e-mail sender of section 1 only serves sign-in codes: Supabase does not let the app use it for other messages. Today the person sends the invitation from their own mailbox ("Send by email" asks which one — Gmail, Outlook, Yahoo or the device's mail app — and opens the message already written), or shares / copies the code |
| Notifications in the store apps (iPhone, iPad, Android) | Apple and Google push services, through Expo. The web version already sends browser notifications, with no key to buy or set: the server makes its own pair of keys (`docs/runbooks/NOTIFICATIONS.md`) |
| A robot check on sign-up | Cloudflare Turnstile (free): a site key in the app, a secret in Supabase |
| Crash reports | Sentry or similar |

## The short answer

- To **work**: Supabase, Cloudflare and an e-mail sender. All three are in place.
- The AI (one Anthropic key: words, steps, photos, drawings) is switched off by decision; the code
  is ready if the owner turns it on, with the steps of section 3.
- Voices and dictation work with the device's own services; better ones exist but are a
  project of their own (cost, internet, privacy), not just a key to paste.
