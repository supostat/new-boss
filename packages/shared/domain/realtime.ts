// A change event carries only the ADDRESS of a change — a data field does
// not exist by type; the client re-reads truth through its typed queries.
export type ChangeEvent =
  | { channel: "venues" }
  | { channel: "venue_members"; venueId: string };

export type ChangeChannel = ChangeEvent["channel"];
