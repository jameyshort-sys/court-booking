export const dynamic = "force-dynamic";

import { AmenitiesManager } from "@/components/admin/AmenitiesManager";
import { listAmenities } from "@/lib/admin-service";
import { getStaffContext } from "@/lib/staff";

export default async function AmenitiesPage() {
  const user = await getStaffContext();
  const { amenities } = await listAmenities(user.clubId);
  return <AmenitiesManager amenities={amenities} />;
}
