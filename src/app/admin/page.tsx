export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDashboard } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";
import { formatClubTime, minutesToTime } from "@/lib/time";

export default async function AdminHomePage() {
  const user = await getStaffContext();
  const dashboard = await getDashboard(user.clubId);
  const hours = `${minutesToTime(dashboard.rules.openMinutes)}–${minutesToTime(dashboard.rules.closeMinutes)}`;

  const steps = [
    {
      href: "/admin/settings",
      title: "Club settings",
      detail: [user.club.city, user.club.state].filter(Boolean).join(", ") || "Add city and contact",
    },
    {
      href: "/admin/amenities",
      title: "Amenities",
      detail: `${dashboard.activeAmenities} active`,
    },
    {
      href: "/admin/rules",
      title: "Booking rules",
      detail: `${dashboard.rules.advanceDays} days ahead · ${hours}`,
    },
    {
      href: "/admin/members/import",
      title: "Import members",
      detail: `${dashboard.activeMembers} active · ${dashboard.pending} pending`,
    },
    {
      href: "/admin/blocks",
      title: "Blocks and rain-outs",
      detail: `${dashboard.todayBlocks.length} today`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{user.club.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Admin home · {dashboard.timezone}. Stand the club up here before members book.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/members?status=PENDING" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300">
          <div className="text-2xl font-semibold text-slate-900">{dashboard.pending}</div>
          <div className="text-sm text-slate-500">Pending approvals</div>
        </Link>
        <Link href="/admin/blocks" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300">
          <div className="text-2xl font-semibold text-slate-900">{dashboard.todayBlocks.length}</div>
          <div className="text-sm text-slate-500">Blocks today</div>
        </Link>
        <Link href="/admin/schedule" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300">
          <div className="text-2xl font-semibold text-slate-900">{dashboard.todayBookings}</div>
          <div className="text-sm text-slate-500">Court occupancy today</div>
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Setup</h2>
        <ol className="mt-3 divide-y divide-slate-100">
          {steps.map((step, index) => (
            <li key={step.href}>
              <Link href={step.href} className="flex items-center justify-between gap-3 py-3 hover:text-emerald-800">
                <span>
                  <span className="mr-2 text-slate-400">{index + 1}.</span>
                  <span className="font-medium text-slate-800">{step.title}</span>
                </span>
                <span className="text-sm text-slate-500">{step.detail}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s blocks</h2>
          <Link href="/admin/blocks" className="text-sm text-emerald-700 hover:underline">
            Manage
          </Link>
        </div>
        {dashboard.todayBlocks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No rain-outs or holds today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dashboard.todayBlocks.map((block) => (
              <li key={block.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <span className="font-medium">{block.courtName}</span>
                {" · "}
                {formatClubTime(new Date(block.startAt), "h:mm a", dashboard.timezone)}
                –
                {formatClubTime(new Date(block.endAt), "h:mm a", dashboard.timezone)}
                {" · "}
                {block.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
