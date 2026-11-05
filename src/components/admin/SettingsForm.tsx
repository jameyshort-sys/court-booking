"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIME_ZONE_OPTIONS } from "@/lib/time";
import {
  Alert,
  PageHeader,
  Panel,
  adminFetch,
  fieldClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/ui";

export type ClubSettings = {
  name: string;
  city: string | null;
  state: string | null;
  timezone: string;
  contactEmail: string | null;
};

export function SettingsForm({ club }: { club: ClubSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: club.name,
    city: club.city ?? "",
    state: club.state ?? "",
    timezone: club.timezone,
    contactEmail: club.contactEmail ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const zones = Array.from(new Set([club.timezone, ...TIME_ZONE_OPTIONS]));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Club settings"
        description="Profile shown to staff and used for the club calendar. Times in the admin tools follow this timezone."
      />
      {error ? <Alert kind="error">{error}</Alert> : null}
      {saved ? <Alert kind="success">Club settings saved.</Alert> : null}
      <Panel>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            setSaved(false);
            void adminFetch("/api/admin/club", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: form.name,
                city: form.city,
                state: form.state,
                timezone: form.timezone,
                contactEmail: form.contactEmail,
              }),
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
          <label className="sm:col-span-2">
            <span className={labelClass}>Club name</span>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              maxLength={120}
            />
          </label>
          <label>
            <span className={labelClass}>City</span>
            <input
              className={fieldClass}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              maxLength={80}
            />
          </label>
          <label>
            <span className={labelClass}>State</span>
            <input
              className={fieldClass}
              value={form.state}
              onChange={(event) => setForm({ ...form, state: event.target.value })}
              maxLength={40}
            />
          </label>
          <label>
            <span className={labelClass}>Timezone</span>
            <select
              className={fieldClass}
              value={form.timezone}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Contact email</span>
            <input
              className={fieldClass}
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
              placeholder="desk@club.example"
            />
          </label>
          <div className="sm:col-span-2">
            <button className={primaryButtonClass} type="submit" disabled={busy}>
              Save settings
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
