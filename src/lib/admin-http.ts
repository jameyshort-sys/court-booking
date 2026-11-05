import { NextResponse } from "next/server";
import { AdminError } from "@/lib/admin-error";
import { requireStaff, type StaffActor } from "@/lib/staff";

export function adminHandler<C = unknown>(
  fn: (actor: StaffActor, req: Request, ctx: C) => Promise<unknown>,
) {
  return async (req: Request, ctx: C) => {
    try {
      const actor = await requireStaff();
      const data = await fn(actor, req, ctx);
      if (data instanceof NextResponse) return data;
      return NextResponse.json(data ?? { ok: true });
    } catch (error) {
      if (error instanceof AdminError) {
        return NextResponse.json(
          { error: error.message, ...error.details },
          { status: error.status },
        );
      }
      console.error(error);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 },
      );
    }
  };
}
