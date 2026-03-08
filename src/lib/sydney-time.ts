/**
 * Utility to get the current date/time in the Sydney (AEST/AEDT) timezone.
 * This is critical because the server may run in UTC, but the club
 * operates in Sydney time. Without this, at 6:30am Monday AEST the
 * server would show Sunday (because UTC is still 8:30pm Sunday).
 */

const SYDNEY_TZ = "Australia/Sydney";

/**
 * Returns "today" as a yyyy-MM-dd string in the Sydney timezone.
 */
export function getSydneyDateString(): string {
  const now = new Date();
  // Intl.DateTimeFormat gives us the correct date parts in the target timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // en-CA locale returns yyyy-MM-dd format
  return parts;
}

/**
 * Returns a Date object representing the start of "today" in Sydney timezone.
 * Useful for server-side date comparisons (e.g. filtering future bookings).
 */
export function getSydneyToday(): Date {
  const dateStr = getSydneyDateString();
  // Parse as a date-only string (midnight UTC for that calendar date)
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Returns the day of week (0=Sun, 6=Sat) for "now" in Sydney timezone.
 */
export function getSydneyDayOfWeek(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SYDNEY_TZ,
    weekday: "short",
  });
  const weekday = formatter.format(new Date());
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[weekday] ?? 0;
}
