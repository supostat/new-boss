import type { ChangeEvent } from "@boss/shared/domain/realtime";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { userKeys } from "./features/users/keys";
import { venueKeys } from "./features/venues/keys";

// A channel maps to key factories and nothing else: the menu of
// invalidations is exhaustive over the event union — a new channel does not
// compile until it gets its line here.
const channelInvalidations: {
  [C in ChangeEvent["channel"]]: (
    event: Extract<ChangeEvent, { channel: C }>,
  ) => QueryKey[];
} = {
  venues: () => [venueKeys.root],
  venue_members: (event) => [venueKeys.members(event.venueId)],
};

export function invalidationKeysFor(event: ChangeEvent): QueryKey[] {
  if (event.channel === "venues") {
    return channelInvalidations.venues(event);
  }
  return channelInvalidations.venue_members(event);
}

// Every root the hub knows. A reconnect re-reads them all: events missed
// during the gap cannot be replayed — by design, the stream is dumb.
const knownRoots: QueryKey[] = [venueKeys.root, userKeys.root];

export async function applyChangeEvent(
  queryClient: QueryClient,
  event: ChangeEvent,
): Promise<void> {
  await Promise.all(
    invalidationKeysFor(event).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export async function invalidateOnReconnect(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    knownRoots.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

// The browser only auto-reconnects a stream that once opened; a refused
// stream (401 before sign-in, a restarting server) closes for good — so a
// closed source is re-created on a timer.
export const RECONNECT_DELAY_MS = 3000;

// One EventSource per app, mounted once.
export function startRealtime(queryClient: QueryClient): () => void {
  let activeStream: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let dropped = false;
  let stopped = false;

  function connect() {
    const stream = new EventSource("/api/events");
    activeStream = stream;
    stream.onmessage = (message) => {
      const event = JSON.parse(message.data) as ChangeEvent;
      void applyChangeEvent(queryClient, event);
    };
    stream.onerror = () => {
      dropped = true;
      if (stopped) {
        return;
      }
      if (stream.readyState === EventSource.CLOSED) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
    stream.onopen = () => {
      if (!dropped) {
        return;
      }
      dropped = false;
      void invalidateOnReconnect(queryClient);
    };
  }

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
    }
    activeStream?.close();
  };
}
