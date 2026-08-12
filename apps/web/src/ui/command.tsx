import * as RadixDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useRef, useState } from "react";
import { overlayWidth } from "./overlay";

// The grid is five tiles wide; one constant feeds both the layout and the
// arrow math, so the two can never disagree.
export const GRID_COLUMNS = 5;

export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

const gridStep: Record<GridKey, (columns: number) => number> = {
  ArrowLeft: () => -1,
  ArrowRight: () => 1,
  ArrowUp: (columns) => -columns,
  ArrowDown: (columns) => columns,
};

export function isGridKey(key: string): key is GridKey {
  return Object.hasOwn(gridStep, key);
}

// A step that would leave the tiles keeps the current one: the grid owns
// every edge decision and nothing wraps around.
export function gridTarget(
  index: number,
  key: GridKey,
  columns: number,
  count: number,
): number {
  const target = index + gridStep[key](columns);
  return target < 0 || target >= count ? index : target;
}

// Two letters from the label: the first letters of the first two words, or
// the first two letters of a single word.
export function tileInitials(label: string): string {
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  const first = words[0] ?? "";
  const second = words[1];
  const letters =
    second === undefined
      ? first.slice(0, 2)
      : `${first.charAt(0)}${second.charAt(0)}`;
  return `${letters.charAt(0).toUpperCase()}${letters.charAt(1).toLowerCase()}`;
}

// The palette primitive: a cmdk root inside the same Radix dialog core as
// Dialog, clothed in semantic tokens. The visible entry rides in as the Radix
// trigger, so closing hands focus back to it; the title stays for screen
// readers only. Selection is controlled, which is what lets the four arrows
// walk the grid instead of cmdk's own single file.
export function CommandDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const surface = useRef<HTMLDivElement>(null);

  function changeOpen(open: boolean) {
    if (!open) {
      setQuery("");
      setSelected("");
    }
    props.onOpenChange(open);
  }

  function walkGrid(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!isGridKey(event.key)) {
      return;
    }
    const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    if (horizontal && query !== "") {
      return;
    }
    const values = Array.from(
      surface.current?.querySelectorAll("[cmdk-item]") ?? [],
    ).map((tile) => tile.getAttribute("data-tile-value") ?? "");
    if (values.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const current = values.indexOf(selected);
    const target = gridTarget(
      current === -1 ? 0 : current,
      event.key,
      GRID_COLUMNS,
      values.length,
    );
    setSelected(values[target] ?? selected);
  }

  return (
    <RadixDialog.Root open={props.open} onOpenChange={changeOpen}>
      <RadixDialog.Trigger asChild>{props.trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40 data-[state=open]:animate-[overlay-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[overlay-out_var(--motion-fast)_ease-in]" />
        <RadixDialog.Content
          className={`fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-base border border-line bg-surface shadow-lg data-[state=open]:animate-[dialog-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[dialog-out_var(--motion-fast)_ease-in] ${overlayWidth.form}`}
        >
          <RadixDialog.Title className="sr-only">
            {props.title}
          </RadixDialog.Title>
          <div ref={surface} onKeyDownCapture={walkGrid}>
            <Command
              label={props.title}
              value={selected}
              onValueChange={setSelected}
            >
              {props.placeholder === undefined ? null : (
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={props.placeholder}
                  className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-muted"
                />
              )}
              {props.children}
            </Command>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function CommandList(props: { children: React.ReactNode }) {
  return (
    <Command.List className="max-h-96 overflow-y-auto px-3 pb-3">
      {props.children}
    </Command.List>
  );
}

export function CommandEmpty(props: { children: React.ReactNode }) {
  return (
    <Command.Empty className="px-4 py-8 text-center text-sm text-muted">
      {props.children}
    </Command.Empty>
  );
}

export function CommandGroup(props: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group
      style={{ "--grid-columns": GRID_COLUMNS } as React.CSSProperties}
      className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:gap-1 [&_[cmdk-group-items]]:[grid-template-columns:repeat(var(--grid-columns),minmax(0,1fr))]"
      heading={
        <span className="flex items-center gap-3 px-1 py-3">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] text-muted">
            {props.heading}
          </span>
          <span className="h-px flex-1 bg-line" />
        </span>
      }
    >
      {props.children}
    </Command.Group>
  );
}

export function CommandTile(props: {
  value: string;
  label: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Command.Item
      value={props.value}
      data-tile-value={props.value}
      onSelect={props.onSelect}
      className="flex cursor-default select-none flex-col items-center gap-2 rounded-base px-1 py-3 text-center data-[selected=true]:bg-canvas"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand font-mono text-base text-surface">
        {tileInitials(props.label)}
      </span>
      <span className="text-sm text-ink">{props.label}</span>
    </Command.Item>
  );
}

// The hint row is the palette's own anatomy, not an overlay footer: the
// verbs teach the keyboard once, in the metadata voice.
export function CommandHints() {
  return (
    <div className="border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
      ↑↓←→ navigate · ↵ select · esc close
    </div>
  );
}
