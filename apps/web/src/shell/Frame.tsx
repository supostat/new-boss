import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { visibleNavItems } from "../navigation";
import type { SessionUser } from "../session";
import { sessionKeys, signOut } from "../session";

export function Frame(props: { user: SessionUser; children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const groups = visibleNavItems(
    Object.values(router.routesById),
    props.user.level,
  );

  async function leave() {
    await signOut();
    await queryClient.invalidateQueries({ queryKey: sessionKeys.root });
    await navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between bg-brand px-4 py-2 text-surface">
        <div className="flex items-center gap-5">
          <span className="font-display text-lg font-bold">boss</span>
          {groups.map((group) => (
            <nav key={group.group} className="flex items-center gap-5">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm font-medium opacity-90 hover:opacity-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
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
