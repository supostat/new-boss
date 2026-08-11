import { useState } from "react";
import { Drawer } from "../../../ui/Drawer";
import {
  useAssignableUsers,
  useAssignMembership,
  useCloseMembership,
  useRemoveMembership,
  useVenueMembers,
} from "../api";

function windowLabel(from: Date, to: Date | null): string {
  const start = from.toLocaleDateString("en-GB");
  return to === null
    ? `${start} → open`
    : `${start} → ${to.toLocaleDateString("en-GB")}`;
}

function startOfUtcDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function MembersDrawer(props: {
  venue: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const members = useVenueMembers(props.venue?.id);
  const users = useAssignableUsers();
  const assignMembership = useAssignMembership();
  const closeMembership = useCloseMembership();
  const removeMembership = useRemoveMembership();

  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState("");

  function assign(event: React.FormEvent) {
    event.preventDefault();
    if (props.venue === null || userId === "") {
      return;
    }
    assignMembership.mutate({
      venueId: props.venue.id,
      userId,
      from: startOfUtcDay(from),
      to: to === "" ? null : startOfUtcDay(to),
    });
    setUserId("");
    setTo("");
  }

  const assignForm = (
    <form onSubmit={assign}>
      <label
        htmlFor="member-user"
        className="mb-1 block text-xs font-medium text-muted"
      >
        User
      </label>
      <select
        id="member-user"
        required
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        className="mb-3 w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      >
        <option value="">Choose a user</option>
        {(users.data ?? []).map((row) => (
          <option key={row.id} value={row.id}>
            {row.name} — {row.email}
          </option>
        ))}
      </select>
      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <label
            htmlFor="member-from"
            className="mb-1 block text-xs font-medium text-muted"
          >
            From
          </label>
          <input
            id="member-from"
            type="date"
            required
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="member-to"
            className="mb-1 block text-xs font-medium text-muted"
          >
            To (open if empty)
          </label>
          <input
            id="member-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={assignMembership.isPending}
          className="rounded-base bg-brand px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90 disabled:opacity-60"
        >
          Assign member
        </button>
      </div>
    </form>
  );

  return (
    <Drawer
      open={props.venue !== null}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
      title={`Members — ${props.venue?.name ?? ""}`}
      footer={assignForm}
    >
      <ul className="space-y-2">
        {(members.data ?? []).map((row) => (
          <li
            key={row.membershipId}
            className="flex items-center justify-between rounded-base border border-line bg-surface px-3 py-2"
          >
            <div>
              <p className="text-sm">{row.name}</p>
              <p className="font-mono text-[11px] text-muted">
                {windowLabel(row.from, row.to)}
              </p>
            </div>
            <div className="flex gap-2">
              {row.to === null ? (
                <button
                  type="button"
                  onClick={() =>
                    closeMembership.mutate({
                      membershipId: row.membershipId,
                      to: new Date(),
                    })
                  }
                  className="rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                >
                  Close window
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeMembership.mutate(row.membershipId)}
                className="rounded-base border border-line px-2.5 py-1 text-xs text-danger hover:bg-canvas"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {(members.data ?? []).length === 0 ? (
          <li className="px-1 py-2 text-sm text-muted">No members yet.</li>
        ) : null}
      </ul>
    </Drawer>
  );
}
