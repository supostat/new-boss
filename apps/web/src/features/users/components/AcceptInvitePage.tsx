import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "../../../api";
import { signIn } from "../../../session";

type AcceptFailure = "invalid" | "expired" | "already-accepted" | "unknown";

const failureText: Record<AcceptFailure, string> = {
  invalid: "This invite link is not valid. Ask your admin to send a new one.",
  expired: "This invite has expired. Ask your admin to resend it.",
  "already-accepted":
    "This invite was already used. Sign in with your password instead.",
  unknown: "Something went wrong accepting the invite. Try again.",
};

function failureFrom(message: string): AcceptFailure {
  const match = /invite (invalid|expired|already-accepted)/.exec(message);
  return (match?.[1] as AcceptFailure | undefined) ?? "unknown";
}

// Public by construction: the invited person has no session yet, so this
// page lives outside the session guard.
export function AcceptInvitePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/accept-invite" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<AcceptFailure | null>(
    search.token == null ? "invalid" : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (search.token == null) {
      return;
    }
    setSubmitting(true);
    try {
      const accepted = await trpc.users.invite.accept.mutate({
        token: search.token,
        password,
        name,
      });
      await signIn(accepted.email, password);
      await navigate({ to: "/" });
    } catch (error) {
      setFailure(failureFrom(error instanceof Error ? error.message : ""));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="h-1 bg-brand" />
      <div className="mx-auto mt-[9vh] max-w-[400px] px-4">
        <h1 className="mb-1 font-display text-2xl font-bold">boss</h1>
        <p className="mb-5 text-sm text-muted">You have been invited.</p>
        <div className="rounded-base border border-line bg-surface p-5">
          {failure !== null ? (
            <div>
              <p role="alert" className="mb-4 text-sm text-danger">
                {failureText[failure]}
              </p>
              <a href="/login" className="text-sm text-brand hover:underline">
                Go to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label
                htmlFor="accept-name"
                className="mb-1 block text-xs font-medium text-muted"
              >
                Your name
              </label>
              <input
                id="accept-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mb-3 w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
              <label
                htmlFor="accept-password"
                className="mb-1 block text-xs font-medium text-muted"
              >
                Choose a password
              </label>
              <input
                id="accept-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mb-4 w-full rounded-base border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-base bg-brand py-2 text-[13px] font-semibold text-surface hover:opacity-90 disabled:opacity-60"
              >
                Accept invite
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
