// Query keys are factories, never ad-hoc arrays: every query, invalidation
// and the realtime hub share one spelling by construction.
export const venueKeys = {
  root: ["venues"] as const,
  list: () => [...venueKeys.root, "list"] as const,
  members: (venueId: string | undefined) =>
    [...venueKeys.root, "members", venueId] as const,
  // The assignable people are portal users read through the shared server
  // surface; the key stays under the "users" address so a future users
  // channel invalidates it by prefix, without a cross-slice import.
  assignableUsers: () => ["users", "assignable"] as const,
};
