import * as RadixDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { overlayWidth } from "./overlay";

// The palette primitive: a bare cmdk root inside the same Radix dialog core
// as Dialog, clothed in semantic tokens — form width, enter at base, exit
// always fast. The visible entry rides in as the Radix trigger, so closing
// hands focus back to it; the title stays for screen readers only.
export function CommandDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <RadixDialog.Trigger asChild>{props.trigger}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40 data-[state=open]:animate-[overlay-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[overlay-out_var(--motion-fast)_ease-in]" />
        <RadixDialog.Content
          className={`fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-base border border-line bg-surface shadow-lg data-[state=open]:animate-[dialog-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[dialog-out_var(--motion-fast)_ease-in] ${overlayWidth.form}`}
        >
          <RadixDialog.Title className="sr-only">
            {props.title}
          </RadixDialog.Title>
          <Command label={props.title} loop>
            {props.children}
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function CommandInput(props: { placeholder: string }) {
  return (
    <Command.Input
      placeholder={props.placeholder}
      className="w-full border-b border-line bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-muted"
    />
  );
}

export function CommandList(props: { children: React.ReactNode }) {
  return (
    <Command.List className="max-h-80 overflow-y-auto p-1.5">
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
      heading={props.heading}
      className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-muted"
    >
      {props.children}
    </Command.Group>
  );
}

export function CommandItem(props: {
  value: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={props.value}
      onSelect={props.onSelect}
      className="cursor-default select-none rounded-base px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-canvas"
    >
      {props.children}
    </Command.Item>
  );
}

// The hint row is the palette's own anatomy, not an overlay footer: the
// verbs teach the keyboard once, in the metadata voice.
export function CommandHints() {
  return (
    <div className="border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
      ↑↓ navigate · ↵ select · esc close
    </div>
  );
}
