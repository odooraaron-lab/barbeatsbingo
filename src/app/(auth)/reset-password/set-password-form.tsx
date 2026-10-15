"use client";

import { useActionState } from "react";
import { setPasswordFromToken, type FormState } from "../actions";

export function SetPasswordForm({ token, email, submitLabel }: { token: string; email: string; submitLabel: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordFromToken, {});

  return (
    <form action={action} className="grid gap-5">
      {state.error && (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      )}
      <input type="hidden" name="token" value={token} />
      {/* Helps password managers save the right username. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="field" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className="field" />
      </div>
      <button type="submit" className="btn btn-red w-full" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
