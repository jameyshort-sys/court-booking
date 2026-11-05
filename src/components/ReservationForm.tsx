"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type CourtOption = { id: string; name: string; type: string };

type Props = {
  mode: "create" | "edit";
  reservationId?: string;
  courts: CourtOption[];
  defaultCourtId: string;
  defaultDate: string;
  defaultStart: string;
  defaultEnd: string;
  defaultNotes?: string;
};

export function ReservationForm({
  mode,
  reservationId,
  courts,
  defaultCourtId,
  defaultDate,
  defaultStart,
  defaultEnd,
  defaultNotes = "",
}: Props) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(defaultCourtId);
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [notes, setNotes] = useState(defaultNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = { courtId, date, start, end, notes };

      const res =
        mode === "create"
          ? await fetch("/api/reservations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/reservations/${reservationId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(`/schedule?date=${date}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function onCancelReservation() {
    if (!reservationId) return;
    if (!confirm("Cancel this reservation?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not cancel");
        return;
      }
      router.push(`/schedule?date=${date}`);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Court
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
          required
        >
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === "PICKLEBALL" ? "Pickleball" : "Tennis"})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Date
        </label>
        <input
          type="date"
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Start
          </label>
          <input
            type="time"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            step={900}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            End
          </label>
          <input
            type="time"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            step={900}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional — team name, partners, etc."
          maxLength={500}
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Book court"
              : "Save changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            disabled={pending}
            onClick={onCancelReservation}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            Cancel reservation
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Back
        </button>
      </div>
    </form>
  );
}
