export const dynamic = "force-dynamic";

import { BlocksManager } from "@/components/admin/BlocksManager";
import { getRules, listAmenities, listBlocks } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";
import { dateKeyInClubTz, minutesToTime } from "@/lib/time";

export default async function BlocksPage() {
  const user = await getStaffContext();
  const [{ amenities }, { blocks, timezone }, { rules }] = await Promise.all([
    listAmenities(user.clubId),
    listBlocks(user.clubId),
    getRules(user.clubId),
  ]);

  return (
    <BlocksManager
      amenities={amenities}
      blocks={blocks}
      timezone={timezone}
      today={dateKeyInClubTz(new Date(), timezone)}
      openTime={minutesToTime(rules.openMinutes)}
      closeTime={minutesToTime(rules.closeMinutes)}
    />
  );
}
