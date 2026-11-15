# Google Play subscription payments end to end for an individual developer resident in Lebanon: how subscribers pay, what Google's rules allow outside Google Play Billing, and how Google pays into a Lebanese bank account (as of 15 November 2026)

> **Method and dating.** On 15 Nov 2026 I fetched every Google page below directly (curl through the session proxy, `hl=en`) and read the article text. Unless a finding says "search summary", the quote comes from that direct read.
> - **Dates.** Play Help, Play Console Help and Payments Center Help articles show no "last updated" date in their HTML, so each is dated "n.d.; read 15 Nov 2026". developer.android.com pages show their own date.
> - **Blocked.** `blog.google` could not be reached from this session, so findings about it rest on search summaries.
> - **Secondary sources** are marked "(secondary)".
> - **Relation to earlier notes.** This file builds on `Lebanon app subscription taxes/google_play.md` and `verify_google_irs.md`. It does not repeat their tax, fee-rate, withholding or Merchant-of-Record findings. Points where it **corrects** them are marked CORRECTION.

## 1. How subscribers pay: payment methods in Lebanon and worldwide, currency, declines

### Takeaway
**Lebanon has no country entry on Google's "Accepted payment methods" page,** so Lebanese users fall under "Other countries": **credit or debit cards only** (American Express, Discover, Mastercard, Visa). Google lists no carrier billing (Alfa or Touch), PayPal or e-wallet for Lebanon. Lebanon is not a Google Play gift-card country, and gift cards bought elsewhere cannot be redeemed on a Lebanese Play account.

Virtual credit cards are explicitly unsupported, as are wire transfers and Western Union. Buyers are charged in local currency where Google supports it and "usually" in USD otherwise. I could not confirm Lebanon's buyer currency from a Google page.

