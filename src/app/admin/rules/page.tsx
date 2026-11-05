export const dynamic = "force-dynamic";

import { RulesForm } from "@/components/admin/RulesForm";
import { getRules } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";

export default async function RulesPage() {
  const user = await getStaffContext();
  const { rules } = await getRules(user.clubId);
  return <RulesForm rules={rules} />;
}
