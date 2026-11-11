import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BUILTIN_CONCEPTS } from '../data/concepts';
import { createDefaultProfile } from '../data/defaults';
import { PICTO_LIBRARIES, PICTO_LICENSE_TEXTS, PICTO_TOTAL } from '../data/pictoLibraries';
import { SYMBOL_DEFAULTS } from '../data/symbolMap';
import { symbolOf } from '../lib/lexicon';
import { libraryOf, PICTO_AR_AUTO, PICTO_FR_AUTO, PICTO_SENSITIVE, prepareIndex, searchPictos, type PictoIndex } from '../lib/pictoSearch';
import { migrate } from '../lib/storage';

const root = join(__dirname, '../..');
const raw: PictoIndex = JSON.parse(readFileSync(join(root, 'assets/picto/index.pidx'), 'utf8'));
const index = prepareIndex(raw);
const manifest: { id: string; license: string }[] = JSON.parse(readFileSync(join(root, 'pictograms/libraries.json'), 'utf8'));

/** Licences accepted for a paid app (docs/PICTOGRAM-LICENSES.md). */
const ALLOWED = /^(CC BY-SA 4\.0|CC BY 4\.0|CC0 1\.0|MIT|ISC|Apache-2\.0)/;

describe('pictogram library (free for commercial use)', () => {
  it('holds only pictograms of the verified libraries, each with a unique key', () => {
    const known = new Set(manifest.map((l) => l.id));
    expect(raw.libs!.every((id) => known.has(id))).toBe(true);
    expect(raw.libs).not.toContain('arasaac');
    const keys = raw.items.map((it) => it[10]!);
    expect(new Set(keys).size).toBe(keys.length);
    for (const it of raw.items) expect(it[10]!.split('/')[0]).toBe(raw.libs![it[9]!]);
    expect(raw.items.length).toBe(PICTO_TOTAL);
    expect(PICTO_TOTAL).toBeGreaterThan(20000);
  });

  it('never uses a non-commercial or unknown licence', () => {
    for (const lib of manifest) {
      expect(lib.license).toMatch(ALLOWED);
      expect(lib.license).not.toMatch(/NC|non.?commercial/i);
    }
  });

  it('leaves out company logos and adult content from suggestions', () => {
    const keys = new Set(raw.items.map((it) => it[10]!));
    // Apple logo (OpenMoji extras), brand logos (Phosphor, Tabler), Google product icons (Material).
    for (const k of ['openmoji/F8FF', 'openmoji/E042', 'phosphor/apple-logo', 'tabler/brand-apple', 'material/android', 'tabler/lego']) expect(keys.has(k)).toBe(false);
    expect([...keys].some((k) => /^phosphor\/.*-logo$/.test(k))).toBe(false);
    // Still there for an adult who searches, but never proposed automatically.
    const beer = raw.items.find((it) => it[10] === 'openmoji/1F37A')!;
    expect((beer[8] ?? 0) & PICTO_SENSITIVE).toBe(PICTO_SENSITIVE);
  });

  it('finds the same idea in French, English and Arabic, in several libraries', () => {
    const libsOf = (ids: number[]) => new Set(ids.map((id) => libraryOf(index, id)));
    const fr = searchPictos(index, 'manger', 'fr', 40);
    const en = searchPictos(index, 'eat', 'en', 40);
    const ar = searchPictos(index, 'يأكل', 'ar', 40);
    for (const found of [fr, en, ar]) expect(found.length).toBeGreaterThanOrEqual(2);
    expect(libsOf(en).size).toBeGreaterThanOrEqual(2);
    // The Mulberry "eat" symbol is reached from the three languages.
    const eat = index.byKey.get('mulberry/eat_,_to')!;
    expect(eat).toBeDefined();
    for (const found of [fr, en, ar]) expect(found).toContain(eat);
  });

  it('can limit a search to one library', () => {
    const only = searchPictos(index, 'apple', 'en', 40, 'mulberry');
    expect(only.length).toBeGreaterThan(0);
    expect(only.every((id) => libraryOf(index, id) === 'mulberry')).toBe(true);
  });

  it('marks French and Arabic words that were added automatically', () => {
    // Emoji words come from Unicode's own lists: nothing to review.
    const emoji = raw.items.filter((it) => ['fluent', 'noto', 'twemoji'].includes(raw.libs![it[9]!]));
    expect(emoji.every((it) => !((it[8] ?? 0) & (PICTO_FR_AUTO | PICTO_AR_AUTO)))).toBe(true);
    // Icon libraries are English only: a French word there is ours, so it is marked — unless it
    // is one of the app's own words.
    const own = new Set(Object.values(BUILTIN_CONCEPTS).map((c) => c.labels.fr.toLowerCase()));
    const icons = raw.items.filter((it) => raw.libs![it[9]!] === 'tabler' && it[4].length > 0);
    expect(icons.length).toBeGreaterThan(50);
    for (const it of icons) if (!((it[8] ?? 0) & PICTO_FR_AUTO)) expect(own.has(it[4][0].toLowerCase())).toBe(true);
  });

  it('gives every built-in word a picture from the library', () => {
    for (const key of Object.values(SYMBOL_DEFAULTS)) expect(index.byKey.has(key)).toBe(true);
  });
});

