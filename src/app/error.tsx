"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

/** Shown when a page fails to load, instead of a blank or technical error screen. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const ref = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <div className="wrap flex min-h-[70dvh] flex-col items-start justify-center py-16">
      <Logo className="w-[150px]" />
      <h1 className="mt-10 text-[clamp(2.4rem,6vw,4rem)]">Something went wrong</h1>
      <p className="mt-4 max-w-md text-lg text-mist">
        Sorry, this page didn&apos;t load properly. Try again in a moment. If it keeps happening, let us know.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-red">
          Try again
        </button>
        <Link href="/contact-us" className="btn btn-ghost">
          Contact us
        </Link>
      </div>
      {ref && <p className="mt-6 text-sm text-fog">Reference: {ref}</p>}
    </div>
  );
}
