import Link from "next/link";
import { CLUB_TZ, formatClubDate, parseDateKey, shiftDateKey } from "@/lib/time";
import { DatePicker } from "@/components/DatePicker";

export function DateBar({
  dateKey,
  basePath = "/schedule",
  tz = CLUB_TZ,
}: {
  dateKey: string;
  basePath?: string;
  tz?: string;
}) {
  const prev = shiftDateKey(dateKey, -1, tz);
  const next = shiftDateKey(dateKey, 1, tz);
  const labelDate = parseDateKey(dateKey, tz);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Link
          href={`${basePath}?date=${prev}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          ← Prev
        </Link>
        <Link
          href={basePath}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Today
        </Link>
        <Link
          href={`${basePath}?date=${next}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Next →
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {formatClubDate(labelDate, "EEEE, MMM d", tz)}
        </h1>
        <DatePicker dateKey={dateKey} basePath={basePath} />
      </div>
    </div>
  );
}
