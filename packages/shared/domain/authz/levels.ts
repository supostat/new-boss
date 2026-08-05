// Ordered junior → senior; the tuple's shape holds the full five-level range.
export const LEVELS = ["manager", "admin"] as const;

export type Level = (typeof LEVELS)[number];

export function atLeast(actual: Level, required: Level): boolean {
  return LEVELS.indexOf(actual) >= LEVELS.indexOf(required);
}
