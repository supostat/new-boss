import type { Level } from "@boss/shared/domain/authz";
import type { AnyRoute } from "@tanstack/react-router";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { NavGroupItems } from "../navigation";
import { visibleNavItems } from "../navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandHints,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

// The palette has no list of its own: its items exist only as this
// delegation, and the test beside it pins that law.
export function commandMenuGroups(
  routes: readonly AnyRoute[],
  level: Level | null,
): NavGroupItems[] {
  return visibleNavItems(routes, level);
}

export function CommandMenu(props: { level: Level }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const groups = commandMenuGroups(
    Object.values(router.routesById),
    props.level,
  );

  useEffect(() => {
    function toggleOnHotkey(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", toggleOnHotkey);
    return () => document.removeEventListener("keydown", toggleOnHotkey);
  }, []);

  async function go(path: string) {
    setOpen(false);
    await navigate({ to: path });
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-base border border-surface/40 px-2.5 py-1 text-xs font-semibold hover:bg-surface/10"
        >
          Search
          <kbd className="font-mono text-[11px] font-normal opacity-90">
            {navigator.platform.includes("Mac") ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      }
    >
      {groups.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          No sections available.
        </p>
      ) : (
        <>
          <CommandInput placeholder="Search sections…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.group} heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.path}
                    value={item.label}
                    onSelect={() => go(item.path)}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </>
      )}
      <CommandHints />
    </CommandDialog>
  );
}
