import { adminHandler } from "@/lib/admin-http";
import { listMembers } from "@/lib/admin-service";

export const GET = adminHandler(async (actor, req) => {
  const status = new URL(req.url).searchParams.get("status");
  return listMembers(actor.clubId, status);
});
