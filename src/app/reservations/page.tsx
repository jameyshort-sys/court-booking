export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLUB_TZ, formatClubDate, formatClubTime } from "@/lib/time";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyReservationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const club = await prisma.club.findUnique({
    where: { id: session.user.clubId },
    select: { timezone: true },
  });
  const tz = club?.timezone || CLUB_TZ;
  const now = new Date();
  const reservations = await prisma.reservation.findMany({
    where: {
      userId: session.user.id,
      canceledAt: null,
      endAt: { gte: now },
    },
    include: { court: true },
    orderBy: { startAt: "asc" },
  });

  const past = await prisma.reservation.findMany({
    where: {
      userId: session.user.id,
      canceledAt: null,
      endAt: { lt: now },
    },
    include: { court: true },
    orderBy: { startAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">My reservations</h1>
          <p className="text-sm text-slate-500">Upcoming and recent</p>
        </div>
        <Link
          href="/book"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Book
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Upcoming
        </h2>
        {reservations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            Nothing upcoming.{" "}
            <Link href="/schedule" className="text-emerald-700 underline">
              View schedule
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {reservations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reservations/${r.id}/edit`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {r.court.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatClubDate(r.startAt, "EEE MMM d", tz)} ·{" "}
                      {formatClubTime(r.startAt, "h:mm a", tz)}–{formatClubTime(r.endAt, "h:mm a", tz)}
                    </div>
                    {r.notes ? (
                      <div className="mt-1 text-sm text-slate-500">{r.notes}</div>
                    ) : null}
                  </div>
                  <span className="text-sm text-emerald-700">Edit</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent
          </h2>
          <ul className="space-y-2 opacity-70">
            {past.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="font-medium">{r.court.name}</div>
                <div className="text-slate-600">
                  {formatClubDate(r.startAt, "EEE MMM d", tz)} ·{" "}
                  {formatClubTime(r.startAt, "h:mm a", tz)}–{formatClubTime(r.endAt, "h:mm a", tz)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
