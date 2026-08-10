import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

// The single toast surface: slices call toast.*, never sonner itself.
// Sticky means no auto-dismiss — the native swipe still closes any toast.
const SUCCESS_TOAST_DURATION_MS = 5000;
const STICKY = Number.POSITIVE_INFINITY;
const VISIBLE_TOASTS = 3;

export const toast = {
  success(message: string): void {
    sonnerToast.success(message, { duration: SUCCESS_TOAST_DURATION_MS });
  },
  error(message: string): void {
    sonnerToast.error(message, { duration: STICKY });
  },
  // A pending toast lives until its outcome, never on a timer; the caller
  // keeps the original promise, rejections included.
  pending<T>(
    promise: Promise<T>,
    messages: { pending: string; success: string; error: string },
  ): Promise<T> {
    const id = sonnerToast.loading(messages.pending, { duration: STICKY });
    promise.then(
      () =>
        sonnerToast.success(messages.success, {
          id,
          duration: SUCCESS_TOAST_DURATION_MS,
        }),
      () => sonnerToast.error(messages.error, { id, duration: STICKY }),
    );
    return promise;
  },
};

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      visibleToasts={VISIBLE_TOASTS}
      toastOptions={{
        classNames: {
          toast:
            "border border-line border-l-[3px] bg-surface text-ink rounded-base shadow-lg font-sans text-sm",
          title: "text-ink",
          description: "text-muted",
          success: "border-l-clocked",
          error: "border-l-danger",
          loading: "border-l-amended",
        },
      }}
    />
  );
}
