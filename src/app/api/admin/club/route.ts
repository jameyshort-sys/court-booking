import { adminHandler } from "@/lib/admin-http";
import { getClub, readJson, updateClub } from "@/lib/admin-service";

export const GET = adminHandler(async (actor) => getClub(actor.clubId));

export const PATCH = adminHandler(async (actor, req) =>
  updateClub(actor.clubId, await readJson(req)),
);
