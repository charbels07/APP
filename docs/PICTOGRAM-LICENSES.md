# Pictogram libraries — licence eligibility report

Checked on 2026-11-11, before any download (sections 1–4). Sections 5–6 were added after the
import: what is in the app, and where the files are. Rule applied: a library is used only if its **own
official source** says, without contradiction, that it can be used in a commercial (paid or
subscription) application with no fee and no individual authorisation. Anything unclear is
excluded. This is an engineering check of published licences, **not legal advice**: the points
for a lawyer are listed at the end.

## 1. Eligible libraries (verified at the official source)

| Library | Author / owner | Official source | Licence (as published) | Commercial use | What we must do |
|---|---|---|---|---|---|
| **Mulberry Symbols** 3.6.1 | © 2018–2026 Steve Lee (created by Garry Paxton, 2008) | mulberrysymbols.org · github.com/mulberrysymbols/mulberry-symbols | CC BY-SA 4.0 (`LICENSE.txt` and website) | Yes — site: "any project or product, commercial or otherwise" | Clear attribution with a link; say if symbols were changed; changed/derived symbols must be shared under the same licence; **"you must not charge for the symbols themselves"** (the app may be paid, the pictograms may not be a paid extra) |
| **OpenMoji** 17.0 | OpenMoji project (HfG Schwäbisch Gmünd and contributors) | openmoji.org · github.com/hfg-gmuend/openmoji · npm `openmoji` | CC BY-SA 4.0 (graphics) | Yes — FAQ: "for any purpose, even commercially" | Attribution ("All emojis designed by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0"); indicate changes; share adapted emojis alike |
| **Twemoji** 17.0 | © Twitter 2014–2021; © 2022–present Jason Sofonia & Justine De Caires | github.com/jdecked/twemoji (maintained continuation of twitter/twemoji) | Graphics CC BY 4.0, code MIT | Yes (CC BY) | Attribution; the project accepts a mention in an "About" section; indicate changes |
| **Fluent Emoji** | © Microsoft Corporation | github.com/microsoft/fluentui-emoji | MIT | Yes | Keep the copyright and MIT notice |
| **Noto Emoji** | © Google LLC | github.com/googlefonts/noto-emoji | README: images Apache 2.0, fonts SIL OFL 1.1, flags public domain; root `LICENSE` file: OFL 1.1 | Yes under either licence | Keep both notices (see legal point 3) |
| **Material Symbols / Icons** | Google | github.com/google/material-design-icons | Apache 2.0 | Yes — README: "incorporate into your products"; attribution appreciated, not required | Keep the licence notice; state changes |
| **Lucide** | © Lucide Icons and Contributors; some icons © Cole Bemis (Feather) | github.com/lucide-icons/lucide · npm `lucide-static` | ISC (+ MIT for the Feather-derived icons) | Yes | Keep both notices |
| **Phosphor Icons** | © 2023 Phosphor Icons | github.com/phosphor-icons/core · npm `@phosphor-icons/core` | MIT | Yes | Keep the notice |
| **Tabler Icons** | © 2020–2026 Paweł Kuna | github.com/tabler/tabler-icons · npm `@tabler/icons` | MIT | Yes | Keep the notice. Company logos (`brand-*`) are **not imported**: the MIT licence covers the drawing, not the trademark |
| **Health Icons** (added) | Health Icons contributors (Resolve to Save Lives) | healthicons.org · github.com/resolvetosavelives/healthicons · npm `healthicons` | CC0 1.0 (public domain) | Yes | Nothing required (credited anyway) |
| **CoughDrop Symbols** | CoughDrop | opensymbols.org/repositories/coughdrop_symbols | CC BY 4.0 | Yes | Attribution. **Only 21 symbols**, and bulk download needs an OpenSymbols API key that must be requested from OpenAAC → eligible but **not imported** for now |

Words and search keywords for the emoji come from **Unicode CLDR** (npm `cldr-annotations-full`,
Unicode License v3: free, notice required): French, English and Arabic names written by Unicode's
language committees, not machine translation.

All of these may be stored in the app, bundled with it and downloaded by users. None requires a
fee, a subscription or a per-product authorisation.

## 2. Excluded libraries

