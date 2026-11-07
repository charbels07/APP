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
- `npm run fetch:arasaac` regenerates `src/data/arasaacMap.ts` (needs access to
  api.arasaac.org and static.arasaac.org).
- `npm run build:picto` rebuilds the offline pictogram library (`assets/picto/`, base64 text packs:
  some hosts refuse binary files) and `src/data/pictoLibrary.ts`. Set `PICTO_CACHE` to reuse downloads.
- Speech recognition uses `expo-speech-recognition` (native module): test on a dev/EAS build, not Expo Go.
