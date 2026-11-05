import { adminHandler } from "@/lib/admin-http";
import { deleteBlock } from "@/lib/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = adminHandler(async (actor, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteBlock(actor.clubId, id);
});
