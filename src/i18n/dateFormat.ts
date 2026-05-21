import i18n from './index';

// Maps i18n language → BCP-47 locale tag for Intl APIs. Hermes ships with
// Intl built-in (RN 0.73+), so DateTimeFormat resolves CLDR data on-device.
function currentLocale(): string {
  switch (i18n.language) {
    case 'es': return 'es-ES';
    case 'en':
    default:   return 'en-US';
  }
}

const WEEKDAY_KEYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

const WEEKDAY_SHORT_KEYS = [
  'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
] as const;

/** Locale-aware month names (e.g. "January" / "enero"). Length 12. */
export function getMonthNames(format: 'long' | 'short' = 'long'): string[] {
  const fmt = new Intl.DateTimeFormat(currentLocale(), { month: format });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2000, m, 1)));
}

/** Locale-aware weekday names indexed Sunday=0..Saturday=6. */
export function getWeekdayLabels(format: 'long' | 'short' | 'initial' = 'long'): string[] {
  if (format === 'initial') {
    return i18n.t('dates:weekdayInitial', { returnObjects: true }) as string[];
  }
  const keys = format === 'long' ? WEEKDAY_KEYS : WEEKDAY_SHORT_KEYS;
  return keys.map((k) =>
    format === 'long'
      ? (i18n.t(`dates:weekday.${k}`) as string)
      : (i18n.t(`dates:weekdayShort.${k}`) as string)
  );
}

/** Locale-aware date formatter. Pass any Intl.DateTimeFormatOptions. */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

/** Locale-aware time formatter (defaults: numeric hour + minute, 12h cycle). */
export function formatTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' },
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat(currentLocale(), options).format(d);
}
