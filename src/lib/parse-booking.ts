import { CLUB_TZ, clubLocalToUtc } from "@/lib/time";

/** Accept either ISO startAt/endAt or date + start/end (HH:mm) in club TZ */
export function resolveBookingWindow(
  body: {
    startAt?: string;
    endAt?: string;
    date?: string;
    start?: string;
    end?: string;
  },
  tz = CLUB_TZ,
): { startAt: Date; endAt: Date } | { error: string } {
  if (body.date && body.start && body.end) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return { error: "Invalid date" };
    }
    const [sh, sm] = body.start.split(":").map(Number);
    const [eh, em] = body.end.split(":").map(Number);
    if (
      [sh, sm, eh, em].some((n) => Number.isNaN(n)) ||
      sh < 0 ||
      sh > 23 ||
      eh < 0 ||
      eh > 23 ||
      sm < 0 ||
      sm > 59 ||
      em < 0 ||
      em > 59
    ) {
      return { error: "Invalid time" };
    }
    return {
      startAt: clubLocalToUtc(body.date, sh, sm, tz),
      endAt: clubLocalToUtc(body.date, eh, em, tz),
    };
  }

  if (body.startAt && body.endAt) {
    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return { error: "Invalid start or end time" };
    }
    return { startAt, endAt };
  }

  return { error: "Missing start/end" };
}
