import type { Level } from "@boss/shared/domain/authz";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../api";

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
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (inviteId: string) =>
      trpc.users.invite.revoke.mutate({ inviteId }),
    onSuccess: invalidate,
  });
}

export function useResendInvite() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (inviteId: string) =>
      trpc.users.invite.resend.mutate({ inviteId }),
    onSuccess: invalidate,
  });
}

export function useDisableUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (userId: string) => trpc.users.disable.mutate({ userId }),
    onSuccess: invalidate,
  });
}

export function useEnableUser() {
  const invalidate = useUsersInvalidation();
  return useMutation({
    mutationFn: (userId: string) => trpc.users.enable.mutate({ userId }),
    onSuccess: invalidate,
  });
}
