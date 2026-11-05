export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { getStaffContext } from "@/lib/staff";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getStaffContext();

  return (
    <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
      <AdminNav clubName={user.club.name} role={user.role} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
