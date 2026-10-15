"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});

  return (
    <form action={action} className="grid gap-5" key={state.ok}>
      {state.error && (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert alert-ok" role="status">
          {state.ok}
        </p>
      )}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <div>
        <label htmlFor="current" className="label">
          Current password
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="field" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="label">
            New password
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="field" />
          <p className="hint">At least 10 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="label">
            Type it again
          </label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className="field" />
        </div>
      </div>
      <div>
        <button type="submit" className="btn btn-red" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
