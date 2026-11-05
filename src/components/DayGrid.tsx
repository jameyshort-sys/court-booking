import Link from "next/link";
import { CLUB_TZ, formatClubTime } from "@/lib/time";

export type GridReservation = {
  id: string;
  startAt: Date;
  endAt: Date;
  notes: string | null;
  userId: string;
  userName: string;
  isMine: boolean;
};

export type GridBlock = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string;
};

export type GridCourt = {
  id: string;
  name: string;
  type: string;
  reservations: GridReservation[];
  blocks?: GridBlock[];
};

function typeLabel(type: string) {
  if (type === "PICKLEBALL") return "Pickleball";
  if (type === "TENNIS") return "Tennis";
  return "Other";
}

function hourLabel(hour: number) {
  if (hour === 0 || hour === 24) return "12am";
  if (hour === 12) return "12pm";
  if (hour > 12) return `${hour - 12}pm`;
  return `${hour}am`;
}

export function DayGrid({
  courts,
  dateKey,
  tz = CLUB_TZ,
  openMinutes = 7 * 60,
  closeMinutes = 22 * 60,
}: {
  courts: GridCourt[];
  dateKey: string;
  tz?: string;
  openMinutes?: number;
  closeMinutes?: number;
}) {
  const startHour = Math.floor(openMinutes / 60);
  const endHour = Math.max(startHour + 1, Math.ceil(closeMinutes / 60));
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const span = endHour - startHour;

  function hourFraction(date: Date): number {
    const parts = formatClubTime(date, "H:mm", tz).split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return h + m / 60;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className="min-w-[720px]"
        style={{
          display: "grid",
          gridTemplateColumns: `4.5rem repeat(${Math.max(courts.length, 1)}, minmax(5.5rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-500">
          Time
        </div>
        {courts.map((court) => (
          <div
            key={court.id}
            className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center last:border-r-0"
          >
            <div className="text-sm font-semibold text-slate-900">{court.name}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              {typeLabel(court.type)}
            </div>
          </div>
        ))}

        <div className="relative sticky left-0 z-10 border-r border-slate-200 bg-white">
          {hours.map((hour) => (
            <div
              key={hour}
              className="flex h-14 items-start justify-end border-b border-slate-100 pr-2 pt-1 text-[11px] text-slate-400"
            >
              {hourLabel(hour)}
            </div>
          ))}
        </div>

        {courts.map((court) => (
          <div
            key={court.id}
            className="relative border-r border-slate-100 last:border-r-0"
            style={{ height: `${hours.length * 3.5}rem` }}
          >
            {hours.map((hour) => (
              <Link
                key={hour}
                href={`/book?date=${dateKey}&courtId=${court.id}&hour=${hour}`}
                className="absolute left-0 right-0 border-b border-slate-50 hover:bg-emerald-50/60"
                style={{
                  top: `${((hour - startHour) / span) * 100}%`,
                  height: `${(1 / span) * 100}%`,
                }}
                title={`Book ${court.name} at ${hourLabel(hour)}`}
              />
            ))}

            {(court.blocks ?? []).map((block) => {
              const s = Math.max(hourFraction(block.startAt), startHour);
              const e = Math.min(hourFraction(block.endAt), endHour);
              if (e <= startHour || s >= endHour) return null;
              const top = ((s - startHour) / span) * 100;
              const height = Math.max(((e - s) / span) * 100, 4);
              return (
                <div
                  key={block.id}
                  className="absolute left-0.5 right-0.5 z-[2] overflow-hidden rounded-md border border-amber-300 bg-amber-100 px-1.5 py-1 text-[11px] leading-tight text-amber-950"
                  style={{ top: `${top}%`, height: `${height}%` }}
                  title={block.reason}
                >
                  <div className="font-semibold truncate">Blocked</div>
                  <div className="truncate">{block.reason}</div>
                </div>
              );
            })}

            {court.reservations.map((reservation) => {
              const s = Math.max(hourFraction(reservation.startAt), startHour);
              const e = Math.min(hourFraction(reservation.endAt), endHour);
              if (e <= startHour || s >= endHour) return null;
              const top = ((s - startHour) / span) * 100;
              const height = Math.max(((e - s) / span) * 100, 4);

              return (
                <Link
                  key={reservation.id}
                  href={
                    reservation.isMine
                      ? `/reservations/${reservation.id}/edit`
                      : `/reservations?highlight=${reservation.id}`
                  }
                  className={`absolute left-0.5 right-0.5 z-[1] overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight shadow-sm ${
                    reservation.isMine
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-slate-100 text-slate-800"
                  }`}
                  style={{ top: `${top}%`, height: `${height}%` }}
                  title={`${reservation.userName}: ${formatClubTime(reservation.startAt, "h:mm a", tz)}–${formatClubTime(reservation.endAt, "h:mm a", tz)}${reservation.notes ? ` — ${reservation.notes}` : ""}`}
                >
                  <div className="truncate font-semibold">{reservation.userName}</div>
                  <div className="truncate opacity-90">
                    {formatClubTime(reservation.startAt, "h:mm", tz)}–
                    {formatClubTime(reservation.endAt, "h:mm a", tz)}
                  </div>
                  {reservation.notes ? (
                    <div className="truncate opacity-80">{reservation.notes}</div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
