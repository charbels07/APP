# Google Play: taxes, fees, payments profile and payouts for an individual developer in Lebanon selling auto-renewing subscriptions worldwide (as of 15 November 2026)

> **How these notes were gathered, and how far to trust them.** This session's network policy blocked direct access to `support.google.com` (Play Console Help / Payments Center Help), `play.google` (the DDA), `android-developers.googleblog.com`, `irs.gov` and `sec.gov`. Only `developer.android.com` could be read directly.
> - **Read in full (primary, dated):** the two official Google Play fee announcements on the Android Developers Blog (4 Mar 2026 and 24 Jun 2026), including the rate-card and release-schedule images in the June post.
> - **Search summaries only:** every fact attributed to a Play Console Help, Payments Center Help or DDA URL comes from a search engine's summary of the indexed page. Short quoted sentences come from those summaries, not from a direct read. The live page's "last updated" date could not be seen.
> - **Secondary sources** are labelled "(secondary)".
>
> Anything here that decides a filing or a price should be checked against the live Play Console page.

## 1. Google's legal role under the DDA (agent / merchant of record) and which Google entity sells

### Takeaway
Under DDA §3.4, Google acts as the developer's **agent** and is **merchant of record (MoR) only in a listed set of countries/territories** (a Help Center list; a secondary source counts 54). In every other country, **the developer (here, the Lebanese individual) is the merchant of record** and owns the tax obligations there. Google Commerce Limited (Ireland) is among the Google contracting entities named in the DDA. I could not verify which entity contracts with a Lebanon-based developer.

