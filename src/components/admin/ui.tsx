import type { ReactNode } from "react";

export const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500";
export const labelClass = "mb-1 block text-sm font-medium text-slate-700";
export const primaryButtonClass =
  "rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const dangerButtonClass =
  "rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Alert({
  kind = "info",
  children,
}: {
  kind?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const tone =
    kind === "error"
      ? "border-red-100 bg-red-50 text-red-700"
      : kind === "success"
        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${tone}`}>
      {children}
    </div>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </section>
  );
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(
      typeof data.error === "string" ? data.error : "Request failed",
    ) as Error & { status?: number; data?: Record<string, unknown> };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data as T;
}

export function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
