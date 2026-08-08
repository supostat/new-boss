import type { Level } from "@boss/shared/domain/authz";
import { atLeast } from "@boss/shared/domain/authz";

// Portal users are management matter: only admins hand out access.
export function canInviteUsers(level: Level): boolean {
  return atLeast(level, "admin");
}
