"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AMENITY_TYPES, type AmenityType } from "@/lib/constants";
import {
  Alert,
  PageHeader,
  Panel,
  adminFetch,
  dangerButtonClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/admin/ui";

export type AmenityRow = {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  active: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  TENNIS: "Tennis",
  PICKLEBALL: "Pickleball",
  OTHER: "Other",
};

export function AmenitiesManager({ amenities }: { amenities: AmenityRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<AmenityType>("TENNIS");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { name: string; type: string }>>({});

  function draft(amenity: AmenityRow) {
    return drafts[amenity.id] ?? { name: amenity.name, type: amenity.type };
  }

  async function run(task: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await task();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Amenities"
        description="Courts and other bookable spaces. Disabling an amenity keeps its history and stops new bookings."
      />
      {error ? <Alert kind="error">{error}</Alert> : null}

      <Panel>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await adminFetch("/api/admin/amenities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type }),
              });
              setName("");
            });
          }}
        >
          <div>
            <label className={labelClass} htmlFor="amenity-name">
              Name
            </label>
            <input
              id="amenity-name"
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              placeholder="Tennis 7"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="amenity-type">
              Type
            </label>
            <select
              id="amenity-type"
              className={fieldClass}
              value={type}
              onChange={(event) => setType(event.target.value as AmenityType)}
            >
              {AMENITY_TYPES.map((option) => (
                <option key={option} value={option}>
                  {TYPE_LABEL[option]}
                </option>
              ))}
            </select>
          </div>
          <button className={primaryButtonClass} disabled={busy} type="submit">
            Add amenity
          </button>
        </form>
      </Panel>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {amenities.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  No amenities yet.
                </td>
              </tr>
            ) : (
              amenities.map((amenity, index) => {
                const row = draft(amenity);
                return (
                  <tr key={amenity.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busy || index === 0}
                          onClick={() =>
                            void run(() => reorder(amenities, index, -1))
                          }
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busy || index === amenities.length - 1}
                          onClick={() =>
                            void run(() => reorder(amenities, index, 1))
                          }
                        >
                          Down
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={fieldClass}
                        value={row.name}
                        aria-label={`Name for ${amenity.name}`}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [amenity.id]: { ...row, name: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={fieldClass}
                        value={row.type}
                        aria-label={`Type for ${amenity.name}`}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [amenity.id]: { ...row, type: event.target.value },
                          }))
                        }
                      >
                        {AMENITY_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {TYPE_LABEL[option]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          amenity.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {amenity.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await adminFetch(`/api/admin/amenities/${amenity.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: row.name,
                                  type: row.type,
                                }),
                              });
                              setDrafts((current) => {
                                const next = { ...current };
                                delete next[amenity.id];
                                return next;
                              });
                            })
                          }
                        >
                          Save
                        </button>
                        {amenity.active ? (
                          <button
                            type="button"
                            className={dangerButtonClass}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/amenities/${amenity.id}`, {
                                  method: "DELETE",
                                });
                              })
                            }
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/amenities/${amenity.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ active: true }),
                                });
                              })
                            }
                          >
                            Enable
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function reorder(amenities: AmenityRow[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  const ordered = [...amenities];
  const [item] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, item);
  await Promise.all(
    ordered.map((amenity, order) =>
      adminFetch(`/api/admin/amenities/${amenity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: order + 1 }),
      }),
    ),
  );
}
