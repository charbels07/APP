/**
 * Day and month names for the week and month plans, in the child's communication language.
 * Arabic follows the dialect the family chose: كانون الثاني، شباط… in the Levant and Iraq,
 * يناير، فبراير… in Egypt, Saudi Arabia and the Gulf. Weeks start on Monday.
 */
import type { ArabicDialect, Lang } from '../model/types';
import { arabicDays, arabicDaysShort, arabicMonths } from './dialects';

const WEEKDAYS: Record<Exclude<Lang, 'ar'>, string[]> = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const WEEKDAYS_SHORT: Record<Exclude<Lang, 'ar'>, string[]> = {
  fr: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const MONTHS: Record<Exclude<Lang, 'ar'>, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Monday first. `arabic`: the family's dialect (settings.arabic). */
export const weekdays = (lang: Lang, arabic?: ArabicDialect): string[] => (lang === 'ar' ? arabicDays(arabic) : WEEKDAYS[lang]);
export const weekdaysShort = (lang: Lang, arabic?: ArabicDialect): string[] => (lang === 'ar' ? arabicDaysShort(arabic) : WEEKDAYS_SHORT[lang]);
export const months = (lang: Lang, arabic?: ArabicDialect): string[] => (lang === 'ar' ? arabicMonths(arabic) : MONTHS[lang]);

/** 0 = Monday … 6 = Sunday. */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** YYYY-MM-DD in local time (the plan's dates are calendar days, not moments). */
export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** The days shown for a month: full weeks from Monday, blanks (null) before the 1st and after the last day. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: weekdayIndex(first) }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** « samedi 14 novembre » / « Saturday 14 November » / « السبت 14 تشرين الثاني ». */
export function dayLabel(d: Date, lang: Lang, arabic?: ArabicDialect): string {
  return `${weekdays(lang, arabic)[weekdayIndex(d)]} ${d.getDate()} ${months(lang, arabic)[d.getMonth()]}`;
}
