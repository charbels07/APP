# Store builds and payment

How to build the iPhone, iPad and Android apps, put them on TestFlight and Google Play internal
testing, and switch payment on. Before each release, `RELEASE-CHECKLIST.md` still applies.

What is already done in the code (26 November 2026):

- Identifiers: **`com.daleth.aac`** on both stores (`app.json`: `ios.bundleIdentifier`,
  `android.package`). They can never change once an app is published.
- Build profiles in `eas.json`: `development` (a test app with the developer menu), `preview` (a
  release-like app installed by link: on iPhone / iPad only on devices registered first; an Android
  `.apk`), `production` (for the stores and TestFlight, build number raised by EAS itself).
- A build without the server's address or the purchase key stops at once
  (`scripts/check-store-env.js`, run by EAS before installing).
- Payment through RevenueCat (`src/lib/purchases.ts`), written to the database by the server
  function `caa-billing` only, decided by the database (`supabase/migrations/20261126000000_billing.sql`).
  **Off until you switch it on**: nothing changes for anyone before that.

## 1. Accounts to open (once)

| Account | Cost | For |
|---|---|---|
| **Apple Developer Program** (as an individual, in the owner's name: see below) | 99 $ a year | App Store, TestFlight, in-app purchases, Sign in with Apple |
| **Google Play Console** (personal or organisation: see below) | 25 $ once | Google Play, internal testing, Play billing |
| **Expo** (expo.dev), free plan to start | free (paid plans build faster) | Builds the apps in the cloud (`eas build`) and sends them to the stores (`eas submit`) |
| **RevenueCat** (revenuecat.com) | free up to 2,500 $ of monthly revenue, then 1 % | Purchases on both stores, renewals, refunds |

Apple and Google also need the company's **bank account and tax forms** before anything can be
sold (App Store Connect → Business: the **Paid Apps agreement**, also needed to test purchases in the
Sandbox; Play Console → Payments profile).

**The owner's name as the seller** (owner's decision, 27 November 2026): DALETH is opened as a
sole proprietorship in Lebanon (مؤسسة فردية) in the owner's own name. Apple enrols a sole
proprietorship as an individual (it does not accept trade names), so the App Store shows the
owner's legal name as the seller, not "DALETH". If DALETH later becomes a company with a D-U-N-S
number, Apple can move the account to an organisation on request (Contact us → Account updates):
slow, and it cannot be undone.

- **Small Business Program** (App Store Connect → Business): apply once the agreement is signed:
  Apple then keeps 15 % instead of 30 % below 1 million $ of yearly sales.
- **EU trader status** (App Store Connect → Business → Digital Services Act): an app that is sold is
  a "trader". To be on the App Store in the EU, an individual must give an address (a P.O. box is
  accepted), a phone number and an e-mail that Apple **shows on the app's page there**: use the
  business's address and phone, not the home's. Without it the app is not shown in the EU.
