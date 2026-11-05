export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ReservationForm } from "@/components/ReservationForm";
import { DEFAULT_RULES } from "@/lib/constants";
import { CLUB_TZ, dateKeyInClubTz } from "@/lib/time";
import { redirect } from "next/navigation";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    courtId?: string;
    hour?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    include: { rules: true },
  });
  const tz = club?.timezone || CLUB_TZ;
  const openHour = Math.floor((club?.rules?.openMinutes ?? DEFAULT_RULES.openMinutes) / 60);
  const closeHour = Math.ceil((club?.rules?.closeMinutes ?? DEFAULT_RULES.closeMinutes) / 60);

  const params = await searchParams;
  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : dateKeyInClubTz(new Date(), tz);

  const courts = await prisma.court.findMany({
    where: { clubId: session.user.clubId, active: true },
    orderBy: { sortOrder: "asc" },
  });

  if (courts.length === 0) {
    return <p>No courts configured.</p>;
  }

  const courtId =
    params.courtId && courts.some((c) => c.id === params.courtId)
      ? params.courtId
      : courts[0].id;

  const hour = Math.min(
    Math.max(openHour, closeHour - 1),
    Math.max(openHour, Number(params.hour ?? openHour + 2) || openHour),
  );
  const start = `${String(hour).padStart(2, "0")}:00`;
  const closeMinutes = club?.rules?.closeMinutes ?? DEFAULT_RULES.closeMinutes;
  let endHour = hour + 1;
  let endMinute = 30;
  if (endHour * 60 + endMinute > closeMinutes) {
    endHour = Math.floor(closeMinutes / 60);
    endMinute = closeMinutes % 60;
  }
  const end = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Book a court</h1>
        <p className="text-sm text-slate-500">
          Single-court reservation
        </p>
      </div>
      <ReservationForm
        mode="create"
        courts={courts.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))}
        defaultCourtId={courtId}
        defaultDate={dateKey}
        defaultStart={start}
        defaultEnd={end}
      />
    </div>
  );
}
