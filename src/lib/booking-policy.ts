import { prisma } from "@/lib/prisma";
import { DEFAULT_RULES } from "@/lib/constants";
import {
  CLUB_TZ,
  dateKeyInClubTz,
  formatClubTime,
  shiftDateKey,
} from "@/lib/time";

export type PolicyError = { error: string; status: number };

type Rules = {
  advanceDays: number;
  openMinutes: number;
  closeMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxConcurrentCourts: number;
  cancelCutoffMinutes: number;
};

function minutesOnClock(date: Date, tz: string): number {
  const [hour, minute] = formatClubTime(date, "HH:mm", tz).split(":").map(Number);
  return hour * 60 + minute;
}

export async function loadClubPolicy(clubId: string): Promise<{
  tz: string;
  rules: Rules;
} | null> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { rules: true },
  });
  if (!club) return null;
  return {
    tz: club.timezone || CLUB_TZ,
    rules: club.rules ?? { ...DEFAULT_RULES },
  };
}

export async function checkBooking(opts: {
  clubId: string;
  userId: string;
  courtId: string;
  startAt: Date;
  endAt: Date;
  isStaff: boolean;
  excludeReservationId?: string;
}): Promise<PolicyError | null> {
  if (Number.isNaN(opts.startAt.getTime()) || Number.isNaN(opts.endAt.getTime())) {
    return { error: "Invalid start or end time", status: 400 };
  }
  if (opts.endAt <= opts.startAt) {
    return { error: "End must be after start", status: 400 };
  }

  const policy = await loadClubPolicy(opts.clubId);
  if (!policy) return { error: "Club not found", status: 404 };
  const { tz, rules } = policy;

  const court = await prisma.court.findFirst({
    where: { id: opts.courtId, clubId: opts.clubId },
  });
  if (!court) return { error: "Court not found", status: 404 };
  if (!court.active) return { error: "This amenity is disabled", status: 400 };

  const overlap = await prisma.reservation.findFirst({
    where: {
      courtId: opts.courtId,
      canceledAt: null,
      id: opts.excludeReservationId ? { not: opts.excludeReservationId } : undefined,
      startAt: { lt: opts.endAt },
      endAt: { gt: opts.startAt },
    },
    select: { id: true },
  });
  if (overlap) {
    return { error: "That court is already booked for this time", status: 409 };
  }

  const block = await prisma.courtBlock.findFirst({
    where: {
      courtId: opts.courtId,
      startAt: { lt: opts.endAt },
      endAt: { gt: opts.startAt },
    },
    select: { reason: true },
  });
  if (block) {
    return {
      error: `That court is blocked (${block.reason})`,
      status: 409,
    };
  }

  if (opts.isStaff) return null;

  if (opts.startAt.getTime() < Date.now()) {
    return { error: "Cannot book in the past", status: 400 };
  }

  const startKey = dateKeyInClubTz(opts.startAt, tz);
  const endKey = dateKeyInClubTz(opts.endAt, tz);
  if (startKey !== endKey) {
    return { error: "Bookings must start and end on the same day", status: 400 };
  }

  const todayKey = dateKeyInClubTz(new Date(), tz);
  const lastKey = shiftDateKey(todayKey, rules.advanceDays, tz);
  if (startKey < todayKey) {
    return { error: "Cannot book in the past", status: 400 };
  }
  if (startKey > lastKey) {
    return {
      error: `Bookings can be made up to ${rules.advanceDays} days ahead`,
      status: 400,
    };
  }

  const startMinutes = minutesOnClock(opts.startAt, tz);
  const endMinutes = minutesOnClock(opts.endAt, tz);
  if (startMinutes < rules.openMinutes || endMinutes > rules.closeMinutes) {
    return {
      error: `Bookings must fall between ${formatMinutes(rules.openMinutes)} and ${formatMinutes(rules.closeMinutes)}`,
      status: 400,
    };
  }

  const duration = (opts.endAt.getTime() - opts.startAt.getTime()) / 60000;
  if (duration < rules.minDurationMinutes) {
    return {
      error: `Minimum booking is ${rules.minDurationMinutes} minutes`,
      status: 400,
    };
  }
  if (duration > rules.maxDurationMinutes) {
    return {
      error: `Maximum booking is ${rules.maxDurationMinutes} minutes`,
      status: 400,
    };
  }

  const concurrent = await prisma.reservation.count({
    where: {
      userId: opts.userId,
      canceledAt: null,
      id: opts.excludeReservationId ? { not: opts.excludeReservationId } : undefined,
      startAt: { lt: opts.endAt },
      endAt: { gt: opts.startAt },
      court: { clubId: opts.clubId },
    },
  });
  if (concurrent + 1 > rules.maxConcurrentCourts) {
    return {
      error: `You can hold at most ${rules.maxConcurrentCourts} courts at the same time`,
      status: 400,
    };
  }

  return null;
}

export async function checkCancel(opts: {
  clubId: string;
  startAt: Date;
  isStaff: boolean;
}): Promise<PolicyError | null> {
  if (opts.isStaff) return null;
  const policy = await loadClubPolicy(opts.clubId);
  if (!policy) return { error: "Club not found", status: 404 };
  const cutoffMs = policy.rules.cancelCutoffMinutes * 60_000;
  if (Date.now() > opts.startAt.getTime() - cutoffMs) {
    return {
      error: `Cancellations must be at least ${policy.rules.cancelCutoffMinutes} minutes before start`,
      status: 400,
    };
  }
  return null;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${hour}${suffix}`;
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}
