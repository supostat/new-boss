export type VenueStatus = "active" | "archived";

const pillStyle: Record<VenueStatus, string> = {
  active: "border-clocked/40 bg-clocked/10 text-clocked",
  archived: "border-line bg-muted/10 text-muted",
};

const pillLabel: Record<VenueStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export function VenueStatusPill(props: { status: VenueStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${pillStyle[props.status]}`}
    >
      {pillLabel[props.status]}
    </span>
  );
}
