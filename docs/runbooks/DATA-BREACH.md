# Personal data breach

What to do when personal data may have been read, changed, lost or made unavailable by someone
who should not. Assessment item: 6.22. This page is technical and practical; the deadlines and
duties must be confirmed by `[DPO]` and `[lawyer]` (it is not legal advice).

Use it together with `INCIDENT-RESPONSE.md`: the incident page contains and fixes, this page
notifies and records.

## 1. Is it a breach?

A breach is any event that touches the **confidentiality** (someone read what they should not),
the **integrity** (data changed without right) or the **availability** (data lost or out of
reach) of personal data. Examples for this app:

| Event | Breach? |
|---|---|
| A professional could read the follow-up of a child whose family did not allow it | Yes (confidentiality) |
| A release erased the words a family added to the board, with no copy | Yes (integrity, availability) |
| The Supabase project was down for 3 hours, nothing lost | Usually yes for the register (availability), usually no notification: decide and write why |
| A laptop with the backup private key was stolen | Yes if the encrypted copies can be reached too; write the assessment |
| An e-mail with an invitation code went to the wrong address | Yes (small): register; notification depends on the risk |
| Figures shown in the back office for a group under 5 children | Yes (confidentiality): register |

When in doubt, treat it as a breach and record it. Recording costs nothing; a missed
notification does.

## 2. Clock

The clock starts when the team **becomes aware** of the breach (reasonably sure it happened),
not when everything is known.

| When | What | Who |
|---|---|---|
| Hour 0 | Incident opened (`INCIDENT-RESPONSE.md`), privacy role named, breach register line opened | Incident lead |
| Within 24 h | First assessment: what data, how many people (children / adults), which countries, what risk | Privacy + technical lead |
| **Within 72 h** | **Notify the CNIL** (online form: notifications.cnil.fr), unless the breach is unlikely to result in a risk for the people. If not everything is known, notify what is known and complete later | `[DPO]` |
| Within 72 h | **Saudi Arabia (PDPL)**: notify the competent authority (SDAIA, through the channel it indicates) when the breach may harm the people or their rights | `[DPO]` with `[lawyer]` |
| Without undue delay | **Inform the families** when the risk to them is **high** (section 4) | Communication |
| Always | Write the breach in the **register** (section 5), even when nothing is notified, with the reason | Privacy |

If the company is established in another EU country than France, its own authority replaces
the CNIL: `[lead supervisory authority]`.

Our processors (Supabase, Cloudflare, Google for Gmail and sign-in, Apple; Anthropic only if the
AI is turned on: it is switched off today) must tell
us of a breach on their side without undue delay (their data processing agreements). When they
do, our clock starts.

## 3. Assessing the risk

Children's data about communication can reveal a disability. **Assume high risk** unless one
of these is true and written down:

- the data could not be read (encrypted, and the key was not reached);
- the access was closed before anyone used it, and the logs show it;
- the data is only counts that cannot point to a child (the back-office figures of 5 children
  of 5 families or more).

| Factor | Raises the risk | Lowers it |
|---|---|---|
| Kind of data | Child's name with follow-up, sentences, observations, photos, recordings; identity documents of professionals; passwords | Counts; technical problem counts (`error_counts` has no person in it) |
| Volume | Many families | One account |
| Who got it | Unknown or hostile person | A team member of the same child, by mistake, who confirmed deleting it |
| Duration | Days, unknown | Minutes, known from logs |
| Can people be identified | Name, e-mail, photo | IDs only |

## 4. Informing families

Inform the families concerned (the parent who owns each child's profile, and the adults
concerned) when the risk is high, in clear words, in **French, English and Arabic** (the three
languages of the app; send the language of the menus of each account first, the other two
below). Two channels:

1. **E-mail** from `daleth.contact@gmail.com` (the app itself only sends sign-in codes; the e-mail is
   sent by the team from its mailbox).
2. **A notice in the app** (`INCIDENT-RESPONSE.md`, section 5: in-app only, the three languages
   in one notice).

An e-mail must say: what happened, what data, the likely consequences, what we did, what they
can do, and who to contact (`[DPO]`). Never in the message: another family's name, a child's
name other than their own, technical details that help an attacker.

The Arabic texts below are a first version, to be read by a native speaker before use.

### E-mail — English

