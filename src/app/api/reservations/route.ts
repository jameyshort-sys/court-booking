import { NextResponse } from "next/server";
import { checkBooking } from "@/lib/booking-policy";
import { resolveBookingWindow } from "@/lib/parse-booking";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/staff";
import { CLUB_TZ } from "@/lib/time";

export async function POST(req: Request) {
  const user = await requireActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const courtId = String((body as { courtId?: string }).courtId ?? "");
  const notesRaw = (body as { notes?: unknown }).notes;
  const notes =
    typeof notesRaw === "string" && notesRaw.trim()
      ? notesRaw.trim().slice(0, 500)
      : null;

  const tz = user.club.timezone || CLUB_TZ;
  const window = resolveBookingWindow(body as {
    startAt?: string;
    endAt?: string;
    date?: string;
    start?: string;
    end?: string;
  }, tz);
  if ("error" in window) {
    return NextResponse.json({ error: window.error }, { status: 400 });
  }

  const problem = await checkBooking({
    clubId: user.clubId,
    userId: user.id,
    courtId,
    startAt: window.startAt,
    endAt: window.endAt,
    isStaff: user.role === "ADMIN" || user.role === "DIRECTOR",
  });
  if (problem) {
    return NextResponse.json({ error: problem.error }, { status: problem.status });
  }

  const reservation = await prisma.reservation.create({
    data: {
      courtId,
      userId: user.id,
      startAt: window.startAt,
      endAt: window.endAt,
      notes,
    },
    include: {
      court: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
