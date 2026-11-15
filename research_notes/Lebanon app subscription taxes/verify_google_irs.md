# Verification against official Google and IRS pages: Google Play tax, fees and payouts for an individual developer resident in Lebanon (as of 15 Nov 2026)

> **Method.** I fetched every page below directly on 15 Nov 2026 (curl through the session proxy, English locale, `hl=en`) and read the article text. No search summaries were used.
> - **Dates:** Play Console Help and Payments Center Help articles show no "last updated" date in their HTML, so each is dated "no date shown; read 15 Nov 2026". The DDA and the IRS page do show dates.
> - **Status labels:** VERIFIED = official wording confirms the earlier note. CORRECTED = official wording differs from, or adds to, the earlier note in `google_play.md`. STILL UNCONFIRMED = no official text found.

## 1. Where Google determines, charges and remits VAT/GST/sales tax; Lebanon and Türkiye

### Takeaway
- **Lebanon is NOT covered (VERIFIED).** It appears nowhere on the tax page, including the tax-inclusive pricing list. For buyers in Lebanon the developer is responsible for any tax.
- **Türkiye IS covered (CORRECTED; the earlier note had it unconfirmed).** It is on the "Other countries and regions" list, where Google remits VAT.
- **Where tax is the developer's job:** the developer may set a rate in Play Console. Google then collects that tax at checkout and passes all of it to the developer. If no rate is set, no tax is charged.

