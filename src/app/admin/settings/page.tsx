export const dynamic = "force-dynamic";

import { SettingsForm } from "@/components/admin/SettingsForm";
import { getClub } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";

export default async function SettingsPage() {
  const user = await getStaffContext();
  const { club } = await getClub(user.clubId);
  return <SettingsForm club={club} />;
}
