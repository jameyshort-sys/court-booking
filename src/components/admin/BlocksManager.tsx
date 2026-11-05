"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatClubTime } from "@/lib/time";
import {
  Alert,
  PageHeader,
  Panel,
  adminFetch,
  dangerButtonClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/ui";

type AmenityOption = { id: string; name: string; type: string; active: boolean };
type BlockRow = {
  id: string;
  courtId: string;
  courtName: string;
  startAt: string;
  endAt: string;
  reason: string;
  createdByName: string;
};

export function BlocksManager({
  amenities,
  blocks,
  timezone,
  today,
  openTime,
  closeTime,
}: {
  amenities: AmenityOption[];
  blocks: BlockRow[];
  timezone: string;
  today: string;
  openTime: string;
  closeTime: string;
}) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(amenities.find((item) => item.active)?.id ?? "");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState(openTime);
  const [end, setEnd] = useState(closeTime);
  const [reason, setReason] = useState("Rain-out");
  const [allAmenities, setAllAmenities] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startValue = allDay ? openTime : start;
  const endValue = allDay ? closeTime : end;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Blocks and rain-outs"
        description="Hold an amenity so members cannot book it. A block is one amenity and one time range. Use all amenities when weather closes the club."
      />
      {error ? <Alert kind="error">{error}</Alert> : null}
      {notice ? <Alert kind="success">{notice}</Alert> : null}

      <Panel>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            setNotice(null);
            const targets = allAmenities
              ? amenities.filter((item) => item.active).map((item) => item.id)
              : [courtId];
            void (async () => {
              if (targets.length === 0 || targets.some((id) => !id)) {
                throw new Error("Choose an amenity");
              }
              for (const id of targets) {
                await adminFetch("/api/admin/blocks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    courtId: id,
                    date,
                    start: startValue,
                    end: endValue,
                    reason,
                  }),
                });
              }
              return targets.length;
            })()
              .then((count) => {
                setNotice(
                  count === 1 ? "Block saved." : `Saved ${count} blocks, one per amenity.`,
                );
                router.refresh();
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not save the block");
              })
              .finally(() => setBusy(false));
          }}
        >
          <label className="sm:col-span-2">
            <span className={labelClass}>Amenity</span>
            <select
              className={fieldClass}
              value={courtId}
              disabled={allAmenities}
              onChange={(event) => setCourtId(event.target.value)}
            >
              {amenities.map((amenity) => (
                <option key={amenity.id} value={amenity.id}>
                  {amenity.name}
                  {amenity.active ? "" : " (disabled)"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={allAmenities}
              onChange={(event) => setAllAmenities(event.target.checked)}
            />
            Apply to every active amenity
          </label>
          <label>
            <span className={labelClass}>Date</span>
            <input
              className={fieldClass}
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
            />
            All open hours ({openTime}–{closeTime})
          </label>
          <label>
            <span className={labelClass}>Start</span>
            <input
              className={fieldClass}
              type="time"
              required
              disabled={allDay}
              value={startValue}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label>
            <span className={labelClass}>End</span>
            <input
              className={fieldClass}
              type="time"
              required
              disabled={allDay}
              value={endValue}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Reason</span>
            <input
              className={fieldClass}
              required
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div>
            <button className={primaryButtonClass} type="submit" disabled={busy}>
              Save block
            </button>
          </div>
        </form>
      </Panel>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Amenity</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {blocks.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={4}>
                  No upcoming blocks.
                </td>
              </tr>
            ) : (
              blocks.map((block) => (
                <tr key={block.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    {formatClubTime(new Date(block.startAt), "EEE MMM d, h:mm a", timezone)}
                    {" – "}
                    {formatClubTime(new Date(block.endAt), "h:mm a", timezone)}
                  </td>
                  <td className="px-3 py-3">{block.courtName}</td>
                  <td className="px-3 py-3">
                    {block.reason}
                    <div className="text-xs text-slate-400">by {block.createdByName}</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className={dangerButtonClass}
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setError(null);
                        void adminFetch(`/api/admin/blocks/${block.id}`, { method: "DELETE" })
                          .then(() => {
                            setNotice("Block removed.");
                            router.refresh();
                          })
                          .catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "Could not remove block");
                          })
                          .finally(() => setBusy(false));
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
