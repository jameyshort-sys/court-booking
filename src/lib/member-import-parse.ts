import * as XLSX from "xlsx";
import { AdminError } from "@/lib/admin-error";
import { MAX_IMPORT_BYTES } from "@/lib/constants";
import {
  assertImportSize,
  recordsFromGrid,
  type ParsedRecord,
} from "@/lib/member-import-logic";

export type ParsedMemberFile = {
  headers: string[];
  records: ParsedRecord[];
  sheetName: string;
};

function gridFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    },
  );
  return rows.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => String(cell ?? "").trim()),
  );
}

export function parseMemberFile(
  filename: string,
  buffer: Buffer,
): ParsedMemberFile {
  const ext = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase()
    : "";
  if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
    throw new AdminError(400, "Upload a .csv, .xlsx, or .xls file");
  }
  if (buffer.length === 0) {
    throw new AdminError(400, "That file is empty");
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new AdminError(400, "File is larger than 5 MB");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  } catch {
    throw new AdminError(400, "Could not read that spreadsheet");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AdminError(400, "The spreadsheet has no sheets");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new AdminError(400, "The spreadsheet has no sheets");
  }

  const { headers, records } = recordsFromGrid(gridFromSheet(sheet));
  if (headers.length === 0 || headers.every((header) => header === "")) {
    throw new AdminError(400, "The first row must be column headers");
  }
  const sizeError = assertImportSize(records.length);
  if (sizeError) throw new AdminError(400, sizeError);

  return { headers, records, sheetName };
}

export async function readImportForm(req: Request): Promise<{
  filename: string;
  buffer: Buffer;
  mapping: unknown;
  mode: string;
}> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AdminError(400, "Upload a CSV or Excel file");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AdminError(400, "Choose a CSV or Excel file");
  }

  let mapping: unknown = undefined;
  const rawMapping = form.get("mapping");
  if (typeof rawMapping === "string" && rawMapping.trim()) {
    try {
      mapping = JSON.parse(rawMapping);
    } catch {
      throw new AdminError(400, "Column mapping is not valid JSON");
    }
  }

  const mode = String(form.get("mode") ?? "");
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    filename: file.name || "members.csv",
    buffer,
    mapping,
    mode,
  };
}
