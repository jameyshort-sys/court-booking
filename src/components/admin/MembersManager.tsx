"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLES, type Role } from "@/lib/constants";
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
  secondaryButtonClass,
} from "@/components/admin/ui";

export type MemberRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  invitedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
};

const FILTERS = [
  { id: "", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ACTIVE", label: "Active" },
  { id: "REJECTED", label: "Rejected" },
  { id: "DISABLED", label: "Disabled" },
] as const;

export function MembersManager({
  members,
  currentUserId,
  initialStatus,
  timezone,
}: {
  members: MemberRow[];
  currentUserId: string;
  initialStatus: string;
  timezone: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState(
    FILTERS.some((item) => item.id === initialStatus) ? initialStatus : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState({ email: "", name: "", role: "MEMBER" });
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const counts = useMemo(() => {
    const tally: Record<string, number> = { "": members.length };
    for (const member of members) tally[member.status] = (tally[member.status] ?? 0) + 1;
    return tally;
  }, [members]);

  const visible = members.filter((member) => !filter || member.status === filter);

  async function run(task: () => Promise<string | void>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const message = await task();
      if (message) setNotice(message);
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
        title="Members"
        description="Invite people, approve them, then set a temporary password so they can sign in. Email is not sent in this phase."
        action={
          <Link href="/admin/members/import" className={primaryButtonClass}>
            Bulk import
          </Link>
        }
      />
      {error ? <Alert kind="error">{error}</Alert> : null}
      {notice ? <Alert kind="success">{notice}</Alert> : null}

      <Panel>
        <h2 className="text-sm font-semibold text-slate-900">Invite a member</h2>
        <p className="mt-1 text-xs text-slate-500">
          Invites stay pending until you approve them. Use Set password on their row
          after that — pending and rejected accounts cannot sign in even with a password.
        </p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await adminFetch("/api/admin/members/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(invite),
              });
              setInvite({ email: "", name: "", role: "MEMBER" });
              setFilter("PENDING");
              return "Invite recorded. Approve them from the pending queue when you are ready.";
            });
          }}
        >
          <label>
            <span className={labelClass}>Email</span>
            <input
              className={fieldClass}
              type="email"
              required
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
            />
          </label>
          <label>
            <span className={labelClass}>Name</span>
            <input
              className={fieldClass}
              required
              maxLength={120}
              value={invite.name}
              onChange={(event) => setInvite({ ...invite, name: event.target.value })}
            />
          </label>
          <label>
            <span className={labelClass}>Role</span>
            <select
              className={fieldClass}
              value={invite.role}
              onChange={(event) => setInvite({ ...invite, role: event.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button className={primaryButtonClass} type="submit" disabled={busy}>
            Invite
          </button>
        </form>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === item.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {item.label} {counts[item.id] ?? 0}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Sign-in</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  No members in this view.
                </td>
              </tr>
            ) : (
              visible.map((member) => {
                const isSelf = member.id === currentUserId;
                return (
                  <tr key={member.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">
                        {member.name}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-normal text-slate-400">You</span>
                        ) : null}
                      </div>
                      <div className="text-slate-500">{member.email}</div>
                      {member.invitedAt ? (
                        <div className="text-xs text-slate-400">
                          Invited {formatClubTime(new Date(member.invitedAt), "MMM d", timezone)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={member.status} />
                    </td>
                    <td className="px-3 py-3">
                      {isSelf ? (
                        <p className="text-sm text-slate-700">
                          {member.role}
                          <span className="mt-1 block text-xs text-slate-400">
                            You can&apos;t change your own role.
                          </span>
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className={fieldClass}
                            aria-label={`Role for ${member.name}`}
                            value={roleDrafts[member.id] ?? member.role}
                            disabled={busy}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [member.id]: event.target.value,
                              }))
                            }
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={
                              busy || (roleDrafts[member.id] ?? member.role) === member.role
                            }
                            onClick={() => {
                              const role = (roleDrafts[member.id] ?? member.role) as Role;
                              void run(async () => {
                                await adminFetch(`/api/admin/members/${member.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ role }),
                                });
                                setRoleDrafts((current) => {
                                  const next = { ...current };
                                  delete next[member.id];
                                  return next;
                                });
                                return `${member.name} is now ${role}.`;
                              });
                            }}
                          >
                            Save role
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-slate-500">
                        {member.hasPassword ? "Password set" : "No password yet"}
                      </p>
                      {member.status === "PENDING" || member.status === "REJECTED" ? (
                        <p className="mt-1 text-xs text-slate-400">
                          Approve them before this password can be used.
                        </p>
                      ) : null}
                      <form
                        className="mt-2 flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const password = passwords[member.id] ?? "";
                          void run(async () => {
                            await adminFetch(`/api/admin/members/${member.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ password }),
                            });
                            setPasswords((current) => ({ ...current, [member.id]: "" }));
                            return member.status === "ACTIVE"
                              ? `Password set for ${member.name}. They can sign in with it now.`
                              : `Password saved for ${member.name}. They can sign in after you approve them.`;
                          });
                        }}
                      >
                        <input
                          className={fieldClass}
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="Temporary password"
                          aria-label={`Temporary password for ${member.name}`}
                          value={passwords[member.id] ?? ""}
                          onChange={(event) =>
                            setPasswords((current) => ({
                              ...current,
                              [member.id]: event.target.value,
                            }))
                          }
                        />
                        <button className={secondaryButtonClass} type="submit" disabled={busy}>
                          Set password
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.status === "PENDING" || member.status === "REJECTED" ? (
                          <button
                            type="button"
                            className={primaryButtonClass}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/members/${member.id}/approve`, {
                                  method: "POST",
                                });
                                return `${member.name} is now active.`;
                              })
                            }
                          >
                            Approve
                          </button>
                        ) : null}
                        {member.status === "PENDING" ? (
                          <button
                            type="button"
                            className={dangerButtonClass}
                            disabled={busy || isSelf}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/members/${member.id}/reject`, {
                                  method: "POST",
                                });
                                return `${member.name} was rejected.`;
                              })
                            }
                          >
                            Reject
                          </button>
                        ) : null}
                        {member.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className={dangerButtonClass}
                            disabled={busy || isSelf}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/members/${member.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "DISABLED" }),
                                });
                                return `${member.name} was deactivated.`;
                              })
                            }
                          >
                            Deactivate
                          </button>
                        ) : null}
                        {member.status === "DISABLED" ? (
                          <button
                            type="button"
                            className={secondaryButtonClass}
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await adminFetch(`/api/admin/members/${member.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "ACTIVE" }),
                                });
                                return `${member.name} is active again.`;
                              })
                            }
                          >
                            Reactivate
                          </button>
                        ) : null}
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "PENDING"
        ? "bg-amber-50 text-amber-800"
        : status === "REJECTED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>
  );
}
