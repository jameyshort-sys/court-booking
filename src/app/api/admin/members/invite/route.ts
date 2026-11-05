import { adminHandler } from "@/lib/admin-http";
import { inviteMember, readJson } from "@/lib/admin-service";

export const POST = adminHandler(async (actor, req) =>
  inviteMember(actor, await readJson(req)),
);
