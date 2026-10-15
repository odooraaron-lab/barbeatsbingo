"use client";

import { useActionState } from "react";
import { sendEnquiry, type ContactState } from "./actions";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(sendEnquiry, initial);

  if (state.status === "sent") {
    return (
      <div className="alert alert-ok text-lg" role="status">
        <p className="font-bold">Thanks, your message is on its way.</p>
        <p className="mt-1">We&apos;ll get back to you as soon as we can.</p>
      </div>
    );
  }

  const f = state.fields ?? {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.status === "error" && (
        <p className="alert alert-error" role="alert">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input id="name" name="name" className="field" autoComplete="name" defaultValue={f.name} />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Phone number
          </label>
          <input id="phone" name="phone" type="tel" className="field" autoComplete="tel" defaultValue={f.phone} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email <span className="text-red-bright">(required)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="field"
          autoComplete="email"
          defaultValue={f.email}
        />
      </div>
      <div>
        <label htmlFor="message" className="label">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className="field"
          placeholder="Tell us about your venue or event"
          defaultValue={f.message}
        />
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <button type="submit" className="btn btn-red" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
