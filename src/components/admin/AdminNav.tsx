"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/amenities", label: "Amenities" },
  { href: "/admin/rules", label: "Booking rules" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/members/import", label: "Import" },
  { href: "/admin/blocks", label: "Blocks" },
  { href: "/admin/schedule", label: "Court occupancy" },
  { href: "/admin/settings", label: "Club settings" },
];

export function AdminNav({
  clubName,
  role,
}: {
  clubName: string;
  role: string;
}) {
  const pathname = usePathname();
  const activeHref = LINKS.filter((link) =>
    link.href === "/admin"
      ? pathname === "/admin"
      : pathname === link.href || pathname.startsWith(`${link.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="md:sticky md:top-20 md:self-start">
      <p className="mb-2 hidden text-xs font-medium uppercase tracking-wide text-slate-400 md:block">
        {clubName} · {role === "ADMIN" ? "Admin" : "Director"}
      </p>
      <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {LINKS.map((link) => {
          const active = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-emerald-600 font-medium text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
