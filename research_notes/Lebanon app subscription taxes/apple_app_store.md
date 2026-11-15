# Apple App Store: taxes, fees, programs and payouts for an individual developer resident in Lebanon selling auto-renewable subscriptions worldwide (as of 15 November 2026)

Source versions used (Apple pages read on 2026-11-15):
- **Apple Developer Program License Agreement (DPLA)**, https://developer.apple.com/support/terms/apple-developer-program-license-agreement/. The page states: "Developer Program License Agreement, including its Schedule 1 last updated October 29, 2026. Schedule 2 & 3 last updated October 13, 2026. Exhibits to Schedule 2 & 3 last updated August 27, 2026." The Schedule 2 heading on the page carries the date "October 29, 2026". Apple says the version accepted in the developer's account is the binding one.
- **App Store Connect Help pages.** These show no revision date, so read them as "current at 2026-11-15".
- **Apple Developer News posts.** Dated individually below.
- **Secondary sources.** Marked **[SECONDARY]**.

## 1. Apple's legal role under Schedule 1 / Schedule 2 (agent, commissionaire, deemed supplier) and who is the "merchant of record"

### Takeaway
For paid apps and in-app purchases, including subscriptions, the developer is the **principal**. Apple acts as an **agent** (Apple Inc. in the US; Apple Canada; Apple Pty Ltd in Australia and New Zealand; Apple Services LATAM; iTunes KK in Japan) or as a **commissionaire**. Apple Distribution International Ltd (ADI, Cork, Ireland) is the commissionaire for most of the world, including **Lebanon**, the EU, the UK, the Gulf, Egypt, Türkiye and India. Apple Services Pte Ltd is the commissionaire for some Asia-Pacific storefronts. Apple collects the price, invoices the end user and concludes the sale in its own name where it is commissionaire. The EULA is between the developer and the end user. The DPLA never uses the terms "merchant of record" or "marketplace facilitator". Deemed-supplier treatment appears only country by country in Exhibit C (New Zealand, Australia).

