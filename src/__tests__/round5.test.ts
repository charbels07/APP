import { APPS_FOLDER_SLOT, createDefaultProfile } from '../data/defaults';
import { appLinkOf, cleanUrl, findAppInSentence, isIncomplete } from '../lib/appLinks';
import { toSpeechPlan, type Token } from '../lib/grammar';
import { migrate } from '../lib/storage';
import { searchWebPictures, symbolQueries } from '../lib/webPictures';
import type { Lang, Profile, StripItem } from '../model/types';

const profile = createDefaultProfile();
let n = 0;
const c = (concept: string, lang: Lang = 'fr'): StripItem => ({ key: `k${n++}`, kind: 'concept', concept, lang });
const txt = (text: string, lang: Lang = 'fr'): StripItem => ({ key: `k${n++}`, kind: 'text', text, lang });

describe('apps opened from a sentence', () => {
  it('« je veux écouter de la musique » opens Spotify', () => {
    expect(findAppInSentence(profile, [c('i'), c('want'), txt('écouter de la'), c('music')])).toBe('app_spotify');
  });
  it('works in English and Lebanese Arabic too', () => {
    expect(findAppInSentence(profile, [c('i', 'en'), c('want', 'en'), txt('to listen to music', 'en')])).toBe('app_spotify');
    expect(findAppInSentence(profile, [txt('بدي إسمع موسيقى', 'ar')])).toBe('app_spotify');
  });
  it('naming the app wins over a trigger word', () => {
    expect(findAppInSentence(profile, [c('i'), c('want'), c('music'), c('app_anghami')])).toBe('app_anghami');
    expect(findAppInSentence(profile, [txt('je veux une vidéo sur youtube')])).toBe('app_youtube');
  });
  it('does not open anything for ordinary sentences', () => {
    expect(findAppInSentence(profile, [c('i'), c('want'), c('look'), c('tv')])).toBeUndefined();
    expect(findAppInSentence(profile, [c('i'), c('want'), c('eat')])).toBeUndefined();
    expect(findAppInSentence(profile, [txt('merci maman')])).toBeUndefined();
  });
  it('WhatsApp starts without a link (the family is asked to add it)', () => {
    expect(findAppInSentence(profile, [c('i'), c('want'), txt('appeler'), c('mom')])).toBe('app_whatsapp');
    expect(isIncomplete(appLinkOf(profile, 'app_whatsapp'))).toBe(true);
    expect(isIncomplete({ url: 'https://wa.me/', triggers: [] })).toBe(true);
    expect(isIncomplete({ url: 'wa.me/96170123456', triggers: [] })).toBe(false);
    expect(isIncomplete(appLinkOf(profile, 'app_spotify'))).toBe(false);
  });
  it('a word turned back into a plain word no longer opens its app', () => {
    const p: Profile = structuredClone(profile);
    p.overrides.app_spotify = { app: false };
    expect(appLinkOf(p, 'app_spotify')).toBeUndefined();
    expect(findAppInSentence(p, [c('i'), c('want'), c('music')])).toBeUndefined();
  });
  it('cleans the links the family types', () => {
    expect(cleanUrl(' wa.me/96170123456 ')).toBe('https://wa.me/96170123456');
    expect(cleanUrl('spotify:playlist:123')).toBe('spotify:playlist:123');
    expect(cleanUrl('')).toBe('');
  });
});

describe('apps folder on saved profiles', () => {
  const old = () => {
    const p: Partial<Profile> = structuredClone(profile);
    delete p.migrations;
    p.boards!.core.cells[APPS_FOLDER_SLOT] = null;
    return p;
  };
  it('is added to the empty slot of an older profile', () => {
    expect(migrate(old()).boards.core.cells[APPS_FOLDER_SLOT]?.folder).toBe('apps');
  });
  it('never replaces a word the family put there, and is not added back once removed', () => {
    const p = old();
    p.boards!.core.cells[APPS_FOLDER_SLOT] = { concept: 'ball' };
    expect(migrate(p).boards.core.cells[APPS_FOLDER_SLOT]?.concept).toBe('ball');
    const removed = old();
    removed.migrations = ['apps'];
    expect(migrate(removed).boards.core.cells[APPS_FOLDER_SLOT]).toBeNull();
  });
});

