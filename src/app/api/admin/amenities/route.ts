import { adminHandler } from "@/lib/admin-http";
import { createAmenity, listAmenities, readJson } from "@/lib/admin-service";

export const GET = adminHandler(async (actor) => listAmenities(actor.clubId));

export const POST = adminHandler(async (actor, req) =>
  createAmenity(actor.clubId, await readJson(req)),
);
