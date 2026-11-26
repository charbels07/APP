# Store builds and payment

How to build the iPhone, iPad and Android apps, put them on TestFlight and Google Play internal
testing, and switch payment on. Before each release, `RELEASE-CHECKLIST.md` still applies.

What is already done in the code (26 November 2026):

- Identifiers: **`com.daleth.aac`** on both stores (`app.json`: `ios.bundleIdentifier`,
  `android.package`). They can never change once an app is published.
- Build profiles in `eas.json`: `development` (a test app with the developer menu), `preview` (a
  release-like app shared by link: TestFlight internal / an Android `.apk`), `production` (for the
  stores, build number raised by EAS itself).
- A build without the server's address or the purchase key stops at once
  (`scripts/check-store-env.js`, run by EAS before installing).
- Payment through RevenueCat (`src/lib/purchases.ts`), written to the database by the server
  function `caa-billing` only, decided by the database (`supabase/migrations/20261126000000_billing.sql`).
  **Off until you switch it on**: nothing changes for anyone before that.

## 1. Accounts to open (once)

| Account | Cost | For |
|---|---|---|
| **Apple Developer Program** (as an organisation: DALETH, needs a D-U-N-S number) | 99 $ a year | App Store, TestFlight, in-app purchases, Sign in with Apple |
| **Google Play Console** (organisation) | 25 $ once | Google Play, internal testing, Play billing |
| **Expo** (expo.dev), free plan to start | free (paid plans build faster) | Builds the apps in the cloud (`eas build`) and sends them to the stores (`eas submit`) |
| **RevenueCat** (revenuecat.com) | free up to 2,500 $ of monthly revenue, then 1 % | Purchases on both stores, renewals, refunds |

Apple and Google also need the company's **bank account and tax forms** before anything can be
sold (App Store Connect → Business; Play Console → Payments profile).

## 2. First build

On a computer with Node 22:

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
(`extra.eas.projectId`): commit that change.

In **expo.dev → the project → Environment variables**, for `preview` and `production`:

| Name | Value | Visibility |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | the project's address (Supabase → Project Settings → API) | Plain text |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the public "anon" key | Plain text |
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

## 3. The store records

**App Store Connect** → My Apps → New App: platform iOS, name "Daleth AAC", bundle ID
`com.daleth.aac`, primary language. Age rating and the **Kids category**: if you choose it, Apple
requires a parental gate before any purchase or link out (the caregiver code is that gate: every
purchase screen is behind it) and no third-party analytics or advertising (RevenueCat is for
purchases only; the app's own figures are off unless the family agrees).

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

1. Create the project, add the **App Store** app (bundle ID, then an App Store Connect API key and
   the In-App Purchase key) and the **Play Store** app (package, then a Google service account with
   access to the Play Console's financial data).
2. **Entitlements**: `family` (attach `family_monthly`, `family_yearly`, and both Google base plans)
   and `pro` (attach `pro_licence`). These names are read by the app and the server: keep them exactly.
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
