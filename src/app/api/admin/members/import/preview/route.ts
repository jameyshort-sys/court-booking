import { adminHandler } from "@/lib/admin-http";
import { previewMemberImport } from "@/lib/admin-service";
import { readImportForm } from "@/lib/member-import-parse";

export const POST = adminHandler(async (actor, req) => {
  const form = await readImportForm(req);
  return previewMemberImport(
    actor.clubId,
    { filename: form.filename, buffer: form.buffer },
    form.mapping,
  );
});
