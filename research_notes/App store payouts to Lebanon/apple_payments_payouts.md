# App Store subscription payments end to end for an individual developer resident in Lebanon: subscriber side, Apple's payment rules, and payouts to a Lebanese bank (as of 15 November 2026)

How these notes relate to the earlier notes, and how sources are dated:
- **Relation to earlier notes.** These notes build on `research_notes/Lebanon app subscription taxes/apple_app_store.md`. That file covers: Apple's agent and commissionaire roles; ADI as commissionaire for Lebanon; tax collection (Lebanon is not on Exhibit B); commission rates, including the Small Business Program, the EU's Attachment 14 and the Japan/Brazil Attachment 12; the W-8BEN form; the 45-day payment timing; the USD 40 payment threshold; and Lebanon's place in the "Rest of World" USD region. Those facts are not repeated here unless re-checked or corrected.
- **Apple pages.** All were read on 2026-11-15, by direct download of the official pages. Where a page shows a date, it is given:
  - support.apple.com pages show a "Published Date".
  - The App Review Guidelines say "Last Updated: October 16, 2026".
  - In the Developer Program License Agreement (DPLA), Schedule 2 was last updated 13 Oct 2026 and its Exhibits 27 Aug 2026.
  - App Store Connect Help and StoreKit documentation pages carry no date, so read them as "current at 2026-11-15".
- **Secondary sources** are marked **[SECONDARY]**. Several could only be seen as search-engine snippets, because discussions.apple.com, macdailynews.com and courthousenews.com were blocked from this research session. Those are marked "(snippet; not opened)".

## 1. How App Store subscribers pay: payment methods worldwide and for an Apple Account in Lebanon (cards, Apple Pay, carrier billing, PayPal, gift cards or balance, currency)

### Takeaway
Apple's official country list gives **Lebanon exactly one payment method: "Most credit and debit cards"**. Lebanon has:
- no Apple Pay;
- no mobile phone (carrier) billing, so nothing through Alfa or Touch;
- no PayPal;
- no "Apple Account balance", which means no redeeming of Apple Gift Cards and no adding of funds.

Worldwide the options are much wider. They include Apple Pay, carrier billing in about 50 markets (including Gulf and Turkish carriers), PayPal in the US, Canada, Mexico, much of Europe and Israel, local wallets (UPI, Alipay, PayPay and others), and Apple Account balance from gift cards.

A Lebanese subscriber is charged on the card on file in the storefront's currency. Earlier notes found that this is USD for Lebanon (it is in the "Rest of World" region).

