import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const CLUB_TZ = "America/New_York";

/** YYYY-MM-DD for a calendar day in the club timezone */
export function dateKeyInClubTz(date = new Date(), tz = CLUB_TZ): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

export function parseDateKey(dateKey: string, tz = CLUB_TZ): Date {
  return fromZonedTime(`${dateKey}T00:00:00`, tz);
}

export function dayBoundsUtc(
  dateKey: string,
  tz = CLUB_TZ,
): { start: Date; end: Date } {
  const start = fromZonedTime(`${dateKey}T00:00:00`, tz);
  const end = fromZonedTime(`${dateKey}T23:59:59.999`, tz);
  return { start, end };
}

export function formatClubTime(
  date: Date,
  pattern = "h:mm a",
  tz = CLUB_TZ,
): string {
  return formatInTimeZone(date, tz, pattern);
}

export function formatClubDate(
  date: Date,
  pattern = "EEE MMM d",
  tz = CLUB_TZ,
): string {
  return formatInTimeZone(date, tz, pattern);
}

export function shiftDateKey(dateKey: string, days: number, tz = CLUB_TZ): string {
  const d = parseDateKey(dateKey, tz);
  return dateKeyInClubTz(addDays(d, days), tz);
}

export function clubLocalToUtc(
  dateKey: string,
  hour: number,
  minute: number,
  tz = CLUB_TZ,
): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${dateKey}T${hh}:${mm}:00`, tz);
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 80) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const TIME_ZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Puerto_Rico",
  "UTC",
] as const;
