"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  /** Clear the inputs after a successful save (for "add" forms). */
  resetOnSuccess?: boolean;
  /** Ask before submitting, e.g. for deletes. */
  confirm?: string;
  footer?: React.ReactNode;
};

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  className = "grid gap-5",
  submitClassName = "btn btn-red",
  resetOnSuccess = false,
  confirm,
  footer,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});

  return (
    <form
      action={formAction}
      className={className}
      key={resetOnSuccess ? state.at : undefined}
      onSubmit={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}
    >
      {state.error && (
        <p className="alert alert-error whitespace-pre-line" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert alert-ok" role="status">
          {state.ok}
        </p>
      )}
      {state.warning && (
        <p className="alert alert-info whitespace-pre-line" role="status">
          {state.warning}
        </p>
      )}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={submitClassName} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
