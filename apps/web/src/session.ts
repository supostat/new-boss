import type { Level } from "@boss/shared/domain/authz";
import { useQuery } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  level: Level;
}

interface SessionPayload {
  user: SessionUser;
}

// The session's query key factory: every consumer shares one spelling.
export const sessionKeys = {
  root: ["session"] as const,
};

export async function fetchSession(): Promise<SessionPayload | null> {
  const response = await fetch("/api/auth/get-session");
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as SessionPayload | null;
}

export function useSession() {
  return useQuery({ queryKey: sessionKeys.root, queryFn: fetchSession });
}

export async function signIn(
  email: string,
  password: string,
): Promise<boolean> {
  const response = await fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.ok;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
