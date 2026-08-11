// Overlay widths are words, never numbers at a call site. The canonical
// trio lives in exactly one place — this Record; a fourth size is a type
// change, not a prop.
export type OverlaySize = "confirm" | "form" | "wide";

export const overlayWidth: Record<OverlaySize, string> = {
  confirm: "max-w-[400px]",
  form: "max-w-[560px]",
  wide: "max-w-[720px]",
};

// The drawer has exactly one width; a configurable drawer is two overlays.
export const drawerWidth = "w-[480px]";
