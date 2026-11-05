"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNavLinks({ staff }: { staff: boolean }) {
  const pathname = usePathname() ?? "";
  const inAdmin = pathname.startsWith("/admin");

  return (
    <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
      {staff ? (
        <Link
          href="/admin"
          className={`rounded-lg px-2 py-1.5 sm:px-3 ${
            inAdmin
              ? "bg-emerald-50 font-medium text-emerald-800"
              : "font-medium text-emerald-800 hover:bg-emerald-50"
          }`}
        >
          Admin
        </Link>
      ) : null}
      {inAdmin ? (
        <Link
          href="/schedule"
          className="rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:px-3"
        >
          Member schedule
        </Link>
      ) : (
        <>
          <Link
            href="/schedule"
            className="rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:px-3"
          >
            Schedule
          </Link>
          <Link
            href="/book"
            className="rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:px-3"
          >
            Book
          </Link>
          <Link
            href="/reservations"
            className="rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 sm:px-3"
          >
            Mine
          </Link>
        </>
      )}
    </nav>
  );
}
