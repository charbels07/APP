/**
 * Low-tech continuity (spec §19): every board, schedule and First–Then can be
 * printed or exported as PDF, locally. Personal data (name, diagnosis, contact)
 * is never included (PRN-07).
 */
import { pictoCreditLine } from '../data/pictoCredit';
import { SYMBOL_IMAGES } from '../data/symbolMap';
import { pictoImageUriByKey } from './pictoLibrary';
import type { Board, Lang, Profile } from '../model/types';
import { CLASS_COLORS } from '../ui/theme';
import { isRtl, label, symbolOf, wordClass } from './lexicon';
import { mediaDataUrl } from './media';
import { bundledImageSrc } from './platform';

export interface PrintOptions {
  paper: 'A4' | 'A3';
  landscape: boolean;
  blackWhite: boolean;
  labels: boolean;
  cutCards: boolean;
}

export interface PrintCell {
  text: string;
  img?: string;
  emoji?: string;
  bg: string;
  border: string;
  heading?: string;
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function imageFor(profile: Profile, conceptId: string): Promise<{ img?: string; emoji?: string }> {
  const sym = symbolOf(profile, conceptId);
  try {
    if (sym.kind === 'picto') {
      const mod = SYMBOL_IMAGES[sym.key];
      return { img: mod ? await bundledImageSrc(mod) : await pictoImageUriByKey(sym.key) };
    }
    if (sym.kind === 'media') return { img: await mediaDataUrl(sym.name) };
    return { emoji: sym.value };
  } catch {
    return { emoji: '' };
  }
}

export async function conceptCell(profile: Profile, conceptId: string, lang: Lang, heading?: string, folder = false): Promise<PrintCell> {
  const colors = CLASS_COLORS[folder ? 'folder' : wordClass(profile, conceptId)];
  return { text: label(profile, conceptId, lang), ...(await imageFor(profile, conceptId)), ...colors, heading };
}

export async function boardCells(profile: Profile, board: Board, lang: Lang): Promise<(PrintCell | null)[]> {
  const level = profile.settings.revealLevel;
  return Promise.all(
    board.cells.map((cell) => {
      if (!cell) return null;
      if (board.kind === 'core' && (cell.level ?? 1) > level) return null;
      return conceptCell(profile, cell.concept, lang, undefined, !!cell.folder);
    }),
  );
}

export function buildPrintHtml(
  title: string,
  rows: number,
  cols: number,
  cells: (PrintCell | null)[],
  o: PrintOptions,
  lang: Lang,
): string {
  const gap = o.cutCards ? 6 : 2;
  const page = `${o.paper} ${o.landscape ? 'landscape' : 'portrait'}`;
  const cellHtml = cells
    .map((c) => {
      if (!c) return `<div class="cell empty"></div>`;
      const pic = c.img
        ? `<img src="${escape(c.img)}" alt="" />`
        : `<span class="emoji">${escape(c.emoji ?? '')}</span>`;
      const head = c.heading ? `<div class="heading">${escape(c.heading)}</div>` : '';
      return `<div class="cell" style="background:${o.blackWhite ? '#fff' : c.bg};border-color:${o.blackWhite ? '#000' : c.border}">${head}<div class="pic">${pic}</div>${
        o.labels ? `<div class="label">${escape(c.text)}</div>` : ''
      }</div>`;
    })
    .join('');
  return `<!doctype html><html lang="${lang}" dir="${isRtl(lang) ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/>
<title>${escape(title)}</title>
<style>
@page { size: ${page}; margin: 10mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; height: 100%; font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif; }
body { display: flex; flex-direction: column; padding: 0; }
h1 { font-size: 16pt; margin: 0 0 4mm; }
.grid { flex: 1; display: grid; grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr); gap: ${gap}mm; min-height: 0; }
.cell { border: 2px solid #999; border-radius: 3mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5mm; overflow: hidden; break-inside: avoid; min-height: 0; }
.cell.empty { border: none; }
${o.cutCards ? '.cell { outline: 1px dashed #666; outline-offset: 2.5mm; }' : ''}
.pic { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; width: 100%; }
.pic img { max-width: 100%; max-height: 100%; object-fit: contain; ${o.blackWhite ? 'filter: grayscale(1) contrast(1.25);' : ''} }
.emoji { font-size: 28pt; ${o.blackWhite ? 'filter: grayscale(1);' : ''} }
.label { font-weight: 700; font-size: ${cols > 8 ? 9 : cols > 5 ? 12 : 18}pt; text-align: center; line-height: 1.1; }
.heading { font-weight: 900; text-transform: uppercase; font-size: 14pt; letter-spacing: 1px; }
.foot { font-size: 6.5pt; color: #666; margin-top: 2mm; }
</style></head><body>
<h1>${escape(title)}</h1>
<div class="grid">${cellHtml}</div>
<div class="foot">${escape(pictoCreditLine(lang))}</div>
</body></html>`;
}
