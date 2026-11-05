import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function AppNav() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: { select: { name: true } } },
  });
  if (!user || user.status !== "ACTIVE") return null;

  const staff = user.role === "ADMIN" || user.role === "DIRECTOR";
  const roleLabel =
    user.role === "ADMIN" ? "Admin" : user.role === "DIRECTOR" ? "Director" : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <Link
            href={staff ? "/admin" : "/schedule"}
            className="block truncate font-semibold text-slate-900"
          >
            Court Booking <span className="font-normal text-slate-500">(pilot)</span>
          </Link>
          <p className="truncate text-xs text-slate-500">
            {user.club.name} · {user.name}
            {roleLabel ? ` · ${roleLabel}` : ""}
          </p>
        </div>
        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          {staff ? (
            <Link
              href="/admin"
              className="rounded-lg px-2 py-1.5 font-medium text-emerald-800 hover:bg-emerald-50 sm:px-3"
            >
              Admin
            </Link>
          ) : null}
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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100 sm:px-3"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
