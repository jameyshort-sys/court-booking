import { NextResponse } from "next/server";
import { checkBooking, checkCancel } from "@/lib/booking-policy";
import { resolveBookingWindow } from "@/lib/parse-booking";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/staff";
import { CLUB_TZ, formatClubTime } from "@/lib/time";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: { court: true },
  });
  if (!existing || existing.canceledAt || existing.court.clubId !== user.clubId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = user.role === "ADMIN" || user.role === "DIRECTOR";
  if (existing.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const payload = body as {
    date?: string;
    start?: string;
    end?: string;
    startAt?: string;
    endAt?: string;
    notes?: unknown;
    courtId?: unknown;
  };

  const tz = user.club.timezone || CLUB_TZ;
  let startAt = existing.startAt;
  let endAt = existing.endAt;
  if (payload.date || payload.start || payload.end || payload.startAt || payload.endAt) {
    const window = resolveBookingWindow(
      {
        date: payload.date ?? formatClubTime(existing.startAt, "yyyy-MM-dd", tz),
        start: payload.start ?? formatClubTime(existing.startAt, "HH:mm", tz),
        end: payload.end ?? formatClubTime(existing.endAt, "HH:mm", tz),
        startAt: payload.startAt,
        endAt: payload.endAt,
      },
      tz,
    );
    if ("error" in window) {
      return NextResponse.json({ error: window.error }, { status: 400 });
    }
    startAt = window.startAt;
    endAt = window.endAt;
  }

  const notes =
    payload.notes === undefined
      ? existing.notes
      : typeof payload.notes === "string" && payload.notes.trim()
        ? payload.notes.trim().slice(0, 500)
        : null;
  const courtId =
    typeof payload.courtId === "string" && payload.courtId
      ? payload.courtId
      : existing.courtId;

  const problem = await checkBooking({
    clubId: user.clubId,
    userId: existing.userId,
    courtId,
    startAt,
    endAt,
    isStaff,
    excludeReservationId: id,
  });
  if (problem) {
    return NextResponse.json({ error: problem.error }, { status: problem.status });
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: { startAt, endAt, notes, courtId },
    include: {
      court: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ reservation });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: { court: true },
  });
  if (!existing || existing.canceledAt || existing.court.clubId !== user.clubId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = user.role === "ADMIN" || user.role === "DIRECTOR";
  if (existing.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const problem = await checkCancel({
    clubId: user.clubId,
    startAt: existing.startAt,
    isStaff,
  });
  if (problem) {
    return NextResponse.json({ error: problem.error }, { status: problem.status });
  }

  await prisma.reservation.update({
    where: { id },
    data: { canceledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
