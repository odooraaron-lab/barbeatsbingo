"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});

  if (state.ok) {
    return (
      <p className="alert alert-ok" role="status">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      {state.error && (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
          defaultValue={state.email}
        />
      </div>
      <button type="submit" className="btn btn-red w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
