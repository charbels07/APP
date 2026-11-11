/**
 * Builds the app's pictogram library from the open libraries listed in pictograms/libraries.json
 * (all free for commercial use: see docs/PICTOGRAM-LICENSES.md).
 *
 *   npm run build:picto            catalogue + images (a few minutes)
 *   npm run build:picto -- --dry   catalogue and statistics only (seconds)
 *
 * Needs the original files, downloaded by scripts/fetch-pictogram-sources.sh into ../picto-sources
 * (or the folder named by PICTO_SOURCES). Originals are never modified: each drawing is only
 * resized to a 160 px WebP for the app.
 *
 * Output:
 *   assets/picto/index.pidx        search index: [id, pack, offset, length, fr[], en[], ar[], topics[], flags, lib, key]
 *   assets/picto/pNNN.pack         base64 text of concatenated WebP images
 *   src/data/pictoLibrary.ts       the asset list
 *   src/data/pictoLibraries.ts     libraries actually used, with licence notices (Credits page)
 *   pictograms/database/*.csv      the full database (one line per pictogram) and statistics
 *   pictograms/licenses/*          each library's own licence file
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { BUILTIN_CONCEPTS } from '../src/data/concepts.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.PICTO_SOURCES ?? join(root, '../picto-sources');
const outDir = join(root, 'assets/picto');
const DRY = process.argv.includes('--dry');
const SIZE = 160;
const PACK_SIZE = 150;

/** Flags kept with each pictogram. */
const SENSITIVE = 1; // left out of automatic suggestions
const FR_AUTO = 2; // French label not from the library: to review
const AR_AUTO = 4; // Arabic label not from the library: to review
const AMBIGUOUS = 8; // the English word has several meanings: translation to check

interface Library {
  id: string;
  name: string;
  author: string;
  website: string;
  repository: string;
  version: string;
  revision: string;
  license: string;
  licenseUrl: string;
  licenseFile: string;
  extraLicense?: string;
  copyright: string;
  attribution: string;
  sourcePattern: string;
  style: string;
  shareAlike?: boolean;
}

interface Rec {
  lib: string;
  /** Path of the original file inside the library's folder. */
  file: string;
  /** Stable name inside the library (the key is `lib/stem`). */
  stem: string;
  /** Label as the library gives it. */
  original: string;
  en: string[];
  fr: string[];
  ar: string[];
  topics: string[];
  flags: number;
  author?: string;
  emoji?: string;
}

const libraries: Library[] = JSON.parse(readFileSync(join(root, 'pictograms/libraries.json'), 'utf8'));
const read = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');
const json = (...p: string[]) => JSON.parse(read(...p));
/** One library file has a damaged letter ("Le\uFFFDn"): repaired here, and anything else damaged is dropped. */
const repair = (x: string) => x.replace(/le\uFFFDn/gi, (m) => (m[0] === 'L' ? 'León' : 'león'));
const uniq = (a: (string | undefined)[]) => [...new Set(a.map((x) => repair(x ?? '').trim()).filter((x) => x && !x.includes('\uFFFD')))];
const clean = (s: string) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Words of the emoji: Unicode CLDR (names and keywords written per language) ──

const stripVs = (s: string) => s.replace(/️/g, '');
function cldr(lang: string): Map<string, { name?: string; kw: string[] }> {
  const m = new Map<string, { name?: string; kw: string[] }>();
  const add = (obj: Record<string, { default?: string[]; tts?: string[] }>) => {
    for (const [emoji, v] of Object.entries(obj)) m.set(stripVs(emoji), { name: v.tts?.[0] && clean(v.tts[0]), kw: (v.default ?? []).map(clean) });
  };
  add(json('cldr', 'annotations', lang, 'annotations.json').annotations.annotations);
  add(json('cldr-derived', 'annotationsDerived', lang, 'annotations.json').annotationsDerived.annotations);
  return m;
}
const CLDR = { en: cldr('en'), fr: cldr('fr'), ar: cldr('ar') };

