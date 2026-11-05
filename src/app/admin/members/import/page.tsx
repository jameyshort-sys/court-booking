export const dynamic = "force-dynamic";

import { ImportManager } from "@/components/admin/ImportManager";
import { prisma } from "@/lib/prisma";
import { getStaffContext } from "@/lib/staff";

export default async function ImportMembersPage() {
  const user = await getStaffContext();
  const last = await prisma.memberImport.findFirst({
    where: { clubId: user.clubId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ImportManager
      lastImport={
        last
          ? {
              createdAt: last.createdAt.toISOString(),
              mode: last.mode,
              imported: last.imported,
              skipped: last.skipped,
              errored: last.errored,
            }
          : null
      }
    />
  );
}
