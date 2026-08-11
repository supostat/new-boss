import { useNavigate, useSearch } from "@tanstack/react-router";
import { useSession } from "../../../session";
import { Frame } from "../../../shell/Frame";
import { VenueStatusPill } from "../../../ui/domain/VenueStatusPill";
import { useArchiveVenue, useRestoreVenue, useVenues } from "../api";
import { MembersDrawer } from "./MembersDrawer";
import { VenueDialog } from "./VenueDialog";

export function VenuesPage() {
  const session = useSession();
  const venues = useVenues();
  const archiveVenue = useArchiveVenue();
  const restoreVenue = useRestoreVenue();
  const navigate = useNavigate();
  const search = useSearch({ from: "/venues" });

  if (session.data == null) {
    return null;
  }

  const rows = venues.data ?? [];
  const renameTarget = rows.find((row) => row.id === search.rename) ?? null;
  const membersTarget = rows.find((row) => row.id === search.members) ?? null;

  return (
    <Frame user={session.data.user}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Venues</h1>
        <button
          type="button"
          onClick={() => navigate({ to: "/venues", search: { venue: "new" } })}
          className="rounded-base bg-brand px-3 py-1.5 text-sm font-semibold text-surface hover:opacity-90"
        >
          New venue
        </button>
      </div>

      <div className="overflow-x-auto rounded-base border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <VenueStatusPill
                    status={row.disabledAt == null ? "active" : "archived"}
                  />
                </td>
                <td className="px-3 py-2 text-muted">
                  {row.createdAt.toLocaleDateString("en-GB")}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: "/venues", search: { members: row.id } })
                    }
                    className="mr-2 rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                  >
                    Manage members
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: "/venues", search: { rename: row.id } })
                    }
                    className="mr-2 rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                  >
                    Rename
                  </button>
                  {row.disabledAt == null ? (
                    <button
                      type="button"
                      onClick={() => archiveVenue.mutate(row.id)}
                      className="rounded-base border border-line px-2.5 py-1 text-xs text-danger hover:bg-canvas"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => restoreVenue.mutate(row.id)}
                      className="rounded-base border border-line px-2.5 py-1 text-xs text-ink hover:bg-canvas"
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-muted">
                  No venues yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <VenueDialog
        key={search.rename ?? "new"}
        open={search.venue === "new" || renameTarget !== null}
        venue={
          renameTarget === null
            ? null
            : { id: renameTarget.id, name: renameTarget.name }
        }
        onClose={() => navigate({ to: "/venues", search: {} })}
      />

      <MembersDrawer
        venue={
          membersTarget === null
            ? null
            : { id: membersTarget.id, name: membersTarget.name }
        }
        onClose={() => navigate({ to: "/venues", search: {} })}
      />
    </Frame>
  );
}