const SKIN = /1f3f[b-f]/i;
const fromHex = (hex: string[]) => String.fromCodePoint(...hex.map((h) => parseInt(h, 16)));
/** Never proposed automatically (alcohol, tobacco, weapons, adult content); an adult can still search them. */
const SENSITIVE_EMOJI = new Set(['🖕', '🚬', '🍺', '🍻', '🍷', '🍸', '🍹', '🥂', '🥃', '🍶', '🍾', '🔫', '💣', '🗡', '⚔', '🔞', '🎰']);
const SENSITIVE_WORDS =
  /\b(beer|wine|cocktail|champagne|whisk(e)?y|vodka|liquor|alcohol\w*|cigarette|cigar|smoking|vape|vaping|tobacco|gun|pistol|rifle|bomb|grenade|sex\w*|condom|nude|naked|drugs?|cannabis|marijuana|casino|gambl\w+|slot machine)\b/i;

/**
 * Company logos and icons of named commercial products are left out: the licences cover the
 * drawing, not the trademark (docs/PICTOGRAM-LICENSES.md, legal point 4).
 */
const BRAND: Record<string, (name: string) => boolean> = {
  material: (n) => n === 'android' || n === 'ios' || /(^|_)(adb|gitlab|youtube|google|stadia|chromecast|fitbit|nest|pixel|logo|intel)(_|$)/.test(n),
  tabler: (n) => n === 'steam' || /(^|-)(lego|playstation|xbox|nintendo|airpods|imac|ipad)(-|$)/.test(n),
  phosphor: (n) => /-logo(-|$)/.test(n),
  healthicons: (n) => /-logo$/.test(n),
};

function emojiRec(lib: string, file: string, stem: string, emoji: string, fallback: { label?: string; kw?: string[]; topics?: string[]; author?: string }): Rec | null {
  const key = stripVs(emoji);
  const en = CLDR.en.get(key);
  const label = en?.name ?? fallback.label;
  if (!label) return null;
  const fr = CLDR.fr.get(key);
  const ar = CLDR.ar.get(key);
  return {
    lib,
    file,
    stem,
    original: repair(fallback.label ?? label),
    en: uniq([label, ...(en?.kw ?? []), ...(fallback.kw ?? [])]),
    fr: uniq([fr?.name, ...(fr?.kw ?? [])]),
    ar: uniq([ar?.name, ...(ar?.kw ?? [])]),
    topics: uniq(['emoji', ...(fallback.topics ?? [])]),
    flags: SENSITIVE_EMOJI.has(key) ? SENSITIVE : 0,
    author: fallback.author,
    emoji,
  };
}

// ── One loader per library ──

/** Emoji master list (groups) from OpenMoji's data file. */
const openmojiData: {
  emoji: string;
  hexcode: string;
  group: string;
  subgroups: string;
  annotation: string;
  tags: string;
  openmoji_tags: string;
  openmoji_author: string;
  skintone: string;
}[] = json('openmoji', 'data', 'openmoji.json');
const groupOf = new Map(openmojiData.map((e) => [stripVs(e.emoji), [e.group, e.subgroups]]));