- **Google Play, personal or organisation**: a personal account (like Apple's) needs no D-U-N-S
  number, but before the app can be public Google asks for a **closed test with at least 12 testers
  who stay in it 14 days in a row** (accounts opened since 13 November 2023; Play Console → Test and
  release). An organisation account skips that test but needs a D-U-N-S number in the business's name.
  Chosen: **personal** (owner's decision, 27 November 2026), opened after the Apple app.

Done: the Apple Developer account, as an individual (27 November 2026).

## 2. First build

Done (27 November 2026): the Expo project `empower-communication` of the organisation `daleth.lb`
(`app.json`: `owner`, `extra.eas.projectId`), with its variables `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key) for preview and production. Still to add:
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` (after Apple), then the Android key. The steps below are for a new
computer or a new project.

On a computer with Node 22 or newer (on Windows, if PowerShell says "running scripts is disabled",
run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once):

```bash
npm ci
```

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

`init` links the project to your Expo account and writes its id in `app.json`
(`extra.eas.projectId`, and `owner` when an organisation owns it): commit those two lines only.
Choose the organisation as the owner, not a person's account. The project must be named like
`slug` (`empower-communication`): one created on expo.dev under another name cannot be linked.
`init` may also write the Android permissions it computed from the plugins: leave them out, the
plugins add them at each build.

In **expo.dev → the project → Environment variables**, for `preview` and `production`:

| Name | Value | Visibility |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | the project's address (Supabase → Project Settings → API) | Plain text |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`, Supabase → Project Settings → API Keys), the same as the web version's; never the legacy "anon" key (`docs/runbooks/INCIDENT-RESPONSE.md`) | Plain text |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat → Project → API keys → the **Apple** public key (`appl_…`) | Plain text |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | the **Google** public key (`goog_…`) | Plain text |

These are public keys (they are inside every copy of the app). Never put a secret key here.

Then:

```bash
npm run build:preview
```

EAS asks to create the iOS certificates and the Android signing key: answer yes, it keeps them
(**never lose the Android key**: Google Play App Signing keeps a copy once the first build is uploaded).
iPads and iPhones that test a `preview` build must be registered first: `npx eas-cli device:create`.
`build:preview` builds both apps, so it stops while the Android purchase key is missing.

**Apple only, through TestFlight** (no device to register; the testers install Apple's TestFlight
app): build the store version, then send it to App Store Connect:

```bash
npm run build:ios
```

```bash
npx eas-cli submit -p ios --latest
```

A few minutes after Apple has processed it, the build appears in App Store Connect → the app →
TestFlight: add the testers there (people of App Store Connect → Users and Access at once; others in
an external group, after Apple's short beta review).

## 3. The store records

**App Store Connect** → My Apps → New App: platform iOS, name "Daleth AAC", bundle ID
`com.daleth.aac`, primary language. Age rating and the **Kids category**: if you choose it, Apple
requires a parental gate before any purchase or link out (the caregiver code is that gate: every
purchase screen is behind it) and no third-party analytics or advertising (RevenueCat is for
purchases only; the app's own figures are off unless the family agrees).

**Sign in with Apple** (the button is shown on iPhone and iPad only, `AuthScreen.tsx`): nothing to
create at Apple, `usesAppleSignIn` in `app.json` makes EAS turn the capability on for `com.daleth.aac`
at the first build. In Supabase → Authentication → Providers → Apple: switch it on and put
`com.daleth.aac` in "Client IDs". The other fields (Services ID, key file, secret) stay empty: they
are for signing in in a browser, which the app does not offer (that secret expires every 6 months).
While the provider is off, the button does not show (`signInMethods`).

**Google Play Console** → Create app: "Daleth AAC", app, free (the subscription is inside), then
the Data safety form, the target audience (choose "parents", not "children" if the app is meant to
be set up by adults; the Families policy applies if children are a target audience), and upload the
first `production` build to **Internal testing** (`npx eas-cli submit -p android`).

## 4. Products (the same names on both stores)

| What | App Store Connect | Google Play | Price (decided, Q44–Q46) |
|---|---|---|---|
| Family, monthly | Auto-renewable subscription `family_monthly`, in a subscription group "Daleth AAC" | Subscription `family`, base plan `monthly` | 9.99 $ |
| Family, yearly | `family_yearly`, same group | Subscription `family`, base plan `yearly` | 99.99 $ |
| Professional licence | Non-consumable `pro_licence` | One-time product `pro_licence` | 150 $ |

**Do not add a store free trial (introductory offer)**: the free week is the app's own (no card,
it works the same on the web). A store trial would add a second free week and asks for a card.

## 5. RevenueCat

Done (27 November 2026): the project "Daleth", the entitlements `family` and `pro`, the offerings
`family` and `pro` (still without packages). Waiting for Apple: the App Store app (step 1).

1. Create the project, add the **App Store** app (bundle ID, then an App Store Connect API key and
   the In-App Purchase key) and the **Play Store** app (package, then a Google service account with
   access to the Play Console's financial data). RevenueCat asks for the Apple keys as soon as the
   App Store app is added: add it once Apple has approved the account (App Store Connect → Users and
   Access → Integrations). Leave "Custom URL Scheme" empty (it is for RevenueCat's own paywalls, not used).
2. **Entitlements**: `family` (attach `family_monthly`, `family_yearly`, and both Google base plans)
   and `pro` (attach `pro_licence`). These names are read by the app and the server: keep them exactly.
   RevenueCat may make one by itself with the project (here `daleth_pro`, with sample products): the
   app ignores it; never attach the real products to it. Its "Install SDK" and "paywall" cards can be
   marked done: the SDK is in the app, which draws its own purchase screen.
3. **Offerings**: `family` with the packages *Monthly* and *Annual*; `pro` with the package *Lifetime*.
4. **Webhook** (Integrations → Webhooks): URL `https://<project>.supabase.co/functions/v1/caa-billing`,
   Authorization header value: a long random text (48 characters or more) that you also save in
   Supabase below. Send all events, both environments while testing.
5. **API keys**: the two public SDK keys go to Expo (section 2); a **secret key** (v1) goes to Supabase.

## 6. Server

1. Run `supabase/migrations/20261126000000_billing.sql` in the SQL Editor (test project first,
   then production; `supabase/check-migrations.sql` shows it as done).
2. Supabase → Edge Functions → Secrets: `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH`.
3. Deploy the function:

```bash
supabase functions deploy caa-billing --no-verify-jwt
```

4. In RevenueCat, "Send test event": the function answers `{"ok":true}`.

## 7. Test purchases (before switching payment on)

- iPhone / iPad: a **Sandbox** tester (App Store Connect → Users and Access → Sandbox), signed in
  under Settings → App Store → Sandbox account. Sandbox subscriptions renew every few minutes.
- Android: add the testers' Google accounts under Play Console → Settings → **License testing**;
  the app must come from the internal testing track.
- Payment must be on for the screens to show: do it on the **test project** only:
  `select public.billing_go_live();`. Then check, with a test family:
  1. A new family sees "Free week: 7 day(s) left" in Settings → Account → Subscription.
  2. Subscribe (monthly): "Subscription active. It renews on …"; on a second device of the same
     account, nothing to do; on a new install, "Restore purchases".
  3. Cancel in the store: the status says "not renewing"; at the end (sandbox: minutes), "Nothing is
     blocked for 7 more day(s)".
  4. With no subscription for 8+ days (change `accounts.created_at` on the test project): the dot on
     Settings and Caregiver; the message after the code; Settings opens on Account only; the child's
     words still speak, offline too; a change on another device does not arrive.
  5. A professional: Account & licence → Licence payment → Buy the licence; she can then be on a
     child's team.

## 8. Before switching payment on in production

- Publish the **privacy policy** at `https://daleth-aac.sarrouhcharbel.workers.dev/privacy/`
  and the **terms** at `/terms/` (the purchase screens link to them: `LEGAL_LINKS` in
  `src/lib/billing.ts`; on iPhone and iPad the terms link is Apple's standard licence). The drafts
  in `docs/legal/` mention RevenueCat and the stores as processors: have them checked by the lawyer first.
- Update the App Store "App Privacy" and Google Play "Data safety" forms: **Purchases** (purchase
  history, linked to the account, for app functionality).
- App Review notes: a test family account, the caregiver code, and that the free week, the plans,
  "Restore purchases", the renewal sentence and both links are under Settings → Account.
- Then, in the production SQL Editor:

```sql
select public.billing_go_live();
```

Every family already there starts its free week that day; a professional needs her licence to
stay on a child's team from then on. To stop everything at once (nothing blocked for anyone):

```sql
select public.billing_stop();
```

## What payment blocks, and what it never blocks

| | Free week / 7 days after an ended subscription | Days 8–14 (paused) | After day 14 (frozen) |
|---|---|---|---|
| The child's words, the voice, Help, offline | Yes | Yes | Yes, for good |
| New words, changes, sync, follow-up, team, tablet codes, copies by hand | Yes | No | No |
| Account page: subscribe, sign out, "Download all my data", delete | Yes | Yes | Yes |
| Handing the child to the other parent | Yes | Yes | Yes |

Nothing is deleted while a board is paused or frozen; paying gives everything back at once.
