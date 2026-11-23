/**
 * Dictation stays on the device when the system can: the audio then never leaves it. Otherwise the
 * system's own service (Apple or Google) hears it, and the app says so (t.dictateOnline).
 */

/** Is this language installed for recognition on the device ("ar-LB" matches an installed "ar-LB" or "ar-SA")? */
export function installedFor(installed: readonly string[], locale: string): boolean {
  const norm = (l: string) => l.toLowerCase().replace('_', '-');
  const want = norm(locale);
  const lang = want.split('-')[0];
  return installed.map(norm).some((l) => l === want || l.split('-')[0] === lang);
}

/** What went wrong with a dictation, in words a family can act on (gap review, batch 6). */
export type DictationProblem = 'denied' | 'unavailable' | 'noSpeech' | 'network' | 'other';

/**
 * The recogniser's error code (or the reason `start` threw) → the sentence to show. `null`: nothing to
 * say (the person stopped it). Never "the online demo" for every cause: each cause has its own words.
 */
export function dictationProblem(code: string | undefined): DictationProblem | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
    case 'denied':
      return 'denied';
    case 'service-not-allowed':
    case 'language-not-supported':
    case 'unavailable':
      return 'unavailable';
    case 'no-speech':
    case 'speech-timeout':
      return 'noSpeech';
    case 'network':
      return 'network';
    default:
      return 'other';
  }
}