const loaders: Record<string, () => Promise<{ recs: Rec[]; available: number }>> = {
  async mulberry() {
    const lines = read('mulberry', 'scripts', 'data', 'symbol-info.csv').split(/\r?\n/).slice(1).filter(Boolean);
    const files = new Set(readdirSync(join(SRC, 'mulberry', 'EN')));
    const recs: Rec[] = [];
    for (const line of lines) {
      // symbol-id,category-id,grammar,rated,tags,symbol-en,category-en,symbol-fr,category-fr
      const c = parseCsv(line);
      const [, , grammar, , tags, name, category, nameFr] = c;
      if (!name || !files.has(`${name}.svg`)) continue;
      const verb = /_,_to$/.test(name) || grammar === 'Verb';
      const label = clean(
        name
          .replace(/_,_to$/, '')
          .replace(/_/g, ' ')
          .replace(/\s+\d+[a-z]?$/i, ''),
      );
      const fr = nameFr && !/_/.test(nameFr) && nameFr.toLowerCase() !== name.toLowerCase() ? clean(nameFr.toLowerCase().replace(/^(à|a) /, '')) : '';
      recs.push({
        lib: 'mulberry',
        file: `EN/${name}.svg`,
        stem: name,
        original: name,
        en: uniq([label, verb ? `to ${label}` : undefined, ...(tags ?? '').split(' ')]),
        fr: uniq([fr]),
        ar: [],
        topics: uniq([category, grammar?.toLowerCase(), ...(tags ?? '').split(' ')]),
        flags: (/sex/i.test(category ?? '') ? SENSITIVE : 0) | (fr ? FR_AUTO : 0),
      });
    }
    return { recs, available: files.size };
  },

  async openmoji() {
    const recs: Rec[] = [];
    for (const e of openmojiData) {
      // Skin-tone variants and the "brand" extras (company logos) are not imported.
      if (e.skintone || e.group === 'component' || e.subgroups === 'brand') continue;
      const r = emojiRec('openmoji', `color/svg/${e.hexcode}.svg`, e.hexcode, e.emoji, {
        label: e.annotation,
        kw: [...e.tags.split(','), ...e.openmoji_tags.split(',')],
        topics: [e.group, e.subgroups],
        author: e.openmoji_author,
      });
      if (r && existsSync(join(SRC, 'openmoji', r.file))) recs.push(r);
    }
    return { recs, available: openmojiData.length };
  },

  async fluent() {
    const dir = join(SRC, 'fluent', 'assets');
    const recs: Rec[] = [];
    let available = 0;
    for (const name of readdirSync(dir)) {
      const metaFile = join(dir, name, 'metadata.json');
      if (!existsSync(metaFile)) continue;
      const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as { glyph: string; cldr: string; keywords?: string[]; group?: string; unicode: string; unicodeSkintones?: string[] };
      available += meta.unicodeSkintones?.length ?? 1;
      const sub = existsSync(join(dir, name, 'Default')) ? 'Default/Color' : 'Color';
      const svg = existsSync(join(dir, name, sub)) ? readdirSync(join(dir, name, sub)).find((f) => f.endsWith('.svg')) : undefined;
      if (!svg) continue;
      const r = emojiRec('fluent', `assets/${name}/${sub}/${svg}`, meta.unicode.replace(/ /g, '-'), meta.glyph, {
        label: meta.cldr,
        kw: meta.keywords,
        topics: [meta.group ?? '', ...(groupOf.get(stripVs(meta.glyph)) ?? [])],
      });
      if (r) recs.push(r);
    }
    return { recs, available };
  },

  async noto() {
    const files = readdirSync(join(SRC, 'noto', '2D', 'svg')).filter((f) => f.endsWith('.svg'));
    const recs: Rec[] = [];
    for (const f of files) {
      const hex = f.replace(/^emoji_u/, '').replace(/\.svg$/, '').split('_');
      if (hex.some((h) => SKIN.test(h))) continue;
      const emoji = fromHex(hex);
      const r = emojiRec('noto', `2D/svg/${f}`, hex.join('-'), emoji, { topics: groupOf.get(stripVs(emoji)) });
      if (r) recs.push(r);
    }
    return { recs, available: files.length };
  },

  async twemoji() {
    const files = readdirSync(join(SRC, 'twemoji', 'assets', 'svg')).filter((f) => f.endsWith('.svg'));
    const recs: Rec[] = [];
    for (const f of files) {
      const hex = f.replace(/\.svg$/, '').split('-');
      if (hex.some((h) => SKIN.test(h))) continue;
      const emoji = fromHex(hex);
      const r = emojiRec('twemoji', `assets/svg/${f}`, hex.join('-'), emoji, { topics: groupOf.get(stripVs(emoji)) });
      if (r) recs.push(r);
    }
    return { recs, available: files.length };
  },

  async healthicons() {
    const meta: { id: string; category: string; path: string; tags: string[]; title: string }[] = json('healthicons', 'public', 'icons', 'meta-data.json');
    const recs: Rec[] = [];
    for (const m of meta) {
      const file = `public/icons/svg/filled/${m.path}.svg`;
      if (!existsSync(join(SRC, 'healthicons', file)) || BRAND.healthicons(m.path)) continue;
      recs.push({
        lib: 'healthicons',
        file,
        stem: m.path,
        original: m.title,
        en: uniq([m.title.toLowerCase(), ...m.tags.filter((t) => !t.includes(':')).map((t) => t.toLowerCase())]),
        fr: [],
        ar: [],
        topics: uniq(['health', m.category]),
        flags: 0,
      });
    }
    return { recs, available: meta.length * 2 };
  },

  async material() {
    const names = read('material', 'names.txt').split('\n').filter(Boolean);
    const recs: Rec[] = [];
    for (const n of names) {
      if (!existsSync(join(SRC, 'material', 'svg', `${n}.svg`)) || BRAND.material(n)) continue;
      recs.push({ lib: 'material', file: `svg/${n}.svg`, stem: n, original: n, en: [n.replace(/_/g, ' ')], fr: [], ar: [], topics: ['icon'], flags: 0 });
    }
    return { recs, available: names.length };
  },

  async phosphor() {
    const mod = (await import(pathToFileURL(join(SRC, 'phosphor', 'dist', 'index.mjs')).href)) as { icons: { name: string; tags: string[]; categories: string[] }[] };
    const recs: Rec[] = [];
    for (const i of mod.icons) {
      const file = `assets/regular/${i.name}.svg`;
      if (!existsSync(join(SRC, 'phosphor', file)) || i.categories.includes('brands') || BRAND.phosphor(i.name)) continue;
      recs.push({
        lib: 'phosphor',
        file,
        stem: i.name,
        original: i.name,
        en: uniq([i.name.replace(/-/g, ' '), ...i.tags.filter((t) => !t.includes('*'))]),
        fr: [],
        ar: [],
        topics: uniq(['icon', ...i.categories]),
        flags: 0,
      });
    }
    return { recs, available: mod.icons.length * 6 };
  },

  async lucide() {
    const tags: Record<string, string[]> = json('lucide', 'tags.json');
    const recs: Rec[] = [];
    for (const [name, kw] of Object.entries(tags)) {
      const file = `icons/${name}.svg`;
      if (!existsSync(join(SRC, 'lucide', file))) continue;
      recs.push({ lib: 'lucide', file, stem: name, original: name, en: uniq([name.replace(/-/g, ' '), ...kw]), fr: [], ar: [], topics: ['icon'], flags: 0 });
    }
    return { recs, available: Object.keys(tags).length };
  },

  async tabler() {
    const icons: Record<string, { name: string; category?: string; tags?: (string | number)[]; styles?: Record<string, unknown> }> = json('tabler', 'icons.json');
    const recs: Rec[] = [];
    let available = 0;
    for (const i of Object.values(icons)) {
      available += Object.keys(i.styles ?? {}).length;
      // Company logos: the licence covers the drawing, not the trademark.
      if (i.name.startsWith('brand-') || i.category === 'Brand' || BRAND.tabler(i.name) || !i.styles?.outline) continue;
      const file = `icons/outline/${i.name}.svg`;
      if (!existsSync(join(SRC, 'tabler', file))) continue;
      recs.push({
        lib: 'tabler',
        file,
        stem: i.name,
        original: i.name,
        en: uniq([i.name.replace(/-/g, ' '), ...(i.tags ?? []).map(String)]),
        fr: [],
        ar: [],
        topics: uniq(['icon', i.category]),
        flags: 0,
      });
    }
    return { recs, available };
  },
};

function parseCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') (out.push(cur), (cur = ''));
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// ── Concepts and translations ──

/** One concept per English word or expression: pictograms of every library meet there. */
export const conceptOf = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/ /g, '_');

/** English words with several everyday meanings: their translations are marked "to check". */
const HOMONYMS = new Set(
  `bat orange glasses light match fly duck bow nail bank palm bark wave watch ring letter date spring left right fan mouse bear saw can park play present change close cold fall file fine kind last lie mean mine net note order pen point pool pound pupil rock rose row seal sink star stick table tie tip toast train trip trunk well wind yard bill book box club crane cross deck drill drop iron jam key lead leaves mint mole pitch plant plate record ruler scale shed sign spot square stamp state story tap tear top turkey china chest chip bolt board band bar bass cap case cell charge check class coach court crown current degree draw dress fair figure glass ground horn jack kid line lock log mail mark mass model monitor organ pad patient pipe pitcher port post pump punch racket rest run safe school screen shower slide space staff stall step store suit swallow tank temple tick tire tissue toll track tube type vessel volume back bug calf cast character china cricket dish dove field foot hand head hit jar joint lap lime march may nut pick ram rate ray sail scales second shade sole sound stable stage sweet swing tablet ticket time tone tool wing work`.split(
    /\s+/,
  ),
);

