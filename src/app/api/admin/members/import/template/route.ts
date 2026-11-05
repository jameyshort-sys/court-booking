import { NextResponse } from "next/server";
import { AdminError } from "@/lib/admin-error";
import { memberImportTemplateCsv } from "@/lib/member-import-logic";
import { requireStaff } from "@/lib/staff";

export async function GET() {
  try {
    await requireStaff();
    const csv = memberImportTemplateCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="member-import-template.csv"',
      },
    });
  } catch (error) {
    if (error instanceof AdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
