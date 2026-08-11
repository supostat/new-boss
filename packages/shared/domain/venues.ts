import type { Level } from "./authz";
import { atLeast } from "./authz";

// Venues are fleet infrastructure: only admins open, rename, archive them
// and shape who belongs where. Lives in shared so the web shell can run the
// same function the server procedures gate on.
export function canManageVenues(level: Level): boolean {
  return atLeast(level, "admin");
}