### Cited Findings
- **Payment methods vary by country.** "Available payment methods vary by country. If your country is not listed, scroll down."
  - The country selector lists: Australia, Austria, Bahrain, Belgium, Brazil, Bulgaria, Cambodia, Canada, Chile, Colombia, Croatia, Cyprus, Czechia, Denmark, Egypt, Estonia, Finland, France, Georgia, Germany, Ghana, Greece, Hong Kong, Hungary, India, Indonesia, Iraq, Ireland, Israel, Italy, Japan, Kazakhstan, Kenya, Kuwait, Latvia, Lithuania, Luxembourg, Macau, Malaysia, Mexico, Morocco, Netherlands, New Zealand, Nigeria, Norway, Oman, Pakistan, Peru, Philippines, Poland, Portugal, Qatar, Romania, Saudi Arabia, Singapore, Slovakia, Slovenia, South Africa, South Korea, Spain, Sri Lanka, Sweden, Switzerland, Taiwan, Tanzania, Thailand, Turkiye, Ukraine, United Arab Emirates, United Kingdom, United States, Vietnam. **Lebanon is not listed.**
  - **"Other countries":** "If your country is not on the list, available payment methods are listed below: Credit or debit cards ... American Express, Discover, Mastercard, Visa. Note: The types of cards accepted through Google Play may vary. If your card doesn't work when you think it should, contact your bank or card issuer for help."
  - **Unsupported everywhere:** "Wire transfers, Western Union, Money Gram, Virtual Credit Cards (VCC), Health Savings Account (HSA), Transit cards, Any escrow type of payment."
  - **US view of the same page:** cards (incl. JCB), Google Pay balance, Google Play balance and gift cards, Cash App Pay, PayPal and Venmo. US Cellular carrier billing ended on 29 Jan 2026.
  - — [Google Play Help: Accepted payment methods on Google Play (answer 2651410)](https://support.google.com/googleplay/answer/2651410?hl=en) (n.d.; read 15 Nov 2026)
- **Gift cards: Lebanon not listed.** The countries where gift cards are available are: Australia, Austria, Belgium, Brazil, Canada, Colombia, Finland, France, Germany, Greece, Hong Kong, India, Indonesia, **Iraq**, Ireland, Italy, Japan, Malaysia, Mexico, Netherlands, New Zealand, Poland, Portugal, **Saudi Arabia**, Singapore, South Africa, South Korea, Spain, Switzerland, Thailand, Turkey, **United Arab Emirates**, United Kingdom, United States, Vietnam.
  - "Play gift cards may only be redeemed and used in the country and currency in which they were purchased. The country or region listed in your Google Play account must match the country or region where the gift card ... is offered."
  - "Play gift cards and other prepaid Play balance are not refundable or transferable unless required by law."
  - "Google Play gift cards are not eligible as a family payment method."
  - — [Google Play Help: About Google Play gift cards & where to buy them (answer 3422734)](https://support.google.com/googleplay/answer/3422734?hl=en) (n.d.; read 15 Nov 2026)
- **Worldwide method types.** Refund-timeline rows show what Google Play accepts across markets:
  - cards; mobile carrier billing (prepaid and postpaid); PayPal; Google Play balance;
  - online banking; UPI (India); cash and codes (e.g. Efecty and PSE in Colombia);
  - e-wallets: TrueMoney, LINE Pay, AliPayHK, Boost, Coins.ph, GCash, FPX, GoPay/OVO, KakaoPay, Payco, Mercado Pago, MoMo, Octopus, my paysafecard. — [Google Play Help: Refund timelines for Google Play purchases (answer 15576193)](https://support.google.com/googleplay/answer/15576193?hl=en) (n.d.; read 15 Nov 2026)
- **"Ask someone else to pay"** works only in Australia, Brazil, India, Indonesia, Japan, Mexico, New Zealand and the United States. The payer must be "in the same region as you". — [Google Play Help: Ask someone else to pay (answer 14551162)](https://support.google.com/googleplay/answer/14551162?hl=en) (n.d.; read 15 Nov 2026)
- **Currency.** "If possible, Google will charge you in the currency of your home country. Google gets this information from the home address that you added. If that isn't possible ... For those outside of the United States, this usually means being charged in U.S. dollars. ... You'll always see the currency you'll be charged in before you complete the transaction." — [Google Play Help: Understand currency conversions (answer 6220312)](https://support.google.com/googleplay/answer/6220312?hl=en) (n.d.; read 15 Nov 2026)
- **The developer-side currency table loads dynamically and could not be read** (Lebanon's buyer currency and price range). — [Play Console Help: Supported locations for distribution to Google Play users (answer 10532353)](https://support.google.com/googleplay/android-developer/answer/10532353?hl=en) (n.d.; read 15 Nov 2026)
- **Statement line and fees.**
  - "There are no fees for making purchases on Google services like Google Play".
  - Charges show as "GOOGLE*Seller's name".
  - "Depending on your location, your bank or card company might charge fees for international transactions."
  - Card-check authorizations "may stay in your account for 1-14 business days". — [Google Play Help: Fees, charges & authorizations (answer 6224192)](https://support.google.com/googleplay/answer/6224192?hl=en) (n.d.; read 15 Nov 2026)
- **Google's listed decline causes:** expired cards, a card address or ZIP that does not match the Google Payments address, insufficient funds. Otherwise "Contact your bank or card issuer". — [Google Play Help: Fix payment issues on your account (answer 1267137)](https://support.google.com/googleplay/answer/1267137?hl=en) (n.d.; read 15 Nov 2026)
- **Carrier billing tax and WHT.** Carrier-billed sales draw buyer-country withholding in Egypt (up to 20%), Kuwait (up to 5%), Myanmar and Sri Lanka (see earlier notes). Google's carrier-billing fees page says currency fluctuations, bank fees and taxes can raise the amount charged. — [Google Play Help: Additional taxes and fees for direct carrier billing (answer 6394130)](https://support.google.com/googleplay/answer/6394130?hl=en) (search summary)
- **(secondary)** A web search found no source showing Google Play carrier billing with Alfa or Touch. One list article (Beebom) names Lebanon without saying which method. — search of [Beebom: accepted payment methods list](https://beebom.com/accepted-payment-methods-google-play-store-ultimate-list/amp/) (search summary; unconfirmed)
- **(secondary) Lebanese cards and Google wallets.**
  - Google Pay (wallet) launched in Lebanon in June 2025 with Bank Audi and neo (Mastercard) and Whish (Visa) as the named issuers. — [Visa Middle East press release, 24 Jun 2025](https://km.visamiddleeast.com/en_KM/about-visa/newsroom/press-releases/prl-24062025.html); [beirut.com](https://www.beirut.com/en/?p=756459); [Google MENA blog post](https://blog.google/intl/en-mena/product-updates/android-chrome-and-play/google-pay-lebanon-oman/) (all search summaries; blog.google blocked in this session)
  - In one forum thread, a user with a USD card from a Lebanese bank reported "pay with card" greyed out and three cards declined through Google Pay. — [Navigraph forum](https://forum.navigraph.com/t/cant-purchase-a-subscription-pay-with-card-greyed-out/12828) (secondary, single anecdote, search summary)

### Inferences
- **Lebanese subscribers can effectively pay only with a Visa, Mastercard, Amex or Discover card** that the issuer lets make online, international, card-not-present payments. They have no carrier-billing, PayPal or gift-card fallback.
- **Virtual cards are excluded.** Google's "VCC" exclusion probably covers some app-issued virtual cards popular in Lebanon. Whether a given Lebanese card counts as a "virtual credit card" to Google is unclear.
- **Lost buyers.** Families without a working card cannot subscribe through Google Play at all. A relative abroad cannot gift Play balance into a Lebanese account (gift cards are country-locked), and "ask someone else to pay" is not offered in Lebanon.
- **Currency.** Lebanese users are most likely charged in USD (Google's stated fallback). They would then see their own bank's FX or card fees, not Google's. This is unconfirmed.

### Gaps
- **Buyer currency:** Lebanon's buyer currency and allowed price range on Google Play. The answer 10532353 table needs a JavaScript browser, or check Play Console > a subscription's regional prices.
- **Decline rates:** I found no Google or reliable source on decline rates for Lebanese-issued cards. The evidence is only anecdotal.
- **Carrier billing:** I found no Google statement that carrier billing will never come to Lebanon. Today it is simply not listed.

## 2. Refunds: who decides, the user's 48-hour window, developer-initiated refunds, effect on earnings

### Takeaway
- **Google's window:** Google handles user refund requests **within 48 hours** of purchase, deciding within 1–4 days. After 48 hours the user is sent to the developer.
- **Developer refunds:** the developer can issue full or partial refunds at any time in Play Console, either "refund and revoke" or "refund only". **Google returns its service fee on refunded amounts.**
- **Effect on payouts:** refunds come out of the next payout, and a balance that stays negative for 48 hours is **debited from the payout bank account**.
- **Partial refunds:** user-side partial subscription refunds exist only in Israel, France, Germany and New York.

### Cited Findings
- **User side.**
  - "Within 48 hours: You may be able to get a refund depending on the details of the purchase ... After 48 hours: Contact the developer ... The developer can help with purchase issues and can process refunds according to their policies and applicable laws."
  - "Google doesn't give refunds for most Google Play purchases. However, there are exceptions". — [Google Play Help: Apps, games & in-app purchases (including subscriptions) refund policies (answer 15574908)](https://support.google.com/googleplay/answer/15574908?hl=en) (n.d.; read 15 Nov 2026)
  - "Please allow 1–4 days for a refund decision." Unauthorized charges must be reported "within 120 days of the transaction". "Some information related to refund requests may be shared with developers." — [Google Play Help: Request a refund on Google Play (answer 15574897)](https://support.google.com/googleplay/answer/15574897?hl=en) (n.d.; read 15 Nov 2026)
  - "Partial refunds for subscriptions are not supported for users outside of Israel, France, Germany, and New York." — [Google Play Help: Partial refunds for subscriptions (answer 15576180)](https://support.google.com/googleplay/answer/15576180?hl=en) (n.d.; read 15 Nov 2026)
  - Card refunds take "3–5 business days ... sometimes takes up to 10 business days". — [answer 15576193](https://support.google.com/googleplay/answer/15576193?hl=en)
  - "When you uninstall the app, your subscription won't cancel." If the app is removed from Google Play, "your future subscription will be canceled". Prepaid plans expire on their own, and "If your prepaid plan hasn't been used, you can request a refund for it." — [Google Play Help: Cancel, pause, or change a subscription (answer 7018481)](https://support.google.com/googleplay/answer/7018481?hl=en) (n.d.; read 15 Nov 2026)
- **Developer side.**
  - "You can issue full or partial refunds for subscriptions".
  - "Refund and revoke: If you refund the most recent order in a subscription, the order is refunded, the user's subscription is removed immediately, and future recurrences are automatically canceled." "Refund only: If you refund an older order ... the subscription remains active."
  - Partial refunds: "the percentage of the refund also applies to your payout and service fee amounts".
  - "After you issue a refund, it can't be reversed. Google will return the service fee to you. You'll see the returned service fee on your next earnings report. If you refund an order before Google has issued a payout for that order, you won't receive the amount you refunded ... If you refund an order after you've received the payout for it, the amount you refund your buyer will be deducted from a future payout."
  - "If you issue a refund and your account balance becomes negative and remains negative for at least 48 hours, Google will collect funds from you in accordance with our Terms of Service and debit the bank account that normally receives your payouts."
  - **Google's own refunds:** Google may refund "as a courtesy to your users or as required by law ... as part of our Developer Distribution Agreement", including for unauthorized or accidental purchases.
  - **Account reviews:** "you will be temporarily unable to process refunds through your account". — [Play Console Help: Manage your app's orders and issue refunds (answer 2741495)](https://support.google.com/googleplay/android-developer/answer/2741495?hl=en) (n.d.; read 15 Nov 2026)
- **Automatic refund if not acknowledged:** "If you don't acknowledge a new subscription purchase within three days, the user automatically receives a refund, and Google Play revokes the purchase." — [Android Developers: Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions) (last updated 2026-10-15)
- **Payments policy FAQ:** "Can I offer my customers refunds directly? Yes." — [Play Console Help: Understanding Google Play's Payments policy (answer 10281818)](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) (n.d.; read 15 Nov 2026)

### Inferences
- **Who decides when:** Google decides refunds in the first 48 hours. After that the Lebanese developer decides, so the app needs a written refund policy and a support contact.
- **Refund cost:** a refund costs the developer the net amount only, because Google refunds its fee.
- **Negative balance:** with a Lebanese account paid by wire, how Google would actually "debit the bank account" is unclear. In practice a negative balance would probably be offset against later earnings. This is unconfirmed.
- **Backend:** the backend must acknowledge each purchase within 3 days, or Google refunds it automatically.

### Gaps
- Chargeback fees, if any, charged to developers are not stated on these pages.

## 3. Subscription lifecycle: renewals, failed payments (grace period, account hold, retries), pause, price changes, prepaid plans, free trials

### Takeaway
- **Recovery from a declined renewal:** Google retries the charge and prompts the user, first during a **grace period** (the user keeps access), then during **account hold** (no access). By default the two together last **60 days**; account hold is 60 days minus the grace period. Any custom setting must total at least 30 days.
- **Pause:** users can pause for 1 week to 3 months. Annual plans and free trials cannot be paused.
- **Price increases:** opt-in by default; users who do not accept are cancelled. Opt-out increases are allowed in listed countries, **including Lebanon (30-day notice)**: at most once per 365 days per region, capped at the greater of +50% or US$0.17/day.
- **Free trials:** 3 days to 3 years.
- **Prepaid plans:** do not auto-renew.

### Cited Findings
- **Recovery period.** "If a renewal charge is declined, Google will prompt the user to fix the payment issue and periodically retry the renewal charge. By default, this recovery period consists of a grace period, followed by an account hold period."
  - "By default, all auto-renewing base plans have account hold enabled and the lengths are automatically calculated. The calculation will be 60 days minus any grace period duration ... The total of account hold and grace period durations must total 30 days or more."
  - "If the account hold period ends with the payment issue unresolved, the subscription is automatically expired."
  - Pause: "between one week and three months ... Note that annual subscriptions and free trials cannot be paused." — [Play Console Help: Understanding subscriptions (answer 12154973)](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en) (n.d.; read 15 Nov 2026)
- **Grace period, account hold, retries.**
  - "By default, all auto-renewing base plans have grace period enabled."
  - "Google notifies the user and periodically attempts to renew".
  - "As soon as the user fixes their payment method, the subscription renews with its original renewal date".
  - "You can set a grace period of 0 days, but Play will wait a minimum of 1 day to ensure sufficient time for payment retries."
  - "Before a subscription enters into account hold, Google Play makes additional attempts to charge the payment method for up to 48 hours. The user retains subscription benefits during this period."
  - "When a subscription recovers from account hold, the renewal date resets."
  - "The subscription enters into account hold directly when the subscription resumes from a paused state with a failed form of payment."
  - Revocation happens on developer revoke or "the purchase being charged back".
  - "Don't remove access to a subscription from Google Play while the user is still entitled to the content." — [Android Developers: Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions) (last updated 2026-10-15)
- **Pause default: conflicting wording.**
  - The developer doc says "All subscriptions have pause enabled by default. You can disable pause". Pause lengths: weekly plans 1–4 weeks; monthly, 3-month, 6-month and annual plans 1–3 months, "*Subject to change at any time." — [Subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions)
  - Play Console Help describes pause as something you enable. It says annual plans cannot be paused. — [answer 12154973](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en); [answer 140504](https://support.google.com/googleplay/android-developer/answer/140504?hl=en) (n.d.; read 15 Nov 2026)
- **Base plan types.**
  - "Auto-renewing: Automatically renews unless canceled by the user."
  - "Prepaid: Users will need to make a manual payment to extend their plan."
  - "Installments ... only available ... in Brazil, France, Italy, and Spain."
  - Free trials "must be between 3 days and 3 years".
  - Don't name a subscription "Free Trial".
  - Apps "must clearly disclose how a user can manage or cancel their subscription" and include "an easy-to-use, online method to cancel".
  - Deactivating a base plan "does not affect existing subscriptions, and auto-renewals continue until they are cancelled". — [Play Console Help: Create and manage subscriptions (answer 140504)](https://support.google.com/googleplay/android-developer/answer/140504?hl=en) (n.d.; read 15 Nov 2026)
- **Price changes (developer doc).**
  - "By default, price increases are opt-in changes for existing subscribers. Users must explicitly accept the higher price before it is first charged, or Google Play automatically cancels their subscription."
  - "advance notification period of 37 days. Starting 30 days before this charge, Play notifies existing subscribers". Developers get 7 days to notify subscribers first.
  - Opt-out increases: "This period varies by country and is either 30 days or 60 days ... only available in certain locations with limits on the increase amount and frequency".
  - "Payment authorization may be placed up to 48 hours before the start of a user's next renewal period" (up to 5 days in India and Brazil).
  - Price decreases apply at the next renewal and users are emailed. — [Android Developers: Change subscription prices](https://developer.android.com/google/play/billing/price-changes) (last updated 2026-11-13)
- **Opt-out criteria (Console).**
  - "only to developers in good standing".
  - "Each subscription base plan can only have a single opt-out price increase per country/region in the last 365 days."
  - Maximum: "the greater of: 50% of the price the user is currently paying; or 17 USD cents per day".
  - The developer must certify a "prominent, in-app notice" at least 30 days before the increase, giving the subscription name, current and new price, effective date and how to cancel. — [answer 12154973](https://support.google.com/googleplay/android-developer/answer/12154973?hl=en)
- **Lebanon and opt-out.** The opt-out country table includes "Lebanon | LB | 30". Only South Africa and Zimbabwe show 60 days. — [Play Console Help: Supported countries/regions and advance notice periods for opt-out pricing (answer 13542779)](https://support.google.com/googleplay/android-developer/answer/13542779?hl=en) (n.d.; read 15 Nov 2026)

### Inferences
- **Renewals:** a Lebanese subscriber whose card fails at renewal keeps access during the grace period. They lose it during account hold. By default, Google expires the subscription about 60 days after the first decline.
- **Configuration:** Google's own pages say shortening the windows reduces recoveries. That matters given the card-only, decline-prone payment base in Lebanon.
- **Price rises:** for Lebanese (and most) buyers, prices can be raised on an opt-out basis with 30 days' notice and an in-app notice, within the 50% / US$0.17-per-day cap. Otherwise each subscriber must opt in.

### Gaps
- **Default grace period:** the default length in days was not stated on the pages read. Check it in Play Console.
- **Pause default:** the conflict on whether pause is on by default (developer doc) or must be enabled (Console Help) is unresolved.
- **Retry schedule:** the exact retry timing within grace and hold is not published.

## 4. What Google's rules allow outside Google Play Billing (user choice, alternative billing, external offers/links, billing choice), which user countries qualify as of Nov 2026, whether a Lebanon-based developer can use them, and web-sold subscriptions

### Takeaway
- **Default rule:** subscriptions sold inside a Play app must use Google Play Billing, and the app may not steer users to another payment method.
- **Exceptions are keyed to the user's country**, not the developer's. As of 15 Nov 2026 they cover:
  - the **EEA and UK** (from 30 Jun 2026) and **Australia and Japan** (from 30 Sep 2026): the new "billing choice" program;
  - the **US**: court-ordered alternative billing and external content links programs;
  - the **EEA**: older DMA programs, plus user-choice-billing pilots in Brazil, Indonesia, South Africa, South Korea and India; Japan's external payments program is closing.
- **Lebanon and the rest of the world** get the changes "by September 30, 2027".
- **Lebanon-based developers can join:** Google says billing choice is "available to all developers globally" who serve UK/EEA users. The billing choice and US pages list no business-registration requirement. The EEA DMA programs, the user choice billing pilot and Japan's external payments program **require a registered business**.
- **Fees still apply** under every program (10% on auto-renewing subscriptions, with no 5% billing fee). Transactions must be reported within 24 hours.
- **Web-sold subscriptions:** a subscription sold on the developer's own website may unlock a **consumption-only** Android app anywhere, including Lebanon. The app must sell nothing itself and must not link to the purchase. Outside the programs it may only use plain wording such as "Go to our website to upgrade".

### Cited Findings
- **Payments policy.**
  - In-app purchases "must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies". This includes "subscription services (such as fitness, game, dating, education...)".
  - "Other than the conditions described in Section 3, Section 8, and Section 9, apps may not lead users to a payment method other than Google Play's billing system", including via the store listing, in-app promotions, "webviews, buttons, links, messaging", and sign-up flows.
  - "Developers serving users in eligible countries/regions may offer users an alternative billing system within the app if they enroll in the applicable program". "Developers may lead users in eligible countries/regions outside the app subject to program requirements".
  - "In-app pricing must match the pricing displayed in the user-facing Play billing interface." — [Play Console Help: Payments policy (answer 9858738)](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) (n.d.; read 15 Nov 2026)
- **Payments policy FAQ.**
  - **Communicating outside the app:** "Outside of your app, you are free to communicate with your users about alternative purchase options. You can use email marketing and other channels outside of the app to provide subscription offers and even special pricing." "Within an app, developers may not lead users to a payment method other than Google Play's billing system unless Section 3, 8, or 9 ... applies. This includes directly linking to a webpage that could lead to an alternate payment method or using language that encourages a user to purchase the digital item outside of the app."
  - **Consumption-only wording:** "For services and products that are consumption only (apps that do not enable users to purchase access to digital goods or services from within the app), developers may choose to provide additional information about purchasing options without direct links, including using language like: ... 'Go to our website to upgrade your subscription to Premium'".
  - **Reader apps:** "Can I offer a consumption-only (reader) app on Google Play? Yes. Google Play allows any app to be consumption-only, even if it is part of a paid service. For example, a user could log in when the app opens and access content paid for somewhere else. ... consumption-only means that any product(s) or service(s), whether digital or physical, cannot be purchased from within the app."
  - **No parity rule:** "We do not require parity across platforms." Other Android stores and direct website distribution may be used "all without using Google Play's billing system".
  - **US:** "While the U.S. District Court's order remains in effect, developers may offer users in the U.S. additional alternative billing options or lead users in the U.S. to external content outside of the app if they are enrolled in the appropriate program(s)".
  - **Exempt purchases:** purchases of services "that can only be consumed outside of a Play-distributed app and cannot be accessed in a Play-distributed app do not require Google Play's billing system"; regulated clinical services must not use Play billing. — [Play Console Help: Understanding Google Play's Payments policy (answer 10281818)](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) (n.d.; read 15 Nov 2026)
- **Billing choice program (new in 2026).**
  - Lets the developer "integrate your own billing system or guide users to your website for purchases using external web links". Users "should be given a choice between Google Play Billing and either alternative billing within the app or external web links".
  - **User markets:** Australia (30 Sep 2026), Japan (30 Sep 2026), United Kingdom (30 Jun 2026), EEA (30 Jun 2026; the existing EEA programs remain). The United States is "N/A", handled by the "Existing alternative billing in the United States" and "Existing external content links program".
  - **Requirements:** PCI-DSS; customer support and a dispute process; refunds "unless the user was clearly informed that the transaction is non-refundable"; links for order history and subscription management; external links "Can only direct users to your owned offers"; "Report to Google Play all authorized transactions from users within 24 hours using billing choice APIs".
  - **Fees for auto-renewing subscriptions:** 10% under every row, for both alternative billing and purchases made within 24 hours of an external web link.
  - **Eligibility:** "your app must be an app or game on the mobile or tablet form factors in available markets". No business-registration condition is listed. "This is an opt-in program."
  - **US programs:** "there are no changes to the US programs at this time". — [Play Console Help: Enrolling in the billing choice program (answer 17161464)](https://support.google.com/googleplay/android-developer/answer/17161464?hl=en) (n.d.; read 15 Nov 2026)
- **Who can use billing choice:** "the new billing choice program is available to all developers globally who provide digital services or content to users within the United Kingdom and the European Economic Area, alongside programs in the United States. Following this initial phase, we will continue expanding availability to additional markets." "For transactions processed via alternative billing or external web links, the billing fee does not apply." — [Android Developers Blog: Expanded billing choice and lower fees on Google Play (24 Jun 2026)](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play) (read 15 Nov 2026)
- **4 Mar 2026 (Epic settlement post).** "Mobile developers will have the option to use their own billing systems in their app alongside Google Play's billing, or they can guide users outside of their app to their own websites for purchases." "By September 30, 2027: The updates will reach the rest of the world." "With these updates, we have also resolved our disputes worldwide with Epic Games." — [Android Developers Blog: A new era for choice and openness (4 Mar 2026)](https://developer.android.com/blog/posts/a-new-era-for-choice-and-openness) (read 15 Nov 2026)
- **US alternative billing.**
  - "As part of our compliance with the US District Court's order, we allow developers ... offering their users in the United States an alternative billing system, in lieu of or alongside Google Play Billing."
  - "Per the July 22, 2026 update, developers enrolled in this program must report transactions and successful downloads, as well as pay the relevant Play service fee, starting October 1, 2026."
  - Auto-renewing subscriptions: 10%.
  - Eligibility: "an app or game on the mobile or tablet form factors offering alternative billing to users in the United States and its territories". No business requirement is listed.
  - "Google reserves the right to modify or terminate this program ... as a result of any changes to or termination of the US District Court's order." — [Play Console Help: Offering an alternative billing system for users in the United States (answer 16497028)](https://support.google.com/googleplay/android-developer/answer/16497028?hl=en) (n.d.; read 15 Nov 2026)
- **US external content links.**
  - Links US users "to external content, including to purchase in-app digital items ... in lieu of or alongside Google Play Billing".
  - Fees "starting October 1, 2026". "The deadline to report successful downloads and pay the relevant Play service fee is now February 1, 2027."
  - Recurring subscriptions: 10% on transactions within 24 hours of a link. App-download links: "Games: $3.65, Apps: $2.85" per install.
  - Links must be limited to US users.
  - Eligibility: "a mobile or tablet app or game serving users in the United States". — [Play Console Help: Enrolling in the external content links program for users in the US (answer 16470497)](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en) (n.d.; read 15 Nov 2026)
- **EEA programs (DMA) that need a registered business.**
  - **External offers program:** "Developer must be registered as a business." "Your app must not target only children." Fees effective 4 Jun 2026: links to auto-renewing subscriptions 10%; app download events €1.20 per install. — [Play Console Help: Enroll your app in the external offers program (answer 14372887)](https://support.google.com/googleplay/android-developer/answer/14372887?hl=en) (n.d.; read 15 Nov 2026)
  - **EEA alternative billing without user choice:** "Developer must be registered as a business." — [Play Console Help: Offering an alternative billing system for users in the EEA (answer 12348241)](https://support.google.com/googleplay/android-developer/answer/12348241?hl=en) (n.d.; read 15 Nov 2026)
  - **User choice billing pilot:** "Developer must be registered as a business." — [Play Console Help: Enrolling in the user choice billing pilot (answer 12570971)](https://support.google.com/googleplay/android-developer/answer/12570971?hl=en) (n.d.; read 15 Nov 2026)
- **User choice billing overview.**
  - **Countries:** Australia, Brazil, Indonesia, Japan, South Africa, UK and the EEA; separate programs for South Korea, India and the US.
  - **Eligible apps:** outside the EEA and Japan, only "A non-gaming mobile or tablet app".
  - **Fees:** in AU, EEA, JP and UK, 10% on recurring transactions paid through alternative billing. In Brazil, Indonesia and South Africa the fee is "Reduced by 4%". South Korea and India: "Reduced by 4%".
  - Alternative billing APIs are mandatory. Enrolment is under Play Console > Monetization settings > Alternative billing. — [Play Console Help: Understanding user choice billing on Google Play (answer 13821247)](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en) (n.d.; read 15 Nov 2026)
- **Japan external payments program.** "Starting September 30, 2026, the external payments program in Japan is no longer accepting new enrollments and will be discontinued after March 31, 2027." "Developer must be registered as a business." — [Play Console Help: Enrolling in the external payments program (answer 16787536)](https://support.google.com/googleplay/android-developer/answer/16787536?hl=en) (n.d.; read 15 Nov 2026)
- **Paying fees on outside-Play sales.** Service fees on such sales are billed through "Invoices for payments outside Google Play Billing" (Play Console > Monetization settings). — [answer 14372887](https://support.google.com/googleplay/android-developer/answer/14372887?hl=en); onboarding may require "set up a payment profile as required" ([answer 13821247](https://support.google.com/googleplay/android-developer/answer/13821247?hl=en))
- **User-facing country list for alternative billing:** "EEA countries, Australia, Brazil, India, Indonesia, Japan, South Africa, South Korea, United States, United Kingdom". Under an alternative system, users "can't use your Play balance or Play gift cards", and Play subscription management does not apply. — [Google Play Help: Learn about Google Play & alternative billing systems (answer 11174377)](https://support.google.com/googleplay/answer/11174377?hl=en) (n.d.; read 15 Nov 2026)
- **(secondary, payment processor)** Stripe's "global availability" page, fetched 15 Nov 2026, lists the UAE, Bulgaria and Thailand but has **no "Lebanon"** (nor Jordan or Egypt). — [Stripe: Global availability](https://stripe.com/global) (read 15 Nov 2026)

### Inferences
- **Buyers in Lebanon:** every in-app subscription sale to a Lebanese user must go through Google Play Billing until the rest-of-world rollout (due by 30 Sep 2027). No in-app link to a web checkout is allowed for those users. The developer may still email or message them outside the app about web offers.
- **Buyers in the UK, EEA, Australia, Japan and the US:** a Lebanon-resident individual can probably enrol in billing choice (UK/EEA/AU/JP) and the US programs, since no business requirement is listed. That would cut Google's take on subscriptions from 15% (10% + 5% billing fee) to 10%. The price is building:
  - their own checkout, refunds and support, the 24-hour reporting integration and PCI-DSS compliance;
  - being merchant of record for tax on those sales: the earlier notes show Google remits EU/UK VAT only for Play Billing purchases.
- **Web route for buyers anywhere:** a consumption-only Android app (sign in, use content bought on the web) is allowed everywhere, Lebanon included, with no Google fee. But then the Android app can sell nothing: neither Play Billing nor web.
- **Processor for the web route:** the developer needs a card processor that onboards a Lebanon-resident individual. Stripe does not list Lebanon, so a merchant-of-record reseller or a foreign entity would be needed. That is outside Google's pages and should be checked by the payments-provider workstream.
- **Rights the developer keeps on Play:** Google does not require price parity, so a lower web price is allowed. It just cannot be advertised inside a Play-billing app to users outside the program countries.

### Gaps
- **Business requirement:** whether the billing choice program or the US programs reject **personal (individual) developer accounts** in practice. The pages list no business requirement, but the program Terms of Service were not read.
- **Payment of fees:** how the program service fees are paid by a developer whose payouts go by wire to Lebanon. The pages say invoices; whether they are netted against Play payouts is not stated.
- **Next markets:** billing-choice dates and fees for Türkiye, South Korea, South Africa and rest-of-world markets other than the 30 Sep 2027 headline.
- **Personal-account eligibility, generally:** I found no Google statement on whether personal accounts may enrol in the programs.

## 5. Payout into a Lebanese bank account: payments profile, verification, bank fields, currency, timing, threshold, fees, failed or returned wires, holds, where to see payouts

### Takeaway
- **Method:** Lebanese merchants are paid **by USD wire from the United States** into a bank account **in Lebanon** (same country as the payments profile).
- **Bank fields:** account holder name exactly as on the bank statement (max 60 characters), bank name, SWIFT-BIC, IBAN, plus optional intermediary bank and "For further credit" details.
- **No test deposit (CORRECTION):** wire-payout countries **get no test deposit or bank verification**, so details must be exactly right. The earlier note suggested a test deposit.
- **Timing:** payouts start around the **15th** for the previous month's net earnings. The minimum is **US$100** (the threshold can be raised), and balances below it roll over.
- **Fees:** wire fees are set by the receiving and intermediary banks (US$0–50+). Google states no fee of its own.
- **Holds:** identity reviews can hold payouts **up to 35 days**. Failing verification means no payouts and an obligation to refund unpaid orders.
- **Escheatment:** unclaimed balances of non-US residents can be **escheated to Delaware**.

### Cited Findings
- **Payments profile.**
  - Created at Play Console > Manage account > Play apps settings > Monetization settings > Payments profile.
  - "Enter the legal name of your business as you want it to appear on your payments profile. This info is shown to your customers and on your receipts."
  - Address: "legal business address as it appears on official documents ... We don't allow you to use a PO box address. Later, you'll need to make sure that your bank account is registered in the same country listed in your payments profile."
  - Public info: business website, product category, customer support email, and the name on users' card statements.
  - "Tip: You can't change your business location country". — [Play Console Help: Create a payments profile (answer 7161426)](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en) (n.d.; read 15 Nov 2026)
- **Bank account rules.**
  - The account must be "Able to receive Electronic Funds Transfer (EFT) / Wire Transfer", "In the same country or region where the merchant account is registered", and "Denominated in country's currency (EFT) or USD (Wire transfer)".
  - Path: Payments profile > "How you get paid" > Choose payment method > Add Payment Method. You "might be asked to re-authenticate". "Enter your Bank account holder name exactly as it appears on your bank statement." Account type: "checking, savings, or business".
  - "Important: Bank account verification is only applicable to EFT countries." "Google will never ask for your account info via email."
  - **Lebanon section:** "Merchants in Lebanon receive payments via wire transfer from the United States. Payouts will arrive in US Dollars. Due to the complicated nature of international wire transfers, it's important you work with your bank to find the correct details needed to successfully accept these payments." The fields are:
    - Account holder name (max 60 characters)
    - Bank name (max 70)
    - SWIFT-BIC ("8 or 11 characters: 4 letter bank code, 2 letter country code, 2 letter location code, 3 letter branch code (optional)")
    - IBAN ("a country code, 2 numbers, and up to 30 alphanumeric characters")
    - "Intermediary bank details (optional): If your bank provides intermediary instructions for receiving wires from the United States, provide those here": intermediary bank name (max 70) and intermediary SWIFT-BIC
    - "For further credit details (optional): If your bank required For Further Credit (FFC) or For Benefit Of (FBO) instructions ... This may be an account number OR account name on file with your bank." — [Play Console Help: Enter merchant bank account information (answer 7161440)](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en) (n.d.; read 15 Nov 2026)
- **No test deposit for wires (CORRECTION of earlier §7).** "If you get merchant payouts from Google through wire transfers, a test deposit will not be sent. It's critical you enter your bank account details correctly." The list of affected countries covers the wire-payout countries. For EFT countries the test deposit is "less than US$1.00" and labelled "Google Deposit [your chosen credit card statement name]". To set the payout account, mark it "Primary". — [Play Console Help: Verify bank account (answer 7161378)](https://support.google.com/googleplay/android-developer/answer/7161378?hl=en) (n.d.; read 15 Nov 2026)
- **Wire payouts.**
  - Lebanon is on the list of locations paid by wire.
  - "Your earned balance must meet the minimum payout amount of US$100 ... Unless otherwise indicated in your account, there is no maximum payout amount."
  - "Google issues wire transfer payouts in USD, though your financial institution may exchange these funds to your local currency ... If your financial institution offers you the ability to open accounts in USD, this option is preferred."
  - "Fees for wire transfers are determined by your financial institution and may range from US$0 to US$50 or more." — [Play Console Help: Wire transfer payouts (answer 2700656)](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en) (n.d.; read 15 Nov 2026)
- **Threshold.**
  - Payments Center: "You'll get monthly payouts in U.S. Dollars through a wire transfer to your bank account."
  - "If you get your merchant payouts by wire transfer, we recommend you set the threshold to a minimum of $100 because wire transfer fees can exceed $50 or more."
  - The merchant can change the payout threshold. The Play Console page above treats US$100 as the floor. — [Payments Center Help: Change merchant payout threshold and account nickname (answer 7163445)](https://support.google.com/paymentscenter/answer/7163445?hl=en) (n.d.; read 15 Nov 2026)
- **Schedule.**
  - "Any orders processed, refunded, or charged-back from the 1st of a given month to the end of the month will get paid out around the 15th of the following month."
  - "Google doesn't initiate deposits on weekends or banking holidays."
  - The Payments profile page "is not updated in real time and will update within 24 hours of a payout".
  - Minimums: "local-currency payouts: US$1; USD wire-transfer payouts: US$100". — [Play Console Help: Order processing and payouts (answer 137997)](https://support.google.com/googleplay/android-developer/answer/137997?hl=en) (n.d.; read 15 Nov 2026)
  - "We start payouts for Google Play Developers each month on the 15th for the previous month's sales". Previously withheld payouts follow a separate "account cleared on" schedule, and "your payouts schedule may vary for different billing accounts". — [Payments Center Help: Merchant payout schedule (answer 7159355)](https://support.google.com/paymentscenter/answer/7159355?hl=en) (n.d.; read 15 Nov 2026)
- **Failed or late payouts and escheatment.**
  - Merchants get emails when "Merchant payouts (EFT, Wire, etc.) fail".
  - For a missing payout: "Merchant payouts that we make by wire transfer may be delayed. Check with your bank ... Payments could take up to 5 business days (longer in some countries) to settle". Check the threshold and the bank account; "If you still need help with a payout, contact us".
  - Test-deposit failure causes, which apply only by analogy to wires: "'Account holder name' was not EXACTLY the same as the name on your bank account"; "Your bank isn't located in the same country you entered in your payments profile"; a closed account; wrong codes; codes changed after a bank merger.
  - **Escheatment:** "Companies in the US are obliged to give assets they believe are abandoned to the US state governments ... If you reside outside the US, then the state of Delaware, our state of incorporation, is the appropriate state government. If your balance has already been escheated ... you can apply to your state government unclaimed property office". — [Play Console Help: Frequently asked questions (answer 7161649)](https://support.google.com/googleplay/android-developer/answer/7161649?hl=en) (n.d.; read 15 Nov 2026)
  - **Timing conflict:** a Payments Center page reportedly says wire funds take "5–7 business days". The Play Console FAQ (read directly) says "up to 5 business days (longer in some countries)". — [Payments Center FAQ (answer 7161649, en-GB)](https://support.google.com/paymentscenter/answer/7161649?hl=en-GB) (search summary)
- **Holds.**
  - "If some or all of your payouts from Google are withheld, you won't receive your payouts until Google completes its review ... Disbursements may be on hold for up to 35 days."
  - "If unusual activity is found on your account, Google may require you to provide more information."
  - "If you don't provide the requested information ... you won't receive future merchant payouts and your merchant billing account will remain closed ... If you are a Play Developer, you should refund all orders that you haven't received merchant payouts for."
  - Documents may include "Details of recent activity" and a "Government-issued ID". If the ID address differs from the profile, proof of address is needed ("bank statement, or other proof of name and address").
  - "Make sure your address on file with Google payments matches the full billing address associated with your payment method."
  - "use one merchant ID instead of creating new merchant IDs". — [Payments Center Help: Merchant disbursement verification & payouts on hold (answer 11595946)](https://support.google.com/paymentscenter/answer/11595946?hl=en) (n.d.; read 15 Nov 2026)
- **Identity verification.**
  - "To receive payments from Google, you must complete the identity verification ... after you set up your profile, you'll receive an email from Google with steps."
  - Documents: ID; proof of address (bank statement, credit-card bill with the first 12 digits blacked out, utility bill); business licence. "On all the documents you submit, include your Merchant ID."
  - "typically takes 2–3 business days"; held payouts are released "within 3–5 business days" after verification, as "a one-time, out-of-band payment".
  - Country-specific rules are named only for India (BillDesk), Israel and the EU. Lebanon has none. — [Payments Center Help: Merchant identity verification for payments (answer 7159033)](https://support.google.com/paymentscenter/answer/7159033?hl=en) (n.d.; read 15 Nov 2026)
- **Where to see money.**
  - Play Console > Payments profile ("How you get paid") and Google payments center alerts. — [answers 7161440](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en), [11595946](https://support.google.com/paymentscenter/answer/11595946?hl=en)
  - Monthly earnings reports give per-transaction charges, fees, taxes and refunds (see earlier notes).
- **Registration country.** "If you're legally able to do business in a supported country and agree to that country's Google Payments Terms of Service, you can register as a merchant for that country." Changing currency or country means a new Play Console account and an app transfer. — [Play Console Help: Account, registration, and payment issues (answer 9023898)](https://support.google.com/googleplay/android-developer/answer/9023898?hl=en) (n.d.; read 15 Nov 2026)
- **(secondary) Tracing a stalled wire.** A 2024 community thread advises tracing a SWIFT wire stuck at an intermediary bank with the payout's wire reference. I found no Google Play page naming a UETR or wire trace report. AdSense's wire FAQ (another product) says Google can supply a SWIFT copy for the bank to trace. — [Reddit r/androiddev thread, Jun 2024](https://redlib.ssps.io/r/androiddev/comments/1d9c6wb/help_needed_google_play_developer_earnings_not) (secondary, search summary); [AdSense Help: Wire transfer FAQ](https://support.google.com/adsense/answer/6025222?hl=en) (search summary, different product)

### Inferences
- **Bank account:** for Bank Audi (or any Lebanese bank), use a **USD-denominated account in the developer's own name** that accepts incoming international ("fresh") USD wires. Get from the bank, in writing:
  - its SWIFT-BIC and the account's IBAN;
  - any **US correspondent or intermediary bank** and FFC instructions, entered in Google's optional fields;
  - its tariff for incoming SWIFT transfers.
- **Why exactness matters:** there is no test deposit, so a typo shows up only when the first real wire fails. Google then sends a "payout failed" email. The amount appears to stay with Google until the details are fixed; Google's pages do not say whether or when it retries (see Gaps).
- **Net received:** gross earnings minus Google's fee and withholdings (earlier notes), minus intermediary and receiving-bank charges taken from the USD wire. At low volume, raising the threshold above US$100 cuts the number of wires and their fees.
- **Payout dates:** a sale in month M is paid from about the 15th of M+1. Allow several business days for SWIFT, and more if an intermediary is involved. Refunds and chargebacks in month M are netted against that payout.
- **Unclaimed money:** if payouts keep failing and the balance is treated as abandoned, it could be escheated to Delaware. Fix failed payouts promptly.

### Gaps
- **Returned wires:** Google's procedure for a wire that a Lebanese bank rejects or returns (time to re-credit, retries, any return fee) is not described on the pages read.
- **Account in own name:** no page explicitly requires the account to be in the developer's own name. It only says "exactly as it appears on your bank statement". The holds page's ID and address matching implies it.
- **Bank Audi specifics:** Bank Audi's incoming-wire fees, correspondent bank, and handling of Google wires ("fresh" vs "local" USD) were not researched here. They need the bank or the Lebanon-banking workstream.
- **Wire evidence:** Google does not say whether it provides a SWIFT MT103 or UETR to Play developers on request.

## 6. Paying the US$25 registration fee from Lebanon

### Takeaway
- **The fee:** US$25, one-time, by card through Google Pay.
- **Accepted cards:** Mastercard, Visa, American Express, Visa Electron (outside the US); Discover only in the US. **Prepaid cards are refused**, and acceptance "varies by location".
- **Card and ID:** Google may ask for a **government ID and a credit card in the developer's legal name**. If they are judged invalid, the fee is not refunded.
- **Lebanon:** I found no Google statement specific to Lebanon. Declines are handled by trying another card or billing address.

### Cited Findings
- **Get started page:** "There is a US$25 one-time registration fee. You can pay this fee using any of the following credit or debit cards: Mastercard, Visa, American Express, Discover (US locations only) ... Note: Google Play does not accept prepaid cards. Card acceptance varies by location." "To process your request for a Play Developer account you may be asked for a valid government ID and a credit card, both under your legal name. If this information is determined to be invalid, your registration fee will not be refunded." — [Play Console Help: Get started with Play Console (answer 6112435)](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) (n.d.; read 15 Nov 2026)
- **Payment methods page:** "You can pay for your Google developer account registration through GPay ... Mastercard, Visa, American Express, Discover (United States only), Visa Electron (outside of the United States). Note: Prepaid cards are not accepted." "our support team is unable to provide registration receipts or invoices". — [Play Console Help: Developer account registration payment methods and receipts (answer 9875040)](https://support.google.com/googleplay/android-developer/answer/9875040?hl=en) (n.d.; read 15 Nov 2026)
- **Declines and processing.** "During registration, if you see a message that your payment has been declined, you may need to update your payments profile with a different payment method or billing address." "If it hasn't been 48 hours since you registered ... allow more time for your payment to be processed". — [Play Console Help: Account, registration, and payment issues (answer 9023898)](https://support.google.com/googleplay/android-developer/answer/9023898?hl=en) (n.d.; read 15 Nov 2026)
- **(secondary) Common causes:** online or international payments disabled on the card, an unsupported card type, or a billing-name or address mismatch. Several user reports of countries where "all cards" were refused; none specific to Lebanon. — [Reddit r/android_devs, Mar 2025](https://reddit.birdcat.cafe/r/android_devs/comments/1jd5qpi/play_store_is_declining_my_cards); [Kodular community](https://community.kodular.io/t/problem-payment-registration-fee-for-the-play-console/182955) (secondary, search summaries)

### Inferences
- **Which card:** pay with a non-prepaid Visa or Mastercard **in the developer's own legal name** with international e-commerce enabled. The name should match the payments profile and the ID used for developer verification.
- **Prepaid risk:** many Lebanese "fresh dollar" debit cards or app-issued cards may be classed as prepaid or virtual and refused. This is not confirmed.
- **Borrowed cards:** a relative's card abroad would clash with the "card under your legal name" check.

### Gaps
- I found no Google or reliable statement on how often Lebanese-issued cards are declined for the registration fee.
- I found no information on whether Google screens Lebanese BINs differently.
