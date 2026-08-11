// Query keys are factories, never ad-hoc arrays: every query, invalidation
// and the realtime hub share one spelling by construction.
export const userKeys = {
  root: ["users"] as const,
  list: () => [...userKeys.root, "list"] as const,
  invites: () => [...userKeys.root, "invites"] as const,
};
