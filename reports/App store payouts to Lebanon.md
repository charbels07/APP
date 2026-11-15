# Stores charge the cards, then wire Bank Audi

Your subscribers will never pay you directly. They pay Apple or Google; the store charges the card, runs every renewal, chases failed payments, handles most refunds, keeps its commission (15% for a small developer) and then sends you **one US-dollar bank transfer a month**. In Lebanon a **credit or debit card is the only way to subscribe** on either store, with no Apple Pay, PayPal, phone-bill payment or gift card, while buyers abroad can also pay with wallets, PayPal, their phone bill and gift cards. The stores pay into a bank account identified by its IBAN and SWIFT code, never into a card, and **a Fresh USD account at neo by Bank Audi fits their rules**: Google requires a dollar account in Lebanon, Apple accepts any bank it can find in its own list, and neo's official price list charges **nothing for incoming international transfers**. neo's Mastercard debit card (Standard package, $1.99 a month) is the card to use for Apple's **$99 yearly fee** and Google's **$25 one-time fee**, at about 1.5% extra. Three points are not settled, and need written answers from the bank before you rely on neo: its **unpublished limits on incoming money**, whether **Bank Audi appears in Apple's bank search**, and which **documents** the bank wants for regular income from abroad. neo is also open only to **Lebanese nationals aged 18 or over**; if you are not one, or if its limits are too low, the fallback is Bank Audi's branch-based **External Account** ($4 a month, plus $5–20 for each incoming transfer). Researchers who read the official pages directly found most other doors closed: PayPal has no Lebanese market, Wise will not hold money for people living in Lebanon, and Stripe and Lemon Squeezy do not accept sellers based in Lebanon (an earlier note wrongly listed Lemon Squeezy as open). **Paddle** is the only web-payment service found that accepts, in principle, an individual living in Lebanon, but its fee beats the stores' only on yearly or higher-priced plans, and Apple lets an app point buyers to it only in the United States. The recommendation is therefore to sell through the stores' own payment systems, have the money paid into a fresh USD account at Bank Audi in your own name, and add web sales later only if the figures justify it.

## Fourteen words to know before reading on

The stores and the bank use technical words that matter for the money. This table explains them once; the rest of the report uses them in these senses.

| Term | What it means in plain words | Why it matters here |
|---|---|---|
| In-app purchase (Apple) / Google Play Billing | The store's own checkout inside the app: the buyer pays the store with whatever is saved in their Apple or Google account | Compulsory for subscriptions sold inside the app, in Lebanon and most countries |
| Storefront | The country version of the store a buyer uses. It follows the buyer's account, not where you live | Payment methods, prices, currency and rules all depend on the buyer's storefront |
| Commission / service fee | The store's share of each sale | 15% for a small developer on both stores in most countries |
| Payout | The money a store sends you after keeping its share | Arrives once a month by bank transfer |
| Wire transfer (SWIFT) | An international transfer from one bank to another over the SWIFT network | How both stores pay into Lebanon. Banks along the way can take fees |
| IBAN | Your account's international number. A Lebanese IBAN has 28 characters and starts with "LB" | The number you type into the stores' bank forms |
| SWIFT / BIC code | A bank's international address code | Tells the sender's bank which bank to send to |
| Correspondent (intermediary) bank | A large foreign bank, for dollars usually in New York, that passes a wire on to a Lebanese bank | Can take a fee or ask questions before passing the money on |
| Fresh dollars vs "lollars" | Fresh dollars arrived from abroad after 17 November 2019 and can be withdrawn and sent abroad. "Lollars" are the frozen deposits from before the crisis | Payouts must land in a fresh account, never an old one |
| Payment threshold | The minimum balance before a store sends money. Smaller amounts wait for the next month | $40 at Apple and $100 at Google for Lebanon |
| Billing retry, grace period, account hold | What happens when a renewal charge fails. The store keeps retrying; in a grace period the subscriber keeps access; in account hold they lose it | Lebanese cards often fail, and these settings protect your income |
| Merchant of record | The company that legally sells to the customer: it charges the card and deals with sales tax and refunds | The stores play this role for you. On the web, Paddle can |
| KYC / source of funds | The bank's checks on who you are ("know your customer") and where your money comes from | Expect questions about regular wires from abroad. Keep the stores' statements |
| 3-D Secure | A one-time code sent by SMS or e-mail to approve an online card payment | Usually needed to pay Apple and Google by card |

## In Lebanon a card is the only way to subscribe

### Apple lists one payment method for Lebanon

Apple's official list of payment methods by country gives Lebanon exactly one entry: **"Most credit and debit cards."** Jordan, Iraq, Libya and Yemen get the same single line. Richer markets get much more choice. In the UAE, buyers can use an Apple Account balance (from gift cards or added funds), Apple Pay, their du or Etisalat phone bill, or a card. In the United States they can add Apple Card, Apple Cash and PayPal. In the UK, France and Germany buyers can use PayPal and their phone bill, and India and Japan have local options such as UPI and PayPay. Apple warns that for international cards "you might be asked to authenticate your payment method before it can be used" ([Apple Support: payment methods by country, 7 Aug 2026](https://support.apple.com/en-us/111741)).

| Buyer's App Store country | What the buyer can pay with |
|---|---|
| Lebanon, Jordan, Iraq, Libya, Yemen | Most credit and debit cards only |
| UAE | Apple Account balance (gift cards, added funds), Apple Pay, phone bill (du, Etisalat), cards |
| Saudi Arabia | Apple Account balance, phone bill (Mobily, STC, Zain), cards |
| Israel | Apple Account balance, cards, PayPal |
| United States | Apple Account balance, Apple Card, Apple Cash, Apple Pay, cards, PayPal |
| United Kingdom, France, Germany | Apple Account balance, Apple Pay, phone bill, cards, PayPal |
| India | Apple Account balance, Mastercard, Visa, UPI, Net Banking (adding funds only) |
| Japan | Apple Pay, Merpay, PayPay, phone bill, cards |