| Library | Reason |
|---|---|
| **ARASAAC** | CC BY-NC-SA (non-commercial); commercial authorisation was refused. Removed from the app. |
| **Tawasol** (Mada, Qatar) | **Contradictory licence on the official site.** The terms page says CC BY-SA 4.0 and "free and commercial products"; the footer of every page says "Creative Commons Attribution-NonCommercial 4.0". The set also links to ARASAAC symbols for some words. The old address tawasolsymbols.org now belongs to an unrelated site. → Excluded until Mada confirms in writing which licence applies (see section 4). |
| Sclera, PiCom Symbols | CC BY-NC |
| Jellow, AAC Image Library, Dyvogra, Guemil, LanguageCraft, Link Project, Participatory Action Research, Typical Bulgarian, Croatian, Montenegrin, Albanian, Macedonian sets | CC BY-NC-SA |
| SEA Symbols, Serbian sets | CC BY-NC-ND |
| The Noun Project, IcoMoon, IconArchive (via OpenSymbols) | Mixed licences icon by icon; no right to bulk download |
| Otsimo, Adam Urdu, Stellar, Mulberry Additional / Plus, Blissymbolics, OCHA Humanitarian, PiCom "AI" and "Unicode" sets (via Global Symbols) | Listed as CC BY-SA or public domain **by the aggregator only**; not verified at each publisher (several have no official page; the Global Symbols terms page could not be read; bulk download needs an account). The PiCom "AI" sets are AI-generated, which raises an authorship question. → Not imported; can be added later if verified. |

Aggregators (OpenSymbols, Global Symbols) were used only to **find** collections; no licence was
taken from them without checking the publisher. The app's online picture search must likewise
only return collections from section 1.

## 3. What the licences mean for a paid app

- **CC BY-SA 4.0 (Mulberry, OpenMoji) does not make the app's source code open.** Share-alike
  applies to *adapted pictograms* (redrawn, recoloured, combined). The app is a collection that
  shows them; its code, texts and other content keep their own licence. Resizing a pictogram or
  saving it in another file format is a technical copy, not an adaptation, but it stays under
  CC BY-SA and must be credited.
- If we ever **modify** a Mulberry or OpenMoji drawing, the modified drawing must be published
  under CC BY-SA 4.0 and marked as modified. The database has a "modified" field for this; today
  every imported pictogram is unmodified (only resized for the app).
- **Attribution** is centralised on the page *Settings → About → Pictogram credits & licences*,
  which is what Twemoji and OpenMoji explicitly accept and what CC calls "any reasonable manner".
  Printed boards carry a short credit line too.
- **MIT / ISC / Apache 2.0 / OFL / Unicode**: the copyright lines and licence texts are shown in
  full on the credits page.
- **Mulberry**: never sell the pictograms as such (no paid "pictogram pack").

## 4. Points for legal review

1. **App stores and CC BY-SA.** CC BY-SA 4.0 forbids adding technical protection that stops people
   from using the licensed material. App-store copy protection covers the whole app. Common
   practice (many store apps ship Mulberry or OpenMoji) is to keep the pictograms freely
   obtainable: the credits page links to the original sources. A lawyer should confirm this is
   sufficient for your stores.
2. **Tawasol.** Ask Mada (tawasol.mada.org.qa → Contact) to confirm in writing: CC BY-SA 4.0 or
   CC BY-NC 4.0, and which symbols are original Tawasol drawings. With that confirmation it can be
   added in a few minutes; it is the best source of culturally Arabic symbols.
3. **Noto Emoji.** The README says the images are Apache 2.0, but the `LICENSE` file at the root of
   the repository contains the OFL 1.1 text. Both allow commercial use; both notices are shown.
4. **Trademarks.** The licences cover the drawings, not the trademarks they may show. Company
   logos and icons of named commercial products are **not imported** (OpenMoji's 53 "brand"
   extras such as the Apple logo, Phosphor's 80 logos, Tabler's 378 `brand-*` icons and 80 product
   icons, 77 Google product icons in Material Symbols, 6 logos in Health Icons). Three Mulberry
   symbols are kept although their name is a brand, because they are Mulberry's own drawings of
   everyday objects a child may ask for: `iPhone`, `lego`, `playstation`. Country flags are kept
   (emoji). A lawyer may prefer to remove those three: it is one line in the build script.
5. **Microsoft / Google / Twitter names** are used only to credit the authors; the licences give
   no right to suggest endorsement.
6. **Translations.** French and Arabic labels of the non-emoji libraries are produced
   automatically and marked "to review" in the database; they are search aids, not validated
   vocabulary.
7. **ARASAAC already distributed.** Earlier test builds and the online demo contained ARASAAC
   pictograms; pictures a tester copied onto a word stay on that device. New builds contain none.

## 5. What was imported (after the verification above)

Built on 2026-11-11 by `npm run build:picto`. "Available" is the size of the official collection as
published (all styles and variants); "imported" is what is in the app.

