"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { minutesToTime, timeToMinutes } from "@/lib/time";
import {
  Alert,
  PageHeader,
  Panel,
  adminFetch,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/ui";

export type RulesValues = {
  advanceDays: number;
  openMinutes: number;
  closeMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxConcurrentCourts: number;
  cancelCutoffMinutes: number;
};

export function RulesForm({ rules }: { rules: RulesValues }) {
  const router = useRouter();
  const [values, setValues] = useState(rules);
  const [openTime, setOpenTime] = useState(minutesToTime(rules.openMinutes));
  const [closeTime, setCloseTime] = useState(minutesToTime(rules.closeMinutes));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Booking rules"
        description="These limits apply to member bookings. Admins and directors can still place staff reservations outside the duration, advance, and concurrent-court caps. Rain-outs and overlaps always block everyone."
      />
      {error ? <Alert kind="error">{error}</Alert> : null}
      {saved ? <Alert kind="success">Booking rules saved.</Alert> : null}
      <Panel>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setSaved(false);
            const openMinutes = timeToMinutes(openTime);
            const closeMinutes = timeToMinutes(closeTime);
            if (openMinutes == null || closeMinutes == null) {
              setError("Enter open and close times as HH:MM");
              return;
            }
            setBusy(true);
            void adminFetch("/api/admin/rules", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...values, openMinutes, closeMinutes }),
            })
              .then(() => {
                setSaved(true);
                router.refresh();
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Request failed");
              })
              .finally(() => setBusy(false));
          }}
        >
          <Field label="Advance window (days)" hint="How far ahead members can book">
            <input
              className={fieldClass}
              type="number"
              min={0}
              max={365}
              value={values.advanceDays}
              onChange={(event) =>
                setValues({ ...values, advanceDays: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Cancel cutoff (minutes)" hint="How close to start a member can still cancel">
            <input
              className={fieldClass}
              type="number"
              min={0}
              max={10080}
              value={values.cancelCutoffMinutes}
              onChange={(event) =>
                setValues({
                  ...values,
                  cancelCutoffMinutes: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Opens">
            <input
              className={fieldClass}
              type="time"
              value={openTime}
              onChange={(event) => setOpenTime(event.target.value)}
              required
            />
          </Field>
          <Field label="Closes">
            <input
              className={fieldClass}
              type="time"
              value={closeTime}
              onChange={(event) => setCloseTime(event.target.value)}
              required
            />
          </Field>
          <Field label="Minimum duration (minutes)">
            <input
              className={fieldClass}
              type="number"
              min={15}
              max={1440}
              value={values.minDurationMinutes}
              onChange={(event) =>
                setValues({
                  ...values,
                  minDurationMinutes: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Maximum duration (minutes)">
            <input
              className={fieldClass}
              type="number"
              min={15}
              max={1440}
              value={values.maxDurationMinutes}
              onChange={(event) =>
                setValues({
                  ...values,
                  maxDurationMinutes: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Max courts at once" hint="Per member, overlapping bookings">
            <input
              className={fieldClass}
              type="number"
              min={1}
              max={50}
              value={values.maxConcurrentCourts}
              onChange={(event) =>
                setValues({
                  ...values,
                  maxConcurrentCourts: Number(event.target.value),
                })
              }
            />
          </Field>
          <div className="flex items-end">
            <button className={primaryButtonClass} disabled={busy} type="submit">
              Save rules
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