### Cited Findings
- **Türkiye (CORRECTED).** "Google is responsible for determining, charging, and remitting VAT or GST for all paid app and in-app purchases made by customers in locations using Google Play's billing system where Google is the merchant of record (MOR) and in the following locations: VAT: Albania, Georgia, Kazakhstan, Morocco, Senegal and Türkiye; GST: New Zealand". This list replaces the older Payments Center list (Albania, Morocco, Norway, Taiwan, NZ) cited earlier. Norway and Taiwan now have their own sections. — [Play Console Help: Tax rates and value-added tax (VAT), answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (no date shown; read 15 Nov 2026)
- **Full set of buyer countries where Google remits for a developer outside that country** (same page, VERIFIED):
  - **Remits whenever Google Play's billing system is used:** Bahrain, Belarus, Benin (18%), Cambodia, Cameroon, Canada (GST/HST, BC PST, Manitoba RST, QST, SK PST), Chile, Côte d'Ivoire, Egypt, Ghana, India (GST), Japan (JCT), Kenya, Laos, Malaysia (service tax), Mexico (16%), Moldova, Nepal, Nigeria, North Macedonia (18%), Oman (5%), Philippines, Russia (20%), Saudi Arabia (15%), Serbia, Singapore (9%), South Korea (10%), Taiwan, Thailand (7%), Uganda, Ukraine (20%), UAE (5%), Uzbekistan, Vietnam (10%), Zambia.
  - **Remits only for purchases through Google Play's billing system** (the developer is responsible under alternative billing): Australia (10% GST), Bangladesh, EU, Iceland, Indonesia (11%), Liechtenstein, Norway, Puerto Rico (SUT), South Africa, UK, and the listed US states.
  - **Also remits:** the "Other countries and regions" list quoted above.
- **United States (VERIFIED, state list now seen).** Google remits sales tax for buyers using Google Play's billing system in: Alabama, Alaska Localities, Arizona, Arkansas, California, Colorado, Connecticut, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Nebraska, Nevada, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming. "Even if you're not located in the United States, this treatment will still apply." — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Developer responsible even when based abroad (VERIFIED):**
  - Colombia: "you will continue to be responsible for charging, remitting, and reporting any VAT"
  - Peru: same wording
  - Switzerland, Tanzania, Zimbabwe: "You are responsible for determining, charging, and remitting VAT" — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Saudi Arabia (CORRECTED; this resolves the earlier conflict).** The VAT-registration option applies only to "Developers located in Saudi Arabia". For developers located outside, "Google is responsible for determining, charging and remitting 15% VAT ... for all Google Play Store paid app and in-app purchases by customers in Saudi Arabia." — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Countries not on the list (VERIFIED):**
  - "If you're offering paid app or in-app purchases to customers in circumstances other than those described above where Google is responsible, you are responsible for determining the applicable tax rate for your sales and for remitting the taxes to the appropriate taxing authority ... The tax rates you specify automatically apply when the buyer checks out."
  - The rate options in Play Console are "No tax", "Google preset rate" and "Custom tax rate".
  - "In countries where developers are responsible for remitting VAT to the appropriate tax authority, Google will pass on the entire tax amount collected to the developer." — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Default when no rate is set (VERIFIED).** "When tax is your responsibility and you do not provide any inputs at a country and/or jurisdiction level, Google by default does not set any transaction taxes, even if you provide a product tax category input to Google." The developer is responsible for "(a) determining if the transaction is taxable; (b) charging and collecting ...; (c) remitting ...; (d) providing any required documentation". — [Play Console Help: Understanding Your Tax Responsibilities on Google Play, answer 16408159](https://support.google.com/googleplay/android-developer/answer/16408159?hl=en) (no date shown; read 15 Nov 2026)
- **Lebanon (VERIFIED absent).** A text search of the whole article finds no "Lebanon". Lebanon is also missing from the tax-inclusive pricing list ("We currently support tax-inclusive pricing in the following countries: Albania, Armenia, ... Türkiye, ... Zimbabwe"). — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)

### Inferences
- Any Lebanese VAT on sales to buyers in Lebanon is the developer's job. Google charges nothing unless the developer enters a rate.
- Because Lebanon is not a tax-inclusive-pricing country, a rate entered for Lebanon would likely be added on top of the shown price at checkout. The page's own example is "$10 + 20% = $12".
- For Türkiye buyers, Google remits the VAT. The Lebanese developer has no Turkish VAT filing for Play sales.

### Gaps
- Turkish VAT rate: the page gives no rate for Türkiye. It is visible only in Play Console under "Manage sales tax".

## 2. Developer Distribution Agreement: effective date, agent/MoR (§3.4), MoR country list, contracting entity

### Takeaway
- **Effective date (VERIFIED):** 15 September 2025, with no later change listed.
- **Merchant of record (VERIFIED):** Google is MoR, acting as the developer's agent, **only** in a list of 54 countries/territories: the EEA, the UK and related territories. The developer is MoR everywhere else, **including the US, Türkiye and Lebanon**.
- **Contracting entity (CORRECTED framing, STILL UNCONFIRMED for Lebanon):** the DDA ties the Google entity to **where the developer distributes**, not where the developer lives. The linked country table could not be read.

### Cited Findings
- **Effective date (VERIFIED).** The page header reads "Effective as of September 15, 2025". The change summary's newest entry is "Main Changes implemented on September 15, 2025". That change included "We revised sections 2.1 and 3.1 to update the link to the country list page" and new §3.6 withholding provisions. — [DDA](https://play.google/developer-distribution-agreement.html); [DDA summary of changes](https://play.google/developer-distribution-agreement/summary.html) (read 15 Nov 2026)
- **§3.4 (VERIFIED verbatim).** "Acting as Your agent, and with You acting as a principal, Google is the merchant of record for Products sold or made available to users in the countries/territories described here. You are the merchant of record for Products You sell or make available via Google Play to all other users." — [DDA §3.4](https://play.google/developer-distribution-agreement.html)
- **§3.1.** "You hereby appoint Google as Your agent or marketplace service provider as outlined here". The link goes to answer 10532353. — [DDA §3.1](https://play.google/developer-distribution-agreement.html)
- **MoR list (VERIFIED, 54 entries; the earlier note's count came from a secondary source).** The entries are: Åland Islands, Austria, Belgium, Bulgaria, Ceuta, Croatia, Republic of Cyprus, Czech Republic, Denmark, Estonia, Faroe Islands, Finland, France, French Guiana, French Polynesia, Gibraltar, Germany, Greece, Greenland, Guadeloupe, Holy See, Hungary, Iceland, Ireland, Italy, Las Palmas, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Martinique, Mayotte, Melilla, Monaco, Netherlands, New Caledonia, Norway, Poland, Portugal, Réunion, Romania, Saint Barthélemy, Saint-Martin, Saint Pierre and Miquelon, San Marino, Santa Cruz de Tenerife, Slovakia, Slovenia, Spain, Svalbard and Jan Mayen Islands, Sweden, United Kingdom, Wallis and Futuna. The US, Türkiye and Lebanon are not on it. — [Play Console Help: Merchant of Record, answer 7645364](https://support.google.com/googleplay/android-developer/answer/7645364?hl=en) (no date shown; read 15 Nov 2026)
- **"Google" defined (VERIFIED).** "Google LLC ... Mountain View ...; Google Ireland Limited ... Dublin 4 ...; Google Commerce Limited, a company incorporated in Ireland ...; or Google Asia Pacific Pte. Limited ... Singapore ... Google may update the Google entities and their addresses from time to time." — [DDA §1](https://play.google/developer-distribution-agreement.html)
- **Which entity (CORRECTED framing).** §2.1: "You are contracting with the applicable Google entity based on where You have selected to distribute Your Product (as set forth here)." The link goes to [Supported locations for distribution to Google Play users, answer 10532353](https://support.google.com/googleplay/android-developer/answer/10532353?hl=en). On that page only the intro is served as static HTML ("Using the tables on this page, you can find app availability information..."). The tables load dynamically and could not be read. — [DDA §2.1](https://play.google/developer-distribution-agreement.html)
- **Other DDA clauses (VERIFIED):**
  - §3.5: the developer is responsible for Transaction Taxes "Except in certain countries/territories". Where Google remits, "You may recognize a deemed supply from You to Google solely for Transaction Tax purposes if required by applicable law."
  - §11.3: "as the principal to the transaction with the user, You are solely responsible for compliance worldwide with all applicable laws".
  - §16.8: California law; Santa Clara County courts. — [DDA](https://play.google/developer-distribution-agreement.html)

### Inferences
- A developer distributing worldwide is probably in contract with several Google entities, one per distribution region. That reading follows from §2.1's wording but is not confirmed.
- The earlier inference that "the residual entity for a Lebanon resident is Google LLC" should be dropped. The DDA keys the entity to distribution location, not residence.

### Gaps
- The entity/relationship table in answer 10532353 (agent vs marketplace service provider, entity per buyer country) is STILL UNCONFIRMED. It needs a JavaScript-capable browser, or the developer can check the invoices and earnings reports in Play Console.

## 3. Is the service fee charged on the price excluding tax?

### Takeaway
**VERIFIED (CORRECTED from "likely").** Google states it explicitly for countries where the developer remits the tax. For countries where Google remits, no single sentence says so, but the DDA treats the fee and taxes separately.

### Cited Findings
- "In countries where developers are responsible for remitting VAT to the appropriate tax authority, Google will pass on the entire tax amount collected to the developer, and calculate the service fee off the net price of the product." — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Worked example on the same page:** price 100 JPY, VAT 20%. The developer receives 75 JPY and remits 17 JPY of VAT. "Developer revenue after 70/30 split and remitting VAT: 58JPY — 83JPY * 0.7 = 58JPY — Pre-VAT price * 70%". — [answer 138000](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **DDA §3.4.** "A 'Service Fee' ... will be calculated and charged on the sales price. The Service Fee is exclusive of Transaction Taxes ... to the extent Google is responsible to discharge Transaction Taxes arising on Service Fees, Google will charge You such Transaction Taxes". This is the source of VAT charged on the service fee in some developer countries (e.g. Egypt, Kenya, Nigeria, Ghana). Lebanon has no such section. — [DDA §3.4](https://play.google/developer-distribution-agreement.html)
- **Fee FAQ.** "a percentage of the purchase price of digital purchases". — [Play Console Help: Understanding Google Play's service fee, answer 11131145](https://support.google.com/googleplay/android-developer/answer/11131145?hl=en) (no date shown; read 15 Nov 2026)

### Inferences
- For a Lebanese developer, the fee base is the tax-exclusive price wherever tax is collected, whether Google remits it or the developer does.
- There is no tax on Google's service fee for a Lebanon-based developer: answer 138000 has no Lebanon section.

### Gaps
- No single official sentence states the fee base for countries where Google remits. The earnings report columns show it per transaction.

## 4. Service fees as of Nov 2026 (subscriptions, the first-$1M rule, the 2026 model, rollout by market)

### Takeaway
**VERIFIED with a schedule CORRECTION.**
- **Launched markets:** the new model (service fee + billing fee) is live for buyers in the EEA, UK and US (30 Jun 2026) and in Australia **and Japan** (30 Sep 2026). Auto-renewing subscriptions pay **10% + 5% billing fee** there.
- **Next wave, 31 Dec 2026:** South Korea, **Türkiye** and South Africa.
- **Rest of world, 30 Sep 2027.** This includes buyers in Lebanon. Until then the **legacy 15%** rate applies to auto-renewing subscriptions, whatever the revenue.

### Cited Findings
- "For transactions with users in Australia, the European Economic Area, Japan, United Kingdom, or United States: ... regional rollout date (June 30, 2026 for the EEA, UK, and US; September 30, 2026 for Australia and Japan)". In the rate table, auto-renewing subscriptions (new and existing installs) pay "10% + 5% billing fee *" in every row. "* Billing fee applies when a user completes a purchase ... using Google Play Billing". — [Play Console Help: Service fees, answer 112622](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) (no date shown; read 15 Nov 2026)
- **Rest of world today:** "For all remaining markets until the announced updated service fees are rolled out globally":
  - "Subscriptions: 15% for automatically renewing subscription products purchased by subscribers, regardless of revenue earned by the developer each year"
  - "Developers enrolled in the 15% service fee tier: 15% for the first $1M (USD) ... 30% for earnings in excess of $1M" — [answer 112622](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- **Timeline table (CORRECTED; the earlier note had Japan and Korea both "by 31 Dec 2026" and no Türkiye or South Africa):** "June 30, 2026: EEA, UK, US | September 30, 2026: AU, JP | December 31, 2026: KR, TR, ZA | September 30, 2027: Rest of World". Billing fee: "In the currently launched markets ... the billing fee is currently set at 5%. Billing fee details for other regions are forthcoming." The page opens "As announced on March 4, 2026". — [Play Console Help: Understanding Google Play's lower service fees, answer 16954621](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en) (no date shown; read 15 Nov 2026)
- **Recurring transactions (new and existing installs):** "10% + billing fee, if applicable" under Standard, the Apps & Games programs, and First $1M. — [answer 16954621](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en)

### Inferences
| Buyer market (Nov 2026) | Auto-renewing subscription via Google Play Billing |
|---|---|
| EEA, UK, US, Australia, Japan | 10% + 5% = 15% |
| Türkiye, South Korea, South Africa | legacy 15% until 31 Dec 2026, then 10% + billing fee (rate not yet announced) |
| Lebanon, MENA and other markets | legacy 15% until 30 Sep 2027 |

### Gaps
- Whether enrolling an account group is still needed for the new model's "first $1M" 10% rate is STILL UNCONFIRMED. The pages mention enrolment only for the legacy tier. It does not matter for auto-renewing subscriptions, which pay 10% (new model) or 15% (legacy) regardless.
- Billing-fee rates for KR, TR, ZA and the rest of the world are not published yet.

## 5. Withholding tax by buyer country

### Takeaway
**CORRECTED.**
- **Current list:** Brazil (all payment methods); Egypt, Kuwait, Myanmar and Sri Lanka (carrier billing only); Taiwan (3%); Vietnam (5%, also for developers outside Vietnam); plus India, Kenya and Tanzania, which apply only to developers located there.
- **Saudi Arabia is no longer listed.**
- **New and important:** Lebanon is on Brazil's tax-haven list, so a Lebanese developer has an **extra 10% IRRF** withheld on Brazilian sales.

### Cited Findings
- **Brazil, base rule.** "If you are paid in non-BRL currency and you offer Google Play app and in-app purchases made via any available form of payment by customers in Brazil, Google or its payment processor partners deduct the cost of Brazilian withholding taxes (WHT) ... IRRF ... and CIDE ..., with applicable rates determined based on your location." The 25% / 15% + 10% figures from the earlier note are NOT on the current page (CORRECTED: rates not stated). — [Play Console Help: Withholding tax (WHT), answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (no date shown; read 15 Nov 2026)
- **Brazil, tax-haven surcharge (NEW).** "If you are a tax resident in one of the following territories that Brazil designates as a tax haven, Google is legally required to withhold an additional 10% IRRF: ... Lebanon ...". The same list includes Bahrain, Oman, UAE, Ireland, Hong Kong and Cyprus. Treaty reduction applies only to "a supported country that has a Double Tax Treaty with Brazil". — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- **Carrier billing (direct carrier billing, DCB) only (VERIFIED):** Egypt "up to 20%", Kuwait "up to 5%", Myanmar "up to 2.5%", Sri Lanka "up to 10%". — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- **Taiwan (VERIFIED).** "3% WHT on the payment made to you for all of your transactions with users in Taiwan" unless the developer has a Taiwan VAT ID, a foreign TIN registered in Taiwan, or an exemption. — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- **Vietnam (NEW).** "If you are (1) located outside of Vietnam and (2) offer paid app or in-app purchases on Google Play, Google or its payment processor partners will deduct 5% of withholding tax (WHT) on your gross sales revenue from transactions with Vietnam end users." — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- **Developer-location rules (CORRECTED; the earlier note listed Kenya and Tanzania as buyer-country rules):**
  - Kenya, 5%: "If you are located in Kenya"
  - Tanzania, 5%: "If you are located in Tanzania"
  - India, 0.1% / 5%: "If you're located in India" — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)
- **Saudi Arabia (CORRECTED).** It has no section on the current WHT page.
- **Opting out and statements (VERIFIED).** "the only way to opt-out of withholding taxes is to remove your app from distribution in the countries where withholding taxes apply." "Google currently provides an annual withholding tax statement". In earnings reports the lines appear as "BRAZIL_IRRF", "BRAZIL_CIDE", "TAIWAN_WITHHOLDING_TAX" and "Direct Carrier Billing Withholding Tax". — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)

### Inferences
- **Brazil:** a Lebanese individual paid in USD bears the normal Brazilian IRRF + CIDE plus 10% extra IRRF. Brazil and Lebanon have no treaty, so there is no reduction.
- **Vietnam and Taiwan:** expect 5% and 3% WHT on sales there.

### Gaps
- The exact Brazilian IRRF and CIDE percentages for a Lebanese resident are not on Google's page. They appear in the Play Console reports.

## 6. US tax: W-8BEN and US withholding on Play earnings of a non-US individual

### Takeaway
- **W-8BEN (VERIFIED):** required. Google says it exempts international merchants from US tax *reporting*.
- **US withholding (STILL UNCONFIRMED for Play specifically):** Google's Payments Center says a documented non-US person is taxed and withheld only on **US-source** income. Without a valid form, Google may withhold 30% (or 24% backup).
- **Form refresh and treaty (VERIFIED):** the form must be refreshed every 3 years. Lebanon has no US treaty (see §9), so no reduced rate can be claimed.

### Cited Findings
- **Who files what.** "US-based merchants must submit the US Internal Revenue Service (IRS) W-9 form. You must submit the Certificate of Foreign Status form (W-8BEN) to the United States Internal Revenue Service (IRS)." Year-end forms: "Non-US-based (1042-S): Submit on or after March 15". — [Play Console Help: Enter merchant tax information, answer 7163598](https://support.google.com/googleplay/android-developer/answer/7163598?hl=en) (no date shown; read 15 Nov 2026)
- **FAQ (VERIFIED).** "If you're an international merchant based outside of the US, you're required to submit the Certificate of Foreign Status (Form W-8BEN) ... The IRS requires international merchants who process sales in the US to provide ... (Form W-8BEN) to be exempt from US tax reporting requirements." "Google may take a range of actions including withholding merchant payouts and suspending processing of transactions." — [Play Console Help: FAQ, answer 7161649](https://support.google.com/googleplay/android-developer/answer/7161649?hl=en) (no date shown; read 15 Nov 2026)
- **Payments Center: scope of US withholding.** "If you've been validly documented as a non-US business or individual, only the portion of your revenue earned from US users is subject to US withholding taxes and reporting." "Generally, a documented non-US person (i.e., valid Form W-8 on file) is subject to US tax on income that is earned from US sources. For example, if a non-US person performs services in the US..." "US activities are the performance of a service in the United States." — [Payments Center Help: US tax information reporting & withholding, answer 10349995](https://support.google.com/paymentscenter/answer/10349995?hl=en) (no date shown; read 15 Nov 2026)
- **Default rates and refresh (VERIFIED; previously secondary only).**
  - "If a valid tax form isn't provided, Google may apply backup withholding at 24% or chapter 3 withholding at 30% on applicable payments. This rate may only be reduced if you're a tax resident of a country or region that has an income treaty with the US".
  - Forms are refreshed "at the earlier of (1) every 3 years or (2) If there has been a change in circumstances".
  - Income-type guidance: "Other Copyright Royalties (such as ... Play Pass)". — [answer 10349995](https://support.google.com/paymentscenter/answer/10349995?hl=en)
- **DDA §3.6.** "You will provide Google with a valid IRS Form W-9 or W-8 ... Unless You are a resident of the United States or Singapore for income tax purposes, You hereby certify that any services that You provide to users through Your Product are not performed in the United States or Singapore", with 90 days' notice to play-tax-notices@google.com otherwise. — [DDA §3.6](https://play.google/developer-distribution-agreement.html)
- **WHT FAQ on what counts as a service.** "The revenue paid to developers for in-app subscriptions may be considered service income", for example "acts you perform to update or maintain content with respect to a subscription offering". — [answer 9384608](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en)

### Inferences
- A Lebanese individual with a valid W-8BEN who maintains the subscription content from Lebanon is not expected to suffer US withholding on Play subscription income. This follows from Google's framing: subscription income is service income, and services performed outside the US are not US activities.
- If the developer ever served subscription content from inside the US, US withholding at 30% could apply, with no treaty relief. Play Pass income is classed as royalties, which are US-source when earned from US users, so it could also be withheld at 30% with no treaty relief.
- Check the monthly earnings report for any US withholding line.

### Gaps
- There is no Play-specific Google sentence saying "no US tax is withheld on Play app or subscription sales of documented non-US developers". This stays an inference from Google's general rules.

## 7. Developer and merchant registration, payout currency, threshold, timing, bank account

### Takeaway
**VERIFIED with two wording corrections.**
- **Registration:** Lebanon supports both developer and merchant registration.
- **Currency:** the default currency shows as "LBP[1]", and footnote [1] means payment in USD or EUR. Lebanon is on the wire list, and Lebanese merchants are paid by **USD wire from the United States**.
- **Threshold and timing:** the minimum is **US$100**, paid around the 15th of the following month.
- **Bank account:** must be in the same country as the payments profile.

### Cited Findings
- **Supported locations table.** "Lebanon | ✔ | ✔ | LBP[1]"; "[1] Developers in these countries will be paid in USD or EUR, depending on their location." "Default currency is based on the location of the developer's payments profile." — [Play Console Help: Supported locations for developer and merchant registration, answer 9306917](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en) (no date shown; read 15 Nov 2026)
- **Wire list.** Lebanon is in the list of "Developers in the locations listed below can receive payouts through wire transfer". The bank page's Lebanon section says: "Merchants in Lebanon receive payments via wire transfer from the United States. Payouts will arrive in US Dollars." Fields: account holder name, bank name, SWIFT-BIC, and others. — [Play Console Help: Wire transfer payouts, answer 2700656](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en); [Enter merchant bank account information, answer 7161440](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en) (no dates shown; read 15 Nov 2026)
- **Minimum and fees (CORRECTED wording).**
  - The $100 is a rule, not a recommendation: "Your earned balance must meet the minimum payout amount of US$100 to be eligible for a payout".
  - Fees: "Fees for wire transfers are determined by your financial institution and may range from US$0 to US$50 or more."
  - "Google issues wire transfer payouts in USD ... If your financial institution offers you the ability to open accounts in USD, this option is preferred." — [answer 2700656](https://support.google.com/googleplay/android-developer/answer/2700656?hl=en)
- **Timing (VERIFIED).**
  - "Any orders processed, refunded, or charged-back from the 1st of a given month to the end of the month will get paid out around the 15th of the following month."
  - "Google doesn't initiate deposits on weekends or banking holidays."
  - Minimums: "local-currency payouts: US$1; USD wire-transfer payouts: US$100".
  - The earlier "5–7 business days" is NOT on the current pages (CORRECTED). The page says only "it may take several days for your bank to credit your account". — [Play Console Help: Order processing and payouts, answer 137997](https://support.google.com/googleplay/android-developer/answer/137997?hl=en) (no date shown; read 15 Nov 2026)
- **Bank account rules (VERIFIED).**
  - The account must be "In the same country or region where the merchant account is registered" and "Denominated in country's currency (EFT) or USD (Wire transfer)".
  - "Enter your Bank account holder name exactly as it appears on your bank statement." — [answer 7161440](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en)
- **Payments profile (VERIFIED).**
  - "make sure that your bank account is registered in the same country listed in your payments profile."
  - "Tip: You can't change your business location country". — [Play Console Help: Create a payments profile, answer 7161426](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en) (no date shown; read 15 Nov 2026)

### Inferences
- Choose a Lebanese bank account in USD that can receive incoming US wires.
- Balances under $100 roll over to the next month.

### Gaps
- No explicit Google sentence requires the bank account to be in the developer's own name: STILL UNCONFIRMED. The page only asks for the holder name exactly as it appears on the bank statement.

## 8. Closed testing for new personal accounts

### Takeaway
**VERIFIED: still current.** The rule is 12 testers, opted in continuously for 14 days, for personal accounts created after 13 Nov 2023.

### Cited Findings
- "Developers with personal accounts created after November 13, 2023, must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days." "Testers who opt in, test for fewer than 14 days, and then opt out do not count toward the requirement." — [Play Console Help: App testing requirements for new personal developer accounts, answer 14151465](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) (no date shown; read 15 Nov 2026)

### Inferences
- None beyond the rule itself.

### Gaps
- None.

## 9. IRS: is Lebanon a US income-tax treaty country?

### Takeaway
**VERIFIED: Lebanon is NOT a treaty country.**

### Cited Findings
- The IRS "United States income tax treaties - A to Z" list under "L" reads "Latvia, Lithuania, Luxembourg", with no Lebanon. Türkiye is listed as "Turkey". The page shows "Page Last Reviewed or Updated: 03-Jan-2026". — [IRS: United States income tax treaties - A to Z](https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z) (read 15 Nov 2026)
- Google points to this IRS list for treaty status: "Want to know if your country has a tax treaty with the United States? Refer to the IRS website." — [answer 10349995](https://support.google.com/paymentscenter/answer/10349995?hl=en)

### Inferences
- On the W-8BEN, a Lebanese resident claims no treaty benefit. Any US-source income (see §6) is withheld at the statutory 30%.

### Gaps
- None.