type Tr = { fr?: string; ar?: string; from: 'app' | 'curated' | 'cldr' };
function lexicon(): Map<string, Tr> {
  const lex = new Map<string, Tr>();
  // 3. Unicode names of the emoji (word for word the same thing in the three languages).
  for (const [emoji, en] of CLDR.en) {
    if (!en.name || en.name.includes(':')) continue;
    const c = conceptOf(en.name);
    if (!c || lex.has(c)) continue;
    lex.set(c, { fr: CLDR.fr.get(emoji)?.name, ar: CLDR.ar.get(emoji)?.name, from: 'cldr' });
  }
  // Countries and flags ("flag France", "country France"): Unicode's own country names.
  for (const [emoji, en] of CLDR.en) {
    const m = en.name?.match(/^flag: (.+)$/);
    if (!m) continue;
    const fr = CLDR.fr.get(emoji)?.name?.split(':')[1]?.trim();
    const ar = CLDR.ar.get(emoji)?.name?.split(':')[1]?.trim();
    if (!fr && !ar) continue;
    lex.set(conceptOf(`flag ${m[1]}`), { fr: fr && `drapeau ${fr}`, ar: ar && `علم ${ar}`, from: 'cldr' });
    lex.set(conceptOf(`country ${m[1]}`), { fr, ar, from: 'cldr' });
  }
  // 2. Translations written for this project (pictograms/translations/*.tsv: english, french, arabic).
  const dir = join(root, 'pictograms/translations');
  for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.tsv')).sort() : []) {
    for (const line of readFileSync(join(dir, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [en, fr, ar] = line.split('\t').map((x) => x?.trim());
      if (!en) continue;
      const before = lex.get(conceptOf(en));
      const join = (a?: string, b?: string) => [...new Set([a, b].flatMap((x) => (x ? x.split(';').map((y) => y.trim()) : [])))].join(';') || undefined;
      // A later file adds its words to an earlier one (the later file's words first).
      lex.set(conceptOf(en), before?.from === 'curated' ? { fr: join(fr, before.fr), ar: join(before.ar, ar), from: 'curated' } : { fr: fr || undefined, ar: ar || undefined, from: 'curated' });
    }
  }
  // 1. The app's own vocabulary (checked by hand; Arabic is Lebanese), followed by what the
  //    translation files add for the same word (e.g. Standard Arabic).
  for (const c of Object.values(BUILTIN_CONCEPTS)) {
    if (c.cls === 'folder' || !c.labels.en) continue;
    const key = conceptOf(c.labels.en);
    const extra = lex.get(key);
    const more = (own: string, other?: string) => [own, ...(extra?.from === 'curated' && other ? other.split(';') : [])].join(';');
    lex.set(key, { fr: more(c.labels.fr, extra?.fr), ar: more(c.labels.ar, extra?.ar), from: 'app' });
  }
  return lex;
}

// ── Build ──

const ORDER = ['mulberry', 'openmoji', 'fluent', 'noto', 'twemoji', 'healthicons', 'material', 'phosphor', 'lucide', 'tabler'];

async function main() {
  const lex = lexicon();
  const all: (Rec & { concept: string; key: string })[] = [];
  const stats: Record<string, { available: number; imported: number; fr: number; ar: number; frAuto: number; arAuto: number; ambiguous: number }> = {};
  for (const id of ORDER) {
    const lib = libraries.find((l) => l.id === id);
    if (!lib || !existsSync(join(SRC, id))) {
      console.log(`- ${id}: source folder missing, skipped`);
      continue;
    }
    const { recs, available } = await loaders[id]();
    const seen = new Set<string>();
    for (const r of recs) {
      if (seen.has(r.stem)) continue;
      seen.add(r.stem);
      const concept = conceptOf(r.en[0]);
      if (SENSITIVE_WORDS.test(r.en[0])) r.flags |= SENSITIVE;
      const tr = lex.get(concept);
      // A library's own words win; otherwise the concept's translation, marked "to review".
      // Translations written for the project (several synonyms separated by ";") are always
      // searchable: first when the library had nothing better, after its own words otherwise.
      const frs = tr?.fr ? tr.fr.split(';').map((x) => x.trim()) : [];
      const ars = tr?.ar ? tr.ar.split(';').map((x) => x.trim()) : [];
      if (!r.fr.length && frs.length) (r.fr = frs), (r.flags |= tr!.from === 'app' ? 0 : FR_AUTO);
      else if (frs.length && tr!.from !== 'cldr') {
        r.fr = r.flags & FR_AUTO ? uniq([...frs, ...r.fr]) : uniq([...r.fr, ...frs]);
        // The app's own word (checked by hand) now comes first: nothing left to review.
        if (tr!.from === 'app') r.flags &= ~FR_AUTO;
      }
      if (!r.ar.length && ars.length) (r.ar = ars), (r.flags |= tr!.from === 'app' ? 0 : AR_AUTO);
      else if (ars.length && tr!.from !== 'cldr') r.ar = uniq([...r.ar, ...ars]);
      // A single letter is its own name in every language.
      if (r.lib === 'mulberry' && /^[A-Za-z]$/.test(r.en[0])) (r.fr = [r.en[0]]), (r.flags &= ~FR_AUTO);
      if (HOMONYMS.has(concept) && (r.flags & (FR_AUTO | AR_AUTO) || !r.emoji)) r.flags |= AMBIGUOUS;
      // Search stays light: a handful of keywords per language.
      r.en = r.en.slice(0, 10);
      r.fr = r.fr.slice(0, 8);
      r.ar = r.ar.slice(0, 8);
      all.push({ ...r, concept, key: `${id}/${r.stem}` });
    }
    const mine = all.filter((x) => x.lib === id);
    stats[id] = {
      available,
      imported: mine.length,
      fr: mine.filter((x) => x.fr.length).length,
      ar: mine.filter((x) => x.ar.length).length,
      frAuto: mine.filter((x) => x.flags & FR_AUTO).length,
      arAuto: mine.filter((x) => x.flags & AR_AUTO).length,
      ambiguous: mine.filter((x) => x.flags & AMBIGUOUS).length,
    };
    console.log(`- ${lib.name}: ${mine.length} imported of ${available} available · fr ${stats[id].fr} · ar ${stats[id].ar}`);
  }
  const concepts = new Map<string, number>();
  for (const r of all) concepts.set(r.concept, (concepts.get(r.concept) ?? 0) + 1);
  console.log(`Total: ${all.length} pictograms, ${concepts.size} concepts (${[...concepts.values()].filter((n) => n > 1).length} shared by several pictograms)`);

  mkdirSync(join(root, 'pictograms/database'), { recursive: true });
  writeFileSync(
    join(root, 'pictograms/database/stats.json'),
    JSON.stringify({ built: new Date().toISOString().slice(0, 10), total: all.length, concepts: concepts.size, libraries: stats }, null, 2) + '\n',
  );
  if (process.argv.includes('--missing')) {
    // Labels without a translation, most shared concepts first (to write pictograms/translations).
    const miss = new Map<string, { n: number; label: string; libs: Set<string> }>();
    for (const r of all) {
      if (r.ar.length && r.fr.length) continue;
      const m = miss.get(r.concept) ?? { n: 0, label: r.en[0], libs: new Set<string>() };
      m.n++;
      m.libs.add(r.lib);
      miss.set(r.concept, m);
    }
    const list = [...miss.values()].sort((a, b) => Number(b.libs.has('mulberry')) - Number(a.libs.has('mulberry')) || b.n - a.n);
    writeFileSync(join(root, 'pictograms/database/untranslated.txt'), list.map((m) => `${m.label}\t${m.n}\t${[...m.libs].join(',')}`).join('\n') + '\n');
    console.log(`untranslated concepts: ${list.length}`);
  }
  if (DRY) return;

  // Images: each original is resized to 160 px, nothing else.
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (/\.(pack|pidx)$/.test(f)) unlinkSync(join(outDir, f));
  const images: (Buffer | null)[] = new Array(all.length).fill(null);
  let done = 0;
  let failed = 0;
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < all.length) {
        const i = next++;
        const r = all[i];
        // A few originals are drawn on a huge canvas: they are read at a lower density instead.
        const render = (density: number) =>
          sharp(join(SRC, r.lib, r.file), { density })
            .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 60, alphaQuality: 80, effort: 4 })
            .toBuffer();
        try {
          images[i] = await render(300);
        } catch {
          try {
            images[i] = await render(72);
          } catch {
            failed++;
          }
        }
        if (++done % 2000 === 0) console.log(`  images ${done}/${all.length}`);
      }
    }),
  );
  const kept = all.map((r, i) => ({ r, img: images[i] })).filter((x): x is { r: (typeof all)[number]; img: Buffer } => !!x.img);
  console.log(`images: ${kept.length} written, ${failed} could not be read`);
  // The statistics count what is really in the app: a drawing that cannot be read is not imported.
  const unreadable = all.filter((_, i) => !images[i]).map((r) => `${r.lib}/${r.file}`);
  for (const u of unreadable) console.log(`  unreadable: ${u}`);
  for (const id of Object.keys(stats)) stats[id].imported = kept.filter((k) => k.r.lib === id).length;
  writeFileSync(
    join(root, 'pictograms/database/stats.json'),
    JSON.stringify({ built: new Date().toISOString().slice(0, 10), total: kept.length, concepts: concepts.size, libraries: stats, unreadable }, null, 2) + '\n',
  );

  const libIds = ORDER.filter((id) => kept.some((k) => k.r.lib === id));
  const packs: string[] = [];
  const items: unknown[] = [];
  const csv: string[][] = [
    ['id', 'key', 'library', 'original_file', 'original_label', 'concept_id', 'label_en', 'label_fr', 'label_ar', 'keywords_en', 'keywords_fr', 'keywords_ar', 'image', 'license', 'author', 'source_url', 'license_url', 'attribution', 'modified', 'french', 'arabic', 'ambiguous'],
  ];
  for (let p = 0; p * PACK_SIZE < kept.length; p++) {
    const chunk = kept.slice(p * PACK_SIZE, (p + 1) * PACK_SIZE);
    const name = `p${String(p).padStart(3, '0')}.pack`;
    packs.push(name);
    let offset = 0;
    for (const { r, img } of chunk) {
      const id = items.length;
      const lib = libraries.find((l) => l.id === r.lib)!;
      items.push([id, p, offset, img.length, r.fr, r.en, r.ar, r.topics.slice(0, 8), r.flags, libIds.indexOf(r.lib), r.key]);
      const fileName = r.file.split('/').pop()!;
      const url = lib.sourcePattern.replace(/\{revision\}/g, lib.revision).replace(/\{stem\}/g, r.stem).replace('{file}', r.lib === 'fluent' ? r.file.replace(/^assets\//, '') : r.lib === 'healthicons' ? r.file.replace(/^public\/icons\/svg\//, '') : fileName);
      const state = (list: string[], auto: number) => (!list.length ? 'missing' : r.flags & auto ? 'automatic, to review' : 'from the source');
      csv.push([
        String(id), r.key, lib.name, r.file, r.original, r.concept, r.en[0] ?? '', r.fr[0] ?? '', r.ar[0] ?? '',
        r.en.slice(1).join('; '), r.fr.slice(1).join('; '), r.ar.slice(1).join('; '),
        `assets/picto/${name}@${offset}+${img.length}`, lib.license, r.author ? `${r.author} (${lib.author})` : lib.author, encodeURI(url), lib.licenseUrl, lib.attribution,
        'no (resized to 160 px WebP)', state(r.fr, FR_AUTO), state(r.ar, AR_AUTO), r.flags & AMBIGUOUS ? 'yes' : '',
      ]);
      offset += img.length;
    }
    writeFileSync(join(outDir, name), Buffer.concat(chunk.map((c) => c.img)).toString('base64'));
  }
  writeFileSync(join(outDir, 'index.pidx'), JSON.stringify({ size: SIZE, packs, libs: libIds, items }));
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  writeFileSync(join(root, 'pictograms/database/pictograms.csv'), '﻿' + csv.map((row) => row.map(cell).join(',')).join('\n') + '\n');

  // The asset list and the libraries actually used (Credits page).
  writeFileSync(
    join(root, 'src/data/pictoLibrary.ts'),
    `// GENERATED by scripts/build-pictograms.ts — do not edit by hand.\n// Pictograms from open libraries, free for commercial use: see docs/PICTOGRAM-LICENSES.md.\n/* eslint-disable */\nexport const PICTO_INDEX: number = require('../../assets/picto/index.pidx');\nexport const PICTO_PACKS: number[] = [\n${packs.map((n) => `  require('../../assets/picto/${n}'),`).join('\n')}\n];\n`,
  );
  mkdirSync(join(root, 'pictograms/licenses'), { recursive: true });
  const texts: Record<string, string> = {};
  const used = libIds.map((id) => {
    const lib = libraries.find((l) => l.id === id)!;
    const text = readFileSync(join(SRC, id, lib.licenseFile), 'utf8').trim();
    copyFileSync(join(SRC, id, lib.licenseFile), join(root, 'pictograms/licenses', `${id}-${lib.licenseFile}`));
    // Creative Commons licences are given by their link; the others must be shown in full.
    const full = !/^CC/.test(lib.license);
    if (full) texts[id] = text;
    return { ...lib, count: kept.filter((k) => k.r.lib === id).length, available: stats[id].available, modified: false, fullText: full };
  });
  if (used.some((l) => l.extraLicense === 'Apache-2.0') && texts.material) texts['Apache-2.0'] = texts.material;
  const unicode = readFileSync(join(SRC, 'cldr', 'LICENSE'), 'utf8').trim();
  copyFileSync(join(SRC, 'cldr', 'LICENSE'), join(root, 'pictograms/licenses', 'unicode-cldr-LICENSE'));
  writeFileSync(
    join(root, 'src/data/pictoLibraries.ts'),
    `// GENERATED by scripts/build-pictograms.ts from pictograms/libraries.json — do not edit by hand.\n// Only the libraries that have pictograms in the app are listed (Credits & Licenses page).\n/* eslint-disable */\nexport interface PictoLibraryInfo {\n  id: string;\n  name: string;\n  author: string;\n  website: string;\n  repository: string;\n  version: string;\n  license: string;\n  licenseUrl: string;\n  copyright: string;\n  attribution: string;\n  style: string;\n  count: number;\n  available: number;\n  modified: boolean;\n  shareAlike?: boolean;\n  fullText: boolean;\n  extraLicense?: string;\n}\nexport const PICTO_BUILT = ${JSON.stringify(new Date().toISOString().slice(0, 10))};\nexport const PICTO_TOTAL = ${kept.length};\nexport const PICTO_LIBRARIES: PictoLibraryInfo[] = ${JSON.stringify(
      used.map(({ sourcePattern: _s, licenseFile: _f, revision: _r, ...l }) => l),
      null,
      2,
    )};\n/** Words of the emoji in French, English and Arabic. */\nexport const PICTO_WORDS_SOURCE = {\n  name: 'Unicode CLDR annotations',\n  author: 'Unicode, Inc.',\n  website: 'https://cldr.unicode.org',\n  version: '49.0.0',\n  license: 'Unicode License v3',\n  licenseUrl: 'https://www.unicode.org/license.txt',\n};\n/** Licence texts that must be shown in full (MIT, ISC, Apache, OFL, Unicode). */\nexport const PICTO_LICENSE_TEXTS: Record<string, string> = ${JSON.stringify({ ...texts, unicode }, null, 2)};\n`,
  );
  const total = readdirSync(outDir).reduce((s, f) => s + readFileSync(join(outDir, f)).length, 0);
  console.log(`Library: ${kept.length} pictograms, ${packs.length} packs, ${(total / 1e6).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