describe('following the words while speaking (wiggle)', () => {
  it('knows where each word starts, elision included', () => {
    const tok = (text: string, lang: Lang = 'fr'): Token => ({ key: text, text, lang });
    const { segments, marks } = toSpeechPlan([tok("j'"), tok('aime'), tok('la'), tok('musique'), tok('yalla', 'ar')]);
    expect(segments[0]).toEqual({ kind: 'tts', text: "j'aime la musique", lang: 'fr' });
    expect(marks[0]).toEqual([
      { token: 0, start: 0 },
      { token: 1, start: 2 },
      { token: 2, start: 7 },
      { token: 3, start: 10 },
    ]);
    expect(marks[1]).toEqual([{ token: 4, start: 0 }]);
  });
});

describe('pictures from the internet', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const answer = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

  it('keeps PNG pictograms of the verified collections only, with their licence', async () => {
    global.fetch = jest.fn((url: string) =>
      answer(
        String(url).includes('symbolsets')
          ? [
              { id: 13, slug: 'mulberry', name: 'Mulberry Symbols', licence: { name: 'Creative Commons BY SA 4.0' } },
              { id: 17, slug: 'arasaac', name: 'ARASAAC', licence: { name: 'Creative Commons BY NC SA 4.0' } },
              { id: 21, slug: 'tawasol', name: 'Tawasol', licence: { name: 'Creative Commons BY SA 4.0' } },
            ]
          : [
              { text: 'ballon', picto: { id: 1, symbolset_id: 13, image_url: 'https://globalsymbols.com/a.png' } },
              { text: 'ballon', picto: { id: 2, symbolset_id: 17, image_url: 'https://globalsymbols.com/b.png' } },
              { text: 'ballon', picto: { id: 3, symbolset_id: 13, image_url: 'https://globalsymbols.com/c.svg' } },
              { text: 'ballon', picto: { id: 4, symbolset_id: 21, image_url: 'https://globalsymbols.com/d.png' } },
            ],
      ),
    ) as unknown as typeof fetch;
    const r = await searchWebPictures('ballon', 'symbols', 'fr');
    expect(r.map((p) => p.key)).toEqual(['gs1']);
    expect(r[0].credit).toBe('Mulberry Symbols — Creative Commons BY SA 4.0');
    expect(String((global.fetch as jest.Mock).mock.calls.find((call) => /labels/.test(call[0]))[0])).toContain('language=fra');
  });

  it('retries a phrase with its main word for pictogram sets', () => {
    expect(symbolQueries('bulles de savon')).toEqual(['bulles de savon', 'bulles', 'bulle']);
    expect(symbolQueries('ballon')).toEqual(['ballon']);
    expect(symbolQueries('the swimming pool')).toEqual(['the swimming pool', 'swimming']);
  });

  it('asks Openverse for commercially usable photos only', async () => {
    global.fetch = jest.fn(() =>
      answer({
        results: [{ id: 'x', title: 'Ballon', thumbnail: 'https://api.openverse.org/v1/images/x/thumb/', creator: 'Groume', license: 'by-sa', license_version: '2.0', provider: 'flickr' }],
      }),
    ) as unknown as typeof fetch;
    const r = await searchWebPictures('ballon', 'photos', 'fr');
    expect(r[0]).toMatchObject({ full: 'https://api.openverse.org/v1/images/x/thumb/', credit: 'Groume — CC BY-SA 2.0 — flickr', ext: 'jpg' });
    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('license_type=commercial');
    expect(url).toContain('category=photograph');
    expect(url).toContain('page_size=20'); // the anonymous maximum
  });
});
