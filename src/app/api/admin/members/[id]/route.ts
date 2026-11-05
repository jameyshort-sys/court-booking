import { adminHandler } from "@/lib/admin-http";
import { readJson, updateMember } from "@/lib/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminHandler(async (actor, req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return updateMember(actor, id, await readJson(req));
});
