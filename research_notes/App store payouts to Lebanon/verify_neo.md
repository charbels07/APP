# Verification: neo by Bank Audi (and Bank Audi External Account) for App Store / Google Play payouts and store fees (checked 15 November 2026)

> **Method.** Every page below was fetched with curl on **15 Nov 2026** and read in full, not taken from search snippets. neo's web pages show no publication date (footer "Copyright 2026 neo"), so their date here is **"live 15 Nov 2026"**. PDFs give their own date.
>
> **Could not be reached this session:**
> - `pwstg02.blob.core.windows.net` (Bank Audi's PDFs: key-facts sheets, Operations tariff, the old "Neo Digital Branch" sheet), `play.google.com`, `apps.apple.com` and `bankaudigroup.com`: refused by the session proxy (CONNECT 403).
> - `www.bdl.gov.lb`: answered with a Cloudflare challenge page.
> - `www.neo.com.lb/neoBusiness`: returns "404 - Page Not Found".
>
> **Labels:**
> - **VERIFIED** = read on an official neo or Bank Audi page or PDF.
> - **CORRECTED** = the official text differs from the earlier note (`bank_audi_neo.md`).
> - **STILL UNCONFIRMED** = no official text found or read.

## 1. What neo is: accounts, currencies, packages, onboarding, neo Business

### Takeaway
neo is Bank Audi's app-only digital bank. It opens Fresh USD and Fresh LBP accounts automatically, and other currencies can be added. There are two packages:
- **Entry**: now **free**, no card;
- **Standard**: **USD 1.99 a month**, one physical and one digital debit card.

Sign-up is limited to people **aged 18 or over who hold Lebanese nationality**. A business account can be requested through a contact form, but its conditions are not published.

### Cited Findings
- **Official description: VERIFIED.**
  - "neo is a groundbreaking Digital Banking platform from Bank Audi" ([neo FAQ](https://www.neo.com.lb/english/faq), live 15 Nov 2026).
  - "neo is the latest digital innovation by Bank Audi" ([neo home](https://www.neo.com.lb/), live 15 Nov 2026).
  - The footer reads "List of Banks No 56 - BDLN: 26-07-01".
- **Account types: VERIFIED.**
  - "neo offers Fresh LBP and Fresh USD Accounts, additionally you can open accounts in the following currencies: EUR, SAR, QAR, AED, and GBP" ([FAQ](https://www.neo.com.lb/english/faq)).
  - "Upon onboarding, we will automatically open a Fresh LBP and USD accounts for you at NO COST."
  - **Minor inconsistency on neo's own pages:**
    - the [Packages](https://www.neo.com.lb/english/packages) page lists additional accounts as "EUR, GBP, AED & SAR", with no QAR;
    - the home page says "LBP, USD, EUR, GBP, SAR & AED";
    - the FAQ says "up to 7 currencies".
- **Packages and fees: VERIFIED for Standard, CORRECTED for Entry.**
  - The Packages page (live 15 Nov 2026) shows "Entry Package Free" ("without the need for a bank card") and "Standard Package $1.99 / Month" ("one digital and one physical card for free").
  - The brochure ([neoBROCHURE20Feb24](https://neofiles.blob.core.windows.net/files/Assets/ContentFiles/neoBROCHURE20Feb24_112218.pdf); file name 20 Feb 2024, PDF created 24 May 2024) said "Entry Plan ($0.99 monthly charge)". Entry is now free.
  - Paying the stores by card requires **Standard**: the Entry package's physical card is marked "not-included" on the Packages page, and the brochure shows N/A for both cards.
- **Eligibility: VERIFIED. This is new.**
  - "If you are 18 years or older & holding a Lebanese nationality, you're eligible to sign up on neo App." ([FAQ](https://www.neo.com.lb/english/faq))
  - So a non-Lebanese developer cannot open neo.
- **Onboarding: VERIFIED.**
  - "All you need is your phone, national ID, or passport and 5 minutes of your time or less" ([home](https://www.neo.com.lb/)).
  - The FAQ lists the steps: e-mail and mobile OTP, "Scan your Documents", "Take a selfie", personal details, eKYC, package choice, and T&Cs.
  - "In case your information needs manual verification, you will be redirected to a waiting screen".
  - The profile holds "Professional Details" (work status) and "Financial Details" ("Total yearly Income").
  - "Your neo Accounts may be blocked due to expired KYC verification."
- **App-only operation: VERIFIED. This is new.**
  - "The Customer acknowledges and agrees that he/she shall only and exclusively operate his/her accounts through the neo digital platform." ([Rights & Duties](https://www.neo.com.lb/english/rights-duties))
  - "you will no longer visit the Branch to perform your operations" ([FAQ](https://www.neo.com.lb/english/faq)).
  - **Exception:** the Packages page still prices cash at "Bank Audi Branches".
- **neo Business: existence VERIFIED, conditions STILL UNCONFIRMED.**
  - Every neo page carries a "Business" tab and a form: "Tell us a little about your business and our team will get in touch to open a business bank account." The form asks for full name, mobile, company name (optional) and "POS required?".
  - The `/neoBusiness` page returned "404 - Page Not Found" on 15 Nov 2026.
  - No fees, eligibility or document list were found on official pages. The 10,000-business Mastercard programme (Sept 2026) remains secondary-sourced only.
- **Earlier neo product codes: VERIFIED that the documents exist; their contents were not read.**
  - Bank Audi's [Customer Protection page](https://www.bankaudi.com.lb/customer-protection?id=Accounts) lists key-facts PDFs named:
    - "Current Fresh NEOFCU 01.08.2023";
    - "PayrollFreshUSD-NEOFPY-…-01-08-2023";
    - "Current Cash NEOCHC 23.07.2024";
    - "Current Account NEOCUR LBP 01.08.2023".
  - These PDFs sit on `pwstg02`, which was unreachable.

### Inferences
- A neo account in the developer's own name is only possible for a Lebanese national. Otherwise, the classic Bank Audi External Account (Q5) is the route.

### Gaps
- neo Business pricing, eligibility and documents.
- Contents of the NEOFCU key-facts sheet (01.08.2023), which may hold the formal fee schedule for the neo fresh account.

## 2. Incoming international transfers to neo (SWIFT by IBAN, fee, limits, source of funds, IBAN, BIC, correspondent)

### Takeaway
- **Can receive and the fee are VERIFIED:** neo officially receives local and international transfers by IBAN, with **no neo fee**.
- **Limit amounts are not published.** neo's "daily and monthly limits for incoming Funds" are stated only in its answers about transfers between neo clients.
- **The BIC was not found on any official page.**
- **The USD correspondents are known only as a list:** Bank Audi publishes its New York correspondents but does not say which one handles incoming USD SWIFT wires.

### Cited Findings
- **Can receive: VERIFIED.**
  - "Receive transfers from any bank account Locally or Internationally" ([home](https://www.neo.com.lb/), live 15 Nov 2026; same wording in the 2024 brochure).
  - "Send and receive funds globally in USD, LBP, EUR, GBP, AED and SAR" ([multi-currency page](https://www.neo.com.lb/english/pages/multi-currency)).
- **Fee: VERIFIED as free of neo fees.**
  - The Packages page row "Incoming transfers to neo — local and int via IBAN" is marked included (a tick, no price) in both Entry and Standard ([Packages](https://www.neo.com.lb/english/packages), live 15 Nov 2026).
  - The brochure (Feb/May 2024) reads explicitly: "Incoming Transfers from other banks (local & int via IBAN) — Free — Free" (USD and LBP columns, both plans). This settles the earlier "garbled column" doubt.
  - The FAQ answer "Do I incur any neo fees when receiving an incoming Bank Transfer?" points to "Fees & Charges", which is the Packages page.
  - Intermediary or correspondent deductions are not addressed anywhere.
- **Incoming limits: CORRECTED context; amounts STILL UNCONFIRMED.**
  - "There are daily and monthly limits for incoming Funds. The daily Limit refreshes every 24 hours. If you wish to receive more, you may fund your Balance through other alternative methods."
  - This sentence appears only under the questions on receiving via QR code, via mobile number and "from neo Client via IBAN". No limit statement is attached to incoming wires from other banks.
  - The card top-up and ATM deposit answers mention a "daily Deposit ceiling limit".
  - No amounts are published, in English or in Arabic ([Arabic FAQ](https://www.neo.com.lb/arabic/faq)).
- **Source-of-funds justification: STILL UNCONFIRMED.** No neo or Bank Audi page read says anything about it. The only related text is the KYC fields (yearly income, work status) and the "manual verification" step.
- **IBAN: VERIFIED (format and usage).**
  - Bank Audi's example "LBxxxxxxxxxxxxxx 00123456xxxx" is 28 characters. "Enter the 8 digits that fall right before the last 4 digits" gives the account number ([External Account page](https://www.bankaudi.com.lb/externalaccount), undated, live 15 Nov 2026).
  - This confirms the earlier note's 28-character inference.
  - neo: "Check your new IBAN and Account number on neo App … We advise you to provide the IBAN numbers for all payments instead of Account Numbers." The IBAN is shared from Account → "Account information" → "Share" ([FAQ](https://www.neo.com.lb/english/faq)).
- **BIC AUDBLBBX: STILL UNCONFIRMED from official sources.**
  - Not found on the neo FAQ or home page, nor on Bank Audi's External Account, mobile-app, contact or correspondents pages. A site-restricted search found nothing either.
  - Only the directories cited in the earlier note give it.
  - Read it from the IBAN-share screen in the neo app, or ask 1560.
- **USD correspondents: PARTLY VERIFIED.**
  - Bank Audi's [Worldwide Correspondents](https://www.bankaudi.com.lb/about-the-bank/about-us/worldwide-correspondents) page (undated, live 15 Nov 2026) lists for "USA – New York":
    - "The Bank of New York Mellon"
    - "Citibank, N.A."
    - "JPMorgan Chase Bank"
    - "Standard Chartered Bank"
  - Wells Fargo is commented out in the page's HTML, so it is not displayed.
  - The page does not say which one Apple's or Google's banks should use, and gives no settlement instructions or nostro account numbers. That remains **STILL UNCONFIRMED**.

### Inferences
- Expected cost per payout is USD 0 in neo fees, plus whatever the sending and intermediary banks deduct. Apple's help page warns about those deductions; see the earlier note.
- Neither the fee nor the limits text sets a cap on incoming wires from other banks. The neo-client limit sentence is the closest wording, so ask neo (1560, or live chat) in writing for the incoming-wire ceiling on a Fresh USD account before pointing App Store Connect or Play Console at it.

### Gaps
- Exact daily and monthly limit amounts.
- The official BIC.
- Which New York correspondent to name, if any.
- Value dates.
- Any document list for recurring foreign business income.

## 3. Outgoing: cash withdrawal of fresh USD, transfers abroad, limits

### Takeaway
- **Cash at Bank Audi ATMs:** free, using a "Cash Out" voucher, within daily and monthly ceilings whose amounts are not published.
- **Cash elsewhere:** branches cost 6‰ (min USD 2); partner agents have tiered fees.
- **Transfers abroad from neo:** a flat **USD 25 / LBP 350,000**, with no published limits.

### Cited Findings
- **ATM cash-out by voucher, free: VERIFIED.**
  - "You can withdraw Cash from your neo Account at any Bank Audi ATM using a Cash Out voucher."
  - "You will not incur any charges from Cash withdrawal at Bank Audi ATM."
  - "You can always check the minimum and maximum voucher amount on the App."
  - Source: [FAQ](https://www.neo.com.lb/english/faq), live 15 Nov 2026.
- **ATM withdrawal limits: amounts STILL UNCONFIRMED.** "There are daily and monthly Cash withdrawal ceiling limits on the ATM. Your daily limit resets every 24 hours." No amounts are given.
- **Branch cash fees: VERIFIED.** "USD/LBP: 6‰ (with a min $2/LBP100,000)", "EUR: 5‰ (with a min of 2 EUR)" ([Packages](https://www.neo.com.lb/english/packages)).
- **Partner agents: VERIFIED that fees exist; the column mapping is unclear.**
  - The partners are Cash United, OMT and Bob Finance ([FAQ](https://www.neo.com.lb/english/faq)).
  - Agent cash-out tiers on the Packages page include "$10 - 500 0.50% with a min. of $2", "$501 - 1,000 0.60%", "$1,001 - 3000 0.65%", "1.30%" and "$20 – 3,000 0.9% with a min. of $1".
  - The page's layout does not show which agent each column belongs to.
- **International ATMs: VERIFIED.** "1.25% with a min. of USD5 & max. of USD25" ([Packages](https://www.neo.com.lb/english/packages)).
- **Transfers abroad: VERIFIED.**
  - "Outgoing transfers from neo — local and int via IBAN — $25 / LBP 350,000", in both packages ([Packages](https://www.neo.com.lb/english/packages), live 15 Nov 2026; same in the 2024 brochure).
  - The FAQ steps: "Transfer is only possible via IBAN … tap on 'Detail of charges' (SHA, BEN, OUR) … Enter OTP".
- **Outgoing limits on neo: STILL UNCONFIRMED.** None are published.
  - For comparison, the main Bank Audi app says: "International Transfers are subject to the online banking daily and monthly limits. For higher limits, please refer to your branch. … USD 15 + 2‰ with a minimum of USD 30 and a maximum of USD 500" ([Bank Audi Mobile Application](https://www.bankaudi.com.lb/lebanon/adc/bank-audi-mobile-application), undated, live 15 Nov 2026). This is VERIFIED.
- **FX in the app: VERIFIED.** "Buy USD/LBP: 89,600 Sell LBP/USD: 89,750 No additional fees" ([Packages](https://www.neo.com.lb/english/packages)).

### Gaps
- Limit amounts for ATM cash, vouchers and outgoing transfers.
- Whether wires received from abroad can be sent back out without restriction. No official neo statement was found; BDL Circulars 150 and 165 could not be read because BDL's site showed a Cloudflare challenge.

## 4. Cards: type, online and international use, fees, 3-D Secure, Apple Pay / Google Pay, Developer Options

### Takeaway
- **Card type:** the neo card is a **Mastercard debit card** ("neo Platinum Mastercard Debit Card"), not a prepaid card.
- **Two forms:** a digital card for online use only, and a physical card for everyday use.
- **International fee:** 1.5% when the charge is in the card's currency, 4.8% when it is not.
- **Wallets:** Google Wallet is supported; **Apple Pay is officially not supported**.
- **Not found officially:** 3-D Secure on adult neo cards (only teens, and Bank Audi cards in general), and the Developer Options rule.

### Cited Findings
- **Network and type: VERIFIED. This corrects the earlier gap.**
  - "Unlock exclusive perks and privileges with your neo Platinum Mastercard Debit Card"; "Link your card to your LBP, USD, EUR, GBP, SAR & AED account" ([neo Platinum debit card page](https://www.neo.com.lb/english/pages/your-neo-platinum-debit-card), live 15 Nov 2026).
  - "What types of Debit cards are available on neo? Digital and physical cards." Validity: "8 years" ([FAQ](https://www.neo.com.lb/english/faq)).
- **"MasterCard and Visa" wording: CORRECTED.** The FAQ's "We currently support MasterCard® and Visa®" answers "Which Cards and Currencies are supported for Deposits through a Card?". It is about other banks' cards used to top up neo, not about neo's own card.
- **Online and international use: VERIFIED.**
  - Digital card: "can only be used for online purchase and will be instantly issued".
  - Physical card: "can be used locally and internationally, at retail shops and ATMs and for online payments".
  - "You can use your debit card locally in Fresh USD and LBP and internationally in any foreign currency as long as your card is linked to a fresh USD account."
  - Source: [FAQ](https://www.neo.com.lb/english/faq).
  - A card's linked account is changed with "Change Primary Account".
- **Conversion fees: VERIFIED.**
  - "International Card Transaction Fee: 1.5% on transaction done with same currency as account; 4.8% on transaction with different currency as account" (both packages; [Packages](https://www.neo.com.lb/english/packages), live 15 Nov 2026).
  - Same split on the Cedar Miles credit card ([terms PDF](https://neofiles.blob.core.windows.net/files/Assets/ContentFiles/neoCreditCardTermsFees(En)_081857.pdf), undated): "International Transaction Fee: Applied when using the card abroad (outside Lebanon) for any transaction".
  - Other card fees on the Packages page:
    - "Funds Transfer fees from Card to Account/wallet": USD 3 (Standard);
    - "Top up via other banks cards": 3%.
  - **Conflict:** the FAQ says "3.5% of total Amount for Debit card top-up".
- **3-D Secure:**
  - **Teens: VERIFIED.** "All your online payments are 3D secured with OTP sent to your mobile number" ([FAQ Teens](https://www.neo.com.lb/english/faq-teens)).
  - **Bank Audi cards in general: VERIFIED.** "automatically enrolled in the 3D secure service upon card activation … you will receive a 6 digit One-Time Password via your preferred channel (either by SMS or email) for every online purchase" ([Bank Audi 3D Secure](https://www.bankaudi.com.lb/personal-banking/services/online-services/3d-secure), undated).
  - **Adult neo cards specifically: STILL UNCONFIRMED.** neo's adult FAQ mentions 3-D Secure only for top-ups made with other banks' cards.
- **Apple Pay: VERIFIED as not supported.** This upgrades the earlier anecdote: "neo cards are not yet supported on Apple Pay." ([FAQ](https://www.neo.com.lb/english/faq))
- **Google Pay / Wallet: VERIFIED.**
  - "Yes, neo cards are now fully supported on Google Wallet."
  - Online use: "you can use it to pay on websites and apps that support Google Pay."
  - "Receiving money through Google Wallet is not supported in Lebanon at this time." ([FAQ](https://www.neo.com.lb/english/faq))
- **Android Developer Options: STILL UNCONFIRMED.**
  - Not in the English or Arabic FAQ, nor on the [Privacy and Security](https://www.neo.com.lb/english/privacy-and-security) page.
  - The only source remains a Google Play support reply, which could not be re-checked because play.google.com was blocked.

### Inferences
- Paying Apple's USD 99 and Google's USD 25 is my reading, not an official statement. Use the neo **digital** card on the Standard package, linked to the Fresh USD account, and expect 1.5% (about USD 1.49 and USD 0.38).
  - Charges from foreign merchants are presumably counted as "international".
  - The fee rises to 4.8% if the card is linked to a non-USD account or the merchant bills in another currency.

## 5. Bank Audi "External Account" (fresh, branch) tariffs

### Takeaway
The earlier figures are confirmed on the live page:
- monthly fee **USD 4** (Payroll and Personal) and **USD 5** (Business);
- incoming transfers **USD 5 / 10 / 15 / 20** by band;
- cross-border outgoing transfers **USD 15 + 2‰, min 30, max 500**.

The page itself is undated. The linked key-facts PDFs are dated **17 Feb 2025** but could not be opened.

### Cited Findings
- **Status and legal basis: VERIFIED.** "It's a fresh funds account that gives you access* to your money and is available in major foreign currencies, in line with BDL Basic Circular 150." ([External Account](https://www.bankaudi.com.lb/externalaccount), undated, live 15 Nov 2026)
- **Monthly charges: VERIFIED.** "Payroll External Account CPRTRF / Personal External Account CTRFP1 / Business External Account CTRFB1 — Account Monthly Charges USD 4 / USD 4 / USD 5"
- **Incoming transfers: VERIFIED.**
  - "Incoming Transfer*":
    - "From 0 to USD 500 — USD 5 or Countervalue"
    - "Above USD 500 to USD 3,000 — USD 10"
    - "Above USD 3,000 to USD 10,000 — USD 15"
    - "Above USD 10,000 — USD 20"
  - Footnote: "*Excluding Salaries bulk payments".
- **Outgoing transfers: VERIFIED.**
  - "Cross-border: USD 15 + 2‰ (with a minimum of USD 30 and a maximum of USD 500)".
  - The HTML also holds a hidden (commented-out) row: "Fast Track: USD 15 + 5‰ (with a minimum of USD 50)", with the note "*Through international correspondent banks, to be considered fresh, if the beneficiary account is a Fresh Funds". It is not displayed, so do not rely on it.
- **Cash: VERIFIED.**
  - Withdrawal: "Over the Counter: 5‰ with a minimum of USD 2; ATM: 2‰ with a minimum of USD 1".
  - Deposit: "Over the Counter: 2 USD for amount < USD 1,000; 3‰ USD & 4‰ other FY for amounts ≥ USD 1,000; ATM: 2‰ with a minimum of USD 1".
  - Debit card: "Depending on the card's type". Online and mobile banking: "Free".
- **Dated documents: STILL UNCONFIRMED (not read).**
  - The [Customer Protection page](https://www.bankaudi.com.lb/customer-protection?id=Accounts) links to:
    - "PersonalExternalAccount-CTRFP1_(En)-17-02-2025.pdf"
    - "BusinessExternalAccount-CTRFB1_(En)-17-02-2025.pdf"
    - "TermsandConditions/operations-en.pdf" (the earlier note dated it 18 June 2025)
  - All are on the blocked `pwstg02` host, so the value dates for incoming wires remain unread.

### Inferences
- On these tariffs, neo (free incoming, USD 25 outgoing) is cheaper than an External Account (USD 5–20 per incoming wire, USD 30 minimum outgoing). The External Account is the fallback for a developer who is not Lebanese, or if neo's incoming limits are too low.

## 6. Official neo / Bank Audi statements on receiving payments from businesses or platforms (freelance income, PayPal, Payoneer, app stores)

### Takeaway
**STILL UNCONFIRMED.** No official neo or Bank Audi page read, nor a search restricted to neo.com.lb and bankaudi.com.lb, mentions freelancers, PayPal, Payoneer, Apple, Google or app-store income.

### Cited Findings
- The only related official wording:
  - "Receive your salary in the currency of your choice LBP, USD, EUR, GBP, SAR & AED" ([home](https://www.neo.com.lb/), live 15 Nov 2026);
  - "Receive transfers from any bank account Locally or Internationally" (same page).
- "Receiving money through Google Wallet is not supported in Lebanon at this time." ([FAQ](https://www.neo.com.lb/english/faq)) This concerns Google Wallet peer payments, not Google Play payouts.

### Gaps
- Ask neo (1560 / +961-1-205405, or in-app live chat) in writing whether recurring SWIFT wires from Apple and Google are accepted on a personal Fresh USD account, and what documents are required.
- BDL Circulars 150 and 165 were not read (bdl.gov.lb served a Cloudflare challenge).
