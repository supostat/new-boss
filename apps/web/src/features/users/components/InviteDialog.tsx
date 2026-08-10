import type { Level } from "@boss/shared/domain/authz";
import { LEVELS } from "@boss/shared/domain/authz";
import { useState } from "react";
import { Dialog } from "../../../ui/Dialog";
import { useInviteUser } from "../api";

export function InviteDialog(props: { open: boolean; onClose: () => void }) {
  const inviteUser = useInviteUser();
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<Level>("manager");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await inviteUser.mutateAsync({ email, level });
      setEmail("");
      props.onClose();
    } catch {
      // The sticky error toast reports; the dialog stays open for correction.
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
      title="Invite user"
      size="form"
    >
      <form onSubmit={submit}>
        <label
          htmlFor="invite-email"
          className="mb-1 block text-xs font-medium text-muted"
        >
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <label
          htmlFor="invite-level"
          className="mb-1 block text-xs font-medium text-muted"
        >
          Role
        </label>
        <select
          id="invite-level"
          value={level}
          onChange={(event) => setLevel(event.target.value as Level)}
          className="mb-4 w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        >
          {LEVELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-base border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={inviteUser.isPending}
            className="rounded-base bg-brand px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90 disabled:opacity-60"
          >
            Send invite
          </button>
        </div>
      </form>
    </Dialog>
  );
}
