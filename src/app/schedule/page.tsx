export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DateBar } from "@/components/DateBar";
import { DayGrid } from "@/components/DayGrid";
import { DEFAULT_RULES } from "@/lib/constants";
import { CLUB_TZ, dateKeyInClubTz, dayBoundsUtc } from "@/lib/time";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    include: { rules: true },
  });
  const tz = club?.timezone || CLUB_TZ;
  const openMinutes = club?.rules?.openMinutes ?? DEFAULT_RULES.openMinutes;
  const closeMinutes = club?.rules?.closeMinutes ?? DEFAULT_RULES.closeMinutes;

  const params = await searchParams;
  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : dateKeyInClubTz(new Date(), tz);

  const { start, end } = dayBoundsUtc(dateKey, tz);

  const courts = await prisma.court.findMany({
    where: { clubId: session.user.clubId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      reservations: {
        where: {
          canceledAt: null,
          startAt: { lt: end },
          endAt: { gt: start },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { startAt: "asc" },
      },
      blocks: {
        where: {
          startAt: { lt: end },
          endAt: { gt: start },
        },
        orderBy: { startAt: "asc" },
      },
    },
  });

  const gridCourts = courts.map((court) => ({
    id: court.id,
    name: court.name,
    type: court.type,
    reservations: court.reservations.map((reservation) => ({
      id: reservation.id,
      startAt: reservation.startAt,
      endAt: reservation.endAt,
      notes: reservation.notes,
      userId: reservation.userId,
      userName: reservation.user.name,
      isMine: reservation.userId === session.user.id,
    })),
    blocks: court.blocks.map((block) => ({
      id: block.id,
      startAt: block.startAt,
      endAt: block.endAt,
      reason: block.reason,
    })),
  }));

  return (
    <div className="space-y-4">
      <DateBar dateKey={dateKey} tz={tz} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>
          All courts on one screen · tap an open slot to book · your bookings are
          green · amber is a club block
        </p>
        <Link
          href={`/book?date=${dateKey}`}
          className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700"
        >
          + Book
        </Link>
      </div>
      <DayGrid
        courts={gridCourts}
        dateKey={dateKey}
        tz={tz}
        openMinutes={openMinutes}
        closeMinutes={closeMinutes}
      />
    </div>
  );
}
