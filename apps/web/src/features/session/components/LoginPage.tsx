import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "../../../session";

// Counter genre: a clerk's entrance — narrow panel, thin brand bar, mono
// labels and inputs. The mono inputs are a peculiarity of this page alone
// and never leak into application forms.
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rejected, setRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setRejected(false);
    const signedIn = await signIn(email, password);
    setSubmitting(false);
    if (signedIn) {
      await navigate({ to: "/" });
    } else {
      setRejected(true);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="h-1 bg-brand" />
      <div className="mx-auto mt-[9vh] max-w-[340px] px-4">
        <div className="mb-1 flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold">boss</h1>
          <div className="relative -top-1 flex w-[30px] flex-col gap-[2px]">
            <i className="h-[2.5px] bg-rota" />
            <i className="h-[2.5px] bg-clocked" />
            <i className="h-[2.5px] bg-amended" />
          </div>
        </div>
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Venues portal · Sign in
        </p>
        <div className="rounded-base border border-line bg-surface p-5">
          <form onSubmit={submit}>
            <label
              htmlFor="email"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.09em] text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mb-3 w-full rounded-base border border-line bg-surface px-2.5 py-2 font-mono text-xs text-ink transition-colors focus:border-brand focus:outline-none"
            />
            <label
              htmlFor="password"
              className="mb-1 block font-mono text-[10px] uppercase tracking-[0.09em] text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mb-3 w-full rounded-base border border-line bg-surface px-2.5 py-2 font-mono text-xs text-ink transition-colors focus:border-brand focus:outline-none"
            />
            {rejected ? (
              <p role="alert" className="mb-3 text-xs text-danger">
                Wrong email or password.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-base bg-brand py-2 text-[13px] font-semibold text-surface hover:opacity-90 focus-visible:outline-2 focus-visible:outline-amended disabled:opacity-60"
            >
              Sign in
            </button>
          </form>
          <div className="mt-3 text-[11.5px] text-muted">
            Access by invitation only
          </div>
        </div>
      </div>
    </div>
  );
}
