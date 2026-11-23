/**
 * Gap review, batch 6: sentences that were untrue. A dictation that fails says why (not "the online demo"
 * for every cause); a print closed without printing is not a failure; recording a new word is optional.
 */
import fs from 'fs';
import path from 'path';
import { dictationProblem } from '../lib/dictation';
import { printCancelled } from '../lib/printHtml';
import { strings } from '../i18n/ui';

describe('dictation failures', () => {
  it('each cause has its own sentence, in the three languages', () => {
    expect(dictationProblem('not-allowed')).toBe('denied');
    expect(dictationProblem('denied')).toBe('denied');
    expect(dictationProblem('language-not-supported')).toBe('unavailable');
    expect(dictationProblem('service-not-allowed')).toBe('unavailable');
    expect(dictationProblem('unavailable')).toBe('unavailable');
    expect(dictationProblem('no-speech')).toBe('noSpeech');
    expect(dictationProblem('speech-timeout')).toBe('noSpeech');
    expect(dictationProblem('network')).toBe('network');
    expect(dictationProblem('busy')).toBe('other');
    expect(dictationProblem(undefined)).toBe('other');
    expect(dictationProblem('aborted')).toBeNull();
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const t = strings(lang);
      for (const k of ['denied', 'unavailable', 'noSpeech', 'network', 'other'] as const) {
        expect(t.dictateProblem[k].length).toBeGreaterThan(10);
        expect(t.dictateProblem[k]).not.toMatch(/démo|demo|التجريبي/);
      }
      // In a browser the browser's service hears the dictation: the line is said there too.
      expect(t.dictateOnlineWeb).toMatch(/Google/);
    }
  });
});

describe('printing', () => {
  it('a print dialog closed without printing is not a failure; anything else is', () => {
    expect(printCancelled(Object.assign(new Error('Printing did not complete'), { code: 'ERR_PRINT_INCOMPLETE' }))).toBe(true);
    expect(printCancelled(new Error('Printing did not complete'))).toBe(true);
    expect(printCancelled(new Error('No view controller'))).toBe(false);
    expect(printCancelled(undefined)).toBe(false);
    for (const lang of ['fr', 'en', 'ar'] as const) expect(strings(lang).printFailed).toContain(strings(lang).exportPdf.replace(/^.*?(PDF).*$/, '$1'));
  });
});

describe('creating a new word', () => {
  it('a recording is optional, whatever the voice (Q48)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'ui', 'panels', 'CaregiverPanels.tsx'), 'utf8');
    expect(src).not.toMatch(/mustRecord|recordRequired/);
    for (const lang of ['fr', 'en', 'ar'] as const) expect(strings(lang).recordOwn).toMatch(/facultatif|optional|اختياري/);
  });
});
