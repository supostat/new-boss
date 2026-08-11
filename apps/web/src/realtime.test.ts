import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { userKeys } from "./features/users/keys";
import { venueKeys } from "./features/venues/keys";
import {
  applyChangeEvent,
  invalidateOnReconnect,
  invalidationKeysFor,
} from "./realtime";

function seededClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(venueKeys.list(), []);
  queryClient.setQueryData(venueKeys.members("v-1"), []);
  queryClient.setQueryData(venueKeys.members("v-2"), []);
  queryClient.setQueryData(userKeys.list(), []);
  return queryClient;
}

function isInvalidated(queryClient: QueryClient, queryKey: unknown[]): boolean {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

describe("invalidationKeysFor", () => {
  it("maps venues to the venues root", () => {
    expect(invalidationKeysFor({ channel: "venues" })).toEqual([
      venueKeys.root,
    ]);
  });

  it("maps venue_members to exactly that venue's members key", () => {
    expect(
      invalidationKeysFor({ channel: "venue_members", venueId: "v-1" }),
    ).toEqual([venueKeys.members("v-1")]);
  });
});

describe("applyChangeEvent", () => {
  it("a venues event invalidates the whole venues root and nothing else", async () => {
    const queryClient = seededClient();
    await applyChangeEvent(queryClient, { channel: "venues" });
    expect(isInvalidated(queryClient, [...venueKeys.list()])).toBe(true);
    expect(isInvalidated(queryClient, [...venueKeys.members("v-1")])).toBe(
      true,
    );
    expect(isInvalidated(queryClient, [...userKeys.list()])).toBe(false);
  });

  it("a venue_members event invalidates one venue's members, not the world", async () => {
    const queryClient = seededClient();
    await applyChangeEvent(queryClient, {
      channel: "venue_members",
      venueId: "v-1",
    });
    expect(isInvalidated(queryClient, [...venueKeys.members("v-1")])).toBe(
      true,
    );
    expect(isInvalidated(queryClient, [...venueKeys.members("v-2")])).toBe(
      false,
    );
    expect(isInvalidated(queryClient, [...venueKeys.list()])).toBe(false);
    expect(isInvalidated(queryClient, [...userKeys.list()])).toBe(false);
  });
});

describe("invalidateOnReconnect", () => {
  it("re-reads every root the hub knows", async () => {
    const queryClient = seededClient();
    await invalidateOnReconnect(queryClient);
    expect(isInvalidated(queryClient, [...venueKeys.list()])).toBe(true);
    expect(isInvalidated(queryClient, [...venueKeys.members("v-1")])).toBe(
      true,
    );
    expect(isInvalidated(queryClient, [...userKeys.list()])).toBe(true);
  });
});
