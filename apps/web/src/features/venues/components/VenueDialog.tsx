import { useState } from "react";
import { Dialog } from "../../../ui/Dialog";
import { useCreateVenue, useRenameVenue } from "../api";

export function VenueDialog(props: {
  open: boolean;
  onClose: () => void;
  venue: { id: string; name: string } | null;
}) {
  const [name, setName] = useState(props.venue?.name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

  function saved() {
    setName("");
    props.onClose();
  }

  const createVenue = useCreateVenue({
    onNameTaken: setNameError,
    onSaved: saved,
  });
  const renameVenue = useRenameVenue({
    onNameTaken: setNameError,
    onSaved: saved,
  });
  const pending = createVenue.isPending || renameVenue.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setNameError(null);
    if (props.venue === null) {
      createVenue.mutate(name);
    } else {
      renameVenue.mutate({ venueId: props.venue.id, name });
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
      title={props.venue === null ? "New venue" : "Rename venue"}
      size="form"
    >
      <form onSubmit={submit}>
        <label
          htmlFor="venue-name"
          className="mb-1 block text-xs font-medium text-muted"
        >
          Name
        </label>
        <input
          id="venue-name"
          type="text"
          required
          value={name}
          aria-invalid={nameError !== null}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(null);
          }}
          className={`w-full rounded-base border bg-surface px-2.5 py-2 text-sm text-ink focus:outline-none ${
            nameError === null
              ? "border-line focus:border-brand"
              : "border-danger"
          }`}
        />
        {nameError === null ? null : (
          <p className="mt-1 text-xs text-danger">{nameError}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-base border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-base bg-brand px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90 disabled:opacity-60"
          >
            {props.venue === null ? "Create venue" : "Rename venue"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