Source: [Apple Support 111741](https://support.apple.com/en-us/111741).

A Lebanese subscriber is charged in **US dollars**. Apple places Lebanon in its "Rest of World" region, which it keeps in dollars ([App Store Connect: financial report regions](https://developer.apple.com/help/app-store-connect/reference/reporting/financial-report-regions-and-currencies)). Buyers in Saudi Arabia, the UAE, the euro area and other markets pay in their own currency. With in-app purchase, the saved card, the management of each subscription and refund requests all stay with Apple. Apple's own wording, for users who leave its payment system, is that these "App Store features … will not be available" to them ([Apple Developer: StoreKit External Purchase Entitlement](https://developer.apple.com/support/storekit-external-entitlement/)). You never see or store a card number.

### Google lists no country page for Lebanon, so the "other countries" rule applies

Google's page of accepted payment methods has entries for 72 countries, Iraq, Kuwait and the UAE among them, but **not Lebanon**. Lebanese users therefore fall under "Other countries": "Credit or debit cards … American Express, Discover, Mastercard, Visa". Google adds that "the types of cards accepted … may vary". Everywhere, Google refuses "Wire transfers, Western Union, Money Gram, **Virtual Credit Cards (VCC)**", transit cards and escrow-type payments ([Google Play Help: accepted payment methods](https://support.google.com/googleplay/answer/2651410?hl=en)). Elsewhere Google Play accepts much more: phone-bill payment, PayPal, Play balance, online banking, UPI in India, and e-wallets from GCash to KakaoPay ([Google Play Help: refund timelines by method](https://support.google.com/googleplay/answer/15576193?hl=en)). Google Play gift cards are not sold in Lebanon. They "may only be redeemed and used in the country and currency in which they were purchased", so a relative abroad cannot top up a Lebanese account ([Google Play Help: gift cards](https://support.google.com/googleplay/answer/3422734?hl=en)). Google's "Ask someone else to pay" feature works only in eight countries, and the payer must be in the same region ([Google Play Help: ask someone else to pay](https://support.google.com/googleplay/answer/14551162?hl=en)). Google charges "in the currency of your home country" if it can, and otherwise "usually" in US dollars. Lebanese buyers are therefore almost certainly charged in dollars, although no Google page states Lebanon's buyer currency ([Google Play Help: currency conversions](https://support.google.com/googleplay/answer/6220312?hl=en)). The charge appears on the buyer's statement as "GOOGLE*" followed by your seller name. Google warns that "your bank or card company might charge fees for international transactions" ([Google Play Help: fees and authorizations](https://support.google.com/googleplay/answer/6224192?hl=en)).

### What this means for your Lebanese customers

Your paying audience in Lebanon is limited to families whose card accepts an international online dollar payment. In practice that means a "fresh" card. Users on Apple's community forum report that a Lebanon-region Apple account needs a card issued in Lebanon with a Lebanese billing address ([Apple Community thread](https://discussions.apple.com/thread/252531319), user reports). neo's own card is built for this: it is a Mastercard debit card that can be used "internationally in any foreign currency as long as your card is linked to a fresh USD account" ([neo FAQ](https://www.neo.com.lb/english/faq)). A neo subscriber would also pay neo's 1.5% international card fee on each charge, assuming neo treats Apple's and Google's charges as international ([neo Packages](https://www.neo.com.lb/english/packages)). Declines do happen. One user with a Lebanese bank's USD card reported three cards refused through Google Pay ([Navigraph forum](https://forum.navigraph.com/t/cant-purchase-a-subscription-pay-with-card-greyed-out/12828), single anecdote). Expect more failed first purchases and failed renewals from Lebanon than from the Gulf or Europe, and set up the stores' recovery tools described next. Families in the diaspora, who subscribe on Gulf, European or American accounts, have far more ways to pay.

## Apple and Google chase failed renewals and decide most refunds

Because the store is the seller at checkout, almost everything that can go wrong with a payment is handled by the store, under rules you choose from a short menu. The table puts the two side by side. The paragraphs after it explain what to switch on.

| Situation | Apple App Store | Google Play |
|---|---|---|
| A renewal charge fails | Apple retries for **up to 60 days** ("billing retry"). An optional **grace period of 3, 16 or 28 days** (weekly plans: 3 or 6) keeps the subscriber's access. Without it, access pauses until payment succeeds | Google retries during a **grace period** (access kept), then an **account hold** (no access). By default the two together last **60 days**; a custom setting must total at least 30. Google makes extra attempts for up to 48 hours before the hold starts |
| The card is fixed | If payment is recovered after the grace period, a new billing cycle starts on the recovery date | During the grace period the original renewal date is kept; after an account hold the renewal date resets |
| A buyer wants a refund | The buyer asks Apple at reportaproblem.apple.com and gets an answer in 24–48 hours. **Apple decides** | Within **48 hours** of purchase Google decides (1–4 days). After that the buyer is sent to **you**, and you can refund in full or in part at any time |
| Cost to you of a refund | You reimburse Apple "an amount equal to the price" | You lose the refunded amount, and **Google returns its fee** |
| Refund after you were paid | Taken from later proceeds. On termination Apple can hold payments to cover refunds | Deducted from the next payout. A balance that stays negative for 48 hours is **debited from your bank account** |
| Price increase | Apple asks subscribers to agree if the rise is above 50% and above about $5 a period ($50 a year for annual plans), if local law requires it, or if it is the second rise in 12 months. Subscribers who do not agree lose the subscription | Subscribers must opt in by default; those who do not are cancelled. In Lebanon an **opt-out** rise is allowed with **30 days' notice**, once a year, capped at the greater of +50% or $0.17 a day |
| Cancelling | In Settings or the App Store. A free trial must be cancelled at least 24 hours before it ends | You must explain how to cancel and offer an online way to do it. Uninstalling the app does not cancel |
| Trials and offers | Free trial, pay up front or pay as you go. One introductory offer per person per subscription group | Free trials from 3 days to 3 years |
| Your technical duty | Check purchases and listen to Apple's server notifications | **Acknowledge each purchase within 3 days**, or Google refunds it automatically |

Sources: [StoreKit: reducing involuntary churn](https://developer.apple.com/documentation/storekit/reducing-involuntary-subscriber-churn); [App Store Connect: billing grace period](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions); [App Store Connect: subscription pricing](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions); [Apple Support: request a refund](https://support.apple.com/en-us/118223); [Apple DPLA Schedule 2 §6.3 and §7.1](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Apple Support: cancel a subscription](https://support.apple.com/en-us/118428); [App Store Connect: introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions); [Android Developers: subscription lifecycle (updated 15 Oct 2026)](https://developer.android.com/google/play/billing/lifecycle/subscriptions); [Play Console Help: understanding subscriptions](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en); [Google Play Help: refund policies](https://support.google.com/googleplay/answer/15574908?hl=en); [Play Console Help: refunds](https://support.google.com/googleplay/android-developer/answer/2741495?hl=en); [Play Console Help: opt-out countries](https://support.google.com/googleplay/android-developer/answer/13542779?hl=en); [Play Console Help: create subscriptions](https://support.google.com/googleplay/android-developer/answer/140504?hl=en).

### Switch on the longest grace periods

For a Lebanese audience paying only by card, failed renewals will be the main reason subscribers drop out without meaning to. Apple's documentation is plain about it. With a grace period, "there won't be any interruption to the subscriber's days of paid service or to your revenue if Apple recovers the subscription within the grace period". Without one, "the subscriber's days of paid service pause". The grace period does not apply to Apple's new "monthly with a 12-month commitment" plans ([App Store Connect: billing grace period](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions)). Choose **28 days on Apple**, keep Google's 60-day default, and show an "update your payment method" message in the app while a payment is being retried.

### Refunds become your job on Google after 48 hours

On Google, refund requests after 48 hours come to you. You therefore need a written refund policy and a support e-mail address before launch. Google's policy page answers "Can I offer my customers refunds directly? Yes" ([Play Console Help: payments policy FAQ](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)). On Apple you can only inform the decision. When Apple asks, and the customer agrees, you can send it the customer's usage of the subscription within 12 hours ([App Store Server API: consumption information](https://developer.apple.com/documentation/appstoreserverapi/send-consumption-information)).

### Family Sharing is a one-way switch

Apple's **Family Sharing** lets one purchase serve "up to six family members". Once you turn it on for a subscription, "you can't turn it off" ([App Store Connect: Family Sharing](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases)). For an app that a whole family uses around one child, it is a goodwill feature that brings no extra income. Decide before launch.

## Inside the app, the store's checkout is compulsory except in a few buyer countries

### Apple: in-app purchase everywhere, and a web link only for American buyers

App Review Guideline 3.1.1 (last updated 16 October 2026) says that to "unlock features or functionality within your app, (by way of example: subscriptions …), you must use in-app purchase". The exceptions follow the **buyer's storefront**, not where you live. On the **United States** storefront, apps may include "buttons, external links, or other calls to action" to another way of paying, with no special permission ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [Apple Developer News, 1 May 2025](https://developer.apple.com/news/?id=9txfddzf)). Apple currently takes no commission on those linked purchases while a US court decides what it may charge. In August 2026 Apple proposed up to 15% ([MacRumors, 11 Dec 2025](https://www.macrumors.com/2025/12/11/APPLE-APP-STORE-FEES-EXTERNAL-PAYMENT-LINKS/); [Michael Tsai, 17 Aug 2026](https://mjtsai.com/blog/2026/08/17/apple-proposes-15-external-purchase-fee/), secondary reports).

In the EU, Apple's Attachment 14 allows other payment systems and offers outside the app, with commissions. It bars offers outside the app for apps "in the Kids category" and for users under 13, and allows other payment systems for users under 18 only "behind a parental gate". Japan and Brazil (Attachment 12) allow other payment systems at a **21%** commission, or **10%** for small developers ([Apple DPLA, Attachments 12 and 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)). The Netherlands option is for dating apps only, and South Korea needs a separate app made only for Korea.

Everywhere else, Lebanon included, Apple allows one model, the "multiplatform" rule (3.1.3(b)). A subscription bought on your website may unlock the app, "provided those items are also available as in-app purchases within the app". Inside the app you may not "encourage users to use a purchasing method other than in-app purchase". Outside it you are free: "Developers can send communications outside of the app to their user base about purchasing methods other than in-app purchase" ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)). Two other exceptions do not fit a family app. The "reader app" exception covers only magazines, newspapers, books, audio, music and video. The enterprise exception (3.1.3(c)) covers apps sold to organisations for their employees or students, while "consumer, single user, or family sales must use in-app purchase".

### Google: Play Billing for Lebanese buyers until 2027, with new choice programs elsewhere

Google's Payments policy requires Play Billing for subscriptions and forbids leading users to another payment method "via … webviews, buttons, links, messaging" unless a program for the user's country applies ([Play Console Help: Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)). Since 2026 those programs have grown quickly.

The new **billing choice program** covers users in the UK and the EEA from 30 June 2026, and in Australia and Japan from 30 September 2026. It lets you offer your own checkout, or links to your website, alongside Play Billing. It still charges **10%** on auto-renewing subscriptions ([Play Console Help: billing choice program](https://support.google.com/googleplay/android-developer/answer/17161464?hl=en)). Google says it is "available to all developers globally" who serve those users, and it lists no condition of being a registered business ([Android Developers Blog, 24 Jun 2026](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play)). For US users, separate programs allow alternative billing or external links, also at 10% on subscriptions ([Play Console Help: US alternative billing](https://support.google.com/googleplay/android-developer/answer/16497028?hl=en); [US external links](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en)). The older EEA programs say "Developer must be registered as a business", and the external-offers program adds "Your app must not target only children" ([Play Console Help: EEA external offers](https://support.google.com/googleplay/android-developer/answer/14372887?hl=en)). Lebanon and the rest of the world get these options "by September 30, 2027" ([Android Developers Blog, 4 Mar 2026](https://developer.android.com/blog/posts/a-new-era-for-choice-and-openness)).

Google also allows a "consumption-only" app anywhere: an app that sells nothing and only lets users log in to what they bought elsewhere. Google does not require equal prices across platforms, and "outside of your app, you are free to communicate with your users about alternative purchase options" ([Play Console Help: payments policy FAQ](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)).

| Buyer's store country | Apple (iPhone, iPad) | Google Play (Android) |
|---|---|---|
| **Lebanon** and most of the world | In-app purchase only. A web subscription may unlock the app if the same plan is also sold in the app; no link or mention in the app | Play Billing only; no link. Choice arrives by 30 Sep 2027 |
| United States | Links or buttons to your web checkout allowed. Apple's commission is currently zero, a court will set it, and Apple has proposed up to 15% | Alternative billing or external links programs; 10% on subscriptions; links shown only to US users |
| EU / EEA | Attachment 14: other payment systems and outside offers, with commission. Barred for the Kids category and under-13s; parental gate for under-18s | Billing choice (since 30 Jun 2026), 10%. Older programs need a registered business |
| UK, Australia | No exception in the sources read: treat as in-app purchase only | Billing choice (UK since 30 Jun, Australia since 30 Sep 2026), 10% |
| Japan, Brazil | Attachment 12: other payment systems at 21%, or 10% for small developers | Japan: billing choice (since 30 Sep 2026). Brazil: pilot that needs a registered business |
| Anywhere | Sending e-mail to your users about web offers is allowed | Same; a "consumption-only" app that sells nothing is allowed |

The money behind this table matters more than the rules. Lebanese buyers can only pay through the stores until at least September 2027. Through the stores' own checkout, a small developer pays **15%**: Apple's Small Business Program rate from the first day ([Apple: Small Business Program](https://developer.apple.com/app-store/small-business-program/)), and Google's 15% on auto-renewing subscriptions, or 10% plus a 5% billing fee in the markets already on its new model ([Play Console Help: service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)). On Google, every alternative route still pays Google 10%, so adding a web processor's roughly 5% costs you **more** than Play Billing's 15%. The one route that saves money today is a link to your website for **American iPhone users**, and only for as long as Apple's commission on it stays at zero.

## Apple and Google send one dollar wire a month to one account

### What you type into the two bank forms

Neither store pays into a card, a wallet or a phone number. Each pays into one bank account, described by a handful of fields that must match the bank's records exactly.

| Field | Apple App Store Connect | Google Play Console |
|---|---|---|
| Before you start | Sign the Paid Apps Agreement and submit the tax form (W-8BEN). You need the Account Holder, Admin or Finance role | Create a payments profile with your legal name and real address (no P.O. box). **The country can never be changed** |
| Where | Business → Agreements → Bank Accounts → Add Bank Account | Payments profile → "How you get paid" → Add payment method |
| Bank country | The country of the **branch**: Lebanon | Must be the payments-profile country: **Lebanon** |
| Currency | The currency of the account (USD). This is also the payout currency; "Don't enter a currency you're not sure your bank account supports" | USD by wire ("Payouts will arrive in US Dollars") |
| Bank identifier | Search for the bank by name, city or postal code. "If you can't identify your bank … it may be that Apple can't send payments to that bank" | Bank name (max 70 characters) and SWIFT-BIC (8 or 11 characters) |
| Account number | Account number and IBAN in **separate** fields; "Don't enter your IBAN into the bank account number field" | IBAN |
| Name | English letters only, "exactly as it appears on your bank account … including punctuations"; holder type Individual; holder's address | Name "exactly as it appears on your bank statement" (max 60 characters) |
| Intermediary bank | "Provide information specific to your bank (not an intermediary or correspondent bank)" | Optional intermediary bank and "for further credit" fields, if your bank gives instructions for wires from the US |
| Checking the details | Changes by Admin or Finance users need the Account Holder's approval | **No test deposit is sent for wire countries**: "It's critical you enter your bank account details correctly" |

Sources: [App Store Connect: enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information); [App Store Connect: banking information](https://developer.apple.com/help/app-store-connect/reference/reporting/banking-information); [Play Console Help: create a payments profile](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en); [Play Console Help: merchant bank account](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en); [Play Console Help: verify bank account](https://support.google.com/googleplay/android-developer/answer/7161378?hl=en).

Both stores show your name to customers. Apple lists an individual's "personal legal name … as the seller on the App Store" ([Apple: enrollment support](https://developer.apple.com/support/enrollment/)). Google shows the payments-profile name to customers "and on your receipts", along with a customer-support e-mail address ([Play Console Help: payments profile](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en)).

Two warnings correct the earlier notes. Google's bank page for Lebanon says that "Merchants in Lebanon receive payments via wire transfer from the United States. **Payouts will arrive in US Dollars**." That settles the worry, raised in the bank notes, that Google might pay in Lebanese pounds. Google's account-registration table shows LBP only as the profile's default currency, with a footnote saying these developers "will be paid in USD or EUR" ([Play Console Help: supported locations](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en)). And the earlier tax research assumed Google would send a small test deposit to check the account. It does not do so for wire countries, so a typing mistake shows up only when the first real payout fails.

### How and when the money arrives

| | Apple | Google |
|---|---|---|
| Who sends it | "Apple's bank". The agreement names Apple Distribution International (Ireland) for payments to you | Google, by wire from the United States |
| Currency | USD. Apple's bank converts every other currency (EUR, SAR, AED…) at the day's market rate | USD |
| When | Once per Apple fiscal month, **within 45 days** after it ends | From **around the 15th** of the month after the sales; never on weekends or bank holidays; then several business days in transit |
| Minimum | **$40** (Lebanon is not in Apple's low-minimum table); smaller balances roll over | **$100**; smaller balances roll over; you can raise it |
| Fees | Your bank's and intermediary banks' fees, plus any conversion difference charged by Apple's bank | Set by your bank and intermediaries: "US$0 to US$50 or more" |
| Number of accounts | One: "Payments to multiple or split bank accounts aren't supported" | One primary account |
| Reference | A 7-digit Transaction ID (CCI) included in the transfer text | Shown in the payments profile within 24 hours of a payout |
| If the bank sends it back | "Payment Returned" alert with the reason; payments resume "within two regularly scheduled payment cycles" once fixed | "Payout failed" e-mail; fix the details |
| Holds | Money held "in trust" while tax forms are missing; payments can be withheld on termination or suspected fraud | Identity review can hold payouts "up to 35 days". If you fail verification you get no payouts and must refund unpaid orders |
| Unclaimed money | — | Balances of non-US residents can be handed to the State of Delaware as abandoned property |

Sources: [App Store Connect: receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments); [App Store Connect: view payments](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds); [App Store Connect: minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/reporting/minimum-payment-threshold); [Apple DPLA, Schedule 2 §3.3, §3.5, §7.1 and Exhibit C §16](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Play Console Help: wire payouts](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en); [Play Console Help: order processing and payouts](https://support.google.com/googleplay/android-developer/answer/137997?hl=en); [Payments Center Help: payouts on hold](https://support.google.com/paymentscenter/answer/11595946?hl=en); [Play Console Help: FAQ](https://support.google.com/googleplay/android-developer/answer/7161649?hl=en).

In practice, a subscription paid on 3 March counts in Google's March earnings; the wire leaves around 15 April and lands a few business days later, provided your balance has reached $100. Apple pays the same sale at the latest 45 days after the end of its fiscal month, so by about mid-May, and publishes its fiscal calendar only inside App Store Connect. At the start, Google's $100 minimum can delay the first payout by several months. Apple's financial reports for the previous month are ready "by the first Friday" of the current fiscal month ([App Store Connect: receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)).

Before any money moves, Google requires an **identity check**: a government ID, proof of address (a bank statement, a credit-card bill with the first 12 digits blacked out, or a utility bill) and your Merchant ID written on every document. The check "typically takes 2–3 business days" ([Payments Center Help: identity verification](https://support.google.com/paymentscenter/answer/7159033?hl=en)). The address on your Google payments profile should match the billing address of your payment method ([Payments Center Help: payouts on hold](https://support.google.com/paymentscenter/answer/11595946?hl=en)). Apple's banking partners "may" ask for extra documents "in certain regions". Apple advises you to "contact us" to check such a request before answering ([App Store Connect: enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)). Google states that it "will never ask for your account info via email" ([Play Console Help: merchant bank account](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en)). Treat any e-mail asking for bank details as fraud until proven otherwise.

### What can go wrong, and what to do

| Problem | Where it shows | What to do |
|---|---|---|
| Bank Audi does not appear in Apple's bank search | App Store Connect bank form | Do not type intermediary-bank details instead. Contact Apple, and ask Bank Audi which code Apple's list uses |
| Name, IBAN or SWIFT code slightly wrong | Apple "Payment Returned" alert; Google "payout failed" e-mail | Copy every detail from the bank's own document; fix it, then wait one or two cycles |
| Wire bigger than neo's incoming limit | Unknown: the bank might hold it or send it back | Ask neo for the limit in writing **before** you enter the account (questions below) |
| Bank asks where the money comes from | Bank holds the credit | Send the store's payout statement, your agreement with the store, and your Apple CCI or Google payout reference |
| Less money arrives than the store sent | Bank statement shows a smaller amount | Intermediary banks deducted fees. Ask the bank for the incoming-wire advice |
| Tax form or Google identity check not finished | Payments held | Finish the W-8BEN and the identity check before the first sale |
| Refund after you were paid | Next payout is smaller | Normal. On Google, keep the balance positive or Google debits your bank account |
| Payouts fail for months | Balance keeps growing | Fix it quickly: Google can eventually hand unclaimed balances to Delaware |

## neo can receive the wires for free, but three answers are missing

### What neo is, and who can open it

"neo by Bank Audi" is Bank Audi's digital bank, used only through its phone app. Bank Audi describes it as launched in 2024 as Lebanon's first digital bank ([LBC, Sept 2026](https://www.lbcgroup.tv/news/economy/956716/bank-audi-in-collaboration-with-mastercard-launch-initiative-to-empowe/en)). Opening an account automatically creates a **Fresh LBP and a Fresh USD account** at no cost, and EUR, GBP, AED, SAR and QAR accounts can be added. Eligibility is strict. A researcher read neo's official FAQ in full and found that "If you are 18 years or older & **holding a Lebanese nationality**, you're eligible to sign up on neo App" ([neo FAQ](https://www.neo.com.lb/english/faq)). A developer living in Lebanon without Lebanese nationality cannot use neo.

Everything happens in the app: "The Customer … shall only and exclusively operate his/her accounts through the neo digital platform" ([neo Rights & Duties](https://www.neo.com.lb/english/rights-duties)). There are two packages. **Entry** is now free but comes with no card; an earlier note, relying on a 2024 brochure, priced it at $0.99. **Standard** costs **$1.99 a month** and includes "one digital and one physical card for free" ([neo Packages](https://www.neo.com.lb/english/packages)). To sign up you need your phone, a national ID or passport, a selfie, and your "Professional Details" and "Total yearly Income". The FAQ warns that accounts "may be blocked due to expired KYC verification" ([neo FAQ](https://www.neo.com.lb/english/faq)). A separate neo Business account can be requested through a contact form, but its conditions are not published.

### Receiving Apple and Google wires

The official pages read in full confirm the essentials. neo lets you "Receive transfers from any bank account Locally or Internationally" ([neo home](https://www.neo.com.lb/)). Its price list marks "Incoming transfers to neo — local and int via IBAN" as included in both packages, and the 2024 brochure says "Free" in so many words ([neo Packages](https://www.neo.com.lb/english/packages); [neo brochure, 2024](https://neofiles.blob.core.windows.net/files/Assets/ContentFiles/neoBROCHURE20Feb24_112218.pdf)). That settles an earlier doubt caused by a garbled table.

The IBAN is shown in the app and shared from "Account information". neo advises giving "the IBAN numbers for all payments instead of Account Numbers". Bank Audi's own example IBAN has the 28-character Lebanese format ([neo FAQ](https://www.neo.com.lb/english/faq); [Bank Audi External Account](https://www.bankaudi.com.lb/externalaccount)). Your USD and LBP accounts each have their own number, so make sure the stores receive the **Fresh USD** account's IBAN.

Three things are on no official page. The first is the **limit on incoming money**: neo says "There are daily and monthly limits for incoming Funds", but only in its answers about transfers between neo customers, and it publishes no amounts in English or Arabic ([neo FAQ](https://www.neo.com.lb/english/faq)). The second is the **SWIFT code**: Bank Audi's appears in directories as **AUDBLBBX**, or AUDBLBBXXXX in its 11-character form ([theswiftcodes.com](https://www.theswiftcodes.com/lebanon/audblbbx/); [Wise SWIFT lookup](https://wise.com/us/swift-codes/AUDBLBBXXXX)), but not on neo's or Bank Audi's own pages, so read it from the neo app or ask the bank. The third is the **dollar correspondent**: Bank Audi lists four New York correspondents, The Bank of New York Mellon, Citibank, JPMorgan Chase and Standard Chartered, but does not say which one, if any, should appear in Google's optional intermediary field ([Bank Audi: worldwide correspondents](https://www.bankaudi.com.lb/about-the-bank/about-us/worldwide-correspondents)).

No neo or Bank Audi page mentions freelancers, app stores or platform income ([neo home](https://www.neo.com.lb/)). The account's KYC profile does record your occupation and yearly income, so declare "app developer" and a realistic income from the start.

### Using the money once it arrives

neo makes fresh dollars easy to use. **Cash at Bank Audi ATMs is free** with an in-app "Cash Out" voucher ("You will not incur any charges"), within daily and monthly ceilings whose amounts are not published; cash at a branch costs 6‰ (minimum $2), and the agents Cash United, OMT and Bob Finance charge tiered fees ([neo FAQ](https://www.neo.com.lb/english/faq); [neo Packages](https://www.neo.com.lb/english/packages)). **A transfer abroad costs a flat $25**, whatever the amount, and the app exchanges dollars and pounds at 89,600 / 89,750 with "No additional fees". Bank Audi's main app charges $15 plus 2‰ (minimum $30, maximum $500) for the same transfer abroad, so neo is cheaper at every amount ([Bank Audi mobile app](https://www.bankaudi.com.lb/lebanon/adc/bank-audi-mobile-application)).

One caution comes from a 2023 analysis of Circular 165, the central bank rule behind fresh-dollar accounts. It reported that the central bank "refuses to transfer" fresh-dollar balances cleared locally to foreign correspondents ([L'Orient Today, 2023](https://today.lorientlejour.com/article/1341581/circular-165-and-the-prisoners-dilemma.html)). That concerns dollars moved between Lebanese banks. A wire from Apple or Google arrives through Bank Audi's foreign correspondent instead, and the US State Department reports that post-2019 deposits "may generally be transferred abroad" ([US State Department, 2026 Investment Climate Statement](https://www.state.gov/reports/2026-investment-climate-statements/lebanon)). This distinction is an inference, so ask the bank to confirm it in writing.

### Bank Audi's External Account is the fallback

Bank Audi's classic fresh-money account is "a fresh funds account … in line with BDL Basic Circular 150". It is run through branches and the main Bank Audi app, and its tariff is published ([Bank Audi External Account](https://www.bankaudi.com.lb/externalaccount)). It costs more than neo but comes with a branch that can deal with compliance questions and raise limits: the main app says, "For higher limits, please refer to your branch" ([Bank Audi mobile app](https://www.bankaudi.com.lb/lebanon/adc/bank-audi-mobile-application)).

| | neo Fresh USD (Standard) | Bank Audi Personal External Account |
|---|---|---|
| Who can open it | Lebanese nationals, 18+, in the app | Branch customers (nationality rules not published) |
| Monthly fee | $1.99 (the Entry package is free but has no card) | $4 ($5 for a business account) |
| Incoming wire from abroad | **Free** (neo fee) | **$5** up to $500; **$10** up to $3,000; **$15** up to $10,000; **$20** above |
| Limits on incoming money | Exist; amounts not published | Not published; branch can raise online limits |
| Transfer abroad | $25 flat | $15 + 2‰ (minimum $30, maximum $500) |
| Cash withdrawal | Free at Bank Audi ATMs (voucher); 6‰ at a branch | ATM 2‰ (minimum $1); counter 5‰ (minimum $2) |
| Help | App and live chat only | Branch |

Sources: [neo Packages](https://www.neo.com.lb/english/packages); [neo FAQ](https://www.neo.com.lb/english/faq); [Bank Audi External Account](https://www.bankaudi.com.lb/externalaccount); [Bank Audi mobile app](https://www.bankaudi.com.lb/lebanon/adc/bank-audi-mobile-application).

At $1,000 a month from each store, the External Account would cost about **$20 a month in incoming-wire fees** (two wires at $10), against **nothing at neo**. Fees deducted by intermediary banks apply to both. If you already bank with Bank Audi, check whether your current account is an External (fresh) account or an old pre-2019 one. Store payouts must never land in an old account.

### Paying Apple's and Google's fees with the neo card

The neo card is a **"neo Platinum Mastercard Debit Card"**, not a prepaid card ([neo debit card page](https://www.neo.com.lb/english/pages/your-neo-platinum-debit-card)). This matters, because Google states that "**Google Play does not accept prepaid cards**". Google's $25 one-time fee can be paid with Mastercard, Visa, American Express or (outside the US) Visa Electron. Google "may" ask for "a valid government ID and a credit card, both under your legal name", and "if this information is determined to be invalid, your registration fee will not be refunded" ([Play Console Help: get started](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en); [Play Console Help: registration payment methods](https://support.google.com/googleplay/android-developer/answer/9875040?hl=en)).

Apple's $99 yearly fee must be paid with "your own credit card" if you enrol as an individual. Where Apple's online store does not sell developer memberships, Apple shows a card form and asks for "a credit card that can be charged in USD". Apple says nothing either way about debit cards ([Apple: enrollment support](https://developer.apple.com/support/enrollment/)).

Use the neo **digital card**, which "can only be used for online purchase", on the Standard package, linked to the Fresh USD account ([neo FAQ](https://www.neo.com.lb/english/faq)). neo charges an "International Card Transaction Fee" of **1.5%** when the charge is in the account's currency and **4.8%** when it is not ([neo Packages](https://www.neo.com.lb/english/packages)). That is about **$1.49** on Apple's $99 and **$0.38** on Google's $25, provided the card is set to dollars.

Bank Audi cards are "automatically enrolled in the 3D secure service" and receive a six-digit code for every online purchase ([Bank Audi 3-D Secure](https://www.bankaudi.com.lb/personal-banking/services/online-services/3d-secure)). For adult neo cards, the official pages confirm 3-D Secure only for teen cards. neo cards work with Google Wallet, and "are not yet supported on Apple Pay". Apple Pay does not matter here, because Apple takes the card number typed directly ([neo FAQ](https://www.neo.com.lb/english/faq)).

One practical snag for a developer: a reply from neo support on Google Play says the Android app will not run while **Developer Options** are switched on, a setting app developers normally keep on ([neo on Google Play](https://play.google.com/store/apps/details?id=com.cbt.neodigital&hl=en), not confirmed on neo's own pages). Keep the bank app on a second phone if this applies.

### Lebanon's banking status adds checks, not a ban

Lebanon has been on the FATF "grey list" since October 2024. It was kept there in June 2026 ([FATF list, 19 June 2026](https://fiu.rks-gov.net/wp-content/uploads/2026/08/FATF-Jurisdictions-under-Increased-Monitoring-19-June-2026.pdf)) and, according to secondary reports, again in October 2026 ([ComplyAdvantage](https://complyadvantage.com/insights/fatf-plenary-october-2026-four-grey-list-exits-a-virtual-asset-review-and-a-new-focus-on-scam-compounds/)). The EU lists it as a high-risk country ([EUR-Lex, Regulation 2025/1184](https://eur-lex.europa.eu/eli/reg_del/2025/1184/oj/eng)). The State Department reports that international correspondent banks "have suspended lines of credit" to Lebanese banks. That is credit, not the receipt of payments. The monthly cash withdrawal limits of roughly $400–800 that the same report describes belong to the old deposit rules; it treats post-2019 deposits separately ([US State Department, 2026](https://www.state.gov/reports/2026-investment-climate-statements/lebanon)). One payments aggregator says transfers into Lebanon often take **3–7 business days**, and that amounts above **$10,000** draw extra scrutiny ([PayAtlas](https://payatlas.com/countries/lebanon-lb), indicative only).

No case was found of Apple or Google payouts to Lebanon being refused. Equally, no public report was found of a Lebanese developer receiving them into neo, so your first payout is the real test. Apple's payments come from its Irish company, and EU rules require extra checks on transfers involving high-risk countries, so expect occasional questions and delays. Keep every store statement as proof of where the money comes from. Because a future rescue of Lebanese banks could still treat deposits in ways nobody can predict, do not let large balances build up: move the money on regularly.

## Most alternatives are closed to someone living in Lebanon in 2026

### Accounts abroad and payment apps

**Google rules out a foreign account.** The bank must be in the payments-profile country, which is your real legal location (Lebanon) and can never be changed ([Play Console Help: payments profile](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en)).

**Apple allows one in principle.** It defines the bank country as the branch's country and says the holder name "doesn't have to match the legal entity name for your agreement" ([App Store Connect: banking information](https://developer.apple.com/help/app-store-connect/reference/reporting/banking-information)). A euro account at an EU bank, or a dirham account in the UAE, would even lower Apple's minimum payout from $40 to almost nothing ([App Store Connect: minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/reporting/minimum-payment-threshold)). The obstacle is opening such an account. EU banks must apply extra checks to Lebanese residents, and UAE banks decide case by case and often expect a UAE resident ([private.law: UAE bank accounts](https://wiki.private.law/en/uae-company-bank-account)). A genuine account abroad in your own name, if you already have one, is a reasonable choice for Apple alone. It does not move the income out of Lebanese tax.

The payment apps fare no better on their own official pages. **PayPal** has no Lebanon entry among its 200 markets, so Lebanese accounts can neither receive nor send ([PayPal: worldwide](https://www.paypal.com/us/webapps/mpp/country-worldwide)). **Wise** lets Lebanon residents register and send money, but Lebanon is missing from the list of places where "You can hold money", which means no Wise balance and no receiving account details ([Wise: where can I use Wise](https://wise.com/help/articles/2978049/where-can-i-use-wise); [Wise: where to live to hold money](https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise)); it can only send dollars *to* Lebanon by wire ([Wise: send money to Lebanon](https://wise.com/gb/send-money/send-money-to-lebanon)). **Payoneer** says nothing official about Lebanon: its sitemap and legal pages never mention the country ([Payoneer: prohibited transactions](https://www.payoneer.com/legal/prohibited-transaction-list/)). Users report both blocked and working accounts ([Skydo](https://www.skydo.com/people-ask/does-payoneer-work-in-lebanon), a competitor), one Payoneer transfer to Lebanon "got rejected and returned" ([Airbnb Community](https://community.withairbnb.com/t5/Help/payouts-lebanon/m-p/986554)), and a dollar withdrawal to a Lebanese bank would fall in Payoneer's 1.2%–4% band, not its $1.50 same-currency fee ([Payoneer pricing](https://www.payoneer.com/pricing/)). **Revolut's** card is reported as "not yet available for residents of Lebanon" ([The Currency Shop](https://www.thecurrencyshop.com.au/guides/using-the-revolut-card-in-lebanon), secondary). Never open a payment account with a foreign address you do not live at. It would misstate your residence and risks closure with the money frozen inside.

### Selling on your own website: Paddle is the only service found that is open

To take subscriptions on a website you need a company that charges cards and pays you. A "merchant of record" goes further: it sells in its own name, so it also deals with the world's sales taxes. The direct checks leave a very short list. **Stripe** is "currently supported" in 46 countries, the UAE included, but not Lebanon ([Stripe global availability](https://stripe.com/global)). **Stripe Managed Payments**, Stripe's own merchant-of-record service, accepts only businesses based in 35 listed locations, without Lebanon or the UAE, and adds **3.5%** to Stripe's normal fees; an earlier note's "5% + 50¢" figure for it was wrong ([Stripe: Managed Payments eligibility](https://docs.stripe.com/payments/managed-payments/eligibility); [stripe.com/managed-payments](https://stripe.com/managed-payments)). **Lemon Squeezy** pays merchants only by bank in its listed countries, which exclude Lebanon, or by PayPal, which does not operate in Lebanon, and it lists Lebanon among the countries whose **customers** it cannot accept. This **corrects** the earlier note, which read a fragment of the same page as listing Lebanon for bank payouts. Since January 2026 Lemon Squeezy has also been steering its users towards Stripe Managed Payments ([Lemon Squeezy: supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries); [Lemon Squeezy: 2026 update](https://www.lemonsqueezy.com/blog/2026-update)). **Creem** neither pays out to Lebanon nor accepts Lebanese customers ([Creem: supported countries](https://docs.creem.io/merchant-of-record/supported-countries)).

**Paddle** is the exception. Its full list of countries it "is unable to support suppliers operating from" includes Iraq, Syria, Iran, Libya and Yemen, **but not Lebanon** ([Paddle: supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)), and business-registration documents are "not required for individuals or sole traders" ([Paddle: business verification](https://www.paddle.com/help/start/account-verification/what-is-business-verification)). It charges **5% + 50¢** per transaction with no monthly fee ([Paddle pricing](https://www.paddle.com/pricing)). It pays once a month by wire, in USD among other currencies, or through Payoneer; the balance is "sent by the 15th", with a **$100 minimum** ([Paddle: when and how do I get paid](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid); [Paddle: payout currencies](https://www.paddle.com/help/manage/get-paid/can-i-be-paid-in-my-local-currency)). A payout that is not in the bank country's local currency goes "internationally via SWIFT" with a **$15 wire fee**, so a dollar payout to a Lebanese bank costs $15 a month plus any intermediary fees ([Paddle: payout fees](https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts)). Paddle's country list "is subject to change", and Paddle may "request further information before … releasing a payment" ([Paddle: supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)). RevenueCat's documentation adds that Paddle "needs to review and approve your account when adding a domain" before live sales ([RevenueCat Docs: Paddle](https://www.revenuecat.com/docs/web/integrations/paddle)).

Local Lebanese services do not fill the gap. Whish's "Whish Pay" lets merchants accept payments online, but its sign-up form asks for a company name, and it publishes no merchant fees ([Whish: corporate solutions](https://www.whish.money/corporate-solutions); [Whish FAQ](https://www.whish.money/faq)). Areeba is reported to settle in Lebanese pounds ([CartDNA: Areeba](https://www.cartdna.com/shopify-payment-methods/Areeba), secondary). Neither handles foreign sales tax.

Paddle's fee hurts most on cheap monthly plans. The table compares it with the 15% store commission on the price before tax, ignoring Paddle's $15 monthly payout fee.

| Price of the plan | Store keeps (15%) | Paddle keeps (5% + 50¢) | Saving per sale with Paddle |
|---|---|---|---|
| $4.99 a month | $0.75 | $0.75 (15%) | none |
| $9.99 a month | $1.50 | $1.00 (10%) | $0.50 |
| $49.99 a year | $7.50 | $3.00 (6%) | $4.50 |

The web route therefore pays only on yearly or higher-priced plans. Even then, Apple lets the app point buyers to the website only in the United States, and Google's alternatives still charge 10%.

### RevenueCat keeps the records, not the money

RevenueCat "is not a payment processor. You'll continue to be paid by Apple, Google, Stripe, or any other payment provider." It tracks who has paid on which platform, so that one subscription unlocks the app everywhere. It is free up to $2,500 of "monthly tracked revenue", then **1%** of everything it tracks, store sales included ([RevenueCat pricing](https://www.revenuecat.com/pricing)). Its own web checkout runs on Stripe and is therefore closed to you. The Paddle integration is listed as fully supported, Web Purchase Links included. An earlier note had read it as "invite only", which is now **corrected** ([RevenueCat Docs: web overview](https://www.revenuecat.com/docs/web/overview); [RevenueCat Docs: Paddle](https://www.revenuecat.com/docs/web/integrations/paddle)). Your app already has its own server and database, so RevenueCat is a convenience, not a necessity.

### A company abroad costs money and does not move the tax

Stripe Atlas lets "founders from anywhere in the world" form a Delaware C corporation or LLC (a limited liability company) for **$500**, plus $100 a year for the registered agent, and it does not name Lebanon among its banned countries ([Stripe Atlas](https://stripe.com/atlas)). But a company whose address, owner or representative is in Lebanon cannot get Stripe's stablecoin account, and its US dollar account needs a representative "with a physical address in the United States" ([Stripe Support: Treasury for Atlas businesses](https://support.stripe.com/questions/treasury-account-availability-for-stripe-atlas-businesses)). No Stripe page says Stripe Payments would approve such a company. A foreign-owned US LLC must also file a yearly Form 5472, and the penalty for missing it is **$25,000** ([Rho: Delaware LLC for non-residents](https://www.rho.co/blog/delaware-llc-non-us-residents), secondary). A UAE free-zone company pays 0% only on "qualifying" income, and banks often expect a UAE-resident signatory ([private.law](https://wiki.private.law/en/uae-company-bank-account)). Estonian e-Residency "does not guarantee a business banking account" ([e-Residency](https://e-resident.gov.ee/blog/posts/changes-to-e-residency-in-2025-and-beyond)).

None of this changes Lebanese tax. Lebanon taxes profits "realised in Lebanon", resident or not, which PwC reads as profit "generated through an effort or activity exerted in Lebanon" ([Income Tax Law, Arts. 2–4](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273621&LawID=185603&language=ar); [PwC](https://taxsummaries.pwc.com/lebanon/corporate/taxes-on-corporate-income)). Work done in Beirut stays taxable there.

| Option | Open to an individual living in Lebanon? | Where the money goes | Cost | Handles foreign sales tax? |
|---|---|---|---|---|
| Apple and Google store billing | **Yes** | Lebanese USD account (Google: must be; Apple: can be abroad) | 15% | Yes, in most countries |
| Paddle (web) | **Yes in principle** (not excluded; individuals accepted) | USD wire to your Lebanese account, monthly, $100 minimum | 5% + 50¢; $15 per payout | Yes, as legal seller |
| Lemon Squeezy | **No** (corrected) | — | — | — |
| Stripe, Stripe Managed Payments, RevenueCat Billing | No | — | — | — |
| PayPal | No (no Lebanese market) | — | — | — |
| Wise | No receiving account (sending only) | — | — | — |
| Payoneer | Unconfirmed; reports of rejected transfers | — | 1.2%–4% to a Lebanese bank | — |
| Whish Pay, Areeba | Company sign-up; local wallets and cards | Whish wallet / Lebanese pounds (reported) | Not published | No |
| Company abroad | Yes, at a cost | Foreign bank; possibly Stripe | $500+ plus yearly filings | Depends; Lebanese tax remains |

## Recommendation: store billing into a fresh Bank Audi account, web sales later

### The plan

Sell your monthly and yearly subscriptions **only through Apple's in-app purchase and Google Play Billing**, at least until September 2027. Both stores charge the cards and run renewals, retries and refunds. They collect foreign sales taxes in most countries and pay you in dollars. No alternative route saves money for Lebanese customers, and for most foreign ones the saving is small. Have both stores pay the **same Fresh USD account in your own name at Bank Audi**: neo if you are Lebanese and the bank confirms in writing that recurring wires from Apple and Google fit its limits, otherwise a Personal External Account. Pay the two developer fees with the neo digital Mastercard. Move money out of the account regularly.

Revisit web sales through **Paddle** once yearly subscriptions bring in enough to make the 9-point saving worth the extra work. In the app, the link to the website would be shown only to iPhone users on the US storefront, and the same plans would still be sold through in-app purchase. Every other customer can learn about the web offer only by e-mail or on your website. Avoid PayPal, Wise, Payoneer, Lemon Squeezy and foreign companies.

### Taxes, briefly

The stores handle foreign sales taxes on their own billing, and Paddle does the same on web sales as merchant of record. Lebanese taxes stay with you: **income tax** on your profit, at 4% to 25% after an allowance of about $5,000; **VAT**, where registering as an exporter of services from the first sale is the safe course; and a **W-8BEN** form for each store, filled in as a Lebanese resident claiming no treaty benefit. Where the money is paid makes no difference to any of this. The separate report "Lebanon app subscription taxes" (15 November 2026, in the same reports folder) gives the details, deadlines and open questions; read it before the first sale.

### Setup checklist

| # | Step | Details |
|---|---|---|
| 1 | Open the account | neo (Lebanese, 18+): Standard package, $1.99 a month; the Fresh USD account opens automatically. Otherwise, or as a backup, a Personal External Account at a Bank Audi branch ($4 a month) |
| 2 | Send the bank the written questions below | Use neo's live chat, or call 1560 / +961 1 205405 and ask for a written reply. Keep the answers |
| 3 | Prepare the card | Link the digital card to the Fresh USD account; allow online and international use; make sure 3-D Secure codes reach your phone |
| 4 | Apple: enrol as an individual | Apple Account in your legal name with two-factor login; pay $99 with your own card in USD |
| 5 | Apple: agreements and tax | Sign the Paid Apps Agreement; W-8BEN as a Lebanese resident with no treaty claim; join the Small Business Program (15%) |
| 6 | Apple: bank account | Country Lebanon; currency USD; holder type Individual; account number and IBAN in separate fields; name and address exactly as the bank has them. If Bank Audi is not found, stop and ask Apple |
| 7 | Apple: subscriptions | Monthly and yearly plans in one subscription group; 28-day grace period; decide on Family Sharing (it cannot be undone); optional free trial |
| 8 | Google: register | Personal account, $25 with your own non-prepaid card; your legal name and real Lebanese address (the country is permanent); support e-mail |
| 9 | Google: tax and bank | W-8BEN; account holder name exactly as on the statement; bank name; SWIFT code from the bank; Fresh USD IBAN; intermediary bank only if Bank Audi tells you to; mark it primary. Check twice, because there is no test deposit |
| 10 | Google: identity check | ID and proof of address, each marked with your Merchant ID |
| 11 | Google: testing and plans | Closed test with 12 testers for 14 days ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)); monthly and yearly plans; keep the default grace period and account hold; the server acknowledges each purchase within 3 days |
| 12 | Write the customer texts | Refund policy, support contact, how to cancel. Required by Google, and needed after its 48-hour window |
| 13 | First payouts | When each first wire arrives, compare the amount with the store's statement; keep the bank's advice, the Apple CCI and the Google payout record |
| 14 | Routine | Sweep balances out regularly; keep all statements for the bank and the tax return; renew the W-8BEN every 3 years |
| 15 | Later, optional | Paddle account as an individual (confirm in writing first, see below); RevenueCat only if wanted; web link shown to US iPhone users only |

### Questions to put to the bank in writing

| # | Question | Why it matters |
|---|---|---|
| 1 | Can my personal Fresh USD account receive **monthly SWIFT wires** from Apple (Apple Distribution International, Ireland) and Google (from the United States) as income from selling my app? | Confirms the account may be used for this business income |
| 2 | What are the **daily and monthly limits** on incoming international transfers to this account, can they be raised for documented income, and what happens to a wire above the limit (held, credited later, or sent back)? | neo publishes no amounts |
| 3 | What **documents** do you need, once or for every wire (store agreements, payout statements, occupation)? Must I update my KYC profile? | Avoids holds on the first payouts |
| 4 | Please give the exact details for a payer abroad: beneficiary name, **IBAN of the Fresh USD account**, **SWIFT/BIC** (AUDBLBBX or AUDBLBBXXXX), bank name and address. | Apple and Google need exact details; Google sends no test deposit |
| 5 | Should a US payer name an **intermediary bank** (BNY Mellon, Citibank, JPMorgan Chase or Standard Chartered) or a "for further credit" instruction? If so, which exactly? | Google has optional fields for this; Apple wants your own bank's details only |
| 6 | Confirm that incoming international transfers carry **no neo fee** (or the External Account tariff of $5–20), and tell me what correspondent banks usually deduct. | Sets the real cost of each payout |
| 7 | Will these funds count as **fresh USD**, withdrawable in cash and transferable abroad without restriction? What are the cash-voucher and outgoing-transfer limits? | Makes sure the money is usable |
| 8 | How many working days after arrival is the money available (**value date**)? Will I get an advice of each incoming wire, and how do I trace a delayed one? | Helps you follow up late payouts |
| 9 | Is a personal account acceptable for this activity, or do you require neo Business or a Business External Account? | Avoids a later account closure |
| 10 | Is the neo digital card a debit (not prepaid) Mastercard, enrolled in 3-D Secure, able to pay Apple ($99) and Google ($25) in USD online, and is the fee 1.5%? | Google refuses prepaid cards |
| 11 | Does the neo Android app work on a phone with Developer Options switched on? | Developers usually keep it on |

If you later add web sales, ask **Paddle** four things in writing: whether it accepts an individual resident in Lebanon selling app subscriptions; whether it will send monthly USD SWIFT payouts to a Bank Audi account, and at what fees; which identity and address documents it needs; and whether it sells to buyers in Lebanon. Its own list "is subject to change", and its developer documents on buyer countries could not be re-checked ([Paddle: supported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)).

## Where reading the official pages overturned earlier notes

The researchers' first notes on banks and payment services relied on search-engine fragments. Later researchers read the official pages directly, and where the two disagree this report follows the direct reading. The changes that matter most:

| Point | Earlier note | Verified answer |
|---|---|---|
| Lemon Squeezy | Lebanon listed for bank payouts; "likely" usable | Not on the payout list, PayPal unavailable, Lebanese buyers refused: **not usable** |
| Paddle | List cut off; "possibly" open | Full list read, no Lebanon; individuals accepted; monthly USD wire, $100 minimum, $15 SWIFT fee |
| PayPal | "Doesn't work", from secondary sources | No Lebanese market on PayPal's own country list |
| Wise | Status unknown | Can register and send, but cannot hold money: no receiving account |
| neo eligibility | Not known | Lebanese nationality and age 18+ required |
| neo incoming fee | "Free", but the table was garbled | Free in both packages (price list and brochure) |
| neo Entry package | $0.99 a month | Free, but no card |
| neo card | Network and type unclear; Apple Pay gap anecdotal | Platinum Mastercard **debit**; Apple Pay officially not supported |
| neo limits | Assumed to apply to all incoming wires | Stated only for transfers between neo customers; no amounts published anywhere |
| Google payout currency | Feared to be Lebanese pounds | USD wire from the United States |
| Google test deposit | Assumed | None for wire countries |
| Stripe Managed Payments | Price unclear | Stripe fees + 3.5%; Lebanon not eligible |
| RevenueCat with Paddle | Web Purchase Links "invite only" | Supported, no invitation |
| Stripe Atlas | LLC unclear | C corporation or LLC; no Stripe Treasury account for Lebanese addresses |

## Conclusion

Asking whether the money can be "linked to" neo misses how the money actually moves. Subscribers never touch your account. The stores take their cards, and once a month each store pushes one dollar wire to an IBAN. So what matters is not neo's card but the receiving side of its account, and that is exactly where Bank Audi publishes the least: no incoming limits, no official SWIFT code, no word on platform income. The cheapest-looking Lebanese option is therefore the one that most needs a written answer before launch. The branch-based External Account, which costs more per wire, may turn out to be the safer one to point the stores at.

The 2026 opening of the app stores is real, but it mostly benefits developers in other countries. Nearly every new freedom follows the buyer's country. The web payment services built to use those freedoms, Stripe, Lemon Squeezy and PayPal, are closed to a seller living in Lebanon. For Lebanese buyers nothing changes before September 2027, and even then Google's 10% fee on alternative billing leaves little to gain. The store commission is the price of a payment system that a Lebanese seller cannot yet build alone. The next real decisions come later: the court-set US commission on Apple links, Google's rest-of-world rollout, and Bank Audi's answers to the eleven questions above.
