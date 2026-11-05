import { adminHandler } from "@/lib/admin-http";
import { createBlock, listBlocks, readJson } from "@/lib/admin-service";

export const GET = adminHandler(async (actor, req) => {
  const date = new URL(req.url).searchParams.get("date");
  return listBlocks(actor.clubId, date);
});

export const POST = adminHandler(async (actor, req) =>
  createBlock(actor, await readJson(req)),
);