> **Subject:** Important: a security incident concerning your Daleth AAC account
>
> Hello,
>
> On [date], we found that [what happened, in one sentence — for example: "a person outside our
> team was able to read some information stored in the app"].
>
> **What was concerned:** [the data — for example: your child's first name and the words of the
> board]. **What was not concerned:** [for example: passwords, photos, recordings].
>
> **What we did:** [for example: we closed this access within two hours, changed our keys, and
> informed the CNIL, the French data protection authority].
>
> **What it may mean for you:** [likely consequences, in plain words].
>
> **What you can do:** [for example: change your password; check the devices linked to your
> child's profile in Settings → Account → Devices; turn on two-step sign-in].
>
> [If true:] Your child's board keeps working on your devices.
>
> Questions: daleth.contact@gmail.com. Our data protection officer: [DPO].
>
> We are sorry. — DALETH

### E-mail — français

> **Objet :** Important : un incident de sécurité concerne votre compte Daleth AAC
>
> Bonjour,
>
> Le [date], nous avons découvert que [ce qui s'est passé, en une phrase — par exemple : « une
> personne extérieure à notre équipe a pu lire certaines informations enregistrées dans
> l'application »].
>
> **Ce qui est concerné :** [les données — par exemple : le prénom de votre enfant et les mots de
> son tableau]. **Ce qui n'est pas concerné :** [par exemple : les mots de passe, les photos, les
> enregistrements].
>
> **Ce que nous avons fait :** [par exemple : nous avons fermé cet accès en deux heures, changé nos
> clés et informé la CNIL].
>
> **Ce que cela peut signifier pour vous :** [conséquences probables, en mots simples].
>
> **Ce que vous pouvez faire :** [par exemple : changer votre mot de passe ; vérifier les appareils
> reliés au profil de votre enfant dans Réglages → Compte → Appareils ; activer la connexion en
> deux étapes].
>
> [Si c'est vrai :] Le tableau de votre enfant continue de fonctionner sur vos appareils.
>
> Questions : daleth.contact@gmail.com. Notre délégué à la protection des données : [DPO].
>
> Nous vous présentons nos excuses. — DALETH

### E-mail — العربية

<div dir="rtl" lang="ar">

> **الموضوع:** مهمّ: حادث أمني يخصّ حسابكم في Daleth AAC
>
> مرحباً،
>
> في [التاريخ]، اكتشفنا أنّ [ما حدث في جملة واحدة — مثلاً: «شخصاً من خارج فريقنا تمكّن من قراءة
> بعض المعلومات المحفوظة في التطبيق»].
>
> **البيانات المعنيّة:** [البيانات — مثلاً: الاسم الأول لطفلكم وكلمات لوحته]. **البيانات غير
> المعنيّة:** [مثلاً: كلمات المرور والصور والتسجيلات].
>
> **ما قمنا به:** [مثلاً: أغلقنا هذا الوصول خلال ساعتين، وغيّرنا مفاتيحنا، وأبلغنا الهيئة الفرنسية
> لحماية البيانات (CNIL)].
>
> **ما قد يعنيه ذلك لكم:** [العواقب المحتملة بكلمات بسيطة].
>
> **ما يمكنكم فعله:** [مثلاً: تغيير كلمة المرور؛ التحقق من الأجهزة المرتبطة بملف طفلكم في
> الإعدادات ← الحساب ← الأجهزة؛ تفعيل تسجيل الدخول بخطوتين].
>
> [إن كان ذلك صحيحاً:] تبقى لوحة طفلكم تعمل على أجهزتكم.
>
> للأسئلة: daleth.contact@gmail.com. مسؤول حماية البيانات لدينا: [DPO].
>
> نعتذر منكم. — DALETH

</div>

### Notice in the app (one notice, three languages)

> [FR] Un incident de sécurité a concerné certaines données le [date]. Nous vous avons écrit à
> l'adresse de votre compte : lisez ce message. / [EN] A security incident concerned some data on
> [date]. We wrote to your account's e-mail address: please read it. / [AR] وقع حادث أمني يخصّ
> بعض البيانات في [التاريخ]. أرسلنا رسالة إلى البريد الإلكتروني لحسابكم: يُرجى قراءتها.

## 5. Breach register (template)

Kept by `[DPO]` in `[place with restricted access]`. **Every** breach goes in, notified or not
(GDPR art. 33(5)). Kept `[5 years — to confirm]`. No child's name in it: profile IDs only.

| Field | Entry |
|---|---|
| Number | B-YYYY-NN |
| Date and time it started (if known) / became aware | |
| How it was found | (a family, a test, the logs, a processor…) |
| What happened | (facts only) |
| Kind: confidentiality / integrity / availability | |
| Data concerned | (account, profile, follow-up, sentences, observations, photos, recordings, documents…) |
| People concerned | (number of children, of adults; countries) |
| Likely consequences | |
| Risk level and reasoning | (none / risk / high risk, and why) |
| Measures taken | (containment, fix, release, migration) |
| CNIL notified? | (date, reference, or reason for not notifying) |
| Other authorities | (SDAIA…: date, reference, or reason) |
| Families informed? | (date, channel, languages, or reason for not informing) |
| Incident record | (link) |
| Closed on, by | |

Summary view (one line per breach):

| Number | Became aware | What | People | Risk | CNIL | Families | Closed |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 6. Countries outside the EU

| Where | What we know | Status |
|---|---|---|
| **France / EU (GDPR)** | Authority within 72 hours unless unlikely to result in a risk; people without undue delay when the risk is high; register of all breaches | Applies |
| **Saudi Arabia (PDPL)** | Authority (SDAIA) within 72 hours when the breach may cause harm; people without undue delay when it may harm them | To confirm with `[lawyer]` before selling there |
| **Lebanon, Jordan, United Arab Emirates, other Gulf states** | Each has its own data protection law with different duties | To check with `[lawyer]` before selling in each country |
| **United States** | If the app is offered in the US App Store or Google Play: COPPA (children under 13: parental consent, a written security programme, deletion rules) may apply, and every state has its own breach notification law (deadlines often 30 to 60 days; some notify the state's attorney general). The FTC's Health Breach Notification Rule may cover a health-related app | To decide: get US advice before offering it there, or leave the US out of the stores' country list |

## 7. After the breach

- Review within two weeks (`INCIDENT-RESPONSE.md`, step 9).
- If a database rule failed: the attack added to `supabase/tests/security_scenario.sql`.
- Update `docs/legal/DPIA-DRAFT.md` (risks and measures) and the risk register in
  `CONTINGENCY.md`.
