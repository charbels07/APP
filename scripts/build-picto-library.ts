/**
 * Builds the offline ARASAAC pictogram library used when the family creates
 * a new word (search by French / English / Arabic keyword, works offline).
 *
 *   NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/build-picto-library.ts
 *   … --add-missing   keeps the existing packs and only adds pictograms ARASAAC published since
 *                     (npm run update:picto): a few seconds instead of downloading everything.
 *
 * Requires ImageMagick (`convert`). Output:
 *   assets/picto/index.pidx      JSON: { packs, items: [id, pack, offset, length, fr[], en[], ar[], topics[], sensitive] }
 *   assets/picto/pNN.pack        base64 text of concatenated 160 px WebP images (offsets are in decoded bytes)
 *
 * Selection: the whole ARASAAC catalogue (every pictogram with a keyword in French,
 * English or Arabic). Pictograms ARASAAC flags as violent or sexual are kept (they
 * matter for body, consent and safety vocabulary) but marked, so the app can leave
 * them out of automatic suggestions.
 * ARASAAC: Sergio Palao, CC BY-NC-SA, Government of Aragón.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = process.env.PICTO_CACHE ?? join(root, '.picto-cache');
const outDir = join(root, 'assets/picto');
const PACK_SIZE = 150;
const run = promisify(execFile);
const SIZE = 160;
const QUALITY = 55;

type Raw = {
  _id: number;
  keywords?: { keyword?: string }[];
  violence?: boolean;
  sex?: boolean;
  categories?: string[];
  tags?: string[];
};

async function getJson(lang: string): Promise<Raw[]> {
  const file = join(cache, `all_${lang}.json`);
  if (!existsSync(file)) {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/all/${lang}`);
    if (!res.ok) throw new Error(`catalog ${lang}: ${res.status}`);
    writeFileSync(file, await res.text());
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function main() {
  mkdirSync(join(cache, 'png'), { recursive: true });
  mkdirSync(join(cache, 'webp'), { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const [fr, en, ar] = await Promise.all(['fr', 'en', 'ar'].map(getJson));
  const enById = new Map(en.map((p) => [p._id, p]));
  const arById = new Map(ar.map((p) => [p._id, p]));
  const kw = (p?: Raw) => [...new Set((p?.keywords ?? []).map((k) => (k.keyword ?? '').trim()).filter(Boolean))].slice(0, 8);

  // Every pictogram that can be found by a keyword, sorted by French keyword so that
  // similar words share packs (fewer packs to load per search).
  const frById = new Map(fr.map((p) => [p._id, p]));
  const sortKey = (id: number) =>
    (kw(frById.get(id))[0] ?? kw(enById.get(id))[0] ?? kw(arById.get(id))[0] ?? '').toLowerCase();
  const chosen = fr
    .map((p) => p._id)
    .filter((id) => kw(frById.get(id)).length || kw(enById.get(id)).length || kw(arById.get(id)).length)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'fr') || a - b);
  console.log(`selected ${chosen.length} pictograms`);

  // --add-missing: keep what is already built, add only the pictograms not in it yet.
  const addMissing = process.argv.includes('--add-missing');
  type Item = [number, number, number, number, string[], string[], string[], string[], number];
  let items: Item[] = [];
  let packs: string[] = [];
  let todo = chosen;
  if (addMissing) {
    const old = JSON.parse(readFileSync(join(outDir, 'index.pidx'), 'utf8')) as { packs: string[]; items: Item[] };
    items = old.items;
    packs = old.packs;
    const have = new Set(items.map((i) => i[0]));
    todo = chosen.filter((id) => !have.has(id));
    console.log(`${todo.length} pictograms to add`);
    if (!todo.length) return;
  }

  let done = 0;
  const failed: number[] = [];
  await pool(todo, 16, async (id) => {
    const webp = join(cache, 'webp', `${id}.webp`);
    if (!existsSync(webp)) {
      const png = join(cache, 'png', `${id}.png`);
      if (!existsSync(png)) {
        // The static server misses a few pictograms: the API serves every one of them.
        let res = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_300.png`);
        if (!res.ok) res = await fetch(`https://api.arasaac.org/v1/pictograms/${id}?download=false&resolution=500`);
        if (!res.ok) {
          failed.push(id);
          return;
        }
        writeFileSync(png, Buffer.from(await res.arrayBuffer()));
      }
      await run('convert', [png, '-resize', `${SIZE}x${SIZE}`, '-quality', String(QUALITY), '-define', 'webp:method=4', webp]);
    }
    if (++done % 500 === 0) console.log(`${done}/${todo.length}`);
  });
  if (failed.length) console.warn(`could not download: ${failed.join(', ')}`);

  if (!addMissing) for (const f of readdirSync(outDir)) if (f.endsWith('.pack') || f.endsWith('.pidx')) unlinkSync(join(outDir, f));
  const firstPack = packs.length;
  for (let start = 0, pack = firstPack; start < todo.length; start += PACK_SIZE, pack++) {
    const parts: Buffer[] = [];
    let offset = 0;
    for (const id of todo.slice(start, start + PACK_SIZE)) {
      const file = join(cache, 'webp', `${id}.webp`);
      if (!existsSync(file)) continue;
      const buf = readFileSync(file);
      const p = frById.get(id);
      const topics = [...new Set([...(p?.categories ?? []), ...(p?.tags ?? [])])];
      const sensitive = p?.violence || p?.sex ? 1 : 0;
      items.push([id, pack, offset, buf.length, kw(p), kw(enById.get(id)), kw(arById.get(id)), topics, sensitive]);
      parts.push(buf);
      offset += buf.length;
    }
    const name = `p${String(pack).padStart(2, '0')}.pack`;
    // Base64 text: served everywhere as plain text (some hosts refuse raw binary files).
    writeFileSync(join(outDir, name), Buffer.concat(parts).toString('base64'));
    packs.push(name);
  }
  writeFileSync(join(outDir, 'index.pidx'), JSON.stringify({ size: SIZE, packs, items }));

  // Static requires for Metro (one per pack).
  const lines = [
    '// GENERATED by scripts/build-picto-library.ts — do not edit by hand.',
    '// ARASAAC pictograms: Sergio Palao, CC BY-NC-SA, Government of Aragón.',
    '/* eslint-disable */',
    "export const PICTO_INDEX: number = require('../../assets/picto/index.pidx');",
    'export const PICTO_PACKS: number[] = [',
    ...packs.map((p) => `  require('../../assets/picto/${p}'),`),
    '];',
    '',
  ];
  writeFileSync(join(root, 'src/data/pictoLibrary.ts'), lines.join('\n'));
  console.log(`wrote ${items.length} pictograms in ${packs.length} packs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