### Cited Findings
- **Schedule 2 §1.1:** the developer appoints Apple and its subsidiaries as "(i) Your agent for the marketing and delivery of the Licensed Applications to End-Users located in those regions listed on Exhibit A, Section 1 … and (ii) Your commissionaire for the marketing and delivery of the Licensed Applications to End-Users located in those regions listed on Exhibit A, Section 2". "Licensed Application" includes "any content, functionality, extensions, stickers, or services offered in the software application" (§1.1(c)). For auto-renewable subscriptions, "End-User" also includes Group Members of a Group Purchase (§1.1(b), added in the 13 Oct 2026 revision). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Apple News, 13 Oct 2026](https://developer.apple.com/news/?id=17mwd36z)
- **Schedule 2 §1.3:** "their relationship under this Schedule 2 is, and shall be, that of principal and agent, or principal and commissionaire … You, as principal, are, and shall be, solely responsible for any and all claims and liabilities involving or relating to, the Licensed Applications". The appointment is non-exclusive. — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §1.2(e):** Apple is authorised to "issue invoices for the purchase price payable by End-Users". **§3.1:** "As Your agent and/or commissionaire, Apple shall be solely responsible for the collection of all prices payable by End-Users". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §4.1:** "title, risk of loss, responsibility for, and control over the Licensed Applications shall, at all times, remain with You". **Exhibit D §1:** the EULA "is concluded between You and the End-User only, and not with Apple". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit A, Section 1 (agent):**
  - Apple Canada, Inc.: Canada.
  - Apple Pty Limited (APL): Australia, New Zealand.
  - Apple Inc.: United States, "as Your agent pursuant to California Civil Code §§ 2295 et seq.".
  - Apple Services LATAM LLC: Latin America and the Caribbean, including Brazil, Mexico, Chile and Argentina.
  - iTunes KK: Japan, under Article 643 of the Japanese Civil Code.

  — [DPLA Exhibit A](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit A, Section 2 (commissionaire).** ADI is the commissionaire for a long list of regions that **includes Lebanon**, as well as all EU states, the UK, Switzerland, Norway, Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman, Jordan, Iraq, Egypt, Türkiye, Israel, India, Indonesia, China, Hong Kong, Taiwan, Singapore, Malaysia, Philippines, Thailand, Vietnam, Russia, Ukraine, Pakistan, Nigeria, South Africa and others. Apple Services Pte. Ltd. is the commissionaire for Bhutan, Brunei, Cambodia, Laos, Macau, Maldives, Micronesia, Mongolia, Myanmar, Nepal, Palau, Sri Lanka, Korea, Fiji, Nauru ("Naoero" in the agreement), Papua New Guinea, Solomon Islands, Tonga and Vanuatu. Apple defines "commissionaire" as "an agent who purports to act on their own behalf and concludes agreements in their own name but acts on behalf of other persons, as generally recognized in many Civil Law legal systems." — [DPLA Exhibit A](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 1 (free apps):** headed "1. Appointment of Agent", so for free apps and free IAP content Apple is agent only. — [DPLA Schedule 1](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Deemed supplier, New Zealand (Exhibit C §10.2.1(c)):** "APL is the operator of the electronic marketplace in respect of supplies made by You … and is treated as the supplier of those supplies under s. 60C of the GST Act 1985". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Deemed supplier, Australia (Exhibit C §1):** for non-resident developers, APL treats sales as "inbound intangible consumer supplies" made through APL and issues all tax invoices to end users in its own name. The developer must not issue tax invoices. — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Japan:** since 1 April 2025, Apple (iTunes K.K.) is a "Specified Platform Operator" and collects 10% JCT on sales by non-Japan-based developers. — [Apple News, 6 Feb 2025](https://developer.apple.com/news/?id=bdl07n0d)
- **Apple's US 1099 note:** "Sales on the App Store are between you and the customer. You're the seller of copyrighted works, and we make payments to you for products or goods". — [App Store Connect Help: Manage invoices and other tax documents](https://developer.apple.com/help/app-store-connect/manage-tax-information/manage-invoices-and-other-tax-documents)
- **EU alternative payments (Attachment 14 §5.1(B)):** for sales made through alternative payment processing or out-of-app offers, "You act as the seller in Your own name and on Your own account". This contrasts with sales through Apple IAP. — [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- "Marketplace facilitator", "deemed supplier" and "merchant of record" do not appear anywhere in the DPLA text (full-text search of the 653,656-character page). The only electronic-marketplace wording is the New Zealand clause. — [DPLA](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

### Inferences
- **Legal form vs tax form.** The developer is the legal seller (principal) under the contract. Apple, as the party that contracts with and collects from the customer in its own name (commissionaire) or as the electronic-marketplace operator, is in practice the "merchant of record" towards customers. In EU-style VAT systems, a commissionaire, or an electronic interface operator taking part in the supply, is generally treated as buying and reselling the service. That is general VAT knowledge, not Apple's wording.
- **Lebanese buyers.** For buyers in Lebanon, the contracting Apple entity is ADI (Ireland) acting as commissionaire.
- **US.** For US buyers, Apple Inc. is a disclosed agent. US state sales tax is collected by Apple (see Q2), consistent with US marketplace-facilitator laws, but the DPLA itself does not use that term.

### Gaps
- Apple publishes no official statement using the term "merchant of record". Its characterisation for each country's VAT law beyond NZ, Australia and Japan is not spelled out in the DPLA.

## 2. Where Apple calculates, collects and remits VAT/GST/sales tax/DST, and whether Lebanon is on the list

### Takeaway
Apple's official list is **Exhibit B to Schedule 2** (Exhibits last updated 27 Aug 2026). It has 94 regions, including **all 27 EU states, the UK, the US, Saudi Arabia, UAE, Oman, Bahrain, Egypt, Türkiye, India, Switzerland, Norway, Australia, New Zealand, Canada, Japan** (non-resident developers only) and others. **Lebanon is NOT on Exhibit B.** Under Exhibit B §2, the developer is "solely responsible for the collection and remittance" of any tax on sales to customers in non-listed regions, including Lebanon. Other notable non-listed storefronts: Israel, Jordan, Iraq, Kuwait, Qatar, Pakistan, Hong Kong, Brazil and Argentina.

### Cited Findings
- **Schedule 2 §3.2:** where a sale "is subject to any sales, use, goods and services, value added, telecommunications or other similar tax or levy … responsibility for the collection and remittance of that tax … will be determined in accordance with Exhibit B to this Schedule 2 as updated from time to time via the App Store Connect site." — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit B §1:** "If taxes apply, Apple shall collect and remit to the competent tax authorities the taxes described in Section 3.2 of Schedule 2 … located in the following regions":

  Albania, Armenia, Australia, Austria, Azerbaijan, Bahamas, Bahrain, Barbados, Belarus, Belgium, Benin, Bhutan, Bosnia and Herzegovina, Bulgaria, Canada, Cambodia\*\*, Cameroon, Chile, China\*, Colombia, Congo, Croatia, Cyprus, Czech Republic, Denmark, Egypt, Estonia, Finland, France, Georgia, Germany, Ghana, Greece, Hungary, Iceland, India, Indonesia\*\*, Ireland, Italy, Ivory Coast, Japan\*\*\*, Kazakhstan\*\*, Kenya, Korea\*\*, Kosovo, Kyrgyzstan\*\*, Laos, Latvia, Lithuania, Luxembourg, Malaysia, Malta, Mauritius, Mexico\*\*\*\*, Moldova, Morocco, Nepal\*\*, Netherlands, New Zealand, Nigeria, Norway, Oman, Peru, Philippines\*\*, Poland, Portugal, Romania, Russia\*\*\*, Saudi Arabia, Serbia, Senegal, Singapore\*\*, Slovakia, Slovenia, South Africa, Spain, Suriname, Sweden, Switzerland, Taiwan, Tajikistan\*\*, Tanzania, Thailand\*\*, Türkiye, Ukraine, United Arab Emirates, Uganda, United Kingdom, United States, Uruguay†, Uzbekistan\*\*, Vietnam††, Zambia, Zimbabwe.

  — [DPLA Exhibit B](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit B footnotes:**
  - \* China: Apple collects only certain taxes required by the Chinese government. The developer is otherwise responsible.
  - \*\* "Solely applicable to non-resident Developers". Local developers self-account, and Apple estimates VAT before computing the commission.
  - \*\*\* Japan and Russia: non-resident developers only.
  - \*\*\*\* Mexico: special rules for developers registered for Mexican VAT.
  - † Uruguay: only certain digital-transaction taxes.
  - †† Vietnam: Apple collects for non-resident developers and local individual developers, but not for local corporate developers.

  A Lebanon-resident developer is "non-resident" in all of these countries, so the \*\* and \*\*\* footnotes mean Apple collects there for them. — [DPLA Exhibit B](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit B §2:** "Apple shall not collect and remit the taxes described in Section 3.2 of Schedule 2 … located in the regions not listed above in Section 1 of this Exhibit B. You shall be solely responsible for the collection and remittance of such taxes as may be required by local law." — [DPLA Exhibit B](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **US (Exhibit C §15.2):** "If Apple, in its reasonable belief, determines that any state or local sales, use or similar transaction tax may be due … Apple will collect and remit those taxes". If Apple has not collected such a tax, "You shall remain primarily liable for the tax". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Canada (Exhibit C §3.2(d)):** for non-registered, non-resident developers, "Apple Canada will charge, collect and remit GST/HST" and QST/PST (§3.3–3.4). The commission charged to them is zero-rated. — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Recent additions to Exhibit B (dated Apple News posts):**
  - Azerbaijan and Peru (VAT 18%), 6 Feb 2025: [Apple News](https://developer.apple.com/news/?id=bdl07n0d)
  - Philippines (VAT 12% for developers based outside the Philippines), 21 Aug 2025: [Apple News](https://developer.apple.com/news/?id=yo2104n5)
  - Bhutan (GST 5%) and Mauritius (VAT 15%), 29 Jan 2026: [Apple News](https://developer.apple.com/news/?id=gvnljl3f)
  - Morocco (VAT 20%) and Republic of the Congo (VAT 18%), 27 Aug 2026: [Apple News](https://developer.apple.com/news/?id=artln8br)
- **Tax-rate changes Apple applied in the same period:**
  - Türkiye digital sales tax cut from 7.5% to 5%; Kazakhstan VAT up from 12% to 16%; Russia VAT up from 20% to 22% (29 Jan 2026): [Apple News](https://developer.apple.com/news/?id=gvnljl3f)
  - Tanzania DST up from 2% to 3% (27 Aug 2026): [Apple News](https://developer.apple.com/news/?id=artln8br)
  - Canada DST "no longer applicable"; Estonia VAT 24%; Romania VAT 21% (21 Aug 2025): [Apple News](https://developer.apple.com/news/?id=yo2104n5)
- **Effect on subscriptions:** when taxes change, Apple's automatic price equalisation updates do NOT change subscription prices ("Prices won't change in any region if your In‑App Purchase is an auto‑renewable subscription"). For subscriptions, a new or higher tax therefore lowers proceeds unless the developer changes prices. — [Apple News, 27 Aug 2026](https://developer.apple.com/news/?id=artln8br); [Apple News, 29 Jan 2026](https://developer.apple.com/news/?id=gvnljl3f)
- **Tax category:** Apple's tax engine uses "your tax category selection in App Store Connect, app metadata, legal entity status, tax registration status, customer attributes". The default category is "App Store software". Other categories include Fitness and health, Software training material, Books and Video. "Proceeds are calculated based on the price … minus any applicable taxes". — [App Store Connect Help: Set a tax category](https://developer.apple.com/help/app-store-connect/manage-app-information/set-a-tax-category)
- **Developer liability for the tax category (Schedule 2 §3.2):** the developer "is solely responsible for selecting and maintaining accurate inputs for tax categorization". If a tax authority deems the category inaccurate, "You are solely responsible for the tax consequences". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **[SECONDARY]** A third-party guide says Apple collects in "the 94 regions listed in Exhibit B". This matches my count of the 27 Aug 2026 list. — [appsops.store](https://appsops.store/blog/app-store-tax-vat-gst-territories) (via search snippet; not opened)

### Inferences
- **Lebanon.** Lebanon is in Exhibit A §2 (ADI commissionaire) but not in Exhibit B. So Apple sells to Lebanese customers through ADI but adds and remits **no Lebanese VAT**. Any Lebanese VAT on those sales is the developer's own responsibility, and for subscriptions it would come out of the developer's proceeds. Whether Lebanese VAT (or any other Lebanese tax) actually applies to a resident individual's App Store sales depends on Lebanese law, such as VAT registration thresholds and how sales made through a foreign commissionaire are treated. That question is outside Apple's documentation.
- **Requested countries.** EU (all 27), UK, US (state and local sales tax), Saudi Arabia, UAE and Türkiye (VAT and DST) are covered by Apple. So are India, Egypt and Japan, Japan only for non-Japan-based developers.

### Gaps
- Apple publishes no list of the tax rates it applies per storefront. Rates appear only in the "Tax and price updates" news posts and in each app's "All Prices and Currencies" view.
- I did not check whether any news post after 27 Aug 2026 (none found in the RSS feed up to 22 Oct 2026) changed Exhibit B again.

## 3. Where the developer remains responsible for tax, and Apple's position on the developer's own income tax

### Takeaway
The developer remains responsible for:
- (a) indirect tax in every region not on Exhibit B, including **Lebanon**, Israel, Jordan, Iraq, Kuwait, Qatar, Pakistan, Hong Kong, Brazil and others;
- (b) any tax, withholding or levy Apple does not collect (Schedule 2 §3.6);
- (c) the consequences of a wrong tax category;
- (d) all income tax on proceeds (Exhibit C §15.3; Schedule 2 §8).

Apple reports some data to tax authorities, but says this does not change the developer's own obligations.

### Cited Findings
- **Schedule 2 §3.6:** if the commission or price is subject to "(i) any withholding or similar tax; or (ii) any sales, use, goods and services, value added, telecommunications or other tax or levy not collected by Apple under Section 3.2 hereof; or (iii) any other tax or other government levy of whatever nature, the full amount of that tax or levy shall be solely for Your account, and shall not reduce the commission". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit C §15.3 (US):** "In the event that You incur liability for income tax, franchise tax, business and occupation tax, or any similar taxes based on Your income, You shall be solely responsible for that tax." — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §8:** the relationship "may have important legal and/or tax consequences for You … it is Your responsibility to consult with Your own legal and tax advisors". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Exhibit C §16 (developers selling through ADI's Exhibit A §2 regions, which include Lebanon):** "in the event Apple Distribution International Ltd. is subject to any sales, use, goods and services, value added, or other tax or levy with respect to any remittance to You, the full amount of such tax or levy shall be solely for Your account … any invoice issued by You to Apple Distribution International Ltd. will be limited to amounts actually due to You, which amounts shall be inclusive of any value added or other tax". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Brazil (Exhibit C §2.1):** Brazil is not on Exhibit B. The developer has "sole responsibility for … any indirect taxes liability … filing of indirect tax returns and payment of indirect taxes to the Brazilian government, if applicable". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **China and Uruguay:** footnotes \* and † of Exhibit B leave other taxes to the developer. — [DPLA Exhibit B](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Reporting to tax authorities (13 Oct 2026 revision, Schedule 2 §3.3(a)):** "any information You provide to Apple under this Schedule 2 may be disclosed by Apple to the applicable tax authorities to the extent required under applicable law". Apple's change note says Apple "will report legally required information such as tax, sales, and contact details to tax authorities". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Apple News, 13 Oct 2026](https://developer.apple.com/news/?id=17mwd36z)
- **OECD MRDP reporting:**
  - Apple reports developers who "reside in certain jurisdictions that have implemented MRDP and that sell apps that offer personal services" to Irish Revenue and/or the CRA.
  - Pre-recorded, non-customised digital content "would typically not be considered a personal service".
  - "MRDP doesn't change your tax obligations … you remain responsible for determining whether the proceeds you receive from Apple are subject to tax in any relevant jurisdiction".

  — [App Store Connect Help: Model Reporting Rules for Digital Platforms](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-information-for-model-reporting-rules-for-digital-platforms)
- **Taxes on Apple's commission are applied only for developers based in specific countries.** Apple applies local VAT/GST/SST/FCT on its commission for developers resident in Canada, Chile, Japan, Korea, Malaysia, Mexico, Singapore, Thailand and Vietnam (Exhibit C §§3, 4, 6, 7, 8, 9, 12, 14, 17). Lebanon has no such section. — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Commissions and fees exclude tax:** "As is standard for business transactions, commissions and fees don't include taxes … the applicability of tax depends on … Your business location". — [App Store Connect Help: Understanding taxes](https://developer.apple.com/help/app-store-connect/making-payments-to-apple/understanding-taxes)

### Inferences
- Apple deducts no Lebanese tax on its commission, and no Exhibit C section covers Lebanon. Whether Lebanon requires a resident to self-account (reverse charge) for VAT on services bought from ADI (the commission) is a Lebanese-law question for the Lebanon tax research strand.
- Income tax on App Store proceeds is entirely the Lebanese resident's own matter. Apple neither withholds Lebanese income tax nor issues Lebanese tax certificates.

### Gaps
- I could not confirm whether Lebanon has implemented the OECD MRDP. If not, MRDP reporting would not apply to a Lebanon resident in any case.

## 4. Is Apple's commission charged on the price net of VAT, and how are proceeds calculated

### Takeaway
Yes. Where Apple collects tax (Exhibit B regions), the commission is a percentage of the customer price **net of taxes Apple collected**, and proceeds = customer price − taxes collected − commission. Where Apple collects no tax (for example Lebanon), the commission is computed on the full price. Any tax the developer owes there "shall not reduce the commission".

### Cited Findings
- **Schedule 2 §3.4(a):** "For purposes of determining the commissions to which Apple is entitled under this Section 3.4(a), the prices payable by End-Users shall be net of any and all taxes collected, as provided in Section 3.2 of this Schedule 2." — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §3.4, closing paragraph:** "Except as otherwise provided in Section 3.2 …, Apple shall be entitled to the commissions specified in Section 3.4 hereof without reduction for any taxes or other government levies". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §3.5:** Apple "shall deduct the full amount of its commission …, and any taxes collected by Apple under Section 3.2 and 3.4 hereof, and shall remit to You … the remainder". Apple is entitled to the commission "even if Apple is unable to collect the price … from that End-User". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Proceeds:** "This is the Customer Price minus applicable taxes and Apple's commission, per Schedule 2 of your Paid Apps Agreement." — [App Store Connect Help: View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Locally resident developers:** for them, Apple "will estimate the VAT amount … The estimated tax will be deducted from the price payable by End-Users … prior to the calculation of Apple's commission" (Exhibit B, footnote \*\*). — [DPLA Exhibit B](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Payments page, "Taxes and Adjustments" column:** "the net of all input taxes, adjustments, or withholding taxes for that region". "Withholding tax represents amounts withheld by Apple and remitted to taxing authorities". — [App Store Connect Help: Payment information](https://developer.apple.com/help/app-store-connect/reference/reporting/payment-information)
- **Estimated vs actual proceeds** can differ "due to changes in the foreign exchange rate by the time of payment, and any applicable withholding tax, which is applied when the payment is made". — [App Store Connect Help: View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Small Business Program definition:** "proceeds (sales net of Apple's commission and certain taxes and adjustments)". — [Apple: App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)

### Inferences
- **Worked logic (illustrative only, not Apple figures).** A subscription priced at €9.99 in an EU state with 20% VAT has a net-of-VAT price of €8.325. Under the Small Business Program the commission is 15% of €8.325 = €1.25, so proceeds are about €7.08.
- **Lebanon.** A USD 4.99 sale in Lebanon has no tax deducted by Apple. The commission is 15% of USD 4.99 and proceeds are about USD 4.24, from which the developer must fund any Lebanese tax due.
- Apple's "All Prices and Currencies" view in App Store Connect shows the exact proceeds per storefront ([Set a tax category](https://developer.apple.com/help/app-store-connect/manage-app-information/set-a-tax-category)).

### Gaps
- None material.

## 5. Tax forms (W-8BEN etc.), US withholding, the Lebanon–US treaty question, and other countries' withholding

### Takeaway
Every developer must complete a US tax form. A non-US individual gets **Form W-8BEN** through an interview in App Store Connect, which can also lead to W-8BEN-E or W-8ECI. Apple characterises App Store sales as sales of copyrighted works / products (a "sales/commission" model), not royalties. Apple Finance has stated, as relayed on Apple's forum, that **app sales by non-US developers are not subject to US withholding or reporting**, so a treaty claim is not needed. On that basis the absence of a US–Lebanon income tax treaty should not cause 30% US withholding. The DPLA keeps a general right to withhold (§3.7). Non-US withholding or income taxes that do reduce proceeds include:
- **Brazil:** withholding on remittances out of Brazil, the 10% CIDE (since May 2025) and the 3.5% IOF (since Aug 2025);
- **Vietnam:** 5% personal income tax for individual developers based outside Vietnam (since Aug 2025);
- DSTs collected by Apple (for example Türkiye 5%, Tanzania 3%).

### Cited Findings
- "All developers must complete a US tax form to comply with the Paid Apps Agreement … If you're based outside the United States, the W-8BEN, W-8BEN-E, or W-8ECI may be required, but you'll be prompted to answer a series of questions to direct you to the most appropriate tax form and any applicable certification." Once submitted, the form cannot be changed in App Store Connect ("contact us"). Tax forms can be submitted only after signing the Paid Apps Agreement. — [App Store Connect Help: Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- **Exhibit C §15.1:** "If You are not a resident of the United States for U.S. federal income tax purposes, You will complete Internal Revenue Service Form W-8BEN and/or any other required tax forms". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §3.3:** if tax documentation required under Exhibit C is missing, "Apple may decide to not remit those amounts to You, and to hold those amounts in trust" until it is provided (no interest). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §3.7:**
  - "If Apple reasonably believes that such tax is due, Apple will deduct the full amount of such withholding … and will pay the full amount withheld over to the competent tax authorities."
  - "Apple will apply a reduced rate of withholding tax, if any, provided for in any applicable income tax treaty only if You furnish Apple with such documentation".
  - "Upon Your timely request … Apple will use commercially practical efforts to report to You the amount of Apple's payment of withholding".

  — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Apple's characterisation (official, current):** Apple "won't issue a US 1099-MISC tax form. Sales on the App Store are between you and the customer. You're the seller of copyrighted works, and we make payments to you for products or goods, which are specifically exempt from reporting on Form 1099-MISC." 1099-K forms go only to US-based developers. — [App Store Connect Help: Manage invoices and other tax documents](https://developer.apple.com/help/app-store-connect/manage-tax-information/manage-invoices-and-other-tax-documents)
- **[SECONDARY: Apple Finance reply relayed by a developer, Sep 2020]:** "Since the App Store contracts are characterized as a 'sales/commission' agreement, as opposed to a 'royalty' agreement, there is no tax withholding for sales in the USA App and Book Stores … application sales by non-U.S. developers or publishers on the App Store or Book Store are not subject to U.S. tax withholding or reporting. Therefore, completion of Part III - Claim of Tax Treaty Benefits, is not required … you are not required to provide a U.S. taxpayer identification number (TIN)". Another community member (Aug 2022) instead claimed 0% under the "Article 7 - Business Profits" article of a treaty. — [Apple Developer Forums thread 660025](https://developer.apple.com/forums/thread/660025)
- **[SECONDARY]** A May 2026 "Foreign Country US Withholding Tax Schedule", which takes its rates from the IRS treaty table "Patent" column, lists **Lebanon at 30%**, consistent with Lebanon having no US income tax treaty. — [AST, US Withholding Tax Schedule 2026 (PDF)](https://www.ast.com/wp-content/uploads/2026/05/Foreign-Country-US-Withholding-Tax-Schedule_2026.pdf) (via search snippet; not opened)
- **Brazil withholding:**
  - Exhibit C §2.3: "To the extent withholding taxes are applicable on remittances out of Brazil …, the Collecting Entity will deduct the full amount of such withholding tax … and will pay the amount withheld to the competent Brazilian tax authorities in Your name."
  - §2.4: a reduced treaty rate applies only after Apple approves a tax-residence certificate.
  - The help page says that without a certificate "your sales in Brazil may be subject to the applicable withholding tax at the standard rate. If your region is denied under the Brazilian legislation, no reduced rate of withholding is available."

  — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [App Store Connect Help: Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
- **Brazil CIDE and IOF:** from 16 May 2025, proceeds in Brazil were reduced by "CIDE tax introduction of 10% for developers based outside of Brazil". From 21 Aug 2025, by the "Imposto sobre Operações Financeiras (IOF) of 3.5%". — [Apple News, 16 May 2025](https://developer.apple.com/news/?id=wim4cztw); [Apple News, 21 Aug 2025](https://developer.apple.com/news/?id=yo2104n5)
- **Vietnam (from 21 Aug 2025):** "Individual developers based outside of Vietnam: Personal income tax (PIT) introduction of 5%, replacing the corporate income tax (CIT)", and VAT for non-resident organisations rose from 5% to 10%. — [Apple News, 21 Aug 2025](https://developer.apple.com/news/?id=yo2104n5)
- **Mexico** income-tax withholding applies to Mexico residents only (Exhibit C §9). **Nepal's** 5% advance income tax applies only to Nepal-based bank accounts ("Apple isn't responsible for deducting or remitting this tax"). — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Other countries' forms:** extra tax forms are listed only for developers *based in* Australia, Brazil, Canada, Ireland, Mexico, Singapore, South Korea, Taiwan and Thailand. Brazil adds an optional treaty-residency certificate for non-residents. Canada adds optional GST506/FP-2506-V for non-residents who are registered. — [App Store Connect Help: Provide tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)

### Inferences
- **Forms for a Lebanon-resident individual:** the US W-8BEN, by interview, and no other country's form is mandatory. Uploading a Lebanese tax-residence certificate for Brazil would help only if Lebanon and Brazil have a double-tax treaty (unverified; see Gaps).
- **US withholding in practice.** Because Apple treats App Store income as sales income ("products or goods"), US withholding should be 0% for a Lebanon resident without a US trade or business, regardless of the missing treaty. The 30% statutory FDAP rate would matter only if income were treated as royalties. The exact current interview wording should be checked in App Store Connect.

### Gaps
- irs.gov could not be reached from this research session (blocked host). I could not check the IRS "United States Income Tax Treaties – A to Z" list directly to confirm that Lebanon has no US treaty. The only support is the secondary AST schedule showing a 30% rate. **This should be verified on irs.gov.**
- I found no current, first-hand Apple page (only a relayed 2020 Apple Finance email) that states "0% US withholding on App Store sales for non-US developers". Apple's W-8BEN tip sheets sit inside App Store Connect behind login.
- Whether Brazil denies treaty relief for Lebanon (that is, whether a Lebanon–Brazil treaty exists), and the standard Brazilian withholding rate Apple applies, were not checked.

## 6. Tax invoices, self-billed invoices and reports usable for Lebanese bookkeeping

### Takeaway
For a Lebanon-based developer, Apple issues **no** self-billed invoice, recipient-created tax invoice or tax-on-commission invoice. Those exist only for developers based in specific countries (Australia, Ireland, Canada, Japan, Malaysia, Mexico, Singapore, South Korea, Thailand). The usable records are:
- the monthly **Financial Reports** and the **Payments** page (earned, taxes and adjustments, exchange rate, proceeds, payment date, Transaction ID/CCI);
- the Schedule 2 §3.5 monthly sales report;
- the **Brazil withholding certificate** and monthly statements if the app sells in Brazil;
- on request, a report of withholding Apple paid (§3.7).

### Cited Findings
- **Tax-on-commission invoices** "are available in relation to commissions paid by developers based in the following countries or regions": Canada, Japan, Malaysia, Mexico, Singapore, South Korea, Thailand. — [App Store Connect Help: Manage invoices and other tax documents](https://developer.apple.com/help/app-store-connect/manage-tax-information/manage-invoices-and-other-tax-documents)
- **Self-billed invoices** "are available to developers who are based in" Australia (Recipient Created Tax Invoice, ABN plus GST registration) and Ireland (IE Self Billing Invoice, Irish VAT ID). — [App Store Connect Help: Manage invoices and other tax documents](https://developer.apple.com/help/app-store-connect/manage-tax-information/manage-invoices-and-other-tax-documents)
- **Brazil:** "If you sell content on the App Store in Brazil, an annual withholding tax certificate can be downloaded in App Store Connect". Monthly withholding information for Brazil and Mexico is available under Reports → Tax Statements. — [App Store Connect Help: Manage invoices and other tax documents](https://developer.apple.com/help/app-store-connect/manage-tax-information/manage-invoices-and-other-tax-documents)
- **Schedule 2 §3.5:** "No later than forty-five (45) days following the end of each monthly period, Apple will make available to You on the App Store Connect site a sales report in sufficient detail to permit You to identify the Licensed Applications sold in that monthly period and the total amount to be remitted to You". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Report timing:** financial reports "are made available for the previous fiscal month's earnings by the first Friday of the current fiscal month". They use "the Apple fiscal calendar" and include only paid transactions Apple could collect. — [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Payments page:** shows per region: Units Sold, Earned, Taxes and Adjustments (with a breakdown of withholding and input taxes), Total Owed, Exchange Rate, Proceeds and Payment Date. "The payment date displayed … is the date the payment leaves Apple's bank". — [App Store Connect Help: Payment information](https://developer.apple.com/help/app-store-connect/reference/reporting/payment-information)
- **Payment record:** each payment carries a seven-digit Transaction ID, the Consolidated Credit Identifier (CCI), which appears in the bank transfer details. — [App Store Connect Help: View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Transaction tax report:** a report showing sales/use/GST taxes applied is available "for US and Canadian transactions" in Payments and Financial Reports. — [App Store Connect Help: Set a tax category](https://developer.apple.com/help/app-store-connect/manage-app-information/set-a-tax-category)
- **Invoices from the developer to ADI:** Exhibit C §16 contemplates that the developer may issue an invoice to ADI, "limited to amounts actually due to You … inclusive of any value added or other tax". — [DPLA Exhibit C](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

### Inferences
- For Lebanese bookkeeping, the developer would typically keep the monthly Financial Reports (per region and currency) plus the bank credit (CCI) as evidence of income. If Lebanese rules require an invoice for each supply, the developer could issue their own invoice to ADI, which Exhibit C §16 allows. Whether Lebanese law requires that is a question for the Lebanon tax strand.

### Gaps
- Apple's 1099-K, self-billing and tax-on-commission documents do not cover Lebanon. I found no Apple statement about issuing any document to Lebanon-based developers beyond the reports above.

## 7. App Store Small Business Program, the subscription 15% after one year, and 2025–2026 changes (EU, Japan/Brazil, US)

### Takeaway
**Small Business Program (SBP).**
- A reduced 15% commission applies to developers (including all their Associated Developer Accounts) with ≤ USD 1,000,000 proceeds in the prior calendar year, and to new developers.
- To enrol, the developer must be the Account Holder, accept the Paid Apps Agreement and list Associated Developer Accounts.
- The 15% starts 15 days after the end of the fiscal month in which enrolment is approved.
- Exceeding USD 1M in a year reverts the rest of that year to the standard rate.

**Standard rate.** 30%, dropping to 15% for renewals after a subscriber has accrued more than one year of paid service in a Subscription Group (with a retention grace period of up to 60 days).

**2025–2026 changes:**
- **EU:** from 1 Oct 2026, single terms under Attachment 14. Apple IAP is **26%**, or **15%** for SBP members or subscriptions after year one. Alternative payments are 20%/10%, out-of-app offers 15%/10%, and alternatively distributed apps pay a 5% Core Technology Commission. The Core Technology Fee is gone.
- **Japan and Brazil (iOS):** Attachment 12. Apple IAP is 21% + 5% processing fee, or 10% + 5% for SBP members or subscriptions after year one.
- **US storefront:** apps may include buttons and external links to other purchase methods. Whether Apple may charge a commission on linked-out purchases is still being litigated.

### Cited Findings
- **Schedule 2 §3.4(a):** "Apple shall be entitled to a commission equal to thirty percent (30%) of all prices payable by each End-User. Solely for auto-renewing subscription purchases made by customers who have accrued greater than one year of paid subscription service within a Subscription Group … Apple shall be entitled to a commission equal to fifteen percent (15%) … for each subsequent renewal." A "Retention Grace Period" (a gap between subscriptions) is "no greater than 60 days, subject to change". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Schedule 2 §3.4(b), SBP terms:**
  - The reduced commission is "15% of all prices payable by each End-User for sales of Licensed Applications to End-Users located in those regions listed in Exhibit B of this Schedule 2".
  - Eligibility: "no more than $1,000,000 in total proceeds (sales net of Apple's commission and certain taxes and adjustments) during the twelve (12) fiscal months occurring in the prior calendar year".
  - "Once the total proceeds … exceeds $1,000,000 in the current calendar year, You will be charged the standard commission rate … for the remainder of the calendar year."
  - "Apple will determine eligibility and approve qualified Developers … within fifteen (15) days of the end of each fiscal calendar month."
  - Associated Developer Accounts are defined by >50% ownership or ultimate decision-making authority. Misuse means disqualification, and Apple "may withhold payments".

  — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **SBP page:**
  - "reduced commission rate of 15% on paid apps and Apple In-App Purchases".
  - "Existing developers who made up to 1 million USD in proceeds in the prior calendar year …, as well as developers new to the App Store, can qualify".
  - To enrol: "Be an Account Holder …, Review and accept the latest Paid Apps agreement (Schedule 2 …), and … list all of your Associated Developer Accounts".
  - "Your proceeds will be adjusted fifteen (15) days after the end of the fiscal calendar month in which your enrollment is approved."
  - Eligibility is measured in USD. Developers with non-USD bank accounts convert using public end-of-fiscal-month rates.

  — [Apple: App Store Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- **Possible conflict on regions.** §3.4(b) limits the 15% SBP rate to "End-Users located in those regions listed in Exhibit B" (Lebanon is not in Exhibit B), while the SBP web page states no regional limit. — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); contrast [SBP page](https://developer.apple.com/app-store/small-business-program/)
- **EU Attachment 14 (effective "October 1, 2026, or the date on which You sign this Agreement including this Attachment 14, whichever is later"; replaces the Alternative Terms Addendum and the StoreKit External Purchase Link Addendum for the EU):**
  - **§3.5(B), Apple IAP:** "Apple's commission rate for the sale of Licensed Applications is twenty-six percent (26%)", and 15% for SBP participants, Video/Mini Apps partner programs, or "a qualifying auto-renewing subscription purchase beyond one year".
  - **§3.5(A), alternative payment processing:** 20%, or 10% for SBP / second year onward of a subscription.
  - **§3.5(C), out-of-app offers:** 15% store services commission, or 10% in the same cases, on sales started within 7 days of a link tap.
  - **§4, Core Technology Commission:** 5% on sales in alternatively distributed apps.
  - **§5.3:** the developer handles taxes on alternative-payment sales.

  — [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Apple's EU page:**
  - "Apps distributed in the EU are now subject to a single set of terms … The Core Technology Fee … has been replaced by the Core Technology Commission, a simple 5% commission … The new terms also eliminate the Initial Acquisition Fee and Store Services Fee."
  - Its table lists IAP at "26%" and "15%" (SBP, Mini Apps, Video Partner, "auto-renewable subscriptions after their first year").
  - "As of October 1, 2026, these terms have been superseded by Attachment 14".

  — [Apple: Updates for apps in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/); [Apple News, 18 Aug 2026](https://developer.apple.com/news/?id=gmws0jgp); [Apple News, 18 Aug 2026 (DPLA)](https://developer.apple.com/news/?id=0cgo95n6)
- **Earlier EU step (26 Jun 2025):** Apple introduced an initial acquisition fee, a store services fee and the CTC for EU link-outs, and planned a single business model by 1 Jan 2026. — [Apple News, 26 Jun 2025](https://developer.apple.com/news/?id=awedznci)
- **Stale EU statement on the SBP page.** The SBP page still says "For developers on the alternative terms in the EU in the App Store Small Business Program and for subscriptions after their first year, Apple will offer a further reduced commission of 10%". This reflects the superseded alternative terms. Under Attachment 14 the 10% applies only to alternative payment or out-of-app sales, and IAP stays at 15%. — [SBP page](https://developer.apple.com/app-store/small-business-program/); [DPLA Attachment 14](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Japan and Brazil (Attachment 12; Japan added Dec 2025, Brazil added 18 Jun 2026):**
  - "The terms in this Section 3.5 apply to iOS Applications distributed on the Japan and/or Brazil storefront(s)".
  - Apple IAP commission is "twenty-one percent (21%)", or 10% for SBP / subscriptions beyond one year, and "there is additionally a five percent (5%) fee for the App Store's payment processing and related commerce services".
  - Alternative payments are 21%/10%. Out-of-app offers are 15%/10%. The CTC is 5%.

  — [DPLA Attachment 12](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/); [Apple News, 17 Dec 2025](https://developer.apple.com/news/?id=76371du6); [Apple News, 18 Jun 2026](https://developer.apple.com/news/?id=umq9wxmm)
- **US storefront:**
  - The App Review Guidelines (Last Updated 16 Oct 2026) exempt "the United States storefront" from the ban on "buttons, external links, or other calls to action" to other purchase methods (3.1.1, 3.1.3).
  - Schedule 2 §3.11 repeats "except for the United States storefront, where this prohibition does not apply".
  - The DPLA contains no US commission on linked-out purchases.

  — [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **[SECONDARY] Court status:**
  - In December 2025 the Ninth Circuit upheld the contempt finding but allowed Apple to charge a commission limited to costs "genuinely and reasonably necessary" for linked-out purchases, and sent the case back to the district court.
  - A Ninth Circuit panel reversed its own stay of the mandate (29 Apr 2026).
  - The Supreme Court denied Apple's application to stay the mandate (6 May 2026).
  - The district court is setting the allowed commission. No final figure was found.

  — [MacRumors, 29 Apr 2026](https://www.macrumors.com/2026/04/29/epic-games-wins-reversal-app-store-fee-battle/); [Fenwick](https://www.fenwick.com/insights/publications/ninth-circuit-largely-upholds-ruling-in-epic-v-apple); [PocketGamer.biz](https://www.pocketgamer.biz/supreme-court-rejects-apples-bid-to-pause-epic-games-contempt-ruling/) (all via search snippets; not opened)

### Inferences
- **Commission rates for an SBP member selling subscriptions through Apple IAP** (assuming Attachment 12 applies by storefront, which the text suggests):

  | Storefronts | Year 1 | After year 1 |
  |---|---|---|
  | Standard | 15% | 15% (the two reductions do not stack outside the alternative-payment schedules) |
  | EU | 15% | 15% |
  | Japan / Brazil | 10% + 5% fee = 15% | 10% + 5% fee = 15% |

- **Without the SBP:** 30% falls to 15% after one year of paid service per subscriber. In the EU the rates are 26% and 15%. In Japan and Brazil they are 21% + 5% and 10% + 5%.
- **Region wording.** The §3.4(b) "Exhibit B regions" wording could, read literally, mean the 15% SBP rate does not apply to sales in non-Exhibit-B storefronts such as Lebanon, Israel, Qatar or Kuwait. The SBP page states no regional limit. This should be confirmed in the developer's actual Financial Reports or with Apple.

### Gaps
- No Apple text confirms whether Attachment 12 rates apply automatically to every iOS app on the Japan and Brazil storefronts or only after an election. §3.5(A) of Attachment 12 suggests automatic application.
- The final US linked-purchase commission (if any) after remand was not found. It is likely to change after November 2026.

## 8. Enrolling as an individual in Lebanon: availability, fee, Paid Apps Agreement, banking, thresholds, payment timing, foreign bank accounts

### Takeaway
Enrolment as an individual needs:
- an Apple Account with two-factor authentication;
- legal age of majority;
- the legal name, which becomes the App Store seller name;
- an address that is not a P.O. box;
- the **USD 99/year** fee, charged in local currency where available, or by a USD credit card form where Apple Store Online is unavailable.

Apple says enrolment "may not be supported in certain regions, for example due to sanctions". Lebanon is not named either way, but it is a listed App Store region (Exhibit A §2).

To be paid, the developer must:
- sign the Paid Apps Agreement (Schedule 2);
- submit tax forms (W-8BEN);
- add **one** bank account. The bank country is chosen separately, and the bank account holder name does not have to match the developer's legal entity name, but it must match the bank's records;
- pass the minimum threshold, which is **USD 40** for any bank country or currency not in Apple's table (Lebanon is not in it).

Payment is made by wire/EFT **within 45 days of the end of each Apple fiscal month**, consolidated per currency, net of any intermediary bank fees.

### Cited Findings
- **Enrolment requirements:** "an Apple Account with two-factor authentication turned on and be the legal age of majority in your region". "If you're an individual or sole proprietor/single-person business, your personal legal name will be listed as the seller on the App Store". — [Apple: Enrollment support](https://developer.apple.com/support/enrollment/)
- "Email, phone, and address. P.O. boxes are not accepted." — [Apple: Enroll](https://developer.apple.com/programs/enroll/)
- **Fee:** "The Apple Developer Program annual fee is 99 USD …, in local currency where available. Prices may vary by region". "If Apple Developer products are not available on your region's Apple Store Online, you'll be presented with a credit card form. Please make your purchase with a credit card that can be charged in USD." Individuals paying by card "must use your own credit card". "When applicable, your membership purchase will be taxed using the tax rate for your region". — [Apple: Enrollment support](https://developer.apple.com/support/enrollment/)
- **Restrictions:** "Enrollment may not be supported in certain regions, for example due to sanctions or other restrictions." — [Apple: Enrollment support](https://developer.apple.com/support/enrollment/)
- **Sanctions (Schedule 2 §7.3(vi)):** Apple may stop distributing apps if "You or anyone representing You or Your company are subject to sanctions of any region in which Apple operates". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Requirements to be paid:** "Have a Paid Apps Agreement in effect … Provide banking information … Payments are sent to the primary bank account on file … Payments to multiple or split bank accounts aren't supported … Exceed the minimum monthly payment threshold … Complete any monthly invoicing requirements". — [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Timing:** "payments are made to the bank account and the currency you provided within 45 days of the last day of the fiscal month in which the transaction was completed." Payments go by direct deposit or EFT, low-value transfers when available. "Apple's bank consolidates proceeds for each currency …, resulting in a single payment to your bank per fiscal month." Payments "may be subject to bank fees and transaction costs charged by your bank or intermediate financial institutions". — [App Store Connect Help: Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments)
- **Schedule 2 §3.5:** remittances "(i) are made by means of wire transfer only; (ii) are subject to minimum monthly remittance amount thresholds; (iii) require You to provide certain remittance-related information …; and (iv) … will be made no later than forty-five (45) days following the close of the monthly period in which the corresponding amount was received by Apple". Apple's bank may convert into the developer's "Designated Currency", and "You remain responsible for any fees (e.g., wire transfer fees) charged by Your bank or any intermediary banks". — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Threshold:** "All other bank countries or regions and bank account currencies must exceed a minimum payment threshold of 40 USD." The listed exceptions, mostly 0.02 USD, cover EU/EEA EUR accounts, the US (USD), UK (GBP/EUR), UAE (AED), India (INR) and others. Lebanon is not in the table. — [App Store Connect Help: Minimum payment threshold](https://developer.apple.com/help/app-store-connect/reference/reporting/minimum-payment-threshold)
- **Bank details required:**
  - Bank country or region ("Select your bank country or region").
  - Local clearing or routing code, searchable by bank name or city.
  - Account number of "the legal entity or individual enrolled", and the IBAN "if applicable".
  - Account currency ("choose the primary currency of the bank account").
  - Checking or savings.
  - Account holder details "exactly as it appears on your bank account or your payment may be rejected".
  - Tax forms must be submitted before Apple processes banking information.
  - Apple's banking partners may ask for extra documents "in certain regions".

  — [App Store Connect Help: Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information)
- **Banking field definitions:**
  - "Bank Territory: The country or region for the branch of your bank."
  - "If you can't identify your bank in App Store Connect, it may be that Apple can't send payments to that bank."
  - Account holder name must use English letters or digits.
  - "The account holder name for your bank account doesn't have to match the legal entity name for your agreement."
  - "Bank Account Currency … This is also the currency you will be paid in."

  — [App Store Connect Help: Banking information](https://developer.apple.com/help/app-store-connect/reference/reporting/banking-information)
- **Exchange rate and dates:** "Our bank converts payment amounts into the currency of your bank account … typically the spot rate on the date of payment and no more than three business days prior to the date the proceeds are received". Payment information appears "starting the first Wednesday of the current fiscal month". A payment below the threshold is carried forward as a "Balance Carried Forward". — [Overview of receiving payments](https://developer.apple.com/help/app-store-connect/getting-paid/overview-of-receiving-payments); [View payments and proceeds](https://developer.apple.com/help/app-store-connect/getting-paid/view-payments-and-proceeds)
- **Withheld payments:** Apple may withhold payments while it calculates refunds when the agreement terminates, or if it suspects fraud (Schedule 2 §7.1). It may also hold amounts in trust if tax documentation is missing (§3.3) or the tax category is wrong (§3.2). — [DPLA Schedule 2](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

### Inferences
- **Paying in.** Lebanon has no Apple Store Online, so the USD 99 fee would likely be paid through the USD credit-card form. This is an inference from Apple's wording. Lebanon is not named as restricted.
- **Bank outside Lebanon.** Apple's docs nowhere require the bank to be in the developer's country of residence: the bank country is a free choice and the holder name need not match the agreement's legal entity. So a bank account outside Lebanon (for example in the UAE or an EU country) in the developer's own name appears to be allowed, provided Apple can find the bank in App Store Connect. A UAE AED account or a EUR account at an EU bank would have a 0.02 USD threshold instead of USD 40. This is inference, not an explicit Apple statement, and any Lebanese tax or foreign-exchange consequences are outside Apple's docs.
- **"About 33 days".** The figure in the brief is not in Apple's current documentation. Apple commits only to "within 45 days" of fiscal month-end. In practice payments usually land in the first days of the second fiscal month after the sale, but I found no Apple source for a 33-day figure.

### Gaps
- No Apple page explicitly confirms that Lebanese banks (or a specific Lebanese bank) are selectable in App Store Connect, or how payments to Lebanese banks are routed (USD correspondent banking). I found no reliable developer reports on Lebanese bank payouts.
- I found no current Apple page that publishes the fiscal-calendar payment dates (the URLs I tried returned "not found").
- I found no Apple statement that names Lebanon as unrestricted for enrolment.

## 9. Is Lebanon an App Store storefront, and in what currency are Lebanese customers charged

### Takeaway
Yes. Lebanon (ISO "LBN") is an App Store storefront and is listed in Exhibit A §2 (ADI as commissionaire). Apple reports Lebanon in the **"Rest of World" (region code WW) financial-report region, in USD**, which indicates that Lebanese customers are charged in US dollars. Apple adds no Lebanese tax to the price (Lebanon is not on Exhibit B).

### Cited Findings
- Lebanon (LBN) is listed in Apple's table of App Store storefronts for pricing and availability start times. — [App Store Connect Help: App Store pricing and availability start times by country or region](https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/app-store-pricing-and-availability-start-times-by-country-or-region)
- Lebanon is in Exhibit A, Section 2 (Apple Distribution International Ltd. as commissionaire). — [DPLA Exhibit A](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
- **Financial report regions:** "Rest of World | USD | WW | … Jordan, Kazakhstan, Kenya, Kuwait, Kyrgyzstan, Lebanon, Liberia, Libya …". By contrast, Saudi Arabia (SAR), UAE (AED), Qatar (QAR), Egypt (EGP), Israel (ILS) and Türkiye (TRY) have their own currencies. — [App Store Connect Help: Financial report regions and currencies](https://developer.apple.com/help/app-store-connect/reference/reporting/financial-report-regions-and-currencies)
- **Storefront and currency counts:** the App Store supports "43 currencies across 175 storefronts" (Jan and Aug 2026 posts). Posts in 2025 said 44 currencies. — [Apple News, 27 Aug 2026](https://developer.apple.com/news/?id=artln8br); [Apple News, 30 Oct 2025](https://developer.apple.com/news/?id=nomqoqfm)
- Payment information is displayed "in the corresponding currency of each region where sales occur". — [App Store Connect Help: Payment information](https://developer.apple.com/help/app-store-connect/reference/reporting/payment-information)

### Inferences
- Lebanese customers pay App Store prices in USD, the report currency of the Rest-of-World region. A Lebanon-resident developer selling to Lebanese users therefore earns USD proceeds booked by ADI, with no tax deducted by Apple.
- Proceeds from the many other countries reported in local currencies (EUR, GBP, SAR, AED and so on) are converted by Apple's bank into the developer's chosen bank-account currency.

### Gaps
- I did not retrieve a page that states "Lebanon storefront customer price currency = USD" directly. This is inferred from the financial-report region currency. The App Store Connect price-point export, which needs a login, would confirm it.
