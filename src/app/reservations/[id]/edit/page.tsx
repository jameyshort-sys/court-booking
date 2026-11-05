export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "@/components/ReservationForm";
import { CLUB_TZ, formatClubTime } from "@/lib/time";
import { redirect, notFound } from "next/navigation";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { court: true },
  });

  if (!reservation || reservation.canceledAt || reservation.court.clubId !== session.user.clubId) {
    notFound();
  }

  const isOwner = reservation.userId === session.user.id;
  const isDirector =
    session.user.role === "DIRECTOR" || session.user.role === "ADMIN";
  if (!isOwner && !isDirector) {
    redirect("/reservations");
  }

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { timezone: true },
  });
  const tz = club?.timezone || CLUB_TZ;

  const courts = await prisma.court.findMany({
    where: {
      clubId: session.user.clubId,
      OR: [{ active: true }, { id: reservation.courtId }],
    },
    orderBy: { sortOrder: "asc" },
  });

  const date = formatClubTime(reservation.startAt, "yyyy-MM-dd", tz);
  const start = formatClubTime(reservation.startAt, "HH:mm", tz);
  const end = formatClubTime(reservation.endAt, "HH:mm", tz);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Edit reservation</h1>
        <p className="text-sm text-slate-500">
          Change time, court, or notes — or cancel
        </p>
      </div>
      <ReservationForm
        mode="edit"
        reservationId={reservation.id}
        courts={courts.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))}
        defaultCourtId={reservation.courtId}
        defaultDate={date}
        defaultStart={start}
        defaultEnd={end}
        defaultNotes={reservation.notes ?? ""}
      />
    </div>
  );
}
