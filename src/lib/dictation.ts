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