### Cited Findings
- **What the page says:** "To buy apps from the App Store, use Apple subscriptions … you need an Apple Account and a valid payment method. See what forms of payment are accepted in your country or region." "Payment methods are subject to change." If a listed method still fails, "contact your financial institution." — [Apple Support: Payment methods that you can use with your Apple Account (Published 7 Aug 2026)](https://support.apple.com/en-us/111741)
- **Lebanon entry,** under "Middle East and Türkiye": "Lebanon — Most credit and debit cards". Nothing else is listed. — [Apple Support 111741 (7 Aug 2026)](https://support.apple.com/en-us/111741)
- **Neighbouring storefronts on the same page:**

  | Storefront | Methods listed |
  |---|---|
  | Iraq, Jordan, Libya, Yemen | Most credit and debit cards only (same as Lebanon) |
  | Israel | Apple Account balance (adding funds), cards, PayPal |
  | Egypt | Apple Account balance (adding funds), mobile billing (Vodafone), cards |
  | Kuwait | Mobile billing (Ooredoo, stc, Zain), cards |
  | Saudi Arabia | Apple Account balance (App Store & iTunes Gift Cards or adding funds), mobile billing (Mobily, STC, Zain), cards |
  | UAE | Apple Account balance (Apple Gift Card or adding funds), Apple Pay, mobile billing (Du, Etisalat), cards |
  | Türkiye | Apple Account balance, mobile billing (Paycell, Türk Telekom, Vodafone), cards |

  — [Apple Support 111741 (7 Aug 2026)](https://support.apple.com/en-us/111741)
- **Examples elsewhere on the same page:**

  | Storefront | Methods listed |
  |---|---|
  | United States | Apple Account balance, Apple Card, Apple Cash, Apple Pay, most credit and debit cards, PayPal |
  | United Kingdom | Apple Account balance, Apple Pay, mobile billing (3Pay, EE, O2, Vodafone), cards, PayPal |
  | France / Germany | Apple Account balance, Apple Pay, mobile billing (Bouygues/Orange/SFR; O2/Telekom/Vodafone), cards, PayPal |
  | Netherlands | Also iDEAL / Wero, for adding funds only |
  | India | Apple Account balance, Mastercard, Net Banking (adding funds only), UPI, Visa |
  | Japan | Apple Pay, Merpay, mobile billing (au, NTT DOCOMO, SoftBank), PayPay, cards |
  | China mainland | Alipay, Douyin Pay, WeChat Pay, Apple Account balance, cards |

  — [Apple Support 111741 (7 Aug 2026)](https://support.apple.com/en-us/111741)
- **Footnotes on the page** (they apply where a country entry cites them):
  - "Apple Pay requires two-factor authentication."
  - "You might be asked to verify your account with the payment method provider" (PayPal).
  - "This payment method can't be used for Family Sharing" (for example, India Net Banking).
  - "Mobile billing is available only with supported carriers. This list is subject to change."
  - "For international credit and check cards, you might be asked to authenticate your payment method before it can be used."
  - "This payment method can't be used to add funds to an Apple Account balance."

  — [Apple Support 111741 (7 Aug 2026)](https://support.apple.com/en-us/111741)
- **Carrier billing:** "If your carrier supports it, you can pay for your App Store and iTunes Store purchases and more through mobile phone billing … Mobile billing is currently available only in some countries and regions." Set-up uses an SMS one-time code. — [Apple Support: If there's an issue when you set up mobile phone billing (Published 11 Dec 2024)](https://support.apple.com/en-us/108097)
- **Card data stays with Apple.** Apple's Netherlands entitlement page shows what normally belongs to Apple. A user leaving Apple's payment system sees: "App Store features, such as your stored App Store payment method, subscription management, and refund requests, will not be available." So with In-App Purchase, the stored payment method, subscription management and refunds all sit with Apple, not the developer. — [Apple Developer: StoreKit External Purchase Entitlement (Netherlands dating apps)](https://developer.apple.com/support/storekit-external-entitlement/)
- **Currency:** Apple's financial-report regions place Lebanon in "Rest of World", reported in USD (re-checked; Lebanon appears in the WW list). — [App Store Connect Help: Financial report regions and currencies](https://developer.apple.com/help/app-store-connect/reference/reporting/financial-report-regions-and-currencies)
- **[SECONDARY] Apple Community replies (users, not Apple):**
  - For a Lebanon-region account you need a card issued by a bank in that country with a Lebanese billing address. A UAE card was reported rejected for the Lebanon store.
  - Someone suggested asking a Lebanese bank for a prepaid card.
  - Changing region requires spending the Apple Account balance first.

  — [Apple Community thread 252531319](https://discussions.apple.com/thread/252531319) and [Apple Community thread 251970872 "Which apple itunes card can i use for Lebanon region?"](https://discussions.apple.com/thread/251970872) (snippets; not opened)
- **[SECONDARY] Lebanese "fresh USD" cards:**
  - Lebanese banks and wallets sell "fresh USD" cards for online use. Byblos Bank's "Visa Platinum Fresh" debit card is one.
  - The WeePay wallet advertises a "disposable Fresh USD virtual card … to pay for all your digital international subscriptions".
  - Neither source says the card works with an Apple Account.

  — [Byblos Bank: Visa Platinum Fresh](https://www.byblosbank.com/personal/cards/debit/visa-fresh); [WeePay Wallet App Store listing](https://apps.apple.com/py/app/weepay-wallet/id6444006006?l=en-GB) (snippets; not opened)

### Inferences
- **Lebanese subscribers need a working international card.** A Lebanese subscriber on a Lebanon-region Apple Account can pay only with a credit or debit card that clears an international USD card charge. In practice that is a "fresh" USD card, because older "lollar" (blocked-deposit) cards are often restricted for foreign online payments. That last point is general Lebanese banking context, not Apple's.
- **No fallback options.** There is no fallback through carrier billing (Alfa/Touch), Apple Pay or gift cards on the Lebanon storefront. That means a subscription app's paying audience in Lebanon is limited to people holding such cards. Expect a higher share of failed first purchases and failed renewals.
- **Gift cards bought elsewhere.** Gift cards bought abroad cannot be used, because Lebanon lists no Apple Account balance. Apple gift cards are also storefront-specific in general. A Lebanese family could subscribe only through an account in another storefront, which needs a payment method and address valid there.

### Gaps
- Apple does not say whether prepaid cards, or specific Lebanese debit or "fresh" cards, are accepted on a Lebanon Apple Account. The official list says only "Most credit and debit cards". No reliable first-hand test reports were found (forum hosts were blocked here).
- No Apple page gives the customer price currency for the Lebanon storefront directly. USD is inferred from the financial-report region (see earlier notes).

## 2. Is Lebanon a full App Store storefront with paid apps and In-App Purchase?

### Takeaway
Yes. Lebanon is one of Apple's App Store storefronts, with pricing and availability start times listed like any other. It is listed in DPLA Exhibit A §2 (ADI as commissionaire), and Apple lists accepted payment methods for it. So paid apps, In-App Purchases and auto-renewable subscriptions can be offered there. The storefront has the payment constraints described in Q1.

### Cited Findings
- Lebanon appears in Apple's table of storefronts and start times. The table covers "setting the availability of apps, In-App Purchases, and pre-orders, scheduling introductory and win-back offers, or adjusting prices". — [App Store Connect Help: App Store pricing and availability start times by country or region](https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/app-store-pricing-and-availability-start-times-by-country-or-region)
- Introductory offers can be priced across "all 175 App Store countries and regions". — [App Store Connect Help: Set up introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- The Lebanon payment-method entry exists, giving "Most credit and debit cards". — [Apple Support 111741 (7 Aug 2026)](https://support.apple.com/en-us/111741)
- Lebanon is in Exhibit A §2, so ADI sells there as commissionaire (confirmed in earlier notes). — [DPLA (Schedule 2 updated 13 Oct 2026)](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **New subscription formats in 2026:**
  - Monthly subscriptions with a 12-month commitment, available worldwide except the US and Singapore, from iOS 26.5 (May 2026): [Apple News, 27 Apr 2026](https://developer.apple.com/news/?id=agq42lxe)
  - Multiseat and group purchases. Volume purchasing for organisations started 22 Oct 2026; group purchases come "this winter": [Apple News, 22 Oct 2026](https://developer.apple.com/news/?id=yfo21auu)
  - Retention messages in the cancellation flow: [Apple News, 4 Nov 2026](https://developer.apple.com/news/?id=fk9ps3gv)

### Inferences
- A Lebanon-based developer can sell its subscription in Lebanon and in every other storefront from one App Store Connect account. "Developer in Lebanon" and "customer in Lebanon" are separate questions: most revenue may come from storefronts with richer payment options (Gulf, EU, US).

### Gaps
- None material.

## 3. Apple's rules on taking payment: In-App Purchase required for a subscription; exceptions (US links, EU, Japan/Brazil, Netherlands, Korea, reader apps, multiplatform); what a Lebanon-based developer can use; web subscriptions

### Takeaway
**The base rule.** Under Guideline 3.1.1 (Last Updated 16 Oct 2026), any subscription that unlocks features in the app **must use In-App Purchase**. Apple then charges the customer, holds the card, invoices, handles refunds and pays the developer. The developer never sees card data.

**The exceptions are tied to the customer's storefront, not to where the developer lives:**
- **United States storefront:** apps may include "buttons, external links, or other calls to action" to other purchase methods without any entitlement. Apple currently charges no commission on these link-outs while a US court sets one. Apple has proposed up to 15% (August 2026, [SECONDARY]).
- **EU storefronts:** Attachment 14 allows alternative payment processing and out-of-app offers, with commissions (see earlier notes).
- **Japan and Brazil (iOS):** Attachment 12 allows alternative payments and out-of-app offers, with commissions.
- **Netherlands:** dating apps only.
- **South Korea:** a separate Korea-only binary.
- **Reader apps** (Guideline 3.1.3(a)): limited to magazines, newspapers, books, audio, music and video. An AAC or education app does not qualify.
- **Multiplatform services** (Guideline 3.1.3(b)): a subscription bought on the developer's website may be used in the app, "provided those items are also available as in-app purchases within the app". Outside the US, the app must not encourage the web purchase. Communication outside the app (email and so on) is allowed.

So a Lebanon-based developer may sell a web subscription and honour it in the app. The developer must still offer the same subscription through In-App Purchase. Outside the US, EU, Japan and Brazil (with their own entitlements and commissions), the app may not link to or mention the web offer.

### Cited Findings
- **Guideline 3.1.1:** "If you want to unlock features or functionality within your app, (by way of example: subscriptions, … access to premium content, or unlocking a full version), you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality, such as license keys, … QR codes, cryptocurrencies". — [App Review Guidelines (Last Updated 16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Guideline 3.1.1(a):** "Developers may apply for entitlements to provide a link in their app to a permitted destination in order to purchase digital content or services. These entitlements are not required for developers to include buttons, external links, or other calls to action in their United States storefront apps." On the StoreKit External Purchase Link Entitlements: "The entitlements are limited to use only in specific storefronts of the App Store … In all other storefronts, except for the United States storefront, where this prohibition does not apply, apps and their metadata may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase." — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **16 Oct 2026 revision:** "3.1.1(a): Removed bullet point on Music Streaming Services Entitlements, which is now incorporated in the bullet point on StoreKit External Purchase Link Entitlements; clarified that links may be provided to a permitted destination." — [Apple News, 16 Oct 2026](https://developer.apple.com/news/?id=92th7e5i)
- **US change (1 May 2025):** the guidelines were "updated for compliance with a United States court decision regarding buttons, external links, and other calls to action in apps. These changes affect apps distributed on the United States storefront", in Guidelines 3.1.1, 3.1.1(a), 3.1.3 and 3.1.3(a). — [Apple News, 1 May 2025](https://developer.apple.com/news/?id=9txfddzf)
- **Guideline 3.1.3, "Other Purchase Methods":** "Apps in this section cannot, within the app, encourage users to use a purchasing method other than in-app purchase, except for apps on the United States storefront and as set forth in 3.1.1(a) and 3.1.3(a). Developers can send communications outside of the app to their user base about purchasing methods other than in-app purchase." — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Guideline 3.1.3(a), reader apps:** "Apps may allow a user to access previously purchased content or content subscriptions (specifically: magazines, newspapers, books, audio, music, and video)." Reader apps may apply for the External Link Account Entitlement, which "is not required … in their United States storefront apps." — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Guideline 3.1.3(b), multiplatform services:** "Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site … provided those items are also available as in-app purchases within the app." — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Other 3.1.3 exceptions:**
  - 3.1.3(c) Enterprise Services: only for apps sold to organisations for employees or students. "Consumer, single user, or family sales must use in-app purchase."
  - 3.1.3(d) one-to-one real-time person-to-person services, such as tutoring or medical consultations, may use other payment methods. "One-to-few and one-to-many real-time services must use in-app purchase."

  — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Guideline 3.1.2(a), subscription rules:** the subscription period "must last at least seven days and be available across all of the user's devices". Existing paid features must not be taken away when switching to subscriptions. — [App Review Guidelines (16 Oct 2026)](https://developer.apple.com/app-store/review/guidelines/)
- **Netherlands:** "The entitlements that comply with the ACM order are only available for dating apps on the App Store in the Netherlands … The entitlement cannot be used in the same app with Apple's in-app purchase system in the Netherlands storefront." The payment provider must meet PCI DSS Level 1 and price in euros. — [Apple Developer: StoreKit External Purchase Entitlement](https://developer.apple.com/support/storekit-external-entitlement/)
- **[SECONDARY] South Korea:** the Korea entitlement is for apps "distributed on the App Store solely in South Korea". Developers must "submit your app as a separate app binary". The approved payment providers are KCP, Inicis, Toss and NICE. — [Apple Developer (Korea) page](https://developer-mdn.apple.com/support/storekit-external-entitlement-kr/) (snippet; not opened)
- **EU eligibility under Attachment 14** (in force from 1 Oct 2026). To use alternative payment processing or out-of-app offers, the app must "Be distributed on the App Store … in one or more storefront(s) available in any country or region located in the EU ('EU storefront(s)')" and be submitted with the entitlement. The developer's own location is not a condition. **Restrictions relevant to a children's app:**
  - no "Out-of-App Offers to any end user, if Your Application is in the Kids category";
  - none "to end users who are under 13 years of age (or the higher associated age threshold for that EU storefront)";
  - for ages 13–17, only behind a parental gate;
  - no "Alternative Payment Processing to end users under 18 years of age, unless You have provided those options behind a parental gate."

  — [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **EU election lock-in (Attachment 14):** "any changes You make to Your elections in Applications already distributed on the App Store remain in effect for twelve (12) months". — [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Japan and Brazil (Attachment 12).** The app must "Be distributed on iOS in the Japan and/or Brazil storefront(s) of the App Store; and Be submitted with the entitlement". In Japan, no out-of-app offers are allowed for Kids-category apps or under-13s. For alternative payment processing, "Apple is entitled to an App Store commission of twenty-one percent (21%) … including … auto-renewing subscriptions", or 10% for Small Business Program members and others. — [DPLA Attachment 12](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **When the options started:** Japan "Beginning with iOS 26.2" under the Mobile Software Competition Act; developers had to accept the updated DPLA by 17 Mar 2026. Brazil "Beginning with iOS 26.5" under the CADE agreement; acceptance by 6 Jul 2026. — [Apple News, 17 Dec 2025](https://developer.apple.com/news/?id=074b3wzz); [Apple News, 18 Jun 2026](https://developer.apple.com/news/?id=dhwadr2x)
- **Seller of record off Apple IAP:** for alternative-payment or out-of-app sales in the EU, "You act as the seller in Your own name and on Your own account" and handle the taxes (Attachment 14 §5; also in earlier notes). — [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **The developer never handles card data under IAP.** Apple "shall be solely responsible for the collection of all prices payable by End-Users" (Schedule 2 §3.1). Apple issues the invoices (§1.2(e)). Refunds are decided by Apple (see Q4). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **[SECONDARY] US commission status:**
  - In Dec 2025 the Ninth Circuit upheld the contempt finding but allowed Apple to seek a commission on linked-out purchases. It is limited to costs "genuinely and reasonably necessary" for coordinating external links (plus some compensation for its IP), and Apple may charge nothing until the district court approves a rate.
  - The Supreme Court denied a stay (May 2026).
  - In August 2026 Apple proposed commissions of up to 15% (MLex reports proposals from 5% to 15%). Epic called this "far outside of the bounds" of the court's guidance.
  - Apple "has been charging zero commission on these external purchases in the U.S. since the contempt ruling". No final rate was found as of mid-November 2026.

  — [MacRumors, 11 Dec 2025](https://www.macrumors.com/2025/12/11/APPLE-APP-STORE-FEES-EXTERNAL-PAYMENT-LINKS/); [MacRumors, 29 Apr 2026](https://www.macrumors.com/2026/04/29/epic-games-wins-reversal-app-store-fee-battle/); [MLex](https://www.mlex.com/mlex/antitrust/articles/2512333/apple-loses-bid-to-stay-app-commission-process-pending-us-high-court-review); [Michael Tsai blog, 17 Aug 2026 "Apple Proposes 15% External Purchase Fee"](https://mjtsai.com/blog/2026/08/17/apple-proposes-15-external-purchase-fee/); [Channel Insider](https://www.channelinsider.com/apple/news-apple-external-purchase-fee-epic-court-fight/); [MacDailyNews, 14 Aug 2026](https://macdailynews.com/2026/08/14/u-s-supreme-court-clears-path-for-app-store-commission-showdown-as-apple-must-defend-its-rates-in-lower-court/amp/) (all snippets; not opened)

### Inferences
- **What a Lebanon-based developer can actually use, by customer storefront:**
  - **All storefronts, including Lebanon:** Apple IAP (required whenever the subscription is sold in the app), plus a web subscription honoured in the app under 3.1.3(b). The app must not steer users to the web subscription, except in the US, the EU and Japan/Brazil under their terms.
  - **US-storefront users:** the app may also show a button or link to the developer's own web checkout, currently with no Apple commission, though a court-set commission may come and could apply.
  - **EU and Japan/Brazil users:** link-outs or an in-app third-party payment sheet, under the entitlement and its commission. For a children's app, the Kids-category and under-13 restrictions may block out-of-app offers entirely.
  - **Netherlands and Korea:** not useful. One is for dating apps only; the other needs a Korea-only binary.
- **Who processes payments off Apple.** Every non-IAP route makes the developer the seller and payment taker. It needs a payment processor that onboards Lebanon-resident individuals, or a merchant-of-record service. The developer then also owns refunds, chargebacks and taxes. Apple's IAP remains the only route where Apple charges the customer and pays the developer.
- **Web-only subscriptions.** A subscription sold only on the web, with no IAP equivalent in the app, does not meet 3.1.3(b) ("provided those items are also available as in-app purchases"). It would be rejected under 3.1.1 unless the app qualifies as a reader app (an AAC app does not) or as Enterprise (sold only to organisations).

### Gaps
- No final US court-set commission on link-outs was found. It is likely to change after November 2026.
- I did not confirm which payment processors accept Lebanon-resident individuals. That is outside Apple's pages.
- I could not open Apple's full Korea and EU entitlement pages in this session to list every current requirement.

## 4. How auto-renewable subscriptions are charged and managed: renewal, billing retry, grace period, price increases and consent, refunds, Family Sharing, introductory offers, offer codes, cancellation

### Takeaway
**Who does what.** Apple charges each renewal to the subscriber's Apple Account payment method. If the charge fails, the subscription enters **billing retry for up to 60 days**. The developer can choose a **Billing Grace Period** of 3, 16 or 28 days (weekly plans: 3 or 6), during which the user keeps access.

**Price increases.** Apple notifies subscribers itself. It asks for **consent** when the increase is more than 50% and more than about US$5 per period (US$50 per year for annual plans), when local law requires consent, or when the subscriber already had an increase in the last 12 months. Without consent the subscription expires.

**Refunds.** **Apple decides** refunds, and the user requests them at reportaproblem.apple.com. The developer can send consumption data to inform the decision. The DPLA makes the developer reimburse Apple "an amount equal to the price".

**Family Sharing** is opt-in per product and cannot be turned off once on. Up to six family members share one purchase.

**Offers.** Introductory offers (free trial, pay up front, pay as you go) are limited to one per person per subscription group. Offer codes allow up to 1 million redemptions per app per period.

### Cited Findings
- **Billing retry:** "If the customer's billing is invalid, the renewal fails and the user's subscription enters a billing retry state, where the App Store attempts to collect payment for up to 60 days." "If the user is recovered within the 60 days, the new billing date is established on the date of recovery and subsequent renewal dates are based on this new billing date". — [StoreKit docs: Reducing involuntary subscriber churn](https://developer.apple.com/documentation/storekit/reducing-involuntary-subscriber-churn)
- **Billing Grace Period:** it "lets subscribers whose auto-renewal failed due to a payment issue continue accessing your app's paid content … while Apple continues to attempt to collect payment. There won't be any interruption to the subscriber's days of paid service or to your revenue if Apple recovers the subscription within the grace period. Without enabling Billing Grace Period, the subscriber's days of paid service pause until Apple is able to collect payment." — [App Store Connect Help: Enable billing grace period](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions)
- **Grace Period options:**
  - The setting is per app, for all subscriptions: "select a period of 3, 16, or 28 days". Weekly plans get 3 or 6 days at most.
  - It covers "All Renewals" (including free-to-paid conversions) or "Only Paid to Paid Renewals".
  - It "doesn't apply for monthly subscriptions with a 12 month commitment".
  - The app "still needs to perform purchase validation" to detect the grace state.
  - Recoveries after the grace period but within billing retry "renew on the recovery date, starting a new billing cycle".

  — [App Store Connect Help](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions); [StoreKit docs](https://developer.apple.com/documentation/storekit/reducing-involuntary-subscriber-churn)
- **What the developer must provide:** "You must fulfill the offer during the entire subscription period, as marketed, including any Billing Grace Period You authorize". If not, Apple may refund the user (Schedule 2 §3.8(c)). Billing periods allowed: "weekly, monthly, bi-monthly, tri-monthly, semi-annual or annual" (§3.8(a)). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Server notifications:**
  - DID_FAIL_TO_RENEW: "the subscription failed to renew due to a billing issue. The subscription enters the billing retry period".
  - DID_RENEW with subtype BILLING_RECOVERY: recovery.
  - GRACE_PERIOD_EXPIRED: the grace period ends but billing retry continues.
  - EXPIRED with BILLING_RETRY: "the billing retry period ended without a successful billing transaction".

  — [App Store Server Notifications: notificationType](https://developer.apple.com/documentation/appstoreservernotifications/notificationtype)
- **Price increases, consent needed when:**
  - "The subscriber is located in a region that requires consent for any price changes."
  - "The price increase is more than 50% of the current price and the difference in price exceeds approximately US$5 per period for non-annual subscriptions, or US$50 per year for annual subscriptions."
  - "The subscriber experienced a price increase for that subscription within the past 12 months."

  "Apple will automatically contact subscribers by email or push notification to request consent." "If a subscriber doesn't consent before the first renewal at the higher price, their subscription will expire". — [App Store Connect Help: Manage pricing for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
- **Price increases, consent not needed:** Apple notifies subscribers "27 or 7 days before the next renewal date". The developer may "Keep the current price for existing subscribers", and lapsed users can resubscribe at the preserved price "within 60 days of expiration". Price decreases apply automatically to existing subscribers. "Once a price increase goes into effect, it can't be reversed." A subscription recovered from billing retry or grace "renews at the existing price for one more billing period". — [App Store Connect Help: Manage pricing](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
- **Refunds, subscriber side:** "Sign in to reportaproblem.apple.com … choose 'Request a refund.'" "Wait 24 to 48 hours for an update on your request". "Refund eligibility might vary by country or region. See the Apple Media Services Terms and Conditions". — [Apple Support: Request a refund (Published 17 Sep 2026)](https://support.apple.com/en-us/118223)
- **Refunds, developer side (Schedule 2 §6.3):** if a user asks to cancel within 90 days, or within the subscription period if shorter, or the app fails to conform, "Apple may refund to the End-User the full amount of the price paid … In the event that Apple refunds any such price to an End-User, You shall reimburse, or grant Apple a credit for, an amount equal to the price for that Licensed Application." The same applies to refunds obtained through a payment provider, such as chargebacks. On termination Apple "may withhold all payments due to You for a period that Apple determines is reasonable in order to calculate and offset any End-User refunds" (§7.1). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Developer input on refunds:** "The App Store uses a variety of factors to determine if a refund request is approved or denied … you can send information about a customer's consumption of the In-App Purchase … The App Store uses the consumption information you provide to inform its refund decisions." This works only with the customer's consent, in reply to a CONSUMPTION_REQUEST notification, "within 12 hours". A REFUND notification "indicates that the App Store successfully refunded a transaction", and there are also REFUND_DECLINED and REFUND_REVERSED notifications. — [App Store Server API: Send Consumption Information](https://developer.apple.com/documentation/appstoreserverapi/send-consumption-information); [notificationType](https://developer.apple.com/documentation/appstoreservernotifications/notificationtype)
- **Family Sharing:**
  - Supported "only by apps that offer auto-renewable subscriptions and non-consumable In-App Purchases".
  - Shared "with up to five additional family members"; a subscription "will be able to be shared by up to six family members. Family Sharing is only available for subscriptions purchased from the App Store."
  - "once you turn on Family Sharing for an In-App Purchases in App Store Connect, you can't turn it off."
  - With multiseat, "only the group purchaser is eligible for Family Sharing".

  — [App Store Connect Help: Turn on Family Sharing for In-App Purchases](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases)
- **Who pays and refunds in a family group:** family purchases are "charged to your shared payment method". The family organizer can request refunds for members. Some payment methods "can't be used for Family Sharing". — [Apple Support: Request a refund (17 Sep 2026)](https://support.apple.com/en-us/118223); [Apple Support 111741](https://support.apple.com/en-us/111741)
- **Introductory offers:** "There are three types of introductory offers: free trial, pay up front, and pay as you go." "Each person is only eligible to redeem one introductory offer per subscription group." "You can have one current and one future introductory offer per storefront." An offer can't be edited once created. — [App Store Connect Help: Set up introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions)
- **Offer codes:**
  - "a maximum of 1 million redemptions per app, per [period]". The period word was cut off in my extraction.
  - Code types: "Unique, one-time-use codes" or "Uniquely named custom codes — for example, SPRINGPROMO". Codes can be redeemed through a URL, the App Store redemption flow or in the app.
  - Eligibility can be set to new, existing (including those in billing retry or grace) or expired subscribers.
  - An offer can be made non-renewing, for free offers only.

  — [App Store Connect Help: Set up subscription offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes)
- **Cancellation:** users cancel in Settings or the App Store, or on the web or Windows. "If you signed up for a trial subscription and you don't want to renew it, cancel it at least 24 hours before the trial ends." "You can't cancel a family member's subscription." — [Apple Support: Cancel a subscription from Apple (Published 29 Sep 2026)](https://support.apple.com/en-us/118428)
- **Upgrades and downgrades:** upgrades and cross-grades start immediately "and Your proceeds will be adjusted accordingly". Downgrades start at the end of the current period (§3.8(a)). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

### Inferences
- **Grace period for Lebanese users.** For Lebanese subscribers, whose only method is a card, failed renewals (expired cards, foreign-transaction limits on "fresh" cards) are likely the main cause of involuntary churn. Turning on the Billing Grace Period (16 or 28 days) and showing an "update your payment method" prompt during billing retry would protect both the user's access and revenue.
- **Refund cost.** Read literally, §6.3 means the developer reimburses "an amount equal to the price" of the refunded item. In practice the financial reports show it as a reversal of the sale. How much of Apple's commission comes back was not verified from an official page.
- **Family Sharing and revenue.** Family Sharing gives no extra revenue: one purchase covers up to six people. It suits a product for one child's family. Once on, it cannot be switched off.

### Gaps
- I did not verify, on an official page, exactly how refunds appear in Financial Reports (negative units and proceeds, and whether the commission is returned).
- The period wording of the offer-code limit was cut off in my extraction ("per app, per …"). Check the page before relying on it.
- The Apple Media Services Terms (the consumer refund terms, including the EU 14-day withdrawal right) were not re-read in this session.

## 5. Payouts: entering a Lebanese bank account in App Store Connect, what Apple sends, currency, paying entity, schedule, threshold, returned payments, fees

### Takeaway
To enter bank details, the developer goes to App Store Connect, then Business, Agreements, Bank Accounts, Add Bank Account. The Paid Apps Agreement must be signed and the tax forms submitted first. The steps are:
1. Select the bank country (the **branch's** country).
2. Find the bank by "Bank Code" (the field shown depends on the country), or search by bank name, city or postal code.
3. Enter the account number and, separately, the IBAN "if applicable".
4. Choose the account currency, which is also the payout currency.
5. Choose checking or savings.
6. Enter the account holder's name and address, exactly as the bank has them, in English letters only.

Only one bank account receives payments.

**If Apple's lookup cannot find the bank,** "it may be that Apple can't send payments to that bank". No Apple page confirms that Lebanese banks (or Bank Audi) appear.

**What arrives.** Payments are consolidated per currency and converted by Apple's bank into the chosen currency (USD for a Lebanese USD account). They arrive by wire or EFT within 45 days of the end of the Apple fiscal month, once the USD 40 threshold is passed (Lebanon is not in Apple's threshold table). Each payment carries a 7-digit Transaction ID (CCI). Fees charged by the developer's bank or intermediary banks are the developer's responsibility.

**If a payment bounces,** App Store Connect shows a "Payment Returned" alert with the reason. Payments resume within about two cycles after the details are fixed.

### Cited Findings
- **Prerequisites:** "in order to add banking information, you'll first need to sign a Paid Apps Agreement." "You must submit all required tax forms needed for your paid contract in order for us to process banking information." Required role: "Account Holder, Admin, or Finance". — [App Store Connect Help: Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- **Steps:**
  - "Select Business at the top of the page. On the Agreements tab, find the Bank Accounts section and click Add Bank Account."
  - A two-factor authentication code may be asked for.
  - "Select your bank country or region, then click Next."
  - "In the Bank Account Currency pop-up menu, choose the primary currency of the bank account".
  - "Account Type … Checking or Savings".
  - "Click 'Don't know your [local clearing code number]?' to search by your bank's name, city, or postal code … Not all branch locations are published in App Store Connect. Select a branch using the routing number for your bank account if your branch location isn't listed."
  - "In the IBAN field, enter your IBAN … if applicable. An IBAN is used for payments to bank accounts in Europe and certain other regions."
  - "Make sure to enter your information exactly as it appears on your bank account or your payment may be rejected."
  - "Depending on where your bank is located, there may be additional required fields."

  — [App Store Connect Help: Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- **Bank details and extra documents:** "Provide information specific to your bank (not an intermediary or correspondent bank) and ensure the routing number is unique to your account." "In certain regions, additional documentation may be required to receive payments. If an Apple banking partner needs more documentation …, they'll reach out to you directly. To verify a request before responding, contact us." — [App Store Connect Help: Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- **Field definitions:**
  - "Bank Territory: The country or region for the branch of your bank. This is not the same as where your bank's headquarters is located."
  - "Bank Code: This is a routing or clearing number, but a different field will display depending on the location of your country or region … If you can't identify your bank in App Store Connect, it may be that Apple can't send payments to that bank."
  - Account number: "English letters or numbers only … Don't enter your IBAN into the bank account number field."
  - Account Holder Name: English letters and digits plus ",/?-)(" only, "matches exactly as it appears on the bank account … including punctuations"; for joint accounts, both names. "The account holder name for your bank account doesn't have to match the legal entity name for your agreement."
  - "Account Holder Type: Individual or Corporation". Address: the holder's address linked to the account.
  - "Bank Account Currency … This is also the currency you will be paid in. Note that most bank accounts only accept a single currency. Don't enter a currency you're not sure your bank account supports."

  — [App Store Connect Help: Banking information](https://developer.apple.com/help/app-store-connect/reference/reporting/banking-information)
- **One account only:** "Can I receive payments to multiple banks? No. You may only receive payments at one bank." "Payments to multiple or split bank accounts aren't supported." — [Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information); [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Changing banks:** changes "made after payment processing has begun for the fiscal month will delay the switch to your new bank account until the next payment cycle". Changes started by Admin or Finance users need the Account Holder's approval, which is "processed within 24 hours". — [Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- **How payments are sent:** "payments are made to the bank account and the currency you provided within 45 days of the last day of the fiscal month". "Payments are processed through direct deposit or electronic funds transfer (EFT). When available, payments are issued as low-value transfers rather than high-value wire transfers. Apple's bank consolidates proceeds for each currency in which you have App Store sales, resulting in a single payment to your bank per fiscal month." — [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Conversion and fees (DPLA Schedule 2 §3.5):** "Apple may cause Apple's bank to convert all remittances in any remittance currency other than the Designated Currency into the Designated Currency … any resulting currency exchange differentials or fees charged by Apple's bank may be deducted … You remain responsible for any fees (e.g., wire transfer fees) charged by Your bank or any intermediary banks between Your bank and Apple's bank." Remittances "are made by means of wire transfer only". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Fees in the help pages:** "Payments may be subject to bank fees and transaction costs charged by your bank or intermediate financial institutions, reducing the amount that's deposited". "The payment amount shown in App Store Connect represents the amount we've sent to your bank. However, the amount you receive may vary". — [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments); [View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Exchange rate:** "The exchange rate is established by our bank … typically the spot rate on the date of payment and no more than three business days prior to the date the proceeds are received". — [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Threshold (re-checked):** "All other bank countries or regions and bank account currencies must exceed a minimum payment threshold of 40 USD." Lebanon is not in the table. — [App Store Connect Help: Minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/reporting/minimum-payment-threshold)
- **Payment record:**
  - The Payments page shows, per payment, "the name of your bank and the last four digits of the account", in the bank-account currency, and the date issued.
  - It shows "a Transaction ID, a unique seven-digit payment reference number … Consolidated Credit Identifier (CCI). The CCI number is included as a reference in the additional text provided with the payment transfer details to your bank."
  - Per region it shows units, earnings in local currency, taxes and adjustments, the exchange rate and proceeds.

  — [App Store Connect Help: View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Reports and notifications:** financial reports for the previous fiscal month are out "by the first Friday of the current fiscal month". Notification emails come from do-not-reply@apple.com. — [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Returned payments:**
  - "If your bank returns a payment to us, we'll show you an alert in App Store Connect, along with the reason the payment was returned, and the bank reference number. You can also opt in to receive email notifications for returned payments."
  - The alert gives a Reason, a Required Adjustment and the Transaction ID.
  - "Once you make all necessary updates, payments should resume within two regularly scheduled payment cycles. Returned and held earnings may take up to two payment cycles to resend … identified in the Balance column".
  - If the details are correct, "reach out to your bank to resolve why they're not accepting our payments."

  — [App Store Connect Help: View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Paying entity:** Apple's help pages say only "Apple's bank" or "our bank". The DPLA makes ADI the commissionaire for Lebanon and most non-Americas storefronts. Exhibit C §16 speaks of "any remittance to You" by Apple Distribution International Ltd. and of invoices "issued by You to Apple Distribution International Ltd." — [DPLA Schedule 2 and Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Holds:** Apple may hold amounts in trust, without interest, while tax documentation is missing (§3.3) or the tax category is wrong (§3.2). It may withhold payments on termination to offset refunds, or on suspected fraud (§7.1). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **[SECONDARY] No Lebanon reports.** Searches of Apple's developer forums found no thread about adding a Lebanese bank account. The banking threads found were generic, such as "Bank key doesn't exist" errors, add-bank failures right after choosing a country, and IBAN rejections. — [Apple Developer Forums thread 850196](https://developer.apple.com/forums/thread/850196); [thread 837729](https://developer.apple.com/forums/thread/837729); [thread 810234 "Reject Payment Notification"](https://developer.apple.com/forums/thread/810234) (titles via search; not opened)

### Inferences
- **For a Bank Audi (or other Lebanese) USD account:**
  - Choose Bank Territory "Lebanon" (the branch country) and Bank Account Currency USD.
  - Find the bank by name or city (Lebanon has no national routing-code system, so the field will probably be a SWIFT/BIC-style bank key).
  - Enter the account number and the Lebanese IBAN in their separate fields.
  - Account Holder Type: Individual. Use the name exactly as on the bank statement, in Latin letters.
  - Apple would then convert all storefront currencies (EUR, GBP, SAR, AED and so on) into USD and send one USD transfer per fiscal month, provided the total exceeds USD 40.
- **"Fresh" funds.** A USD transfer from abroad into a Lebanese bank normally travels through a US correspondent bank, which may take a fee. Whether the Lebanese bank credits it as "fresh" (freely usable) USD is a question for the bank. The developer should confirm before relying on that account, and should keep the CCI reference to trace any payment.
- **Another solution.** Apple's documentation does not require the bank to be in the developer's country of residence ("Bank Territory" is just the branch country; the holder name need not match the agreement). So an account in the developer's own name abroad is permitted by Apple's rules, if Apple's lookup lists the bank. Examples are a UAE AED account or an EU EUR account, both on Apple's low-threshold table per earlier notes. Lebanese tax or foreign-exchange consequences are outside Apple's pages.
- **Payment speed.** "Low-value transfers" are used "when available". For Lebanon, expect a SWIFT wire (inference).

### Gaps
- No public Apple page confirms that Lebanon is selectable as a bank country, that Lebanese banks (Bank Audi) appear in the lookup, or which code field appears for Lebanon. Checking needs the App Store Connect form behind login.
- I could not find whether LBP is offered as a bank-account currency, or whether Apple restricts payouts to Lebanese banks.
- The name of the paying entity or originator on the incoming wire is not stated on any Apple page found: ADI, Apple Inc. or Apple's bank.
- Apple's fiscal calendar and exact payment dates for 2026–2027 are published only inside App Store Connect. No public page was found (as in the earlier notes).
- Whether Apple's banking partners ask Lebanese payees for extra documents ("in certain regions") is not stated.

## 6. Paying the USD 99 Apple Developer Program fee from Lebanon

### Takeaway
The fee is 99 USD a year, "in local currency where available". Enrolment can be done in the Apple Developer app or on the web. On the web, where Apple Store Online does not sell developer products in the region, Apple shows a credit-card form and asks for "a credit card that can be charged in USD". An individual must use **their own** card, or enrolment is delayed for an ID check. Apple says nothing about debit or prepaid cards and does not name Lebanon. It notes that enrolment "may not be supported in certain regions, for example due to sanctions".

### Cited Findings
- "The Apple Developer Program annual fee is 99 USD …, in local currency where available. Prices may vary by region and are listed in local currency during the enrollment process." — [Apple Developer: Enrollment support](https://developer.apple.com/support/enrollment/)
- "If you're enrolling on the web, you can choose from the payment methods presented during your membership purchase. If you're paying by credit card and enrolling as an individual, you must use your own credit card … If you do not, your enrollment will be delayed and you'll be asked for a copy of your government-issued photo identification. If Apple Developer products are not available on your region's Apple Store Online, you'll be presented with a credit card form. Please make your purchase with a credit card that can be charged in USD." — [Apple Developer: Enrollment support](https://developer.apple.com/support/enrollment/)
- "Enrollment in the Apple Developer Program is available through the Apple Developer app* and on the web." Footnote: "Enrollment in India is only available through the Apple Developer app. Enrollment may not be supported in certain regions, for example due to sanctions or other restrictions." — [Apple Developer: Enrollment support](https://developer.apple.com/support/enrollment/)
- For a credit-card-form purchase, the invoice must be requested from Apple Developer Support. Membership is "taxed using the tax rate for your region" when applicable. — [Apple Developer: Enrollment support](https://developer.apple.com/support/enrollment/)

### Inferences
- **Web route.** Lebanon has no Apple Store Online that sells developer memberships, as far as Apple's wording suggests (not confirmed). A Lebanon-resident individual on the web would therefore get the USD credit-card form. They should use a card in their own name that can make international USD online charges; a Lebanese "fresh USD" Visa or Mastercard is the likely candidate.
- **App route.** Enrolling in the Apple Developer app would charge the membership to the Apple Account's payment method. For a Lebanon-region account, that is a credit or debit card (Q1). This is inferred from the two enrolment routes; Apple does not describe the in-app payment method on this page.

### Gaps
- Apple does not say whether debit or prepaid cards work on the USD credit-card form. No reliable first-hand reports from Lebanon were found (forum hosts were blocked from this session).
- No Apple page explicitly lists Lebanon as supported or unsupported for enrolment.
