import * as RadixDialog from "@radix-ui/react-dialog";
import { drawerWidth } from "./overlay";

// The drawer primitive over the same Radix dialog core as Dialog, pinned to
// the right edge at the one drawer width: a scrolling body and a sticky
// footer, entering slow and exiting fast like every overlay.
export function Drawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40 data-[state=open]:animate-[overlay-in_var(--motion-base)_ease-out] data-[state=closed]:animate-[overlay-out_var(--motion-fast)_ease-in]" />
        <RadixDialog.Content
          className={`fixed inset-y-0 right-0 flex max-w-[calc(100vw-2rem)] flex-col border-l border-line bg-surface shadow-lg data-[state=open]:animate-[drawer-in_var(--motion-slow)_ease-out] data-[state=closed]:animate-[drawer-out_var(--motion-fast)_ease-in] ${drawerWidth}`}
        >
          <RadixDialog.Title className="border-b border-line px-5 py-4 font-display text-lg font-bold text-ink">
            {props.title}
          </RadixDialog.Title>
          <div className="flex-1 overflow-y-auto p-5">{props.children}</div>
          {props.footer === undefined ? null : (
            <div className="border-t border-line p-5">{props.footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
