import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../../../session";
import { Frame } from "../../../shell/Frame";
import { Dialog } from "../../../ui/Dialog";
import { UserStatusPill } from "../../../ui/domain/UserStatusPill";
import {
  useDisableUser,
  useEnableUser,
  usePendingInvites,
  useResendInvite,
  useRevokeInvite,
  useUsers,
} from "../api";
import { InviteDialog } from "./InviteDialog";

const INVITE_EXPIRING_SOON_HOURS = 24;

function expiresLabel(expiresAt: Date): { text: string; soon: boolean } {
  const remainingMs = expiresAt.getTime() - Date.now();
  const soon = remainingMs < INVITE_EXPIRING_SOON_HOURS * 60 * 60 * 1000;
  if (remainingMs <= 0) {
    return { text: "expired", soon: true };
  }
  const hours = Math.round(remainingMs / (60 * 60 * 1000));
  return hours < 48
    ? { text: `in ${hours}h`, soon }
    : { text: `in ${Math.round(hours / 24)} days`, soon };
}

export function UsersPage() {
  const session = useSession();
  const users = useUsers();
  const invites = usePendingInvites();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();
  const navigate = useNavigate();
  const search = useSearch({ from: "/users" });
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  if (session.data == null) {
    return null;
  }
  const selfId = session.data.user.id;

  return (
    <Frame user={session.data.user}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Users</h1>
        <button
          type="button"
          onClick={() => navigate({ to: "/users", search: { invite: "new" } })}
          className="rounded-base bg-brand px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90"
        >
          Invite user
        </button>
      </div>

      <div className="overflow-x-auto rounded-base border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 font-mono text-[12.5px]">
                  {row.email}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  {row.level}
                </td>
                <td className="px-3 py-2">
                  <UserStatusPill
                    status={row.disabledAt == null ? "active" : "disabled"}
                  />
                </td>
                <td className="px-3 py-2 text-muted">
                  {new Date(row.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.id === selfId ? null : row.disabledAt == null ? (
                    <button
                      type="button"
                      onClick={() => disableUser.mutate(row.id)}
                      className="rounded-base border border-line px-2.5 py-1 text-xs text-danger hover:bg-canvas"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => enableUser.mutate(row.id)}
                      className="rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                    >
                      Enable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-6 mb-2 font-display text-base font-bold">
        Pending invites{" "}
        <span className="font-sans text-sm font-normal text-muted">
          {invites.data?.length ?? 0}
        </span>
      </h2>
      <div className="overflow-x-auto rounded-base border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(invites.data ?? []).map((row) => {
              const expiry = expiresLabel(new Date(row.expiresAt));
              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-mono text-[12.5px]">
                    {row.email}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {row.level}
                  </td>
                  <td
                    className={`px-3 py-2 ${expiry.soon ? "font-medium text-amended" : "text-muted"}`}
                  >
                    {expiry.text}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => resendInvite.mutate(row.id)}
                      className="mr-2 rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(row.id)}
                      className="rounded-base border border-line px-2.5 py-1 text-xs text-danger hover:bg-canvas"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              );
            })}
            {(invites.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-muted">
                  No pending invites.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <InviteDialog
        open={search.invite === "new"}
        onClose={() => navigate({ to: "/users", search: {} })}
      />

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
          }
        }}
        title="Revoke invite?"
        size="confirm"
      >
        <p className="mb-4 text-sm text-muted">
          The mailed link stops working immediately.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRevokeTarget(null)}
            className="rounded-base border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (revokeTarget !== null) {
                revokeInvite.mutate(revokeTarget);
              }
              setRevokeTarget(null);
            }}
            className="rounded-base bg-danger px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90"
          >
            Revoke
          </button>
        </div>
      </Dialog>
    </Frame>
  );
}
