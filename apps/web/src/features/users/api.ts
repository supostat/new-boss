import type { Level } from "@boss/shared/domain/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../api";
import { toast } from "../../ui/toast";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => trpc.users.list.query(),
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: () => trpc.users.invite.list.query(),
  });
}

function useUsersInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await queryClient.invalidateQueries({ queryKey: ["invites"] });
  };
}

export function useInviteUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (input: { email: string; level: Level }) =>
      trpc.users.invite.create.mutate(input),
    onSuccess: async () => {
      toast.success("Invite sent");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not send the invite");
    },
  });
}

export function useRevokeInvite() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (inviteId: string) =>
      trpc.users.invite.revoke.mutate({ inviteId }),
    onSuccess: async () => {
      toast.success("Invite revoked");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not revoke the invite");
    },
  });
}

export function useResendInvite() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (inviteId: string) =>
      toast.pending(trpc.users.invite.resend.mutate({ inviteId }), {
        pending: "Resending invite",
        success: "Invite resent",
        error: "Could not resend the invite",
      }),
    onSuccess: invalidate,
  });
}

export function useDisableUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (userId: string) => trpc.users.disable.mutate({ userId }),
    onSuccess: async () => {
      toast.success("User disabled");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not disable the user");
    },
  });
}

export function useEnableUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (userId: string) => trpc.users.enable.mutate({ userId }),
    onSuccess: async () => {
      toast.success("User enabled");
      await invalidate();
    },
    onError: () => {
      toast.error("Could not enable the user");
    },
  });
}
