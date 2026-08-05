export interface VenueMembership {
  venueId: string;
  from: Date;
  to: Date | null;
}

// Validity window is [from, to): from inclusive, to exclusive;
// to === null means open-ended.
export function inVenue(
  memberships: readonly VenueMembership[],
  venueId: string,
  now: Date,
): boolean {
  return memberships.some(
    (membership) =>
      membership.venueId === venueId &&
      membership.from.getTime() <= now.getTime() &&
      (membership.to === null || now.getTime() < membership.to.getTime()),
  );
}
