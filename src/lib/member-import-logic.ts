import { MAX_IMPORT_ROWS, isRole } from "@/lib/constants";

export type ColumnMapping = {
  email: string;
  name: string;
  role?: string;
};

export type ImportRowStatus = "valid" | "duplicate" | "error";

export type ImportRowResult = {
  rowNumber: number;
  email: string;
  name: string;
  role: string;
  status: ImportRowStatus;
  reason: string | null;
};

export type ImportSummary = {
  total: number;
  valid: number;
  duplicate: number;
  error: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HEADER_ALIASES: Record<"email" | "name" | "role", string[]> = {
  email: ["email", "e mail", "e-mail", "email address", "member email"],
  name: ["name", "full name", "member name", "member", "player name", "player"],
  role: ["role", "member role", "user role"],
};

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

function matchHeader(headers: string[], wanted: string | undefined): string | null {
  if (!wanted || !wanted.trim()) return null;
  const target = normalizeHeader(wanted);
  return headers.find((header) => normalizeHeader(header) === target) ?? null;
}

export function detectMapping(headers: string[]): ColumnMapping | null {
  const normalized = headers.map(normalizeHeader);
  const find = (aliases: string[]) => {
    const index = normalized.findIndex((header) => aliases.includes(header));
    return index >= 0 ? headers[index] : undefined;
  };
  const email = find(HEADER_ALIASES.email);
  const name = find(HEADER_ALIASES.name);
  if (!email || !name) return null;
  const role = find(HEADER_ALIASES.role);
  return { email, name, ...(role ? { role } : {}) };
}

export function resolveMapping(
  headers: string[],
  requested?: unknown,
): ColumnMapping | null {
  if (requested == null) return detectMapping(headers);
  if (typeof requested !== "object") return null;
  const raw = requested as { email?: unknown; name?: unknown; role?: unknown };
  const hasExplicit =
    (typeof raw.email === "string" && raw.email.trim() !== "") ||
    (typeof raw.name === "string" && raw.name.trim() !== "") ||
    (typeof raw.role === "string" && raw.role.trim() !== "");
  if (!hasExplicit) return detectMapping(headers);

  const email = matchHeader(
    headers,
    typeof raw.email === "string" ? raw.email : undefined,
  );
  const name = matchHeader(
    headers,
    typeof raw.name === "string" ? raw.name : undefined,
  );
  if (!email || !name) return null;

  if (typeof raw.role === "string" && raw.role.trim()) {
    const role = matchHeader(headers, raw.role);
    if (!role) return null;
    return { email, name, role };
  }
  return { email, name };
}

export type ParsedRecord = {
  rowNumber: number;
  cells: string[];
};

export function recordsFromGrid(grid: string[][]): {
  headers: string[];
  records: ParsedRecord[];
} {
  if (grid.length === 0) {
    return { headers: [], records: [] };
  }
  const headers = grid[0].map((cell) => cell.trim());
  const records: ParsedRecord[] = [];
  for (let index = 1; index < grid.length; index += 1) {
    const cells = grid[index].map((cell) => cell.trim());
    if (cells.every((cell) => cell === "")) continue;
    records.push({ rowNumber: index + 1, cells });
  }
  return { headers, records };
}

export function assertImportSize(recordCount: number): string | null {
  if (recordCount === 0) return "No member rows found under the header";
  if (recordCount > MAX_IMPORT_ROWS) {
    return `Import is limited to ${MAX_IMPORT_ROWS} rows per file`;
  }
  return null;
}

function cellValue(headers: string[], cells: string[], header: string | undefined): string {
  if (!header) return "";
  const index = headers.findIndex(
    (item) => normalizeHeader(item) === normalizeHeader(header),
  );
  if (index < 0) return "";
  return cells[index] ?? "";
}

export function validateMemberRows(
  headers: string[],
  records: ParsedRecord[],
  mapping: ColumnMapping,
  existingEmails: Iterable<string>,
): ImportRowResult[] {
  const existing = new Set(
    Array.from(existingEmails, (email) => email.trim().toLowerCase()),
  );
  const seen = new Set<string>();

  return records.map((record) => {
    const emailRaw = cellValue(headers, record.cells, mapping.email);
    const name = cellValue(headers, record.cells, mapping.name).trim();
    const roleRaw = cellValue(headers, record.cells, mapping.role).trim();
    const email = emailRaw.trim().toLowerCase();

    const base = {
      rowNumber: record.rowNumber,
      email,
      name,
      role: "MEMBER",
    };

    if (!email) {
      return { ...base, status: "error" as const, reason: "Email is required" };
    }
    if (!isValidEmail(email)) {
      return { ...base, status: "error" as const, reason: "Invalid email" };
    }
    if (!name) {
      return { ...base, status: "error" as const, reason: "Name is required" };
    }
    if (name.length > 120) {
      return {
        ...base,
        status: "error" as const,
        reason: "Name must be 120 characters or fewer",
      };
    }

    let role = "MEMBER";
    if (roleRaw) {
      const normalized = roleRaw.toUpperCase();
      if (!isRole(normalized)) {
        return {
          ...base,
          role: roleRaw,
          status: "error" as const,
          reason: "Unknown role. Use MEMBER, DIRECTOR, or ADMIN",
        };
      }
      role = normalized;
    }

    if (existing.has(email) || seen.has(email)) {
      const inClub = existing.has(email);
      seen.add(email);
      return {
        ...base,
        role,
        status: "duplicate" as const,
        reason: inClub
          ? "Email already belongs to this club"
          : "Duplicate email in this file",
      };
    }

    seen.add(email);
    return { ...base, role, status: "valid" as const, reason: null };
  });
}

export function summarizeRows(rows: ImportRowResult[]): ImportSummary {
  return rows.reduce<ImportSummary>(
    (summary, row) => {
      summary.total += 1;
      summary[row.status] += 1;
      return summary;
    },
    { total: 0, valid: 0, duplicate: 0, error: 0 },
  );
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\r\n") + "\r\n";
}

export function memberImportTemplateCsv(): string {
  return toCsv([
    ["email", "name", "role"],
    ["ada@example.com", "Ada Lovelace", "MEMBER"],
  ]);
}

export function importErrorsToCsv(rows: ImportRowResult[]): string {
  const lines = [["row", "email", "name", "role", "error"]];
  for (const row of rows) {
    if (row.status !== "error") continue;
    lines.push([
      String(row.rowNumber),
      row.email,
      row.name,
      row.role,
      row.reason ?? "",
    ]);
  }
  return toCsv(lines);
}

export function importReportToCsv(rows: ImportRowResult[]): string {
  const lines = [["row", "email", "name", "role", "status", "reason"]];
  for (const row of rows) {
    lines.push([
      String(row.rowNumber),
      row.email,
      row.name,
      row.role,
      row.status,
      row.reason ?? "",
    ]);
  }
  return toCsv(lines);
}
