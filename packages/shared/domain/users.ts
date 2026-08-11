import type { Level } from "./authz";
import { atLeast } from "./authz";

// Portal users are management matter: only admins see and shape the registry.
// Lives in shared so the web shell can run the same function the server
// procedures gate on.
export function canManageUsers(level: Level): boolean {
  return atLeast(level, "admin");
}
