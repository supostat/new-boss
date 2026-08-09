export type UserStatus = "active" | "invited" | "disabled";

const pillStyle: Record<UserStatus, string> = {
  active: "border-clocked/40 bg-clocked/10 text-clocked",
  invited: "border-amended/40 bg-amended/10 text-amended",
  disabled: "border-line bg-muted/10 text-muted",
};

const pillLabel: Record<UserStatus, string> = {
  active: "Active",
  invited: "Invited",
  disabled: "Disabled",
};

export function UserStatusPill(props: { status: UserStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${pillStyle[props.status]}`}
    >
      {pillLabel[props.status]}
    </span>
  );
}