| Library | Version (pinned) | Available | Imported | Not imported, and why |
|---|---|---:|---:|---|
| Mulberry Symbols | 3.6.1 (commit `fa94a93c`) | 3,436 | **3,436** | — |
| OpenMoji | 17.0.0 (npm) | 4,495 | **2,403** | 2,030 skin-tone variants, 9 components, 53 brand logos |
| Fluent Emoji | commit `1ffb34c7` | 3,145 | **1,595** | skin-tone variants (colour style, default tone kept) |
| Noto Emoji | commit `99701e07` | 3,750 | **1,667** | skin-tone variants; sequences Unicode gives no name to |
| Twemoji | 17.0 (commit `b6b55fef`) | 4,009 | **1,918** | skin-tone variants; sequences Unicode gives no name to |
| Health Icons | 3.1.0 (npm) | 1,552 | **770** | 776 icons × 2 styles: the filled style is kept; 6 logos |
| Material Symbols | commit `10ecc147` | 4,425 | **4,080** | 268 names have no file in the "rounded, filled" style at this commit; 77 Google product icons |
| Phosphor Icons | 2.1.1 (npm) | 9,072 | **1,432** | 1,512 icons × 6 weights: the regular weight is kept; 80 logos |
| Lucide | 1.72.0 (npm) | 2,052 | **2,052** | — |
| Tabler Icons | 3.51.0 (npm) | 6,287 | **4,775** | 5,233 outline + 1,054 filled: outline kept; 378 brand icons, 80 product icons |
| **Total** | | **42,223** | **24,128** | 0 file failed to convert |

The 24,128 pictograms cover **15,489 different concepts**; 3,525 concepts have several pictograms
(a search for "apple" / "pomme" / "تفاحة" shows drawings from 7 libraries), so the family can
choose the drawing style.

### Words in three languages

| Library | With French | With Arabic | Marked "to review" (FR / AR) | Ambiguous word |
|---|---:|---:|---:|---:|
| Mulberry Symbols | 2,459 | 2,009 | 2,278 / 1,853 | 125 |
| OpenMoji | 1,963 | 1,963 | 38 / 38 | 4 |
| Fluent, Noto, Twemoji | all | all | 0 | 0 |
| Health Icons | 103 | 103 | 85 / 85 | 12 |
| Material Symbols | 207 | 207 | 183 / 183 | 36 |
| Phosphor Icons | 280 | 280 | 257 / 257 | 42 |
| Lucide | 275 | 275 | 243 / 243 | 40 |
| Tabler Icons | 293 | 293 | 261 / 261 | 43 |

- Emoji words (French, English, Arabic) are Unicode's own (CLDR 49): not machine translated.
- Mulberry ships English names and a French column that is itself automatic; Arabic comes from the
  shared word lists. All of it is marked "to review" unless it is one of the app's own checked words.
- The icon libraries are English only. They get French and Arabic **only** when their English name
  is exactly a word of the lists in `pictograms/translations/` (about 1,000 everyday words, written
  for this project and marked automatic) or an emoji name. The other ≈ 11,900 icons are found in
  English only. `pictograms/database/untranslated.txt` lists the words still to translate.
- A word is marked **ambiguous** when its English name has several meanings (bat, nail, light,
  orange…): the translation may not match that drawing, so it is flagged instead of assumed. In the
  app these words carry a `*` and the note "Automatic translation: to check".
- Arabic search words are Modern Standard Arabic (plus the app's Lebanese words for its own
  vocabulary). They are search aids; the labels shown on the child's board stay the app's own.

## 6. Where the files are

| What | Where | In the repository? |
|---|---|---|
| List of libraries, versions, licences, attribution texts | `pictograms/libraries.json` | yes |
| Each library's own licence file, unchanged | `pictograms/licenses/` | yes |
| The database: one line per pictogram (id, key, library, original file name, original label, concept, EN/FR/AR labels and keywords, image location, licence, author, source link, licence link, attribution, modification status, translation status) | `pictograms/database/pictograms.csv` (opens in Excel) | yes |
| Numbers per library | `pictograms/database/stats.json` | yes |
| Pictures of the app's 254 built-in words and why each was chosen | `assets/symbols/`, `pictograms/database/defaults.csv`, `pictograms/default-overrides.json` | yes |
| The library the app ships (160 px WebP, 161 packs, 61 MB) and its search index | `assets/picto/` | yes |
| Word lists for French and Arabic | `pictograms/translations/*.tsv` | yes |
| **Original SVG files**, untouched, with their original names and folders (≈ 600 MB with unused styles) | `../picto-sources/<library>/`, created by `npm run fetch:picto` | **no** — downloaded again from the official sources at the pinned versions; every database line links to its original file |

The originals are not stored in the app's repository because they are large and the app never
reads them; `npm run fetch:picto` rebuilds the same folder on any computer in a few minutes, and
`npm run build:picto` rebuilds the library from it. If you prefer a private archive of the
originals (in case a project disappears), keep a copy of that folder.

To add a library later: verify its licence at the source, add it to `pictograms/libraries.json`,
`scripts/fetch-pictogram-sources.sh` and a loader in `scripts/build-pictograms.ts`, then rebuild —
the search, the picker's filter and the credits page update by themselves.

