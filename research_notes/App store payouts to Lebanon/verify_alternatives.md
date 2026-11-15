# Verification of `alternatives.md` against the providers' own pages (individual developer resident in Lebanon, 15 Nov 2026)

> **Method.** Each page was fetched with curl through the session proxy on **15 Nov 2026** and read in full: the raw HTML, Stripe docs' `.md` versions, the `?format=json` article data on support.stripe.com, and PayPal's embedded country JSON. Most pages show **no publication or update date**. "No date shown" therefore means the page is current as of 15 Nov 2026. Labels: **VERIFIED** = an official page read today confirms the earlier claim. **CORRECTED** = an official page read today contradicts it. **STILL UNCONFIRMED** = no official page settles it. Downloads: `/tmp/claude-0/-home-user-APP/42e6514f-ba20-5a91-9af7-1d03da6fa010/scratchpad/dl1/`.
>
> **Biggest changes to the earlier notes:**
> 1. **Lemon Squeezy does *not* list Lebanon for bank payouts.** Lebanon is on its list of countries whose **customers it refuses**.
> 2. **PayPal has no Lebanon market at all.**
> 3. Together, 1 and 2 mean **Lemon Squeezy is not usable** by a Lebanon-resident seller.
> 4. **Paddle is the only merchant of record (MoR) left.** It does not exclude Lebanon and accepts individuals.
> 5. RevenueCat + Paddle Web Purchase Links are **no longer "invite only"**.

## Stripe: accounts, Managed Payments, Atlas

### Takeaway
Lebanon is **not** a Stripe account country, and **not** a Stripe Managed Payments (SMP) business location. Stripe Atlas says founders can use it "from anywhere in the world" and does not name Lebanon as excluded. But a company whose address or representative is in Lebanon **cannot get any Stripe Treasury account**: the stablecoin account excludes Lebanon, and the USD account needs a US physical address.

