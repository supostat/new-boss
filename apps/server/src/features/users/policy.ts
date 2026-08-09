import type { Level } from "@boss/shared/domain/authz";
import { atLeast } from "@boss/shared/domain/authz";

// Portal users are management matter: only admins hand out access.
export function canInviteUsers(level: Level): boolean {
  return atLeast(level, "admin");
}

// Locking someone out is an admin act, and never a self-inflicted one:
// the last admin must not be able to lock the fleet out of the portal.
export function canDisableUser(
  actorLevel: Level,
  actorId: string,
  targetId: string,
): boolean {
  return atLeast(actorLevel, "admin") && actorId !== targetId;
}
