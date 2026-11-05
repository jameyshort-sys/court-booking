import { adminHandler } from "@/lib/admin-http";
import {
  disableAmenity,
  getAmenity,
  readJson,
  updateAmenity,
} from "@/lib/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminHandler(async (actor, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return getAmenity(actor.clubId, id);
});

export const PATCH = adminHandler(async (actor, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return updateAmenity(actor.clubId, id, await readJson(req));
});

export const DELETE = adminHandler(async (actor, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return disableAmenity(actor.clubId, id);
});
