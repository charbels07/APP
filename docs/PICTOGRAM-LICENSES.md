# Pictogram libraries — licence eligibility report

Checked on 2026-11-11, before any download. Rule applied: a library is used only if its **own
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
4. **Trademarks.** Emoji and icons that show brands or flags are drawings under these licences,
   but trademark and flag-use rules still apply. Company logos are not imported.
5. **Microsoft / Google / Twitter names** are used only to credit the authors; the licences give
   no right to suggest endorsement.
6. **Translations.** French and Arabic labels of the non-emoji libraries are produced
   automatically and marked "to review" in the database; they are search aids, not validated
   vocabulary.
7. **ARASAAC already distributed.** Earlier test builds and the online demo contained ARASAAC
   pictograms; pictures a tester copied onto a word stay on that device. New builds contain none.