describe('credits and licences page', () => {
  it('lists exactly the libraries that have pictograms in the app, with their numbers', () => {
    const counts = new Map<string, number>();
    for (const it of raw.items) counts.set(raw.libs![it[9]!], (counts.get(raw.libs![it[9]!]) ?? 0) + 1);
    expect(PICTO_LIBRARIES.map((l) => l.id).sort()).toEqual([...counts.keys()].sort());
    for (const lib of PICTO_LIBRARIES) expect(lib.count).toBe(counts.get(lib.id));
  });

  it('gives each library its author, website, licence, notice and attribution', () => {
    for (const lib of PICTO_LIBRARIES) {
      for (const field of [lib.name, lib.author, lib.copyright, lib.attribution, lib.license]) expect(field.trim()).not.toBe('');
      expect(lib.website).toMatch(/^https:\/\//);
      expect(lib.licenseUrl).toMatch(/^https:\/\//);
      expect(lib.modified).toBe(false);
    }
  });

  it('shows the full text of the licences that ask for it', () => {
    for (const lib of PICTO_LIBRARIES) {
      const needsText = /MIT|ISC|Apache|OFL/.test(lib.license);
      expect(lib.fullText).toBe(needsText);
      if (needsText) expect(PICTO_LICENSE_TEXTS[lib.id].length).toBeGreaterThan(300);
      if (lib.extraLicense) expect(PICTO_LICENSE_TEXTS[lib.extraLicense].length).toBeGreaterThan(300);
    }
    expect(PICTO_LICENSE_TEXTS.unicode).toContain('Unicode');
  });

  it('flags the share-alike libraries', () => {
    expect(PICTO_LIBRARIES.filter((l) => l.shareAlike).map((l) => l.id).sort()).toEqual(['mulberry', 'openmoji']);
  });

  it('keeps a copy of every licence file next to the database', () => {
    for (const lib of PICTO_LIBRARIES) {
      const files = ['LICENSE', 'LICENSE.txt', 'LICENSE-GRAPHICS'].map((f) => join(root, 'pictograms/licenses', `${lib.id}-${f}`));
      expect(files.some((f) => existsSync(f))).toBe(true);
    }
  });
});

describe('profiles saved with the former pictograms', () => {
  it('go back to the app picture, and keep everything the family made', () => {
    const old = createDefaultProfile() as any;
    old.settings.symbolSet = 'arasaac';
    old.overrides = {
      apple: { symbol: { kind: 'arasaac', id: 2462 }, labels: { fr: 'pomme verte' } },
      dog: { symbol: { kind: 'media', name: 'rex.jpg' } },
    };
    const p = migrate(JSON.parse(JSON.stringify(old)));
    expect(p.settings.symbolSet).toBe('pictos');
    expect(p.overrides.apple).toEqual({ labels: { fr: 'pomme verte' } });
    expect(p.overrides.dog.symbol).toEqual({ kind: 'media', name: 'rex.jpg' });
    expect(symbolOf(p, 'apple')).toEqual({ kind: 'picto', key: SYMBOL_DEFAULTS.apple });
  });

  it('leave the emoji choice alone', () => {
    const old = createDefaultProfile() as any;
    old.settings.symbolSet = 'emoji';
    expect(migrate(old).settings.symbolSet).toBe('emoji');
  });
});
