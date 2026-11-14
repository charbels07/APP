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
| Supabase *secret* key | Full access to the database | Secret | Nowhere in the app. Only in Supabase itself (server functions read it there) | Never used by the app |
| **Cloudflare** | Hosts the website | Your Cloudflare account | Connected to the GitHub repository | Done |
| **E-mail sender** (confirmation codes, password reset) | Sends the app's e-mails | SMTP user + password | Supabase → Authentication → SMTP settings | Done with a Gmail app password. For real families, a mail service (Resend, Brevo, SendGrid…) delivers better and sends more per hour |

## 2. Sign-in

| Service | What it does | Key | Where it goes | Today |
|---|---|---|---|---|
| **Google sign-in** | "Continue with Google" | Client ID + client secret | Supabase → Authentication → Providers → Google | Done. Publish the "Audience" in Google Cloud before real families |
| **Apple sign-in** | "Continue with Apple" (Apple asks for it when another sign-in such as Google is offered on iPhone/iPad) | Apple Developer account, Services ID, key file (.p8) | Supabase → Providers → Apple | Prepared in the app, waits for the Apple Developer account |
| **Phone sign-in (SMS)** | Sign in with a phone number | An SMS provider (Twilio or similar), paid per message | Supabase → Providers → Phone | Off. Optional |

## 3. AI: works without a key, better with one

One key covers all four lines: an **Anthropic API key**, kept in the server function
`caa-ai`. The app itself never holds it.

| Feature | Without the key | With the key |
|---|---|---|
| **New board: suggested words** | The built-in library of about 45 situations, then the pictogram library's categories | Any topic: words and steps written for that topic, in the family's Arabic |
| **New sequence: suggested steps** | Steps only for the situations the library knows | Steps for any topic |
| **Photo → board** (a menu, a game box) | Not available | Reads the photo and proposes the words |
| **Search by drawing** | Not available | Guesses what the child drew. On the website only for now; on tablets the drawing still has to be sent as a picture (to do) |

How to turn it on (once):

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
| **The voice that speaks** | The voices of the tablet or the browser (free, work offline). No real child voice, and one standard Arabic voice | A cloud voice service (Microsoft Azure Speech, ElevenLabs, Google) gives real children's voices and more natural ones. Two ways: (a) prepare sound files once for the built-in words — the code exists (`npm run build:voices`, reads `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` on your computer), it was tried for Arabic dialects and judged not good enough; (b) ask the service live through a server function, which costs per sentence and needs internet (not built) |
| **Dictation** (say a word to search, dictate a sentence to model) | The tablet's or browser's own speech recognition (Apple, Google): free, no key | A cloud recognition service (Azure Speech, Google, OpenAI) understands dialects and children better. It needs a server function and sends the recording to that service (not built; to decide with the privacy rules) |
| **A family's own recording of a word** | Works, no key: recorded on the device, it always wins over any voice | — |

## 5. Pictures

| Feature | Key | Today |
|---|---|---|
| The 24,000 pictograms | None: they are inside the app | Done |
| Pictures from the internet (Global Symbols, Openverse) | None. Openverse gives more results per search to registered apps (a free key) | Works without a key |

## 6. Publishing on the stores

| Service | What it is for | Today |
|---|---|---|
| **Apple Developer Program** (yearly fee) | Publishing on the App Store, Apple sign-in, test builds on iPads | To open |
| **Google Play Console** (one-time fee) | Publishing on Android | To open |
| **Expo / EAS account** | Builds the iOS and Android apps in the cloud | To create when the first build is made |

## 7. Not in the app yet, would need a key if added

| Idea | Service |
|---|---|
| Subscriptions and payment | Apple / Google in-app purchases, usually through RevenueCat; Stripe on the website |
| Notifications on the phone (an invitation, a proposal) | Apple and Google push services, through Expo |
| A robot check on sign-up | Cloudflare Turnstile (free): a site key in the app, a secret in Supabase |
| Crash reports | Sentry or similar |

## The short answer

- To **work**: Supabase, Cloudflare and an e-mail sender. All three are in place.
- To be **more accurate**: one Anthropic key (words, steps, photos, drawings) is the one that
  changes the most for families, and everything is ready for it.
- Voices and dictation work with the device's own services; better ones exist but are a
  project of their own (cost, internet, privacy), not just a key to paste.
