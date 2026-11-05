"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  importErrorsToCsv,
  importReportToCsv,
  type ImportRowResult,
  type ImportSummary,
} from "@/lib/member-import-logic";
import {
  Alert,
  PageHeader,
  Panel,
  downloadText,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/admin/ui";

type MappingState = { email: string; name: string; role: string };

const EMPTY_MAPPING: MappingState = { email: "", name: "", role: "" };

export function ImportManager({
  lastImport,
}: {
  lastImport: {
    createdAt: string;
    mode: string;
    imported: number;
    skipped: number;
    errored: number;
  } | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>(EMPTY_MAPPING);
  const [rows, setRows] = useState<ImportRowResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [mode, setMode] = useState<"pending" | "active" | "invite">("pending");
  const [error, setError] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(selected: File, nextMapping: MappingState, commit: boolean) {
    const form = new FormData();
    form.set("file", selected);
    if (nextMapping.email || nextMapping.name || nextMapping.role) {
      form.set(
        "mapping",
        JSON.stringify({
          email: nextMapping.email,
          name: nextMapping.name,
          ...(nextMapping.role ? { role: nextMapping.role } : {}),
        }),
      );
    }
    if (commit) form.set("mode", mode);

    const res = await fetch(
      commit ? "/api/admin/members/import" : "/api/admin/members/import/preview",
      { method: "POST", body: form },
    );
    const data = await res.json().catch(() => ({}));
    if (res.status === 422 && Array.isArray(data.headers)) {
      setHeaders(data.headers.map(String));
      setRows([]);
      setSummary(null);
      setError(data.error || "Map the email and name columns");
      return null;
    }
    if (!res.ok) {
      throw new Error(data.error || "Could not read that file");
    }
    if (Array.isArray(data.headers)) {
      setHeaders(data.headers.map(String));
      setMapping({
        email: data.mapping?.email ?? nextMapping.email,
        name: data.mapping?.name ?? nextMapping.name,
        role: data.mapping?.role ?? "",
      });
    }
    if (Array.isArray(data.rows)) {
      setRows(data.rows);
      setSummary(data.summary);
    }
    setError(null);
    return data as {
      imported?: number;
      skipped?: number;
      errored?: number;
      emailDelivery?: string | null;
      mode?: string;
    };
  }

  async function previewFile(selected: File, nextMapping: MappingState) {
    setBusy(true);
    setResultNote(null);
    setError(null);
    try {
      await send(selected, nextMapping, false);
    } catch (err) {
      setRows([]);
      setSummary(null);
      setError(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import members"
        description="Upload a CSV or Excel file with email, name, and an optional role. Preview every row before anything is saved, then add valid rows as pending, active, or recorded invites."
        action={
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => {
              void fetch("/api/admin/members/import/template")
                .then(async (res) => {
                  if (!res.ok) throw new Error("Could not download the template");
                  downloadText(
                    "member-import-template.csv",
                    await res.text(),
                    "text/csv;charset=utf-8",
                  );
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Could not download the template");
                });
            }}
          >
            Download template
          </button>
        }
      />

      {lastImport ? (
        <Alert>
          Last import {new Date(lastImport.createdAt).toLocaleString()} · {lastImport.mode} ·{" "}
          {lastImport.imported} imported, {lastImport.skipped} duplicates skipped,{" "}
          {lastImport.errored} errors
        </Alert>
      ) : null}
      {error ? <Alert kind="error">{error}</Alert> : null}
      {resultNote ? <Alert kind="success">{resultNote}</Alert> : null}

      <Panel>
        <label className={labelClass} htmlFor="member-file">
          CSV or Excel file
        </label>
        <input
          id="member-file"
          className="block w-full text-sm"
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setRows([]);
            setSummary(null);
            setResultNote(null);
            setMapping(EMPTY_MAPPING);
            if (selected) void previewFile(selected, EMPTY_MAPPING);
          }}
        />
        <p className="mt-2 text-xs text-slate-500">
          Columns: <span className="font-mono">email</span>, <span className="font-mono">name</span>, optional{" "}
          <span className="font-mono">role</span> (MEMBER, DIRECTOR, or ADMIN). Up to 2,000 rows.
          The template includes a sample row — delete it before a real import. Emails must be unique inside this club.
        </p>
        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="text-sm font-medium text-slate-800">How to add valid rows</legend>
          <ModeOption
            checked={mode === "pending"}
            onChange={() => setMode("pending")}
            title="Import as pending"
            detail="They wait in the approval queue. No email is sent."
          />
          <ModeOption
            checked={mode === "active"}
            onChange={() => setMode("active")}
            title="Import as active"
            detail="They join the roster immediately. They still need a password before they can sign in."
          />
          <ModeOption
            checked={mode === "invite"}
            onChange={() => setMode("invite")}
            title="Record invites"
            detail="Pending members are marked invited. Email delivery is not configured yet, so this does not send mail."
          />
        </fieldset>
      </Panel>

      {headers.length > 0 ? (
        <Panel>
          <h2 className="text-sm font-semibold text-slate-900">Column mapping</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MapSelect
              label="Email"
              headers={headers}
              value={mapping.email}
              onChange={(email) => {
                const next = { ...mapping, email };
                setMapping(next);
                if (file) void previewFile(file, next);
              }}
            />
            <MapSelect
              label="Name"
              headers={headers}
              value={mapping.name}
              onChange={(name) => {
                const next = { ...mapping, name };
                setMapping(next);
                if (file) void previewFile(file, next);
              }}
            />
            <MapSelect
              label="Role (optional)"
              headers={headers}
              value={mapping.role}
              allowEmpty
              onChange={(role) => {
                const next = { ...mapping, role };
                setMapping(next);
                if (file) void previewFile(file, next);
              }}
            />
          </div>
        </Panel>
      ) : null}

      {summary ? (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              <strong className="text-slate-900">{summary.valid}</strong> ready ·{" "}
              <strong className="text-slate-900">{summary.duplicate}</strong> duplicates ·{" "}
              <strong className="text-slate-900">{summary.error}</strong> errors · {summary.total} rows
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.error > 0 ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() =>
                    downloadText(
                      "member-import-errors.csv",
                      importErrorsToCsv(rows),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download failed rows
                </button>
              ) : null}
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  downloadText(
                    "member-import-report.csv",
                    importReportToCsv(rows),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Download full report
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`${primaryButtonClass} mt-4`}
            disabled={busy || summary.valid === 0 || !file}
            onClick={() => {
              if (!file) return;
              setBusy(true);
              setError(null);
              void send(file, mapping, true)
                .then((data) => {
                  if (!data) return;
                  const delivery =
                    data.emailDelivery === "not_configured"
                      ? " Invites were recorded, and no email was sent."
                      : "";
                  setResultNote(
                    `Imported ${data.imported ?? 0}, skipped ${data.skipped ?? 0} duplicates, ${data.errored ?? 0} errors.${delivery}`,
                  );
                  router.refresh();
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Import failed");
                })
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Working…" : `Import ${summary.valid} valid row${summary.valid === 1 ? "" : "s"}`}
          </button>

          <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.rowNumber}-${row.email}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.email || "—"}</td>
                    <td className="px-3 py-2">{row.name || "—"}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.status === "valid"
                            ? "text-emerald-700"
                            : row.status === "duplicate"
                              ? "text-amber-700"
                              : "text-red-700"
                        }
                      >
                        {row.status === "valid" ? "Ready" : row.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function MapSelect({
  label,
  headers,
  value,
  allowEmpty,
  onChange,
}: {
  label: string;
  headers: string[];
  value: string;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">Not mapped</option> : <option value="">Choose a column</option>}
        {headers.filter(Boolean).map((header) => (
          <option key={header} value={header}>
            {header}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModeOption({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <input type="radio" name="import-mode" checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block font-medium text-slate-800">{title}</span>
        <span className="block text-slate-500">{detail}</span>
      </span>
    </label>
  );
}
