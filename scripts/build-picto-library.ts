/**
 * Builds the offline ARASAAC pictogram library used when the family creates
 * a new word (search by French / English / Arabic keyword, works offline).
 *
 *   NODE_USE_ENV_PROXY=1 node --experimental-strip-types scripts/build-picto-library.ts
 *
 * Requires ImageMagick (`convert`). Output:
 *   assets/picto/index.pidx      JSON: { packs, items: [id, pack, offset, length, fr[], en[], ar[], topics[]] }
 *   assets/picto/pNN.pack        base64 text of concatenated 160 px WebP images (offsets are in decoded bytes)
 *
 * Selection: one pictogram per distinct French keyword (the oldest, i.e. the
 * canonical one), excluding pictograms ARASAAC flags as violent or sexual.
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
  const kw = (p?: Raw) => [...new Set((p?.keywords ?? []).map((k) => (k.keyword ?? '').trim()).filter(Boolean))].slice(0, 4);

  // One canonical pictogram per distinct French first keyword.
  const byKeyword = new Map<string, number>();
  for (const p of fr) {
    if (p.violence || p.sex) continue;
    const first = p.keywords?.[0]?.keyword?.trim().toLowerCase();
    if (!first) continue;
    const cur = byKeyword.get(first);
    if (cur === undefined || p._id < cur) byKeyword.set(first, p._id);
  }
  const frById = new Map(fr.map((p) => [p._id, p]));
  const chosen = [...byKeyword.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([, id]) => id);
  console.log(`selected ${chosen.length} pictograms`);

  let done = 0;
  await pool(chosen, 16, async (id) => {
    const webp = join(cache, 'webp', `${id}.webp`);
    if (!existsSync(webp)) {
      const png = join(cache, 'png', `${id}.png`);
      if (!existsSync(png)) {
        const res = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_300.png`);
        if (!res.ok) return;
        writeFileSync(png, Buffer.from(await res.arrayBuffer()));
      }
      await run('convert', [png, '-resize', `${SIZE}x${SIZE}`, '-quality', String(QUALITY), '-define', 'webp:method=4', webp]);
    }
    if (++done % 500 === 0) console.log(`${done}/${chosen.length}`);
  });

  for (const f of readdirSync(outDir)) if (f.endsWith('.pack') || f.endsWith('.pidx')) unlinkSync(join(outDir, f));
  const items: [number, number, number, number, string[], string[], string[], string[]][] = [];
  const packs: string[] = [];
  for (let start = 0, pack = 0; start < chosen.length; start += PACK_SIZE, pack++) {
    const parts: Buffer[] = [];
    let offset = 0;
    for (const id of chosen.slice(start, start + PACK_SIZE)) {
      const file = join(cache, 'webp', `${id}.webp`);
      if (!existsSync(file)) continue;
      const buf = readFileSync(file);
      const p = frById.get(id);
      const topics = [...new Set([...(p?.categories ?? []), ...(p?.tags ?? [])])];
      items.push([id, pack, offset, buf.length, kw(p), kw(enById.get(id)), kw(arById.get(id)), topics]);
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
