"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type FormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action} className="grid gap-5">
      {state.error && (
        <p className="alert alert-error" role="alert">
          {state.error}
        </p>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
          defaultValue={state.email}
          autoFocus
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="label">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-sun underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      <button type="submit" className="btn btn-red w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
