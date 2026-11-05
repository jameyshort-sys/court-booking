import { adminHandler } from "@/lib/admin-http";
import { approveMember } from "@/lib/admin-service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminHandler(async (actor, _req, ctx: Ctx) => {
  const { id } = await ctx.params;
  return approveMember(actor, id);
});
