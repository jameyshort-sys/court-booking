import { adminHandler } from "@/lib/admin-http";
import { getRules, readJson, updateRules } from "@/lib/admin-service";

export const GET = adminHandler(async (actor) => getRules(actor.clubId));

export const PATCH = adminHandler(async (actor, req) =>
  updateRules(actor.clubId, await readJson(req)),
);
