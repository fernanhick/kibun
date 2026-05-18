/**
 * Safe date parsing utilities with fallback handling for invalid timestamps.
 * Use these when working with potentially malformed dates from user input or external sources.
 */

/**
 * Safely parse an ISO 8601 timestamp string into a Date object.
 * Returns a fallback date (current time) if the input is invalid.
 * @param isoString - ISO 8601 timestamp (e.g., "2024-05-18T12:00:00Z" or "2024-05-18")
 * @param fallback - Fallback Date to return if parsing fails (defaults to now)
 * @returns Parsed Date or fallback
 */
export function safeParseIsoDate(
  isoString: string | null | undefined,
  fallback: Date = new Date()
): Date {
  if (!isoString || typeof isoString !== 'string') {
    return fallback;
  }

  const date = new Date(isoString);
  
  // Check if the date is valid
  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return date;
}

/**
 * Safely parse a YYYY-MM-DD date string into a Date at noon UTC.
 * Avoids timezone-edge issues where dates land on the wrong day.
 * @param dateString - Date in YYYY-MM-DD format
 * @param fallback - Fallback Date to return if parsing fails (defaults to now)
 * @returns Parsed Date at noon or fallback
 */
export function safeParseDateString(
  dateString: string | null | undefined,
  fallback: Date = new Date()
): Date {
  if (!dateString || typeof dateString !== 'string') {
    return fallback;
  }

  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return fallback;
  }

  const [_, year, month, day] = match;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10) - 1; // 0-indexed
  const d = parseInt(day, 10);

  // Check for NaN
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return fallback;
  }

  const date = new Date(y, m, d, 12, 0, 0, 0);

  // Validate the date was constructed correctly
  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return date;
}

/**
 * Validate if a string is in ISO 8601 format (basic check).
 * @param isoString - String to validate
 * @returns true if valid ISO 8601 format, false otherwise
 */
export function isValidIsoDate(isoString: string | null | undefined): boolean {
  if (!isoString || typeof isoString !== 'string') {
    return false;
  }

  const date = new Date(isoString);
  return Number.isFinite(date.getTime());
}

/**
 * Validate if a string is in YYYY-MM-DD format.
 * @param dateString - String to validate
 * @returns true if valid YYYY-MM-DD format, false otherwise
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}
