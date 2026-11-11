/**
 * Day and month names for the week and month plans, in the child's communication language.
 * Arabic uses the month names used in Lebanon (كانون الثاني، شباط…). Weeks start on Monday.
 */
import type { Lang } from '../model/types';

export const WEEKDAYS: Record<Lang, string[]> = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ar: ['الإثنين', 'التلاتا', 'الأربعا', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
};

export const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  fr: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ar: ['إثنين', 'تلاتا', 'أربعا', 'خميس', 'جمعة', 'سبت', 'أحد'],
};

export const MONTHS: Record<Lang, string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
};

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
export function dayLabel(d: Date, lang: Lang): string {
  return `${WEEKDAYS[lang][weekdayIndex(d)]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}