### Cited Findings
- DDA §3.4 (search summary of the live DDA): "Google is the merchant of record for Products sold or made available to users in the countries/territories described here. You are the merchant of record for Products You sell or make available via Google Play to all other users." Google acts "as Your agent", with You acting as a principal, in the listed countries. — [Google Play Developer Distribution Agreement](https://play.google/developer-distribution-agreement.html)
- Google's DDA change summary says §3.4 "was updated to link to a help center article with the countries/territories where Google acts as Your agent". Before that change the MoR role covered only the EEA and UK. — [DDA summary of changes](https://play.google/developer-distribution-agreement/summary.html); older text in [DDA archive v6](https://play.google/developer-distribution-agreement/archive-v6.html)
- Older DDA versions read: "Google is the merchant of record for Products sold in the European Economic Area and in the United Kingdom, and developers are the merchant of record for products sold to all other users." — [DDA archive v6](https://play.google/developer-distribution-agreement/archive-v6.html) (search summary)
- The 2022 DDA changes added that developers monetise their Product "on their own behalf and not as an agent or appointee on behalf of another person". — [DDA summary of changes](https://play.google/developer-distribution-agreement/summary.html) (search summary)
- Google Commerce Limited, an Irish company, appears in the DDA's definitions of "Google" across several versions. Which Google entity you contract with depends on location. — [DDA (ALL_ca locale)](https://play.google/intl/ALL_ca/developer-distribution-agreement.html) (search summary)
- (secondary) The current DDA is said to be effective **15 September 2025**. Its linked Help page reportedly listed **54 countries/territories** where Google is MoR on 17 Oct 2026, with the developer MoR elsewhere, **including the United States**. — [Newly: Who actually sells your app](https://newly.app/guides/who-actually-sells-your-app)

### Inferences
- For a Lebanon-based individual, Google is the seller of record (and handles VAT/GST) for buyers in the listed MoR territories: the EEA and UK, plus others on the Help list.
- Elsewhere the developer is legally the seller, even though Google processes the payment. In the US, Google is not MoR (per the secondary source) but still collects sales tax as a marketplace facilitator (see §2).
- The DDA's own definition of "Google" decides which entity contracts with a Lebanon resident. In versions I have seen (not verified here), the residual entity is Google LLC, with Google Ireland / Google Commerce Limited / Google Asia Pacific for other regions.

### Gaps
- I could not read the live DDA or the "merchant of record" Help article, so I could not confirm the 54-territory list, its contents, the 15 Sept 2025 effective date, or the contracting entity for a developer in Lebanon. The DDA may also have been amended after the March 2026 Epic settlement and the new fee model.

---

## 2. Where Google determines, charges and remits VAT/GST/sales tax, whether Lebanon is covered, and who is responsible elsewhere

### Takeaway
Google remits VAT/GST in the EU/EEA and UK and in a long list of other countries. Sources confirm Saudi Arabia (15%), UAE (5%), Egypt and India (GST), plus US sales tax in listed states. Outside that list, tax is the **developer's** responsibility: Google charges nothing unless the developer configures tax rates in Play Console, and if it does, Google passes the whole tax amount to the developer to remit. **No source showed Lebanon on Google's remittance list.** Lebanese VAT on sales to buyers in Lebanon therefore appears to be the developer's responsibility (unconfirmed).

### Cited Findings
- **Responsibility rule:** "responsibility for VAT is based on your VAT registration status". Where developers handle VAT themselves, "Google will pass on the entire tax amount collected to the developer." The tax rate set in Play Console is applied to existing tax-exclusive prices in tax-inclusive countries. — [Play Console Help: Tax rates and value-added tax (VAT)](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **EU:** Google is "responsible for charging, collecting, and remitting the VAT on sales" as a result of changes in EU VAT legislation. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **Saudi Arabia:** "Google is responsible for determining, charging and remitting 15% VAT to the appropriate authority for all Google Play Store paid app or in-app purchases by customers in Saudi Arabia." One summary added that developers registered for Saudi VAT can take on the responsibility themselves. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **UAE:** "Google is responsible for determining, charging, and remitting a 5% VAT ... for all Google Play Store paid app and in-app purchases by customers in the United Arab Emirates. If you're located outside of the United Arab Emirates, you don't need to calculate and send VAT separately for purchases by customers in the United Arab Emirates." — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **Egypt:** "Google is responsible for determining, charging, and remitting Egypt VAT ... for all Google Play Store paid app and in-app purchases made by customers in Egypt." Developers not registered for Egyptian VAT see VAT applied to the service fee. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **India:** for developers outside India, Google is responsible for setting, charging and remitting GST on all paid app and in-app purchases by customers in India. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- **US:** Google "remits sales tax in accordance with state and local sales tax requirements in the states listed" on the Help page. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary; I could not see the state list)
- **Older list (possibly out of date):** Albania, Morocco, Norway, Taiwan (VAT) and New Zealand (GST) are listed as countries where Google sets and remits tax. The same page gives Russia 18% and South Korea 10% (with an exception for Korea-based developers). — [Payments Center Help: Check or change sales tax rates](https://support.google.com/paymentscenter/answer/7161449) (search summary). Russia's 18% rate is pre-2019, so this page is likely old.
- **Developer inputs:** Google "cannot provide tax advice". Google determines and applies rates under local law, but product tax categories can change the rate. "If tax is the developer's responsibility and no inputs are provided at the country or jurisdiction level, Google sets no transaction taxes by default." Developers are "solely responsible for providing and maintaining accurate inputs, including tax categorization". Actual rates appear in Play Console financial reports. — [Play Console Help: Understanding your tax responsibilities on Google Play (answer 16408159)](https://support.google.com/googleplay/android-developer/answer/16408159?hl=en) (search summary)
- Consumer-side page: "in most locations, the developer is responsible for charging taxes (where applicable)". — [Google Play Help: Tax information for Google Play purchases](https://support.google.com/googleplay/answer/2850368?hl=en) (search summary)
- (secondary) Where Google is not MoR, the developer must decide whether a product is taxable, which rate applies, and remit the tax. — [Newly: Sales tax and VAT on app sales](https://newly.app/guides/sales-tax-and-vat-on-app-sales)
- **Turkey and Lebanon:** no Play-specific result came back for either. — searches of [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en)
- **Lebanon VAT background (secondary):**
  - Standard VAT is 11%.
  - In February 2026 the Cabinet approved a proposal to raise it to 12%; it needs parliamentary legislation and is reportedly not yet in force.
  - Lebanon has no published simplified regime for non-resident digital sellers. — [Kintsugi Lebanon VAT guide](https://trykintsugi.com/sales-tax-guides/middle-east/lebanon) (secondary); [VATupdate: Lebanon 2026 budget proposal](https://www.vatupdate.com/2025/09/23/lebanons-2026-budget-proposal-vat-deduction-limits-and-expanded-digital-enforcement-measures/) (secondary)

### Inferences
- A Lebanese seller does not need to register for VAT in the EU, UK, Saudi Arabia, UAE, Egypt or India just for Play sales: Google remits there and pays out net of that tax.
- **US:** Google collects and remits sales tax in the listed marketplace-facilitator states.
- **Countries not on Google's list:** the developer is MoR. Whether any local tax is due there is the developer's problem. If the developer enters a rate in Play Console, Google collects it and passes it through (minus nothing), and the developer must remit it. If no rate is entered, none is charged.
- **Lebanon:** because Lebanon does not appear on Google's lists, sales to Lebanese customers are most likely taxed only if the developer is VAT-registered in Lebanon and accounts for VAT itself. That is a domestic sale by a Lebanese resident. The Lebanese VAT threshold and treatment should come from the Lebanon-tax workstream.

### Gaps
- I could not read the full live country list, so I could not confirm Turkey, the full US state list, or Lebanon's absence directly from Google.
- Turkey's status for Play sales is unconfirmed: no Play-specific result. Do not use the 20% Google Cloud figure.
- One summary of the Saudi Arabia section says Google remits for all purchases; another says only when the developer is not VAT-registered there. The two may describe different paragraphs.

---

## 3. Is Google's service fee computed on the price net of tax?

### Takeaway
**Not confirmed from a source reachable in this session.** Google's monthly reports show user charge, tax and service fee as separate columns. My recollection of the Help pages (not verified here) is that the fee is taken on the price after tax is removed.

### Cited Findings
- Monthly reports give "a per-transaction breakdown of user charge, Google service fee and tax amount if applicable". — [Play Console Help: Download and export monthly reports](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en-AU) (search summary)
- In tax-inclusive countries, the tax rate set in Play Console is applied to existing tax-exclusive prices. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
- In Egypt, local VAT applies **to the service fee** for developers not registered for Egyptian VAT. In the UAE, local VAT does not apply to the service fee for UAE-based developers, though they may need to self-assess. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)

### Inferences
- The reports split the user charge, the tax and the fee, and Google remits VAT itself where it is MoR. The fee is therefore most likely computed on the tax-exclusive amount. Treat this as likely, not confirmed.
- Separately, some countries (e.g. Egypt) charge **VAT on Google's service fee** to a non-registered developer, which is an extra cost.

### Gaps
- I found no reachable Google sentence that explicitly says "the service fee is calculated on the price net of tax". The live [Service fees page](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) or the [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) example should be checked.

---

## 4. Service fees: the 15% subscription rate, the first-USD-1M tier with enrolment, and the 2025–2026 changes (Epic settlement, billing fee, billing choice)

### Takeaway
On 4 March 2026 Google settled with Epic worldwide and announced a new model. The **service fee** is separated from a **billing fee** (5% in the US, UK and EEA, charged only when Google Play Billing is used).

- **Auto-renewing subscriptions:** 10% service fee, whether earnings are under or over $1M.
- **Rollout by market:**
  - US, UK, EEA: 30 June 2026
  - Australia: 30 Sept 2026
  - Japan, Korea: by 31 Dec 2026
  - Rest of the world, including Lebanon and MENA buyers: by 30 Sept 2027

So a subscription sold through Google Play Billing still costs about **15% in total everywhere**: 10% + 5% in US/UK/EEA/AU, and the legacy 15% in the rest of the world. Billing fees for markets after the first group are "to be announced".

### Cited Findings
- **Legacy model (still the base outside migrated markets):** auto-renewing subscriptions at 15% "from day one" from 1 January 2022. — [TechCrunch, 2021](https://techcrunch.com/?p=2221893) (secondary)
- **Legacy 15% tier enrolment:** "When you've finished setting up your Account Group, you can enroll for the 15% service fee on the Associated developer accounts page." "For developers who complete enrollment after July 1, 2021 the 15% was applied starting from the date when enrollment was completed." The account group must include all associated developer accounts (ADAs) before enrolling. — [Play Console Help: Changes to Google Play's service fee in 2021](https://support.google.com/googleplay/android-developer/answer/10632485?hl=en) (search summary)
- (secondary) Legacy tier: 15% on the first $1M of earnings per year (combined across all accounts in the group), 30% above that. — [same search, third-party guides](https://help.passion.io/hc/en-us/articles/4402403678737-how-to-apply-for-google-15-service-fee-tier-program-to-pay-15-commission)
- **4 Mar 2026 announcement (read directly):** "introducing a new business model that decouples fees for using our billing system and introduces new, lower service fees". Billing: "For those developers who choose to use Google Play's billing system, they will be charged a market-specific rate separate from the service fee. In the European Economic Area (EEA), UK, and US that rate will be 5%." "Our service fee for recurring subscriptions will be 10%." New-install in-app purchases drop to a 20% service fee. Apps Experience / Level Up participants pay 20% on existing installs and 15% on new installs. Rollout: "By June 30: EEA, the United Kingdom and the US. By September 30: Australia. By December 31: Korea and Japan. By September 30, 2027: The updates will reach the rest of the world." "With these updates, we have also resolved our disputes worldwide with Epic Games." — [Android Developers Blog, Sameer Samat, 4 Mar 2026: A new era for choice and openness](https://developer.android.com/blog/posts/a-new-era-for-choice-and-openness)
- **24 Jun 2026 implementation post (read directly):** "we're separating our service fee from the billing fee. This starts on June 30, 2026, beginning with the United States, European Economic Area, and United Kingdom." "Regardless of whether you use Google Play's billing system, alternative billing, or external web links, the service fee starts at 10% on your first $1M (USD) in annual earnings. This 10% service fee also applies to all auto-renewing subscriptions." "For transactions that use Google Play's billing system, an additional billing fee applies. In the United States, United Kingdom, and the European Economic Area, the billing fee is set at 5%. We'll announce billing fee details for other markets soon. For transactions processed via alternative billing or external web links, the billing fee does not apply." New and existing installs are counted against "the date that the new fee structure launched in their region" (the user's region). — [Android Developers Blog, Paul Feng, 24 Jun 2026: Expanded billing choice and lower fees on Google Play](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play)
- **Rate card (image in the 24 Jun post, read directly):**

  | Annual earnings | Auto-renewing subscriptions (new and existing installs) | Other transactions, new installs | Other transactions, existing installs |
  |---|---|---|---|
  | First $1M (USD) | 10% + billing fee if applicable | 10% + billing fee | 10% + billing fee |
  | $1M+ (USD) | 10% + billing fee | 20% + billing fee | 25% + billing fee (20% for external web link transactions) |
  | Qualified for Level Up / Apps Experience | 10% + billing fee | 15% + billing fee | 20% + billing fee (15% for external web links) |

  — [Android Developers Blog, 24 Jun 2026](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play)
- **Release schedule (image in the same post):**

  | Date | Billing choice and fee changes | Level Up / Apps Experience |
  |---|---|---|
  | 30 Jun 2026 | EEA, UK, US | — |
  | 30 Sep 2026 | AU | AU, EEA, UK, US |
  | 31 Dec 2026 | JP, KR | JP, KR |
  | 30 Sep 2027 | Rest of world | Rest of world |

  — [same post](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play)
- **Billing choice program:** "available to all developers globally who provide digital services or content to users within the United Kingdom and the European Economic Area, alongside programs in the United States." Developers may offer alternative billing or link out to their website, and the service fee still applies. — [Android Developers Blog, 24 Jun 2026](https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play); [Play Console Help: Understanding Google Play's lower service fees (answer 16954621)](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en) (search summary): "a service fee is charged on all transactions regardless of whether the transaction uses Google Play Billing, Alternative Billing or external web links".
- **Reports:** starting in October 2026, the "Fee description" column of monthly reports is being updated for the new fee structures, "gradually rolled out by region". — [Download and export monthly reports](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en-AU) (search summary)
- **US litigation status:** in July 2026 Epic and Google jointly withdrew the motion to modify the injunction, and Google is complying with the October 2024 remedies decision. — [Alphabet Form 10-Q, Q3 2026 (SEC)](https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000084/goog-20260930.htm) (search summary)
- (secondary) Reports that since 1 October 2026 developers using alternative billing or external links must report qualifying transactions to Google. The search tool could not confirm this from a primary source. — [Help Net Security, 5 Mar 2026](https://www.helpnetsecurity.com/2026/03/05/google-play-store-changes-android-app-distribution/) and related search results

### Inferences
- **The new fees apply by the buyer's market, not the developer's country.** Wording such as "their region", "users within the UK and EEA" and "transacting user's install" points that way. For a Lebanese developer selling subscriptions through Google Play Billing (as of Nov 2026):
  - **Buyers in the US, UK, EEA (since 30 Jun 2026) and Australia (since 30 Sep 2026):** 10% service fee + 5% billing fee (AU billing-fee rate not confirmed) = about 15%. Moving those buyers to alternative billing or a web link would cut the Play fee to 10%. That brings back the developer's own payment-processing costs and makes the developer MoR for tax on those sales.
  - **Buyers in Lebanon, MENA and the rest of the world:** legacy 15% for auto-renewing subscriptions until the rest-of-world rollout, due **by 30 Sep 2027**.
  - **Buyers in Japan and Korea:** switch by 31 Dec 2026.
- For a subscription-only app, the old account-group enrolment for the 15% tier hardly matters, because subscriptions were already 15% from day one. Enrolling still matters for any one-time products sold in markets still under the legacy model.

### Gaps
- I could not read the live [Service fees page](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) or [answer 16954621](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en). Three points stay open:
  - whether account-group enrolment is still required for the 10% first-$1M tier under the new model;
  - the billing-fee rate for Australia and later markets;
  - whether the legacy rest-of-world rules have changed in any other way.
- I found no official confirmation that the 30 Sep 2026 Australia rollout happened on schedule.

---

## 5. Withholding: US tax forms (W-8BEN) and countries where Google withholds tax on developer earnings

### Takeaway
A non-US individual must submit **Form W-8BEN** in the payments profile. Google's FAQ says the form exempts international merchants from US tax reporting. Without it, Google may hold payouts and suspend processing. Google also **deducts local withholding tax (WHT) on sales to buyers in certain countries**, whatever the developer's own country:

- Brazil 25% (or 35% for tax-haven residents)
- Egypt up to 20% and Kuwait up to 5% (on carrier billing)
- Myanmar 2.5%, Sri Lanka up to 10%, Tanzania 5%, Taiwan 3% default, Kenya
- Saudi Arabia was in the first rollout in 2019 (current status unconfirmed)

The only way to avoid it is to stop distributing in those countries. Google issues an annual WHT statement. I found no Google source on Lebanon-specific withholding.

### Cited Findings
- **W-8BEN:** "If you're an international merchant based outside of the US, you're required to submit the Certificate of Foreign Status (Form W-8BEN) from your payments profile." US-based merchants submit a W-9. — [Play Console Help: Enter merchant tax information (answer 7163598)](https://support.google.com/googleplay/android-developer/answer/7163598?hl=en-GB) (search summary)
- "The IRS requires international merchants who process sales in the US to provide the Certificate of Foreign Status (Form W-8BEN) to be exempt from US tax reporting requirements." "If you don't provide the required information and certify that it's accurate, Google may take a range of actions including withholding merchant payouts and suspending processing of transactions." — [Play Console Help: Frequently asked questions (answer 7161649)](https://support.google.com/googleplay/android-developer/answer/7161649?hl=en) (search summary)
- The W-8BEN "may be used to claim a treaty benefit (in other words, a reduced rate of withholding)". Forms may be held for review if the legal name does not match the payments profile, or if the residence or mailing address is in the US or does not match the treaty country. — [Payments Center Help: US tax information reporting & withholding (answer 10349995)](https://support.google.com/paymentscenter/answer/10349995?hl=en) (search summary)
- Form 1099-K is filed for **US** developers with more than US$20,000 in gross sales and more than 200 transactions a year. — [Enter merchant tax information](https://support.google.com/googleplay/android-developer/answer/7163598?hl=en) (search summary)
- (Google Books, not Play) "only the portion of your revenue earned from US users is subject to US withholding taxes and reporting for documented non-US persons". — [Google Play Books Partner Center Help: Submit your US tax information](https://support.google.com/books/partner/answer/10722804?hl=en) (search summary). This is a different product; do not apply it to Play app sales without checking.
- (secondary) A missing or invalid form triggers 30% default withholding, and a W-8BEN expires after three years. Not found on Google's own pages. — [1 Person Finance: W-8BEN for non-US app developers](https://1personfinance.com/w8ben-non-us-app-developers/); [Newly: App store tax forms](https://newly.app/how-to/app-store-tax-forms)
- **Local WHT on Play sales**
  - **Brazil:** WHT is "25% of the customer price", made of 15% IRRF and 10% CIDE. Sellers based in a country Brazil designates as a tax haven have an extra 10% IRRF withheld. "Brazil withholding taxes are deducted from your earnings if you are paid in non-BRL currency." UAE-based developers may reduce the Brazilian IRRF under the double tax treaty by uploading a tax residency certificate. — [Play Console Help: Withholding tax (WHT) (answer 9384608)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (search summary)
  - **Egypt:** "up to 20%" WHT on direct carrier billing sales to Egyptian customers. — [Withholding tax (WHT)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (search summary)
  - **Kuwait:** "up to 5%" WHT on direct carrier billing sales. — [Withholding tax (WHT)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (search summary)
  - **Other countries:** Myanmar up to 2.5%, Sri Lanka up to 10%, Tanzania 5% of gross sales revenue. Taiwan defaults to 3% WHT on all transactions with Taiwan users if the developer does not supply the required information. Kenya also applies WHT. — [Withholding tax (WHT)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) and [Payments Center version](https://support.google.com/paymentscenter/answer/9384608?hl=en) (search summaries)
  - **Treaties and opting out:** withholding may be reduced if your country has a tax treaty with the country where you earn. "The only way to opt-out of withholding taxes is to remove your app from distribution in the countries where withholding taxes apply." Google "provides an annual withholding tax statement, which reflects the withholding rates and amounts deducted ... by country for the calendar year". — [Withholding tax (WHT)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (search summary)
- **2019 announcement:** "Where Google or our payment processor partners are required to withhold taxes, we may need to deduct those amounts from our payments to developers." Saudi Arabia, Kuwait and Myanmar were the first rollout countries. — [Android Developers Blog, May 2019: Supporting Google Play developers regarding local market withholding tax regulations](https://android-developers.googleblog.com/2019/05/supporting-google-play-developers.html) (search summary)
- **Developer-residence rules:**
  - **India:** Google withholds 0.1% of the customer price (excluding GST) from an India-resident developer who gave a PAN, and 5% without a PAN. — [Tax rates and VAT](https://support.google.com/googleplay/android-developer/answer/138000?hl=en) (search summary)
  - **Vietnam:** payments to Vietnam-based developers for sales to Vietnamese users are subject to withholding. — [Google Help: Tax residency information and Non-US withholding & reporting (answer 13401799)](https://support.google.com/product-documentation/answer/13401799?hl=en) (search summary)
- (secondary) Lebanon applies non-resident WHT of 8.5% on services and 3.4% on goods. This is Lebanese domestic law on payments **to** non-residents, not a Google deduction. — [Kintsugi Lebanon VAT guide](https://trykintsugi.com/sales-tax-guides/middle-east/lebanon) (secondary)

### Inferences
- **US:** with a valid W-8BEN on file, a Lebanese individual's Play subscription earnings are treated as foreign-person income exempt from US information reporting. The US has no income tax treaty with Lebanon (from general knowledge; not verified here), so a treaty rate cannot be claimed. The W-8BEN only certifies foreign status.
- **Buyer-country WHT:** expect deductions on sales to buyers in Brazil, carrier-billed sales in Egypt and Kuwait, and the other listed markets, possibly including Saudi Arabia. These reduce net proceeds. Whether a credit is available in Lebanon is a Lebanese-tax question. Brazil's tax-haven surcharge applies only if Brazil lists Lebanon as a tax haven (not checked).

### Gaps
- I could not see Google's full current WHT country table. In particular, Saudi Arabia's current status and the Egypt/Kuwait rules for non-carrier payments are unconfirmed.
- Google's own wording on whether **any** US withholding applies to non-US Play developers with a valid W-8BEN, and on the 30% default without one, could not be read.
- The IRS W-8BEN instructions could not be reached (irs.gov blocked).

---

## 6. Payments (merchant) profile: can a Lebanon resident create one and sell paid subscriptions?

### Takeaway
**Yes.** Google's "Supported locations for developer and merchant registration" table marks **Lebanon ✔ for developer registration and ✔ for merchant registration**, so a Lebanon-resident individual can sell paid apps and subscriptions under a Lebanese payments profile. No foreign address or bank is needed. The payments profile must carry the developer's real legal name and address, and the bank account must be in the profile's country.

### Cited Findings
- The table entry reads: "Location: Lebanon; Supports Google Play Developer Registration: ✔; Supports Merchant Registration: ✔; Developer Default Currency: LBP". "Default currency is based on the location of the developer's payments profile." A footnote says developers in some countries are paid in USD or EUR depending on location. — [Play Console Help: Supported locations for developer and merchant registration (answer 9306917)](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en) (search summaries from two separate queries)
- (secondary) A third party counted **214 locations, 163 marked for merchant registration**, in the table on 21 Oct 2026. — [Newly: Google Play merchant account](https://newly.app/how-to/google-play-merchant-account) (secondary)
- "Before you start, make sure your location is supported for developer and merchant registration." The bank account must be "registered in the same country listed in your payments profile". — [Play Console Help: Create a payments profile (answer 7161426)](https://support.google.com/googleplay/android-developer/answer/7161426?hl=en) (search summary)
- "The Google Play Console uses a Google payments profile to verify the legal name and address of all developer accounts." — [Play Console Help: Update developer identity details managed by a Google payments profile (answer 16260648)](https://support.google.com/googleplay/android-developer/answer/16260648?hl=en) (search summary)
- (secondary) A Play Console account's link to its payments profile is permanent. — [Newly: Google Play merchant account — "It Is a Payments Profile, and the Link Is Permanent"](https://newly.app/how-to/google-play-merchant-account) (secondary, title claim)

### Inferences
- Since Lebanon is supported, the "register through another country" workaround is not needed. It would also clash with Google's identity checks (legal name and address verified through the payments profile), its tax certification (W-8BEN residence must match) and its same-country bank rule.
- The default currency "LBP" is odd given Lebanon's banking crisis. Payouts in practice go by **USD wire** (see §7); the developer should confirm in Play Console what currency the profile shows.

### Gaps
- I could not read the table directly. Lebanon's ✔/✔ status rests on search-engine summaries of the live page, which agree with each other, plus the Lebanon section of the wire-transfer page (§7).
- Explicit Google rules forbidding a payments profile in a country where the person does not live were not found in reachable text.

---

## 7. Payouts for Lebanon: method, currency, threshold, timing, fees and bank-account rules

### Takeaway
Merchants in Lebanon are paid by **international wire transfer from the United States, in US dollars**, to a Lebanese bank account (SWIFT/BIC + IBAN) in the payments-profile country.

- **Timing:** about the **15th of the following month** for the previous month's orders.
- **Minimum payout:** **US$100** for USD wire payouts (US$1 for local-currency EFT). Google recommends at least US$100 because wire fees can exceed US$50.
- **Arrival:** 5–7 business days after the payout is sent.

### Cited Findings
- "Merchants in Lebanon receive payments via wire transfer from the United States, and payouts will arrive in US Dollars." Lebanon appears on Google's list of locations paid by wire. Required fields: account holder name, bank name, SWIFT-BIC, IBAN, and optional intermediary bank details. — [Play Console Help: Payouts via wire transfer (answer 2700656, Filipino locale)](https://support.google.com/googleplay/android-developer/answer/2700656?hl=fil) and [Enter merchant bank account information (answer 7161440)](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en) (search summary)
- The bank account must be able to receive EFT or wire transfers and must be in the same country where the merchant account is registered. It is denominated in the country's currency (EFT) or USD (wire). — [Enter merchant bank account information](https://support.google.com/googleplay/android-developer/answer/7161440?hl=en) (search summary)
- Google recommends a minimum threshold of $100 for wire payouts because wire fees can exceed $50. Funds can take 5–7 business days to arrive. — [wire-transfer / bank-account Help pages](https://support.google.com/googleplay/android-developer/answer/2700656?hl=fil) (search summary). Merchants can change their payout threshold. — [Payments Center Help: Change merchant payout threshold (answer 7163445)](https://support.google.com/paymentscenter/answer/7163445?hl=en) (search result title)
- "Orders processed, refunded, or charged-back from the 1st of a given month to the end of the month will get paid out around the 15th of the following month." The earned balance must reach **US$1 for local-currency payouts or US$100 for USD wire transfers**. The payments profile updates within 24 hours of a payout. — [Play Console Help: Order processing and payouts (answer 137997)](https://support.google.com/googleplay/android-developer/answer/137997?hl=en) (search summary); see also [Payments Center: Merchant payout schedule](https://support.google.com/payments/merchant/answer/7159355?hl=en)
- Bank verification uses a small test deposit confirmed in Play Console, or an uploaded official bank statement. — [Create a payments profile](https://support.google.com/paymentscenter/answer/7161426?hl=en) (search summary)
- (secondary) Changing bank details close to the 15th can trigger a verification hold that pushes the payout back by a cycle. — [ExtensionBooster: payment pending checklist](https://extensionbooster.net/blog/google-play-console-payment-pending-developer-payout-fix-guide/) (secondary)

### Inferences
- Balances under US$100 roll over to the next month. Intermediary and receiving-bank wire charges come out of the amount received, so small developers should hold balances higher.
- **Practical Lebanese point (not from Google):** the account should be one that can receive and release incoming international USD wires as "fresh" dollars, given post-2019 banking restrictions. The Lebanon-banking workstream should confirm this.
- The "account holder name" field and the identity checks suggest the account should be in the developer's own name. Google's text asks for the holder's name but, in what I could read, does not explicitly forbid a third-party account.

### Gaps
- I found no explicit Google statement that the bank account must be in the developer's own legal name, though name mismatches are said (secondary) to cause payout problems.
- I found no Google statement of any fee Google itself charges for wires. The ">$50" figure refers to wire fees in general.

---

## 8. Developer account requirements: registration fee, identity verification, D-U-N-S, and the closed-testing rule

### Takeaway
- **Fee:** a one-time US$25 registration fee (secondary sources).
- **Identity:** personal accounts verify legal name and address through the payments profile and a government ID (secondary detail).
- **D-U-N-S:** organisation accounts must match their D-U-N-S record.
- **Closed testing:** personal accounts created after 13 Nov 2023 must run a **closed test with at least 12 testers opted in continuously for 14 days** before applying for production. This rule was still in force in November 2026.

### Cited Findings
- "Developers with personal accounts created after November 13, 2023, must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days." "Testers who opt in, test for fewer than 14 days, and then opt out do not count toward the requirement." — [Play Console Help: App testing requirements for new personal developer accounts (answer 14151465)](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) (search summary)
- (secondary) The requirement was lowered from 20 to 12 testers; sources disagree whether this happened in Dec 2024 or 2025. Organisation accounts are exempt. Review of the production-access application usually takes 7 days or less. — [PrimeTestLab](https://primetestlab.com/blog/google-play-changed-20-to-12-testers); [ontest.app](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained) (secondary)
- (secondary) "As of 2 September 2026, Google's Get started with Play Console page lists a US$25 one-time registration fee, paid by credit or debit card." — [ConsoleMint: Google Play Console price](https://consolemint.com/google-play-console-price/) (secondary)
- Play Console uses the payments profile to verify the legal name and address of all developer accounts. Organisations must match their D-U-N-S (Dun & Bradstreet) record exactly. — [Update developer identity details (answer 16260648)](https://support.google.com/googleplay/android-developer/answer/16260648?hl=en); [Required information to create a Play Console developer account (answer 13628312)](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) (search summaries)
- (secondary) Personal accounts upload a government photo ID, verify a phone number, must be 18+, and may need to prove access to a real Android device through the Play Console app. — [Going Stellar: Play developer account 2026](https://goingstellar.ro/research/google-play-developer-account-2026-personal-vs-organization/) (secondary)
- (secondary, unconfirmed) Mandatory "Android developer verification" for all new personal accounts from September 2026, with existing accounts in early 2027. — [TesterBee](https://testerbee.com/blog/google-play-developer-verification-2026) (secondary; not confirmed by other sources)

### Inferences
- A Lebanese individual needs a Google account, the US$25 card payment, a government ID matching the payments-profile legal name and Lebanese address, 12+ testers for 14 days, and then a production-access application. A D-U-N-S number is not needed for a personal account.

### Gaps
- I could not read the official "Get started with Play Console" page, so the US$25 fee is confirmed by secondary sources only.
- Requirements and dates for the 2026 Android-wide developer verification were not confirmed from Google.

---

## 9. Reports and invoices available for bookkeeping

### Takeaway
Play Console offers **monthly earnings reports** with a per-transaction breakdown (user charge, Google service fee, tax) and an **Invoice ID** that ties to Google's invoice, plus payout records in the payments profile. Google also issues an **annual withholding-tax statement**. A **VAT invoice** can be requested in the Google Payments Center where VAT is charged.

### Cited Findings
- Monthly reports give "a per-transaction breakdown of user charge, Google service fee and tax amount if applicable". The "Invoice ID" column "aligns with the number displayed on your invoice". From October 2026 the "Fee description" column is being updated for the new service-fee structures. — [Play Console Help: Download and export monthly reports (answer 6135870)](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en-AU) (search summary)
- If you're normally charged VAT on Google Play purchases, you can request a VAT invoice in the Google payments center. — [Play Console Help: Billing, reporting, and order cancellation issues (answer 9037917)](https://support.google.com/googleplay/android-developer/answer/9037917?hl=en) (search summary)
- The payments profile updates within 24 hours of a payout. — [Order processing and payouts](https://support.google.com/googleplay/android-developer/answer/137997?hl=en) (search summary)
- Google provides "an annual withholding tax statement, which reflects the withholding rates and amounts deducted from your earnings proceeds by country for the calendar year". — [Withholding tax (WHT)](https://support.google.com/googleplay/android-developer/answer/9384608?hl=en) (search summary)
- Actual tax rates applied appear in Play Console financial reports; visibility varies by jurisdiction. — [Understanding your tax responsibilities on Google Play](https://support.google.com/googleplay/android-developer/answer/16408159?hl=en) (search summary)
- (secondary) Earnings reports list every payout-related line for the prior month: charges, Google fees, taxes, refunds and adjustments. — [Smartbills: Google Play Console receipts, earnings reports and invoices](https://smartbills.io/en/guides/how-to-get-a-google-play-console-receipt) (secondary)

### Inferences
- **Bookkeeping set per month:** the earnings report (gross, tax, fee, net by country and transaction), the payout record and the bank wire advice. Add the per-period service-fee invoice referenced by Invoice ID, and the annual WHT statement as evidence of foreign tax deducted.

### Gaps
- I could not confirm the issuing entity of the service-fee invoice, whether it is a VAT invoice for a Lebanese developer, or whether Lebanese reverse-charge VAT would apply to Google's service fee. The Lebanon-tax workstream should check this.