### Cited Findings
- **VERIFIED: Lebanon is not a supported Stripe country.** The page says: "Stripe is currently supported in the following countries/regions…" The list has 46 entries: the EU/EEA, UK, CH, US, CA, MX, BR, AU, NZ, JP, HK, SG, MY, TH, ID (preview), IN (preview), **United Arab Emirates**, and GH/KE/NG/CI/ZA (extended network). It has **no Lebanon**. For businesses outside the list, Stripe offers "Stripe Treasury with stablecoins … Payments not supported yet." No date shown. — [Stripe global availability](https://stripe.com/global)
- **VERIFIED (new detail): Lebanon is not on Stripe's stablecoin-Treasury country list either.** That list has US + 101 others, among them JO, OM, QA, SA and TR. — [Stripe Docs: Stablecoin financial accounts](https://docs.stripe.com/treasury/stablecoins) (no date shown)
- **VERIFIED: SMP does not support Lebanon.** "Geographic eligibility: Your business must be based in one of the supported business locations."
  - The supported locations are CA and US; AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB, GR, HR, HU, IE, IT, LI, LT, LU, LV, MT, NL, NO, PL, PT, RO, SE, SI, SK; and AU, HK, JP, SG.
  - There is no LB, and also **no AE**. Access also needs "an eligibility review that considers factors such as business type and geography."
  - No date shown. — [Stripe Docs: Managed Payments eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)
- **CORRECTED (SMP pricing, the earlier notes were inconsistent):** "Managed Payments adds **3.5% per successful transaction** to your standard Stripe processing fees." The 5% + 50¢ variant is wrong. — [stripe.com/managed-payments](https://stripe.com/managed-payments) (no date shown)
- **VERIFIED: the Atlas Treasury exclusions, with more detail than before.**
  - Stablecoin Treasury accounts "aren't available if the address country provided in your Atlas incorporation submission" is on a list that includes **Lebanon**. The same applies if "**any account representative or owner** has an address in" a second list that also includes **Lebanon**.
  - A USD Treasury account requires an account representative "with a **physical address in the United States**". "A US registered-agent or virtual mailing address doesn't establish" that.
  - "These lists … don't describe eligibility to incorporate a company using Stripe Atlas."
  - No date shown. — [Stripe Support: Treasury account availability for Stripe Atlas businesses](https://support.stripe.com/questions/treasury-account-availability-for-stripe-atlas-businesses)
- **VERIFIED: Atlas does not exclude Lebanon by name. Whether a Lebanon-based founder can actually use it is STILL UNCONFIRMED.**
  - "Founders from anywhere in the world can use Atlas to form a US company in Delaware."
  - "Apply online from almost anywhere in the world."
  - "Atlas costs $500 …; after the first year, registered agent service costs $100 per year."
  - Atlas forms "a C Corporation or Limited Liability Company (LLC) in Delaware". This settles the earlier open question: **LLCs are offered**.
  - Stripe's prohibited jurisdictions are "including, Cuba, Iran, North Korea, and Syria, and the Crimea, Donetsk, and Luhansk regions". Lebanon is not named.
  - No date shown. — [stripe.com/atlas](https://stripe.com/atlas); [Stripe Support: Stripe Atlas](https://support.stripe.com/questions/stripe-atlas); [Stripe restricted businesses](https://stripe.com/legal/restricted-businesses)

### Inferences
- A Lebanon resident cannot get a Stripe account in their own name, and so cannot use SMP, RevenueCat Billing or RevenueCat's Stripe Billing either.
- An Atlas company run from Lebanon could be incorporated, but it would get **no Stripe bank account (Treasury)**. It would need a separate US bank willing to onboard a Lebanon-resident owner. Whether Stripe Payments would then approve that company is not stated anywhere.

### Gaps
- No Stripe page says whether Stripe Payments approves an Atlas company whose only representative lives in Lebanon.

## Paddle (merchant of record)

### Takeaway
**Lebanon is not on Paddle's list of countries it cannot work with**, so Paddle is open in principle. Individuals and sole traders are accepted without business-registration documents. Paddle pays **once a month** (minimum $100), by **wire, including in USD, or Payoneer**. Its pricing is **5% + 50¢**.

### Cited Findings
- **VERIFIED (and the full list is now read): Lebanon is not excluded.**
  - "Paddle works with software businesses anywhere in the world with the exception of the unsupported countries listed below … unable to support suppliers operating from the below countries."
  - The complete list: Afghanistan, Antarctica, Belarus, Burma (Myanmar), Central African Republic, Cuba, Crimea, Democratic Republic of Congo, Donetsk, Haiti, Iran, **Iraq**, Kherson, Libya, Luhansk, Mali, Netherlands Antilles, Nicaragua, North Korea, Russia, Somalia, South Sudan, Sudan, Syria, Venezuela, Yemen, Zaporizhzhia, Zimbabwe. **No Lebanon.**
  - "This list is subject to change. Our team may … request further information before processing an order or releasing a payment."
  - The page also blocks *buyers* in "specific unsupported regions/countries".
  - No date shown. — [Paddle Help: Which countries are supported by Paddle?](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)
- **VERIFIED (new): individuals are accepted.** Business-registration and ownership documents are asked for, but "this step is not required for individuals or sole traders." No date shown. — [Paddle Help: What is business verification?](https://www.paddle.com/help/start/account-verification/what-is-business-verification)
- **VERIFIED: 5% + 50¢ "per Checkout transaction"**, with "No monthly fees, migration fees, or hidden extras". Custom pricing for "high-volume, low-value transactions". No date shown. — [Paddle pricing](https://www.paddle.com/pricing)
- **VERIFIED (new): how Paddle pays out.**
  - Method: "You can receive your payment either via **wire transfer or Payoneer**."
  - Schedule: monthly. The balance converts on the 1st and is "sent by the 15th".
  - Threshold: "min $100", adjustable up to $100,000.
  - "Some money transfer services like TransferWise … provide banking details … you can receive payouts from Paddle" with those details.
  - No date shown. — [Paddle Help: When and how do I get paid?](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid)
- **VERIFIED (new): payout fees.**
  - Paddle adds no fee beyond its own. Local-network transfers are free "when your payout currency matches the local currency of your bank's country".
  - Otherwise the payout "must be sent internationally via SWIFT. These transfers will incur a wire fee of $/€/£15." Intermediary-bank fees are borne by the seller.
  - Payoneer payouts are "subject to all Payoneer fees".
  - A conversion margin "of up to 1.5%" applies if the payout currency differs from the balance currency.
  - No date shown. — [Paddle Help: Is there a fee taken for payouts?](https://www.paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts)
- **VERIFIED (new): payout currencies.** AUD, GBP, CAD, CNY, CZK, DKK, EUR, HUF, PLN, ZAR, SEK, CHF and **USD**. "If your local currency isn't supported we can send the payout in the most competitive Default Currency." No date shown. — [Paddle Help: Can I be paid in my local currency?](https://www.paddle.com/help/manage/get-paid/can-i-be-paid-in-my-local-currency)

### Inferences
- A USD payout to a Lebanese bank is a currency other than the bank country's local currency (LBP). On Paddle's rule it would therefore go by **SWIFT, with a $15 fee per monthly payout** plus any intermediary or receiving-bank charges.
- Payoneer is not a safe fallback for Lebanon (see Payoneer below).

### Gaps
- The buyer-side claim ("Lebanon (LB) … USD … tax Exclusive" in Paddle's developer docs) was **not re-checked**, because developer.paddle.com was not among the reachable hosts. It stays as the earlier snippet-based claim.
- Paddle's KYC for a Lebanese individual (proof of address, the domain/website review) and whether its banking partners wire to Lebanese banks in practice are not stated. The list is "subject to change", so this should be confirmed with Paddle in writing.

## Lemon Squeezy (merchant of record, owned by Stripe)

### Takeaway
**CORRECTED: Lemon Squeezy is not usable** by a Lebanon-resident seller. Lebanon is **not** in its bank-payout list. Its only other payout route is PayPal, which does not operate in Lebanon (see PayPal below). Lebanon is also on its list of **customer countries it cannot take payments from**.

### Cited Findings
- **CORRECTED: Lebanon is not a bank-payout country, and it is a refused customer country.**
  - "Lemon Squeezy can offer services to merchants and affiliates who can receive bank or PayPal payouts in one of the hundreds of countries we support… If you don't see your country listed by PayPal or in the list below, sorry, you won't be able to use Lemon Squeezy at this time."
  - The bank-payout list runs from Albania to Vietnam. In the region it includes Bahrain, Egypt, Israel, Jordan, Kuwait, Oman, Qatar, Saudi Arabia, Turkey and the UAE. It has **no Lebanon**.
  - "Unsupported countries for purchases: We cannot accept payments from customers in the following countries: … Iran, Iraq, **Lebanon**, Libya, … Syrian Arab Republic, Yemen."
  - Bank payouts run through Stripe (the India footnote: "Stripe only accepts new accounts from India on an invite-only basis").
  - No date shown. — [Lemon Squeezy Docs: Supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- **VERIFIED: the fees.**
  - The platform fee is "5% + 50¢" per transaction ([Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing)).
  - Add-ons: "+1.5% for international (outside of the US) transactions", "+1.5% for PayPal transactions", "+0.5% for subscription payments".
  - Payout fees: "1% per payout for bank accounts outside the US", and PayPal "3% capped at $30 per payout for accounts outside the US".
  - No date shown. — [Lemon Squeezy Docs: Fees](https://docs.lemonsqueezy.com/help/getting-started/fees)
- **VERIFIED (new): the payout schedule.** "Payouts are created twice monthly on the 1st and 15th … Net sales are held for 13 days." The minimum threshold is $50. PayPal payouts are "always in USD". No date shown. — [Lemon Squeezy Docs: Getting paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid)
- **VERIFIED: it is the legal seller.** "Yes! Lemon Squeezy acts as a merchant of record." No date shown. — [Lemon Squeezy Docs: Merchant of record](https://docs.lemonsqueezy.com/help/payments/merchant-of-record)
- **VERIFIED (new, continuity): Lemon Squeezy is steering users to Stripe Managed Payments.** "Our goal is to provide Lemon Squeezy users an easy way to migrate to Stripe Managed Payments… If you do not operate in a country that Stripe supports, check out Atlas." Dated 28 Jan 2026. — [Lemon Squeezy blog: 2026 Update](https://www.lemonsqueezy.com/blog/2026-update)

### Inferences
- The earlier recommendation of "Lemon Squeezy, or Paddle" should become **Paddle only**. The earlier table row "Lemon Squeezy: Likely" should read **No**.

### Gaps
- None material. Lebanon's absence is read from the complete list.

## Wise

### Takeaway
Lebanon is **not** on Wise's "countries we don't support" list, so a Lebanon resident can register and *send* money. But Lebanon is **not** among the countries where residents can **hold money**, so there are no Wise balances and no receiving account details. Wise **can send USD to Lebanon** by Swift.

### Cited Findings
- **CORRECTED, completing the truncated snippet: Lebanon is not on the unsupported list.** "You can register and send money with Wise from most countries around the world". "You can hold money if you live in a country where you can open a Wise account". The unsupported list is Afghanistan, Belarus, Burundi, Central African Republic, Chad, Congo, DR Congo, Cuba, Eritrea, Iran, Iraq, North Korea, Libya, Myanmar, Somalia, South Sudan, Russia, Sudan, Syria, Yemen, Venezuela, plus five Ukrainian regions. **No Lebanon.** No date shown. — [Wise Help: Where can I use Wise?](https://wise.com/help/articles/2978049/where-can-i-use-wise)
- **VERIFIED (new, decisive): Lebanon residents cannot hold money.** "You can hold money in your account if you live in one of the following countries and territories". The list runs from Andorra to Uruguay and includes Bahrain, Israel, Kuwait, Qatar and Saudi Arabia. It has **no Lebanon** (and no UAE). "We sometimes need to make changes that only affect new accounts." No date shown. — [Wise Help: Where do I need to live to hold money with Wise?](https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise)
- **VERIFIED: Wise sends USD to Lebanon by Swift.** "We're working hard to allow customers to send LBP to Lebanon from the UK – but we're not quite there yet. However we do support sending United States Dollars (USD) to Lebanon using international wire transfer." No date shown. — [Wise: Send money to Lebanon](https://wise.com/gb/send-money/send-money-to-lebanon)

### Inferences
- A Wise account cannot serve as a USD receiving account for Apple, Paddle or anyone else for a developer living in Lebanon. Opening one on a foreign address would misstate residence.

### Gaps
- None for this question.

## Payoneer

### Takeaway
**STILL UNCONFIRMED.** No official Payoneer page that could be reached says whether Lebanese residents can open accounts, receive USD, or withdraw to Lebanese banks.

### Cited Findings
- I searched the payoneer.com sitemap (4,816 URLs), the pricing, legal and prohibited-transaction pages, and the Arabic home page. None mentions Lebanon (لبنان). Payoneer says availability depends on "country of residency or incorporation, applicable anti-money laundering regulations, Payoneer risk management policies…" No date shown. — [Payoneer: Prohibited transaction list](https://www.payoneer.com/legal/prohibited-transaction-list/)
- **VERIFIED (fee detail):**
  - "To a bank account in the same country as yours, in local currency (in supported countries)": **1.50 USD**.
  - "To a bank account in the recipient's local currency" or "non-local currency": **1.2% – 4%**.
  - Payoneer claims "190+ countries and territories".
  - No date shown. — [Payoneer pricing](https://www.payoneer.com/pricing/)

### Inferences
- The earlier "$1.50 USD-to-USD withdrawal" is the *same-country, local-currency* fee. A USD withdrawal to a Lebanese bank is non-local currency (LBP is local), so it would fall under 1.2%–4%, if it is offered at all.

### Gaps
- Lebanon's status is unknown: the sign-up country list and the help centre are on hosts that could not be reached. Ask Payoneer directly.

## PayPal

### Takeaway
**VERIFIED from PayPal's own country list: PayPal does not operate in Lebanon at all.** Lebanese accounts can neither receive nor send.

### Cited Findings
- PayPal's "List of Countries and Currencies" page has 200 market entries, embedded as JSON, with `totalCountries` = 201. It has **no LB/Lebanon**. Nearby markets listed: Jordan, Egypt, UAE, Saudi Arabia, Kuwait, Qatar, Cyprus, Israel. Also absent: Syria, Iraq, Turkey. No date shown. — [PayPal: Worldwide](https://www.paypal.com/us/webapps/mpp/country-worldwide)
- `www.paypal.com/lb/home` returns PayPal's **US** home page (`<link rel="canonical" href="https://www.paypal.com/us/home">`, locale `en_US`). There is no Lebanese site. Deeper `/lb/` pages returned 403 (bot protection). — [paypal.com/lb/home](https://www.paypal.com/lb/home)

### Inferences
- This rules out PayPal payouts from Lemon Squeezy, Gumroad-type platforms and others for a Lebanon resident.

### Gaps
- None for this question. The redirect alone could be geo or bot handling, but the official country list settles it.

## RevenueCat

### Takeaway
RevenueCat is **not a payment processor**. It is **free up to $2,500 of monthly tracked revenue (MTR), then 1%**. Web billing has no separate fee. With **Paddle as billing engine**, all web features, Web Purchase Links included, are now listed as **supported**, with no invitation needed. RevenueCat Billing needs a Stripe account.

### Cited Findings
- **VERIFIED: the pricing.**
  - "Pay nothing for up to $2,500 in monthly tracked revenue. Then pay 1% of what you track once you hit $2,500 in MTR."
  - "MTR … is the amount of revenue tracked by RevenueCat (in USD, before the platform cut) … This includes paid subscriptions, renewals, and one-time purchases."
  - "No charges apply on months when you don't hit the $2.5K threshold."
  - "RevenueCat is not a payment processor. You'll continue to be paid by Apple, Google, Stripe, or any other payment provider."
  - No date shown. — [RevenueCat pricing](https://www.revenuecat.com/pricing)
- **VERIFIED: no extra fee for web.** "RevenueCat Web is included in RevenueCat's price; there are no additional RevenueCat fees to support subscriptions and purchases on the web."
  - With RevenueCat Billing, Stripe's fee is 2.9% + 30¢ (US pricing). With Stripe Billing, there is also a "0.7% of volume" Billing fee.
  - The billing engines are: "RevenueCat Billing: RevenueCat's own billing engine, using Stripe as the payment gateway". When setting it up, "use an existing Stripe account or create a claimable sandbox". The others are Stripe Billing (optionally with Managed Payments) and "Paddle Billing … with Paddle as merchant of record".
  - No date shown. — [RevenueCat Docs: Web overview](https://www.revenuecat.com/docs/web/overview)
- **CORRECTED: Paddle Web Purchase Links are supported, not "invite only".** The Paddle page's compatibility table marks Importing external purchases, Web SDK, **Web Purchase Links**, Web Paywalls, Funnels and Redemption Links all "✅ Supported". App-to-web purchases are also listed.
  - Limits: "only one product" per purchase. "For production purchases, Paddle needs to review and approve your account when adding a domain."
  - Also on the page: "For apps available outside the U.S. App Store, Apple still requires that digital goods and subscriptions be purchased through in-app purchases."
  - No date shown. — [RevenueCat Docs: Paddle](https://www.revenuecat.com/docs/web/integrations/paddle)

### Inferences
- Web purchases synced from Paddle are "tracked" revenue, so they almost certainly count toward MTR and the 1% above $2,500. This fits the pricing definition and the earlier Japanese-page claim, but no page says it in those words.
- Paddle + RevenueCat is the only RevenueCat web setup open to a Lebanon resident.

### Gaps
- No RevenueCat page states seller-country limits for the Paddle integration. They follow from Paddle's own list.

## Whish Money (Lebanon)

### Takeaway
**VERIFIED that Whish offers "Whish Pay" for online merchants.** **STILL UNCONFIRMED:** whether it accepts foreign cards from buyers abroad, whether individuals can sign up, and what it charges merchants.

### Cited Findings
- FAQ: "Can my business accept online payments through Whish? Our Whish Pay Service lets merchants accept payments online through their websites or apps." No date shown. — [Whish FAQ](https://www.whish.money/faq)
- "Checkout Services: Enhance your business's payment solutions with Whish Pay tailored for seamless online and in-store transactions." The sign-up is a contact form asking for **Company Name, Sector, Website URL** and platform (Shopify / WordPress / Custom), and says to "contact us for customizable options". No date shown. — [Whish: Corporate Solutions](https://www.whish.money/corporate-solutions)
- Fees page: no merchant or Whish Pay fees are published. The page lists:
  - Add money: "From an International Card 3%", "Through a Payment Link 3%", "From a Bank (US / CA) Free".
  - Cash out: "Over Counter or ATM (USD) 1%".
  - "International Transfers to Bank Accounts: Fees vary by partner and corridor".
  - "Cross-Border Transactions (USD) Free" on the Whish Visa card.
  - No date shown. — [Whish: Fees & Commissions](https://www.whish.money/fees-commissions)
- Licence: "Licensed by Banque du Liban under Resolution No. 19/21/22, dated August 10, 2022". The site is run by TecFrac. Whish says it is in "more than 1000 locations in Lebanon". — [whish.money](https://www.whish.money/)

### Inferences
- The site says nothing about card acceptance for foreign buyers or about payouts abroad, and the merchant sign-up asks for a company. Whish Pay therefore looks like a checkout for Lebanese wallet and card holders, with money held in a USD/LBP Whish wallet. It is not a global subscription merchant of record, and it handles no foreign VAT.

### Gaps
- Whether a sole trader can be a Whish Pay merchant, whether foreign Visa/Mastercard are accepted, whether recurring billing exists, and what merchants pay. None is on the site; ask Whish's corporate team.

## Corrections to the earlier comparison table (`alternatives.md`, section E)

### Takeaway
The table rows for Lemon Squeezy, Paddle, PayPal, Wise, Stripe Managed Payments and RevenueCat + Paddle need these changes.

### Cited Findings
- **Lemon Squeezy:** change "Likely" to **No** (no bank payout to Lebanon, no PayPal in Lebanon, and Lebanese buyers refused). — [LS supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries); [PayPal worldwide](https://www.paypal.com/us/webapps/mpp/country-worldwide)
- **Paddle:** change "Possibly" to **Yes in principle** (not excluded; individuals accepted). Payout is monthly by USD wire (likely a $15 SWIFT fee) or Payoneer, with a $100 minimum, at 5% + 50¢. — Paddle pages above
- **PayPal:** change "No (secondary)" to **No (official country list)**. — [PayPal worldwide](https://www.paypal.com/us/webapps/mpp/country-worldwide)
- **Wise:** change "Unconfirmed" to **No receiving account** (it can send only). — [Wise 2813542](https://wise.com/help/articles/2813542/where-do-i-need-to-live-to-hold-money-with-wise)
- **Stripe Managed Payments:** the fee is **+3.5% on top of Stripe processing**, and it is not available to Lebanon. — [stripe.com/managed-payments](https://stripe.com/managed-payments)
- **RevenueCat + Paddle:** **no invitation needed**. — [RevenueCat Docs: Paddle](https://www.revenuecat.com/docs/web/integrations/paddle)

### Inferences
- The realistic web route for an individual in Lebanon is **Paddle (+ optionally RevenueCat)**, with payouts by USD wire to a fresh-USD Lebanese account. Everything else checked is closed, or (Payoneer, Whish) unconfirmed.

### Gaps
- Paddle's acceptance of a specific Lebanese applicant, and its banks' willingness to wire to Lebanon, can only be confirmed by applying or by asking Paddle in writing.
