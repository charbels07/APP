# Verification: Lebanese income tax for a Lebanon-resident freelance app developer (subscriptions via Apple/Google), as of Nov 2026

Method (15 Nov 2026): this file checks the claims in `lebanon_income_tax.md`. Sources read directly:
- Official texts on legallaw.ul.edu.lb (Lebanese University's legal database, which gives the Official Gazette (OG) references).
- MoF notices and laws on finance.gov.lb, opened as PDFs. Scanned PDFs were turned into images and read by eye.
- All PwC Lebanon pages on taxsummaries.pwc.com. Every page says "Last reviewed - 01 July 2026".

Status labels:
- VERIFIED: confirmed in an official text or a PwC page that was read.
- CORRECTED: the earlier claim is wrong or incomplete.
- STILL UNCONFIRMED: no official or PwC source could be read.

Hosts that could not be reached:
- www.bdl.gov.lb: Cloudflare "Just a moment..." challenge (HTTP 403); WebFetch returned a DNS failure.
- eservices.finance.gov.lb and institutdesfinances.gov.lb: refused by the proxy (403).

Translations are mine.

Short names used below:
- **ITL** = Income Tax Law, Legislative Decree 144 of 12/6/1959 (OG 35, 4/7/1959).
- **TPL** = Tax Procedures Law, Law 44 of 11/11/2008.
- **L324** = 2024 Budget Law, Law 324 of 12/2/2024 (OG 7, 15/2/2024).
- **L40** = 2026 Budget Law, Law 40 of 10/2/2026 (the MoF's PDF of the law as passed by Parliament, posted 13 Feb 2026).

## 1. Brackets, family deductions, and changes in 2025/2026

### Takeaway
VERIFIED from the text of L324: Title I profits of individuals are taxed at 4/7/12/16/21/25%, with band limits at LBP 540m, 1.44bn, 3.24bn, 6.24bn and 13.5bn. The deductions are LBP 450m for the taxpayer, 225m if married, and 45m per child (at most 5). Neither the 2025 budget (Decree 56/2025) nor L40/2026 amends ITL Art. 31 or Art. 32, so the brackets and deductions are unchanged as of Nov 2026.

### Cited Findings
- **VERIFIED: brackets (L324 Art. 46, which replaces ITL Art. 32).**
  - Quote: «حدد معدل الضريبة على أرباح المهن التجارية والصناعية وغير التجارية على الصورة التالية: 4% … لا يتجاوز /540.000.000/ … 7% … لا يتجاوز /1.440.000.000/ … 12% … /3.240.000.000/ … 16% … /6.240.000.000/ … 21% … /13.500.000.000/ … 25% … يزيد عن /13.500.000.000/»
  - Translation: "the rate of tax on profits of commercial, industrial and non-commercial professions is set as follows: 4% up to 540m; 7% up to 1.44bn; 12% up to 3.24bn; 16% up to 6.24bn; 21% up to 13.5bn; 25% above 13.5bn".
  - The same article sets capital companies at «ضريبة نسبية قدرها 17%» ("a flat tax of 17%").
  - Source: [legallaw, L324 ch. 3, Art. 46](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar) (law dated 12/2/2024; OG 7, 15/2/2024).
- **VERIFIED: family deductions (L324 Art. 49, which replaces ITL Art. 31).**
  - Quote: «تفرض الضريبة على الربح الحقيقي أو الـمحدد بصورة مقطوعة بعد أن ينزل منه لكل شخص طبيعي … /450.000.000/ … ويضاف … /225.000.000/ … للـمكلف الـمتزوج و/45.000,000/ … لكل ولد»
  - Translation: "tax is levied on real or lump-sum profit after deducting, for each natural person, 450m, plus 225m for a married taxpayer and 45m per child".
  - At most five children qualify. If both spouses work, each gets the single person's deduction.
  - The deduction applies to both real-profit and lump-sum taxpayers. Estimated-profit taxpayers get «تنزيل سنوي يعادل التنزيل المعطى للمتزوج دون أولاد» ("an annual deduction equal to that of a married person without children").
  - Source: [same page, Art. 49](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar).
- **VERIFIED by PwC:**
  - "as per the 2024 Budget Law, the annual progressive brackets for income tax profits are increased to become between LL 540 million and LL 13.5 billion" — [PwC Individual – Taxes on personal income](https://taxsummaries.pwc.com/lebanon/individual/taxes-on-personal-income) (reviewed 1 Jul 2026).
  - "family deductions ranging from LL 450 million to LL 900 million … (as per Article 49 of Budget Law 2024)" — [PwC Individual – Deductions](https://taxsummaries.pwc.com/lebanon/individual/deductions) (reviewed 1 Jul 2026).
- **VERIFIED: the 2025 budget (Decree 56 of 11/3/2025) does not touch Art. 31 or 32.** Its only ITL amendment is to Art. 63 para. 1 (withholding on salaries): «تعديل الفقرة الأولى من المادة 63 من المرسوم الاشتراعي رقم 144» ("amendment of para. 1 of Art. 63 of LD 144") — [legallaw, Decree 56/2025](https://legallaw.ul.edu.lb/Law.aspx?lawId=334856&language=ar).
- **VERIFIED (by scanning article headings): L40/2026 does not amend ITL Art. 31 or 32.**
  - Its tax-amendment chapter (Arts. 15–54) touches ITL Art. 7 item 7 (deductible charges, Art. 29 of L40), the TPL, VAT, stamp duty and other subjects. It does not touch the brackets or deductions.
  - Source: [MoF, Law 40/2026 PDF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504) (posted 13 Feb 2026). Caveat: the PDF's text layer is partly garbled; I scanned the headings and read selected pages as images.

### Inferences
- The earlier worked examples (≈USD 2,011 tax on USD 30k profit; ≈USD 14,025 on USD 100k, at 89,500 LBP/USD, single person) use the correct legal figures.

### Gaps
- Content of L40 Art. 29 (amendment of ITL Art. 7 item 7, deductible charges): not read.

## 2. Assessment regimes, Notification 4913, the real-profit option, and lump-sum percentages

### Takeaway
- **Regimes:** the ITL has three. Real profit is compulsory for the categories in Art. 11. Everyone else is assessed on lump-sum or estimated profit.
- **Default for liberal professions (VERIFIED):** non-commercial professions file their gross revenue (lump-sum) unless they ask for real profit.
- **Option (VERIFIED):** real profit is requested "before the end of January" of the tax year and cannot be reversed.
- **Notification 4913 (CORRECTED/refined):** it moves estimated-profit taxpayers to lump-sum from 1/1/2026. It also lets small taxpayers who cannot keep books, with turnover at or below LBP 5bn, ask to go back to estimated profit, by 31/3/2026.
- **Percentage for software/IT (STILL UNCONFIRMED):** lump-sum percentages come from MoF Decision 1375 of 7/12/2004, but its table could not be read.

### Cited Findings
- **VERIFIED: the option (ITL Art. 12).**
  - Quote: «تكلف الفئات, غير المذكورة في المادة السابقة, على اساس الربح المقطوع او المقدر, غير انه يحق لكل شخص ان يطلب تكليفه على اساس الربح الحقيقي, شرط ان يقدم طلبا بذلك قبل آخر كانون الثاني من سنة التكليف. ولا يجوز لمن اختار … الربح الحقيقي ان يطلب الرجوع …»
  - Translation: "categories not listed in the previous article are assessed on lump-sum or estimated profit, but any person may ask to be assessed on real profit, provided the request is filed before the end of January of the tax year. Whoever chose real profit may not ask to go back".
  - Source: [legallaw, ITL Arts. 6–30](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273623&LawID=185603&language=ar).
- **VERIFIED: liberal professions default to lump-sum (ITL Art. 10).**
  - Quote: «واذا كان المكلف من اصحاب المهن غير التجارية وغير الصناعية, فعليه ان يقدم تصريحا بمجموع وارداته, ما لم يطلب تكليفه على اساس الربح الحقيقي»
  - Translation: "if the taxpayer exercises a non-commercial, non-industrial profession, he must declare his total revenues, unless he asks to be assessed on real profit".
  - Same page as above.
- **VERIFIED: compulsory real profit (ITL Art. 11).** The list includes companies and industrial firms with more than 4 permanent staff. Item 5 is notable for an app seller: «المصدرون, والمستوردون, والتجار بالجملة …» ("exporters, importers, wholesalers…").
  - PwC's version: real profit is mandatory for SAL, SARL, partnerships ("companies of individuals"), foreign branches and "All entities employing more than four employees or importing goods"; small entities may opt in but "cannot revert back" — [PwC Corporate – Taxes on corporate income](https://taxsummaries.pwc.com/lebanon/corporate/taxes-on-corporate-income) (reviewed 1 Jul 2026).
- **VERIFIED: how the lump-sum percentage is set.**
  - ITL Art. 21: «تتولى لجنة مركزها وزارة المالية تعيين المعدلات الواجب تطبيقها على مجموع الواردات لتحديد الربح الصافي المقطوع» ("a committee at the MoF sets the rates applied to total revenues to determine lump-sum net profit").
  - ITL Art. 23: «تحدد اللجنة لكل نوع من انواع التجارة او الصناعة او المهن او الاعمال معدلا سنويا وسطا … يصدق بقرار من وزير المالية وينشر في الجريدة الرسمية … اما المهن الاخرى فتبقى معدلاتها نافذة» ("the committee sets an average annual rate for each kind of trade, industry, profession or work … approved by decision of the Minister and published in the OG … for other professions the rates stay in force").
  - Source: [legallaw ITL](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273623&LawID=185603&language=ar).
  - The decision linked to Art. 23 is MoF Decision 1375 of 7/12/2004, «تحديد المعدلات الواجب تطبيقها على مجموع الواردات لاستخراج الربح الصافي المقطوع» ("setting the rates to apply to total revenues to derive lump-sum net profit"). Rates apply "from the year 2005"; published in OG 66, 16/12/2004, pp. 12082–12137 — [legallaw, Decision 1375/2004](https://legallaw.ul.edu.lb/Law.aspx?lawId=210581&language=ar).
  - **STILL UNCONFIRMED:** the table itself is not in the database text (only Arts. 1–3), so no percentage for software, programming or IT could be checked. The unsourced "50%" figure remains unverified.
- **CORRECTED/refined: Notification 4913.** It is MoF Notice (إعلام) no. 4913/ص1, dated 24/12/2025, signed by Minister Yassine Jaber, posted on the MoF site on 5 Jan 2026.
  - Quote: «تُعلم وزارة المالية جميع المكلفين على أساس الربح المقدر، أنه سوف يتم تحويل تكليفهم من أساس الربح المقدر الى أساس الربح المقطوع إعتباراً من 2026/1/1، وأنه يتوجب عليهم التسجيل الإلكتروني، ومسك السجلات المحاسبية الخاصة بمكلفي الربح المقطوع والتصريح عن نتائج أعمال السنة قبل الأول من شهر شباط من العام التالي، وإصدار الفواتير والتصريح عن رسم الطابع المالي … (غ20) وتسديد … ص17 خلال 15 يوماً»
  - Translation: "all estimated-profit taxpayers will be moved to lump-sum from 1/1/2026. They must register electronically, keep the books required of lump-sum taxpayers, declare the year's results before 1 February of the following year, issue invoices, and declare stamp duty on invoices (form G20) and pay it (form S17) within 15 days".
  - It continues: «كما تعلم … المكلفين الذين يستحيل عليهم مسك السجلات المحاسبية وإصدار الفواتير ولا يتجاوز رقم أعمالهم رقم الأعمال الإلزامي للخضوع للضريبة على القيمة المضافة أي خمسة مليارات ليرة لبنانية، بضرورة تقديم طلب تحويل تكليفهم إلى الربح المقدر … في مهلة أقصاها 2026/3/31»
  - Translation: "taxpayers who cannot keep books or issue invoices, and whose turnover does not exceed the compulsory VAT threshold of LBP 5bn, must apply to be moved back to estimated profit … by 31/3/2026 at the latest".
  - Source: [MoF, Notice 4913/ص1](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1457) (24 Dec 2025).
  - PwC calls the regime "deemed profit"; in the MoF's Arabic it is الربح المقدر (estimated profit). PwC confirms the transition and the online registration and filing — [PwC Corporate – Taxes on corporate income](https://taxsummaries.pwc.com/lebanon/corporate/taxes-on-corporate-income).
- **VERIFIED by PwC:** for sole proprietors, "tax is levied on real profits or profits on a fixed lump-sum basis (a specified percentage, depending on the type of profession, applied to annual revenues …). Accordingly, no deductions are taken into consideration" — [PwC Individual – Deductions](https://taxsummaries.pwc.com/lebanon/individual/deductions).

### Inferences
- From 2026 a solo developer is on lump-sum by default. The estimated regime survives only for small taxpayers who asked by 31/3/2026; that window is closed for 2026.
- ITL Art. 11(5) lists "exporters" among compulsory real-profit taxpayers. No source says whether selling digital subscriptions to foreign users makes someone an "exporter" in this sense. PwC's paraphrase mentions only "importing goods". This needs an adviser's view.
- Under ITL Art. 19, lump-sum turnover is "total revenues" (مجموع الواردات) taken from the daily journal. The texts read do not say whether that means gross store prices or net payouts.

### Gaps
- The percentage table in Decision 1375/2004 (OG 66/2004), and any later revision for IT or software activities.

## 3. Territoriality, residents' foreign-source income, and a tax on online/digital services

### Takeaway
- **Article number (CORRECTED):** the territorial rule is in ITL **Art. 3**, not Art. 1 or 2. Tax is due on profits "realised in Lebanon".
- **Meaning (VERIFIED):** per PwC, a profit is realised in Lebanon when it comes from an effort or activity exerted in Lebanon. Coding and running apps from Lebanon therefore gives Lebanese-source Title I profit, even when the customers and payers are abroad.
- **Digital tax (VERIFIED absent):** no tax on online or digital-service revenue was enacted in L324 or L40.

### Cited Findings
- **VERIFIED: territoriality (ITL Art. 3).**
  - Quote: «تفرض الضريبة باسم الاشخاص الحقيقيين والمعنويين, المقيمين في الاراضي اللبنانية او في الخارج, على مجموع الارباح التي يحققونها في لبنان»
  - Translation: "the tax is levied on natural and legal persons, resident in Lebanon or abroad, on all profits they realise in Lebanon".
- **VERIFIED: scope (ITL Art. 2).**
  - Quote: «تتناول الضريبة ارباح المهن والمؤسسات التجارية والصناعية والحرفية, وارباح المهن الحرة, وربح كل عمل يدر ريعا غير خاضع لضريبة اخرى على الدخل. ولا يستثنى من الضريبة اي دخل الا بنص صريح في القانون»
  - Translation: "the tax covers profits of commercial, industrial and craft professions and establishments, profits of liberal professions, and the profit of any income-producing work not subject to another income tax. No income is exempt except by an explicit legal text".
  - Source for Arts. 2 and 3: [legallaw, ITL Arts. 2–4](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273621&LawID=185603&language=ar) (OG 35, 4/7/1959).
- **VERIFIED: PwC on what "realised in Lebanon" means.**
  - "the main premise for considering a profit to have been realised in Lebanon is if it was generated through an effort or activity exerted in Lebanon" — [PwC Corporate – Taxes on corporate income](https://taxsummaries.pwc.com/lebanon/corporate/taxes-on-corporate-income).
  - The same rule appears "irrespective of the identity of the taxpayer or place of residency" — [PwC Corporate – Corporate residence](https://taxsummaries.pwc.com/lebanon/corporate/corporate-residence).
- **VERIFIED: no global income tax.** "The income tax law does not deal with what is known as global tax on income … each type of income will be taxed according to the tax chapter it falls under" — [PwC Individual – Income determination](https://taxsummaries.pwc.com/lebanon/individual/income-determination).
- **VERIFIED by PwC: foreign investment income of residents.**
  - Under ITL Art. 82, residents must declare foreign share and bond income on form TH4/G "before 1 March … payment is due before 1 April". Filing is electronic only, under Decision 111/1 of 17/3/2020.
  - Under Decision 322 of 15/5/2023, tax on foreign movable-capital income "should be settled in foreign currency starting 15 November 2022".
  - Source: [PwC Individual – Income determination](https://taxsummaries.pwc.com/lebanon/individual/income-determination).
  - L324 Art. 41 gave residents six months from publication (Feb 2024, so it expired around Aug 2024) to declare past foreign movable-capital income without penalties — [legallaw L324](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar).
  - The **10%** rate for foreign shares and bonds: PwC gives 10% for movable-capital income "generated in Lebanon" and for disposals of shares; ITL Art. 72 (the rate article) was not read. Status: largely consistent, but **STILL UNCONFIRMED from the statute** for foreign income.
- **VERIFIED absent: tax on online or digital-service revenue.** None of the tax-amendment article titles in L324 (chapters 3–4) or L40 (Arts. 15–54) creates one. The 2023–24 "2% on revenues from activities outside Lebanon / online services" was a proposal and was **not enacted** in L324. Sources: [legallaw L324 ch. 3](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar), [ch. 4](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341581&LawID=330076&language=ar), [MoF L40 PDF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504).

### Inferences
- Subscription profit from apps built and run in Lebanon is taxable Title I profit under Art. 3, whoever the customers are. No text read exempts export-type service profit for individuals.

### Gaps
- No MoF ruling specific to app-store income or remote work for foreign customers was found.

## 4. Registration (deadline, tax number, forms, portal)

### Takeaway
- **Deadline (CORRECTED):** registration is due **within two months of starting** the taxable activity (TPL Art. 32). The "before 1 February" in the 2003 MoF guide is superseded.
- **Tax number (VERIFIED):** one tax number covers all taxes.
- **Electronic registration (VERIFIED):** it is required of the taxpayers moved under Notice 4913.
- **Forms (STILL UNCONFIRMED):** the form codes M1/M2 or M10/M11 were not found.

### Cited Findings
- **VERIFIED: TPL Art. 32(1).**
  - Quote: «على كل شخص يباشر عملاً خاضعاً للضريبة أن يحيط الإدارة الضريبية علماً بذلك بموجب طلب تسجيل يقدمه إليها خلال شهرين من تاريخ مباشرة العمل، كما يتوجب عليه أن يحدد صاحب الحق الاقتصادي في نشاطه … تحدد معايير وإجراءات التسجيل بموجب قرار يصدر عن وزير المالية»
  - Translation: "anyone starting a taxable activity must inform the tax administration by a registration request filed within two months of starting, and must identify the beneficial owner of the activity … criteria and procedures are set by decision of the Minister".
  - Art. 32(2)(b), as reworded by L40 Art. 18: a registered resident natural person must report any change of trade name, address, place of work, main activity or beneficial owner within two months.
  - Source: [legallaw, TPL Arts. 32–35](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273817&LawID=246318&language=ar); L40 Art. 18, [MoF L40 PDF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504) p. 27.
- **VERIFIED: one tax number (TPL Art. 34).** «تعطي الادارة الضريبية المكلف عند تسجيله رقما ضريبيا واحدا لجميع انواع الضرائب» ("on registration the administration gives the taxpayer a single tax number for all taxes") — same page.
- **VERIFIED: electronic registration.** Notice 4913/ص1 says «يتوجب عليهم التسجيل الإلكتروني» ("they must register electronically") — [MoF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1457).
- **VERIFIED: what unregistered taxpayers must do (MoF Notice 7/ص1 of 2/1/2026, to lump-sum taxpayers).**
  - Quote: «غير المسجلين لدى الإدارة الضريبية إلى وجوب المبادرة إلى تقديم تصاريح مباشرة العمل وتقديم التصاريح بنتائج أعمالهم عن السنوات 2018 ولغاية 2025 ضمناً»
  - Translation: "those not registered must promptly file start-of-activity declarations and results declarations for 2018 through 2025".
  - The notice recalls that TPL Art. 1(13) defines «عدم التسجيل» ("non-registration") as tax evasion. Non-filers will be pursued and referred to the Financial Public Prosecutor.
  - Source: [MoF Notice 7/ص1](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1464) (2 Jan 2026; posted 7 Jan 2026).
- **VERIFIED: books (ITL Art. 20).** Non-commercial professionals must keep the daily journal under the Commerce Code and record their daily receipts. The journals are numbered and initialled by the court registries (commercial and industrial taxpayers) or by notaries (all others) — [legallaw ITL](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273623&LawID=185603&language=ar).
- **STILL UNCONFIRMED:** the registration form codes (M1/M2 vs M10/M11) and the step-by-step use of eservices.finance.gov.lb. The portal could not be reached (proxy 403), and no MoF page read names the form.

### Inferences
- A developer who started earning without registering is already outside the two-month window. The MoF's stated practice is to require start-of-activity declarations plus past-year returns (back to 2018).

### Gaps
- The Minister's decision on registration criteria and procedures (TPL Art. 32(1)) was not located.

## 5. Filing deadlines, forms, currency of payment, and conversion rate

### Takeaway
- **Deadlines (VERIFIED):** lump-sum returns are due before 1 February (ITL Art. 17); real-profit returns before 1 April (ITL Art. 13). The FY2025 lump-sum deadline was extended to 16/3/2026 (MoF Decision 286/1).
- **Forms (VERIFIED):** lump-sum individuals file electronically on form **F1 (ف1)** plus **F3 (ف3)**, a statement of revenues and expenses.
- **Currency (CORRECTED):** Title I profit tax is due in **LBP**. It is not on the closed list of taxes that must be paid in foreign currency. L40 Art. 22 now **allows** paying LBP taxes in USD or EUR at BDL's effective rate.

### Cited Findings
- **VERIFIED: lump-sum deadline (ITL Art. 17).** «على المكلفين, غير الخاضعين لطريقة التكليف على اساس الربح الحقيقي او على اساس الربح المقدر, ان يقدموا … قبل اول شباط من كل سنة تصريحا عن مجموع وارداتهم الحاصلة خلال السنة السابقة» ("taxpayers not on real or estimated profit must file before 1 February each year a declaration of their total revenues of the previous year").
- **VERIFIED: real-profit deadline (ITL Art. 13).** «يقدم التصريح عن الربح الحقيقي … قبل اول نيسان من كل سنة, وقبل اول حزيران فيما يتعلق بشركات الاموال» ("the real-profit return is filed before 1 April each year, and before 1 June for capital companies"). The administration may extend by one month. Non-commercial filers who cannot produce a balance sheet attach a table of gross revenues, expenses and net profit.
  - Source for Arts. 13 and 17: [legallaw ITL](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273623&LawID=185603&language=ar).
  - PwC agrees: "real profits … before 1 April … fixed lump-sum basis … before 1 February"; "The same deadlines for tax returns apply for tax payments" — [PwC Individual – Tax administration](https://taxsummaries.pwc.com/lebanon/individual/tax-administration).
- **VERIFIED: FY2025 forms and extension (MoF Decision 286/1, scan dated Feb 2026, posted 13 Mar 2026).**
  - Quote: «تمدد لغاية 2026/03/16 ضمناً، مهلة تقديم التصريح السنوي الإلكتروني لمكلفي ضريبة الدخل على أساس الربح المقطوع عن سنة 2025 … التصريح الشخصي لضريبة الدخل (النموذج ف1)، بيان بإيرادات ونفقات المؤسسة/المهنة للمكلفين على طريقة الربح المقطوع (النموذج ف3)، التصريح بعدم مزاولة العمل (النموذج م7)، البيان بصاحب الحق الاقتصادي (النموذج م18)»
  - Translation: "the deadline for the electronic annual return of lump-sum taxpayers for 2025 is extended to 16/3/2026 inclusive: personal income tax return (F1), statement of revenues and expenses for lump-sum taxpayers (F3), declaration of non-activity (M7), beneficial-owner statement (M18)".
  - It cites the earlier Decision 57/1 of 29/1/2026 (a first extension).
  - Source: [MoF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1526).
  - Notice 7/ص1 also names "النموذج ف1" ("form F1") as the lump-sum annual return on actual revenues — [MoF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1464).
  - The blog-sourced form names "R5/R7" are payroll forms (MoF notice titles: «ر5 … ر7 … الرواتب والأجور», "R5 … R7 … salaries and wages"), not business-income forms. **CORRECTED.**
- **CORRECTED: currency of payment.**
  - L324 Art. 15 (which replaced Art. 87 of Law 10/2022), and its replacement L40 Art. 22, set the rule «أ- تستوفى بالليرة اللبنانية: … الضرائب والرسوم» ("taxes and fees are collected in LBP").
  - Exceptions are limited to a closed list under «الضرائب والرسوم المتوجبة على الإيرادات والعائدات والفوائد العائدة إلى مستحقيها بالعملات الأجنبية:» ("taxes and fees due on revenues, proceeds and interest paid to their beneficiaries in foreign currencies:"). The list: bank-interest tax under Art. 51 of Law 497/2003; tax on foreign shares and bonds (ITL Title III); petroleum-rights companies; departure, consular, airport and port fees. L40 adds non-Lebanese entry fees to heritage sites and «الضرائب والرسوم التي يتم فرضها بالعملات الأجنبية» ("taxes and fees imposed in foreign currencies").
  - Title I profit tax is not listed. It is computed on LBP brackets.
  - L40 Art. 22(ج): «يجاز للمكلفين بالضرائب والرسوم والغرامات المتوجبة بالليرة اللبنانية تسديدها بالعملة الأجنبية (الدولار الأميركي أو اليورو)، على أن يعتمد عند التحويل سعر الصرف الفعلي الذي يحدده مصرف لبنان» ("taxpayers may pay taxes, fees and fines due in LBP in foreign currency (USD or EUR), converting at the effective rate set by BDL").
  - Sources: [legallaw L324 Art. 15](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar); [MoF L40 PDF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504) pp. 33–34.
  - The earlier note's reading ("taxes on foreign revenues to be paid in the same currency") over-generalised that heading.
  - L324 Art. 17 (new ITL Art. 43) requires same-currency payment for **non-resident withholding** only.
- **VERIFIED: foreign-currency amounts are converted at BDL's effective rate.** L324 Art. 15(ج): «تفرض وتحتسب بالليرة اللبنانية قيمة سائر الضرائب والرسوم والغرامات المتوجبة بالعملة الأجنبية وفقاً لسعر الصرف الفعلي الذي يحدده مصرف لبنان» ("all other taxes, fees and fines due in foreign currency are assessed and computed in LBP at the effective exchange rate set by BDL").
  - PwC on 89,500: salaries from 1 Apr 2024 are converted "using the exchange rate of USD 1 = LL 89,500, regardless of the payment method".
  - PwC on Decision 338 of 12/3/2025 (revaluation of accounts): it uses "LL 89,500 as of 31 December 2023 and 31 December 2024. For the years 2025 and 2026, the market rate set at 31 December of each respective year".
  - Source: [PwC Corporate – Income determination / Other taxes](https://taxsummaries.pwc.com/lebanon/corporate/income-determination) (reviewed 1 Jul 2026).

### Inferences
- FY2026 lump-sum return (F1 + F3): due before 1 Feb 2027. Real-profit return: before 1 Apr 2027. The MoF has extended these deadlines every year so far.
- The developer converts USD receipts to LBP at BDL's effective rate and pays in LBP, or in USD/EUR under L40 Art. 22(ج).

### Gaps
- Which BDL rate applies to profit returns (transaction date, average or year-end): no MoF instruction found.
- MoF notice OL1535 of 24 Mar 2026 (a further FY2025 lump-sum extension): download timed out, not read.

## 6. Penalties (late filing, non-registration, late payment), L40 multipliers, settlement to 30/12/2026

### Takeaway
- **Late filing (CORRECTED):** the rate is **10% per month** (not 5%), capped at 100% (L324 Art. 74). The minimum for individuals is LBP 750k, raised by L40 to **LBP 2.5m** for FY2026 onward.
- **Late payment (CORRECTED):** **2% per month** on self-assessed tax (not 1%).
- **Under-declaration (VERIFIED):** 20% of the difference.
- **L40 (VERIFIED):** fixed fines (including non-registration) and listed minimum fines rise 25-fold from FY2026.
- **Settlement (VERIFIED):** open until 30/12/2026.

### Cited Findings
- **CORRECTED: late filing (L324 Art. 74, new TPL Art. 109).**
  - Quote: «غرامة قدرها عشرة بالمئة (10%) من قيمة الضريبة المتوجبة … عن كل شهر تأخير (أو كسر الشهر) على أن لا تتجاوز الغرامة مئة بالمئة (100%) … ولا تقل عن: … 750.000 ل.ل. … للأفراد ولباقي المكلفين»
  - Translation: "a fine of 10% of the tax due per month of delay (or part month), not above 100%, and not below … LBP 750,000 for individuals and other taxpayers".
  - Source: [legallaw L324](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar).
  - PwC: "Realisation, including the minimum amount of fine, and late payment penalties rates were amended as per Articles 74 and 77 of the 2024 Budget Law" — [PwC Corporate – Tax administration](https://taxsummaries.pwc.com/lebanon/corporate/tax-administration).
- **VERIFIED: under-declaration (L324 Art. 75, new TPL Art. 110).** 20% of the difference between tax due and tax declared; minimum LBP 750k for individuals (same page).
- **CORRECTED: late payment (L324 Art. 77, new TPL Art. 55).**
  - 1% per month on tax issued in the administration's basic assessment rolls.
  - «فيما يتعلق بالضريبة الناتجة عن التكليف الذاتي … بمعدل 2% شهريا … و3% شهريا بالنسبة للضرائب التي يتم اقتطاعها عند المنبع وبالنسبة للضريبة على القيمة المضافة» ("for self-assessed tax … 2% per month … and 3% per month for withholding taxes and VAT"). Part of a month counts as a full month.
  - Same page.
- **VERIFIED: non-registration fine (base amount; TPL Art. 107(1)).** «تفرض على كل شخص لم يقدم طلب تسجيله … ضمن المهل القانونية … غرامة قدرها … 300.000 ل.ل. … للأفراد ولباقي المكلّفين» ("anyone who did not file a registration request within the legal deadline is fined … LBP 300,000 for individuals and other taxpayers") — [legallaw TPL Arts. 107–117](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=273833&LawID=246318&language=ar) (consolidated text).
- **VERIFIED: L40 multipliers (L40 Arts. 16–17).**
  - Art. 16: «ترفع 25 ضعفاً الغرامات المقطوعة المنصوص عليها في المواد: 107، 108، 111، 123، 124، 126، 127، 128، 129، 130، 132، 133، 138، 139، 140، 141، 143 و144 …» ("the fixed fines in Arts. 107, 108, 111, 123–124, 126–130, 132–133, 138–141, 143 and 144 are raised 25-fold").
  - Art. 17: «ترفع 25 ضعفاً غرامات الحد الأدنى … في المواد: 112، 114، 115، 116، 117، 118، 125 و134» ("the minimum fines in Arts. 112, 114–118, 125 and 134 are raised 25-fold").
  - Art. 17 also: «يرفع الحد الأدنى للغرامات المنصوص عليها في المادتين 109، 110 ليصبح … 2,500,000 ل.ل. … للأفراد ولباقي المكلفين» ("the minimum of the Art. 109 and 110 fines becomes LBP 2.5m for individuals and other taxpayers"; LBP 18.75m for joint-stock companies, 12.5m for partnerships and SARL).
  - Both articles: «تطبق أحكام هذه المادة إعتباراً من أعمال سنة 2026» ("applies from fiscal year 2026").
  - Source: [MoF L40 PDF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504) pp. 26–27.
  - PwC: "a significant increase in both lump-sum penalties and minimum penalties under the Tax Procedures Law, effective as of the 2026 fiscal year" — [PwC Individual – Significant developments](https://taxsummaries.pwc.com/lebanon/individual/significant-developments).
- **VERIFIED: settlement scheme (MoF Decision dated 10/7/2026; number legible on the scan as 642/1; posted 16 Jul 2026).**
  - Scope: verification and collection fines on assessment documents issued from 16/11/2022, whether self-assessed or issued by the administration.
  - Reductions for income tax and the other listed taxes (excluding VAT and payroll tax): proportional verification fines **85%**, fixed verification fines **60%**, collection (late-payment) fines **75%**.
  - Condition: the tax is paid together with the reduced fine within the period.
  - Art. 14: «يُعمل بهذا القرار اعتباراً من تاريخ صدوره ولغاية 2026/12/30 ضمناً» ("in force from its issue until 30/12/2026 inclusive").
  - A reduction above LBP 60bn or USD 667,000 needs Council of Ministers approval.
  - Legal bases cited: Law 662/2005, Law 10/2022 Art. 22, L40 Art. 15.
  - Source: [MoF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1606).
  - Related separate schemes: payroll-tax settlement (Decision 835/1 of 18/9/2026) extended to 30/12/2026 per an MoF press release of 10/11/2026 ([MoF](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=MN2888)); VAT settlement (834/1) extended per MoF notice of 11/11/2026 (title only read).

### Inferences
- From FY2026 the non-registration fine for an individual is LBP 300,000 × 25 = **LBP 7.5m (≈USD 84)**. This assumes the consolidated base on legallaw is current; no later change to Art. 107 was seen in L324.
- The minimum late-filing fine for an individual is LBP 2.5m. The 10%/month rate (cap 100%) applies to the tax due.
- If tax were due in foreign currency, L324 Art. 72 (new TPL Art. 153 bis) would levy fines in that currency, minimum USD 50 for individuals. That does not apply to LBP Title I tax.

### Gaps
- The pre-2026 text of TPL Arts. 112–118 and whether the legallaw consolidated amounts are fully up to date: not cross-checked against the OG.
- The 100%-of-tax fine for an unregistered liberal professional (2003 MoF guide): no current statutory text read. STILL UNCONFIRMED.

## 7. PwC tax summaries: corporate rate, dividends, offshore, residence, other points

### Takeaway
VERIFIED on PwC pages (all reviewed 1 Jul 2026):
- corporate tax 17%;
- dividend withholding 10%;
- non-resident withholding 8.5% on services and 3.4% on goods from 1 Apr 2024;
- offshore companies pay an annual lump sum of **LBP 50m** (from FY2022) instead of corporate tax and dividend withholding;
- individual residence follows Law 60/2016;
- statute of limitations: 4 years for collection; books kept 10 years.

### Cited Findings
- **VERIFIED: rates.** "Corporate income tax (CIT): 17% … Dividend distribution withholding tax (WHT): 10% … Non-resident WHT: 8.5% for services and 3.4% for other than services effective 1 April 2024" — [PwC Corporate – Taxes on corporate income](https://taxsummaries.pwc.com/lebanon/corporate/taxes-on-corporate-income). The 17% also appears in the text of L324 Art. 46 (section 1).
- **VERIFIED: offshore.** "Offshore companies are exempt from CIT and from the WHT on dividends and are instead subject to a lump-sum annual tax of LL 50 million starting from fiscal year 2022 as per the 2022 Budget Law instead of LL 1 million … required to be registered as SAL companies … The business objectives of an offshore company are limited" — [PwC Corporate – Tax credits and incentives](https://taxsummaries.pwc.com/lebanon/corporate/tax-credits-and-incentives). No later change reported. "There have been no significant corporate tax developments in Lebanon during the past year" — [PwC Corporate – Significant developments](https://taxsummaries.pwc.com/lebanon/corporate/significant-developments).
- **VERIFIED: residence.** An individual is tax resident if he "has a place of business in Lebanon; has a house in Lebanon permanently available to one's family …; or is present in Lebanon for more than 183 days in any given 12-month period" — [PwC Individual – Residence](https://taxsummaries.pwc.com/lebanon/individual/residence).
- **VERIFIED: three schedules, no global tax; sole proprietors taxed at 4–25%** (Art. 24 of Budget Law 2019, which amended ITL Art. 32) — [PwC Individual – Income determination](https://taxsummaries.pwc.com/lebanon/individual/income-determination).
- **VERIFIED: administration.** "The tax administration has four years to collect its rights …" and "a company should keep its accounting books and documentation for ten years" — [PwC Individual – Tax administration](https://taxsummaries.pwc.com/lebanon/individual/tax-administration).
- **VERIFIED, but amounts may be outdated: annual lump-sum licence fee** (Decision 993/1 of 2016; applies to all income taxpayers from FY2021 under Decision 260/1): "LBP 550,000 [real profit] … LBP 250,000 [deemed] … LBP 50,000 [assumed]", non-deductible — [PwC Individual – Other issues](https://taxsummaries.pwc.com/lebanon/individual/other-issues).
- **CORRECTED, minor:** PwC still says non-resident withholding is "an effective tax rate of 2.25% … and 7.5%" on its Individual – Taxes on personal income page. The same page and the corporate pages give **3.4% / 8.5% from Q2 2024**, which matches the L324 text (the new ITL Art. 43 on same-currency payment, and the 20%/50% taxable shares).

### Inferences
- At typical indie profit levels, being taxed as an individual (progressive scale after a LBP 450m deduction) costs less than 17% CIT plus 10% on dividends. The offshore lump sum (LBP 50m ≈ USD 559) comes with "limited" business objects that PwC does not detail.

### Gaps
- The offshore activity list (Decree-Law 46/1983 as amended by Law 19/2008) was not read.

## 8. BDL official exchange rate (2026) and BDL Basic Circular 165

### Takeaway
STILL UNCONFIRMED from BDL. www.bdl.gov.lb returned a Cloudflare challenge (403) to curl, and a DNS failure to WebFetch, in this session. Secondary official-adjacent confirmation: PwC (1 Jul 2026) describes 89,500 LBP/USD as the BDL rate currently used for salaries and NSSF. Basic Circular 165 was not checked.

### Cited Findings
- PwC: "pursuant to NSSF Memorandum no. 740, dated 1 February 2024, foreign currency salaries must be converted using the highest official exchange rate published by the Central Bank of Lebanon, currently LL 89,500/USD 1" — [PwC Corporate – Other taxes](https://taxsummaries.pwc.com/lebanon/corporate/other-taxes) (reviewed 1 Jul 2026).
- The laws refer only to «سعر الصرف الفعلي الذي يحدده مصرف لبنان» ("the effective exchange rate set by BDL"), with no figure: L324 Art. 15 and L40 Art. 22 ([legallaw L324](https://legallaw.ul.edu.lb/LawArticles.aspx?LawTreeSectionID=341580&LawID=330076&language=ar); [MoF L40](https://finance.gov.lb/ar-lb/Pages/Pdf-Preview.aspx?dt=OL1504)).

### Inferences
- 89,500 remains the working rate in PwC's July 2026 review. A rate change after July 2026 cannot be excluded without reaching BDL.

### Gaps
- BDL's published rate as of Nov 2026, and the status of Basic Circular 165 (fresh-money accounts): www.bdl.gov.lb must be allowed or reachable to verify.
