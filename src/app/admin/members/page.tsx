export const dynamic = "force-dynamic";

import { MembersManager } from "@/components/admin/MembersManager";
import { listMembers } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getStaffContext();
  const params = await searchParams;
  const { members } = await listMembers(user.clubId);
  return (
    <MembersManager
      members={members}
      currentUserId={user.id}
      initialStatus={(params.status ?? "").toUpperCase()}
      timezone={user.club.timezone}
    />
  );
}
