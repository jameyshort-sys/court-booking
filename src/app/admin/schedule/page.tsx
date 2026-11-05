export const dynamic = "force-dynamic";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { getScheduleOverview } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";
import { dateKeyInClubTz, formatClubTime } from "@/lib/time";

const TYPE_LABEL: Record<string, string> = {
  TENNIS: "Tennis",
  PICKLEBALL: "Pickleball",
  OTHER: "Other",
};

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getStaffContext();
  const params = await searchParams;
  const requested = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
  const dateKey = requested ?? dateKeyInClubTz(new Date(), user.club.timezone);
  const overview = await getScheduleOverview(user.clubId, dateKey);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Schedule overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Read-only view of who is on which court. Booking and editing stay on the member schedule.
        </p>
      </div>
      <DateBar dateKey={overview.date} basePath="/admin/schedule" tz={overview.timezone} />
      {overview.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          Nothing booked or blocked this day.{" "}
          <Link href="/admin/blocks" className="text-emerald-700 underline">
            Add a rain-out
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Amenity</th>
                <th className="px-3 py-2">Who / hold</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {overview.rows.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className={`border-t border-slate-100 ${row.kind === "block" ? "bg-amber-50" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-3">
                    {formatClubTime(new Date(row.startAt), "h:mm a", overview.timezone)}
                    {" – "}
                    {formatClubTime(new Date(row.endAt), "h:mm a", overview.timezone)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">{row.courtName}</div>
                    <div className="text-xs text-slate-400">
                      {TYPE_LABEL[row.courtType] ?? row.courtType}
                      {row.active ? "" : " · disabled"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {row.kind === "block" ? `Block · ${row.label}` : row.label}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{row.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
