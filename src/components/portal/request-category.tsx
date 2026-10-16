"use client";

import { useActionState } from "react";
import { Check, Send } from "lucide-react";
import { requestCategory, type RequestState } from "@/app/portal/actions";

/** One-tap "add this to my plan" request for a locked category. */
export function RequestCategory({ categoryId, label }: { categoryId: string; label: string }) {
  const [state, action, pending] = useActionState<RequestState>(requestCategory.bind(null, categoryId), {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <p className="alert alert-ok flex items-center gap-2" role="status">
        <Check size={18} aria-hidden /> Request sent. We&apos;ll be in touch to add it.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      {state.status === "error" && (
        <p className="alert alert-error" role="alert">
          {state.message}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-red" disabled={pending}>
          <Send size={17} aria-hidden /> {pending ? "Sending…" : label}
        </button>
      </div>
    </form>
  );
}
