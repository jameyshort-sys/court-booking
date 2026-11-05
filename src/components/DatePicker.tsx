"use client";

import { useRouter } from "next/navigation";

export function DatePicker({
  dateKey,
  basePath = "/schedule",
}: {
  dateKey: string;
  basePath?: string;
}) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={dateKey}
      aria-label="Pick date"
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
      onChange={(e) => {
        const v = e.target.value;
        if (v) router.push(`${basePath}?date=${v}`);
      }}
    />
  );
}
