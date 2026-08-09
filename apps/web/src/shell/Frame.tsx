import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { SessionUser } from "../features/session/api";
import { signOut } from "../features/session/api";

export function Frame(props: { user: SessionUser; children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function leave() {
    await signOut();
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between bg-brand px-4 py-2 text-surface">
        <span className="font-display text-lg font-bold">boss</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] opacity-90">
            {props.user.email}
          </span>
          <button
            type="button"
            onClick={leave}
            className="rounded-base border border-surface/40 px-2.5 py-1 text-xs font-semibold hover:bg-surface/10"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{props.children}</main>
    </div>
  );
}
