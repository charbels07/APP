/**
 * A small ZIP writer: files are stored as they are (no compression), which is all an exchange
 * file needs (pictures are already compressed, the boards are small JSON files). Pure: bytes in,
 * bytes out, on every platform, without a library.
 *
 * Format: PKWARE APPNOTE 6.3 (local headers, central directory, end record). File names are
 * UTF-8 (flag bit 11). No ZIP64: an archive stays under 4 GB and 65,535 files.
 */

let table: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (table) return table;
  table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

/** CRC-32 (the one ZIP and PNG use) of some bytes. */
export function crc32(bytes: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path inside the archive, with "/" between folders ("boards/core.obf"). */
  name: string;
  /** Text is written as UTF-8. */
  data: Uint8Array | string;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** MS-DOS time and date, as ZIP keeps them (local time, 2-second steps, from 1980). */
function dosTime(d: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** The archive, as bytes. Names must be unique and relative ("a/b.txt", never "/a" or "../a"). */
export function zipStore(entries: ZipEntry[], when: Date = new Date()): Uint8Array {
  if (entries.length > 0xffff) throw new Error('zip: too many files');
  const seen = new Set<string>();
  const { time, date } = dosTime(when);
  const files = entries.map((e) => {
    if (!e.name || e.name.startsWith('/') || e.name.split('/').includes('..')) throw new Error(`zip: bad name ${e.name}`);
    if (seen.has(e.name)) throw new Error(`zip: twice ${e.name}`);
    seen.add(e.name);
    const data = typeof e.data === 'string' ? utf8(e.data) : e.data;
    return { name: utf8(e.name), data, crc: crc32(data) };
  });
  const localSize = files.reduce((n, f) => n + 30 + f.name.length + f.data.length, 0);
  const centralSize = files.reduce((n, f) => n + 46 + f.name.length, 0);
  const total = localSize + centralSize + 22;
  if (total > 0xffffffff) throw new Error('zip: too large');
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let p = 0;
  const u16 = (v: number) => {
    view.setUint16(p, v, true);
    p += 2;
  };
  const u32 = (v: number) => {
    view.setUint32(p, v >>> 0, true);
    p += 4;
  };
  const bytes = (b: Uint8Array) => {
    out.set(b, p);
    p += b.length;
  };
  const offsets: number[] = [];
  for (const f of files) {
    offsets.push(p);
    u32(0x04034b50); // local file header
    u16(20); // version needed: 2.0
    u16(0x0800); // names in UTF-8
    u16(0); // stored
    u16(time);
    u16(date);
    u32(f.crc);
    u32(f.data.length);
    u32(f.data.length);
    u16(f.name.length);
    u16(0); // no extra field
    bytes(f.name);
    bytes(f.data);
  }
  const centralAt = p;
  files.forEach((f, i) => {
    u32(0x02014b50); // central directory header
    u16(20); // made by: 2.0
    u16(20);
    u16(0x0800);
    u16(0);
    u16(time);
    u16(date);
    u32(f.crc);
    u32(f.data.length);
    u32(f.data.length);
    u16(f.name.length);
    u16(0); // extra
    u16(0); // comment
    u16(0); // disk
    u16(0); // internal attributes
    u32(0); // external attributes
    u32(offsets[i]);
    bytes(f.name);
  });
  const centralLength = p - centralAt;
  u32(0x06054b50); // end of central directory
  u16(0);
  u16(0);
  u16(files.length);
  u16(files.length);
  u32(centralLength);
  u32(centralAt);
  u16(0); // no comment
  return out;
}

/**
 * Reads back an archive written by `zipStore` (stored files only). Used by the tests and to check
 * an export; not a general ZIP reader.
 */
export function unzipStore(zip: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('zip: no end record');
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('zip: bad central header');
    if (view.getUint16(p + 10, true) !== 0) throw new Error('zip: compressed file');
    const crc = view.getUint32(p + 16, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extra = view.getUint16(p + 30, true);
    const comment = view.getUint16(p + 32, true);
    const at = view.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLen));
    const localName = view.getUint16(at + 26, true);
    const localExtra = view.getUint16(at + 28, true);
    const data = zip.subarray(at + 30 + localName + localExtra, at + 30 + localName + localExtra + size);
    if (crc32(data) !== crc) throw new Error(`zip: CRC of ${name}`);
    files.set(name, data);
    p += 46 + nameLen + extra + comment;
  }
  return files;
}
