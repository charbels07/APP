# Project notes

- Expo SDK 58 / React Native 0.88 / TypeScript. Expo APIs change between SDKs: check
  `node_modules/<pkg>/build/*.d.ts` before using an API instead of relying on memory.
- Use `EXPO_OFFLINE=1 npx expo install <pkg>` (the Expo API host may be unreachable).
- Checks before committing: `npm run typecheck` and `npm test`.
- No Expo Router on purpose: the app is one surface with a persistent universal bar
  (`src/ui/Root.tsx`); overlays live inside the content area so the bar is always reachable.
- Vocabulary is concept-based (`src/data/concepts.ts`); never move core cells
  (`src/data/defaults.ts`) when editing: positions are the user's motor plan.
- Platform-specific code uses `.web.ts(x)` siblings (media store, printing, preview).
- Pictograms: only libraries verified as free for commercial use (`docs/PICTOGRAM-LICENSES.md`,
  `pictograms/libraries.json`). Never add ARASAAC or any NC / unclear-licence set. A pictogram is
  identified by its stable key `library/file` (`SymbolRef` kind `picto`), not by a number.
- `npm run fetch:picto` downloads the originals at pinned versions into `../picto-sources`
  (`PICTO_SOURCES`); `npm run build:picto` rebuilds the library (`assets/picto/`, base64 text packs:
  some hosts refuse binary files), `src/data/pictoLibrary.ts`, `src/data/pictoLibraries.ts` (credits
  page) and `pictograms/database/`; `npm run build:symbols` rebuilds the built-in words' pictures
  (`assets/symbols/`, `src/data/symbolMap.ts`; choices by hand in `pictograms/default-overrides.json`).
- French/Arabic words for the icon libraries come from `pictograms/translations/*.tsv` and are
  flagged "to review" (`*` in the picker); never present them as validated vocabulary.
- Speech recognition uses `expo-speech-recognition` (native module): test on a dev/EAS build, not Expo Go.
- Two languages: `settings.lang` (words: labels, speech) and `settings.uiLang` (navigation: `src/i18n/ui.ts`,
  `src/data/guide.ts`, FR/EN/AR). Arabic navigation mirrors menus via `useNavRtl()`; never mirror boards.
- Pictures from the internet (`src/lib/webPictures.ts`): Global Symbols (labels match whole words only;
  only the sets in `VERIFIED_SETS`) and Openverse (anonymous requests: `page_size` ≤ 20). The artifact demo has no network: paste works there.
- Arabic: the family chooses a dialect or none (`settings.arabic`). `src/data/concepts.ts` holds the Lebanese
  words; `src/data/dialectWords.ts` lists what differs per dialect (data only: also read by the build script).
  Always read Arabic labels through `getConcept` / `label`, languages through `availableLangs`, and the
  language name through `langName` — never `BUILTIN_CONCEPTS[id].labels.ar` or `LANGS` directly in screens.
- Dialect voices: NOT used (decision of November 2026: the generated voices were judged bad by a native
  listener). Arabic is read by the device's standard Arabic voice whatever the dialect; do not generate or
  ship voice packs, and do not make the Arabic voice follow the dialect, unless asked. The code stays, switched
  off by the empty index (`npm run build:voices`, `src/lib/dialectVoice.ts`, `src/data/voicePackIndex.ts`).
- A man's / woman's voice is chosen by name in `src/lib/voices.ts`: machine-like and joke voices (`ROBOTIC`)
  come last. A family's own recording of a word (`overrides[id].audio[lang]`) always wins over any voice.
- App pictograms live in `src/data/concepts.ts` (`app: { url, triggers }`); new built-in folders are added
  to saved profiles by a one-time migration in `src/lib/storage.ts` (only into an empty slot).
- Back office (`src/ui/admin/`, stage `admin`): only accounts in the database table `admins`; every
  `admin_*` function checks `is_admin()` (never rely on hiding the page). A `pro` account works on a
  child's profile only once its verification is `verified` (triggers + `access_of`; the demo server
  mirrors this in `LocalBackend.cleared`). Figures from children's profiles or usage: consenting
  families only (`shareStats = 'anonymous'`), never under 5 children, never a name, word or sentence.
