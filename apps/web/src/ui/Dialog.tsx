import * as RadixDialog from "@radix-ui/react-dialog";
import type { OverlaySize } from "./overlay";
import { overlayWidth } from "./overlay";

// The dialog primitive over Radix — the same core shadcn wraps — clothed in
// semantic tokens. Width arrives as a word from the overlay vocabulary.
export function Dialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  size: OverlaySize;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40 data-[state=open]:animate-[overlay-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[overlay-out_var(--motion-fast)_ease-in]" />
        <RadixDialog.Content
          className={`fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-base border border-line bg-surface p-5 shadow-lg data-[state=open]:animate-[dialog-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[dialog-out_var(--motion-fast)_ease-in] ${overlayWidth[props.size]}`}
        >
          <RadixDialog.Title className="mb-4 font-display text-lg font-bold text-ink">
            {props.title}
          </RadixDialog.Title>
          {props.children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
