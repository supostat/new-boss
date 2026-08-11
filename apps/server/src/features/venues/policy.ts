import type { Level } from "@boss/shared/domain/authz";
import { atLeast } from "@boss/shared/domain/authz";

// Venues are fleet infrastructure: only admins open, rename, archive them
// and shape who belongs where.
export function canManageVenues(level: Level): boolean {
  return atLeast(level, "admin");
}
