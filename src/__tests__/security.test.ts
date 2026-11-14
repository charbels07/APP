/**
 * Guards added by the security review (docs/SECURITY.md): links on cards, other people's
 * changes, what stays on the device after signing out, the caregiver code, the print page,
 * the website's protections.
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDefaultProfile } from '../data/defaults';
import { cleanUrl, isIncomplete } from '../lib/appLinks';
import { forgetChild, forgetEverything, hasChildData, isForgotten, mediaNamesIn, pendingSaves, remember } from '../lib/deviceData';
import { buildPrintHtml } from '../lib/printHtml';
import { applyOps, foreignOps, type Op } from '../lib/profileDiff';
import { resourceToOps } from '../lib/resources';
import { csvSafe, intBetween, linkTarget, plain, safeFileName, safeLink } from '../lib/safety';
import { migrate } from '../lib/storage';
import { toCsv } from '../lib/analytics';
import type { Profile } from '../model/types';

describe('links on cards', () => {
  it('opens web pages and known apps only', () => {
    expect(safeLink('https://www.youtube.com/watch?v=1')).toBe('https://www.youtube.com/watch?v=1');
    expect(safeLink('wa.me/96170123456')).toBe('https://wa.me/96170123456');
    expect(safeLink('http://example.com/a')).toBe('https://example.com/a');
    expect(safeLink('spotify:playlist:123')).toBe('spotify:playlist:123');
    expect(safeLink('tel:+96170123456')).toBe('tel:+96170123456');
  });
  it('refuses everything that could run code, read files or open something unknown', () => {
    for (const bad of [
      'javascript:alert(document.domain)',
      'JaVaScRiPt:alert(1)',
      ' java\nscript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'intent://evil#Intent;end',
      'blob:https://x/1',
      'about:blank',
      'unknownapp://do',
      'https://good.com@evil.example/',
      'https://',
      'https://localhost/',
      'x'.repeat(3000),
    ]) {
      expect(safeLink(bad)).toBe('');
    }
    expect(safeLink(undefined)).toBe('');
    expect(cleanUrl('javascript:alert(1)')).toBe('');
    expect(isIncomplete({ url: 'javascript:alert(1)', triggers: [] })).toBe(true);
  });
  it('says where a link goes', () => {
    expect(linkTarget('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
    expect(linkTarget('spotify:playlist:1')).toBe('spotify');
    expect(linkTarget('javascript:alert(1)')).toBe('');
  });
  it('cleans a profile received from the server or a file', () => {
    const p = createDefaultProfile();
    const dirty = JSON.parse(JSON.stringify(p)) as Profile;
    dirty.customConcepts.evil = { id: 'evil', cls: 'noun', labels: { fr: 'x', en: 'x', ar: 'x' }, app: { url: 'javascript:alert(1)', triggers: [] } } as never;
    dirty.overrides.app_youtube = { app: { url: 'data:text/html,x', triggers: ['video'] } };
    dirty.overrides.app_spotify = { app: { url: 'https://open.spotify.com/playlist/1', triggers: [] } };
    (dirty.settings as { lang: string }).lang = '"><script>alert(1)</script>';
    dirty.boards.core = { ...dirty.boards.core, cols: '6"><script>' as never };
    const clean = migrate(JSON.parse(`${JSON.stringify(dirty).slice(0, -1)},"customConcepts":{"__proto__":{"polluted":true},"evil":${JSON.stringify(dirty.customConcepts.evil)}}}`));
    expect(clean.customConcepts.evil.app?.url).toBe('');
    expect(clean.overrides.app_youtube.app && clean.overrides.app_youtube.app.url).toBe('');
    expect(clean.overrides.app_spotify.app && clean.overrides.app_spotify.app.url).toBe('https://open.spotify.com/playlist/1');
    expect(['fr', 'en', 'ar']).toContain(clean.settings.lang);
    expect(Number.isInteger(clean.boards.core.cols)).toBe(true);
    expect(Object.keys(clean.customConcepts)).toEqual(['evil']);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe("other people's changes", () => {
  const profile = createDefaultProfile();
  it('never carry the family’s choices about data, the caregiver code or a link', () => {
    const ops: Op[] = [
      { path: ['setting', 'dataCollection'], before: 'off', after: 'language' },
      { path: ['setting', 'shareStats'], before: 'none', after: 'anonymous' },
      { path: ['setting', 'pin'], before: '1234', after: '0000' },
      { path: ['setting', '__proto__'], before: undefined, after: { x: 1 } },
      { path: ['concept', 'c_new'], before: undefined, after: { id: 'c_new', cls: 'noun', labels: { fr: 'a', en: 'a', ar: 'a' }, app: { url: 'https://wa.me/1', triggers: [] } } },
      { path: ['override', 'eat'], before: undefined, after: { labels: { fr: 'manger !' } } },
      { path: ['setting', 'speechRate'], before: 1, after: 0.8 },
    ];
    const safe = foreignOps(ops);
    expect(safe.leftOut).toBe(5);
    expect(safe.ops.map((o) => o.path.join('.'))).toEqual(['concept.c_new', 'override.eat', 'setting.speechRate']);
    const after = applyOps(profile, safe.ops, { force: true }).profile;
    expect(after.settings.dataCollection).toBe(profile.settings.dataCollection);
    expect(after.settings.pin).toBe(profile.settings.pin);
    expect(after.customConcepts.c_new.app).toBeUndefined();
    expect(foreignOps('not a list').ops).toEqual([]);
  });
  it('a shared material arrives without its links', () => {
    const data = {
      boards: [{ id: 'tla_x', kind: 'tla' as const, concept: 'c_app', rows: 1, cols: 1, cells: [{ concept: 'c_app' }] }],
      schedules: [],
      customConcepts: { c_app: { id: 'c_app', cls: 'noun', labels: { fr: 'appel', en: 'call', ar: 'x' }, app: { url: 'https://wa.me/123', triggers: [] } } },
      overrides: {},
    };
    const ops = resourceToOps(profile, 'tla', data as never);
    const added = ops.find((o) => o.path[0] === 'concept');
    expect(added && (added.after as { app?: unknown }).app).toBeUndefined();
  });
});

describe('what stays on the device', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    remember('a');
    remember('b');
    pendingSaves.clear();
  });
  it('signing out erases the children and nothing can write them back', async () => {
    await AsyncStorage.multiSet([
      ['caa.child.a', '{"dirty":false}'],
      ['caa.usage.a', '{}'],
      ['caa.child.b', '{"dirty":true}'],
      ['caa.onboarding.v1.u1', '{"name":"Adam"}'],
      ['caa.pendingRole', 'pro'],
      ['caa.device.v1', '{"deviceId":"d"}'],
    ]);
    let sent = 0;
    pendingSaves.add(async () => void sent++);
    expect(await hasChildData()).toBe(true);
    await forgetEverything({ beforeSignOut: true });
    expect(sent).toBe(1);
    expect(await AsyncStorage.getAllKeys()).toEqual(['caa.device.v1']);
    expect(isForgotten('a') && isForgotten('b')).toBe(true);
    expect(await hasChildData()).toBe(false);
  });
  it('a session that ended by itself keeps only a board with changes never sent', async () => {
    await AsyncStorage.multiSet([
      ['caa.child.a', '{"dirty":false}'],
      ['caa.usage.a', '{}'],
      ['caa.child.b', '{"dirty":true}'],
      ['caa.usage.b', '{}'],
    ]);
    await forgetEverything({ keepUnsent: true });
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['caa.child.b', 'caa.usage.b']);
    await forgetChild('b');
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
  it('finds the photos and recordings of a profile by their names', () => {
    expect(mediaNamesIn({ overrides: { a: { symbol: { kind: 'media', name: '1762000000000_ab12cd.jpg' } }, b: { audio: { fr: '1762000000001_zz99zz.m4a' } } } })).toEqual([
      '1762000000000_ab12cd.jpg',
      '1762000000001_zz99zz.m4a',
    ]);
    expect(safeFileName('1762000000000_ab12cd.jpg')).toBe(true);
    expect(safeFileName('../../secret.txt')).toBe(false);
  });
});

describe('small guards', () => {
  it('keeps numbers and names in bounds', () => {
    expect(intBetween('6"><script>', 1, 40, 1)).toBe(1);
    expect(intBetween(999, 1, 40, 1)).toBe(40);
    expect(intBetween(6, 1, 40, 1)).toBe(6);
    expect(Object.keys(plain(JSON.parse('{"__proto__":{"a":1},"constructor":1,"ok":2}')))).toEqual(['ok']);
  });
  it('a note cannot become a spreadsheet formula', () => {
    expect(csvSafe('=HYPERLINK("http://evil","x")')).toBe(`'=HYPERLINK("http://evil","x")`);
    expect(csvSafe('@SUM(1)')).toBe("'@SUM(1)");
    expect(csvSafe('pomme')).toBe('pomme');
    expect(toCsv([['=1+1', 3, -2]])).toBe("'=1+1,3,-2");
  });
  it('the printed page only receives a known language and whole numbers', () => {
    const html = buildPrintHtml('<b>t</b>', '3;}</style><script>alert(1)</script>' as never, 2, [], { labels: true, blackWhite: false, cutCards: false, paper: 'A4', landscape: true } as never, '"><script>alert(2)</script>' as never);
    expect(html).not.toContain('<script>');
    expect(html).toContain('<html lang="fr"');
    expect(html).toContain('&lt;b&gt;t&lt;/b&gt;');
  });
});

describe('the website', () => {
  const headers = fs.readFileSync(path.join(__dirname, '../../public/_headers'), 'utf8');
  // The real line is indented under "/*" (lines starting with # are comments).
  const csp = /^[ \t]+Content-Security-Policy: (.*)$/m.exec(headers)?.[1] ?? '';
  it('only runs its own scripts and cannot be framed', () => {
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Referrer-Policy:');
  });
  it('talks only to its server and the two picture libraries', () => {
    const connect = /connect-src ([^;]*)/.exec(csp)?.[1].split(' ') ?? [];
    // "blob:" and "data:" are files picked on the device itself (a photo, a recording, a document).
    expect(connect.sort()).toEqual(["'self'", 'blob:', 'data:', 'https://*.supabase.co', 'https://api.openverse.org', 'https://globalsymbols.com', 'wss://*.supabase.co'].sort());
  });
});
