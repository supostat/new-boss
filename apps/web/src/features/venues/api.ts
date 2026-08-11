import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../api";
import { toast } from "../../ui/toast";

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () => trpc.venues.list.query(),
  });
}

export function useVenueMembers(venueId: string | undefined) {
  return useQuery({
    enabled: venueId !== undefined,
    queryKey: ["venues", "members", venueId],
    queryFn: () => {
      if (venueId === undefined) {
        throw new Error("members query ran without a venue");
      }
      return trpc.venues.members.list.query({ venueId });
    },
  });
}

// The assignable people are portal users; the venues slice reads them through
// the shared server surface, never through another slice's files.
export function useAssignableUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => trpc.users.list.query(),
  });
}

function useVenuesInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["venues"] });
  };
}

// A name outcome is field-bound: name_taken lands at the field and never
// doubles as a toast — one channel per outcome.
export interface VenueNameHandlers {
  onNameTaken: (message: string) => void;
  onSaved: () => void;
}

export function useCreateVenue(handlers: VenueNameHandlers) {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (name: string) => trpc.venues.create.mutate({ name }),
    onSuccess: async (outcome) => {
      if (!outcome.ok) {
        switch (outcome.error) {
          case "name_taken":
            handlers.onNameTaken("A venue with this name already exists");
            return;
          default:
            return outcome.error satisfies never;
        }
      }
      toast.success("Venue created");
      await invalidate();
      handlers.onSaved();
    },
    onError: () => {
      toast.error("Could not create the venue");
    },
  });
}

export function useRenameVenue(handlers: VenueNameHandlers) {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (input: { venueId: string; name: string }) =>
      trpc.venues.rename.mutate(input),
    onSuccess: async (outcome) => {
      if (!outcome.ok) {
        switch (outcome.error) {
          case "name_taken":
            handlers.onNameTaken("A venue with this name already exists");
            return;
          default:
            return outcome.error satisfies never;
        }
      }
      toast.success("Venue renamed");
      await invalidate();
      handlers.onSaved();
    },
    onError: () => {
      toast.error("Could not rename the venue");
    },
  });
}

export function useArchiveVenue() {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (venueId: string) => trpc.venues.archive.mutate({ venueId }),
    onSuccess: async () => {
      toast.success("Venue archived");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not archive the venue");
    },
  });
}

export function useRestoreVenue() {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (venueId: string) => trpc.venues.restore.mutate({ venueId }),
    onSuccess: async () => {
      toast.success("Venue restored");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not restore the venue");
    },
  });
}

export function useAssignMembership() {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (input: {
      venueId: string;
      userId: string;
      from: Date;
      to: Date | null;
    }) => trpc.venues.members.assign.mutate(input),
    onSuccess: async () => {
      toast.success("Member assigned");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not assign the member");
    },
  });
}

export function useCloseMembership() {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (input: { membershipId: string; to: Date }) =>
      trpc.venues.members.close.mutate(input),
    onSuccess: async () => {
      toast.success("Membership window closed");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not close the membership window");
    },
  });
}

export function useRemoveMembership() {
  const invalidate = useVenuesInvalidation();
  return useMutation({
    mutationFn: (membershipId: string) =>
      trpc.venues.members.remove.mutate({ membershipId }),
    onSuccess: async () => {
      toast.success("Membership removed");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not remove the membership");
    },
  });
}
