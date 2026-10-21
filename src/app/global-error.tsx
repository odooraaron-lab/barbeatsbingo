"use client";

/** Last resort, when even the site's layout fails: plain, self-contained, on-brand colours. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-NZ">
      <body style={{ margin: 0, background: "#141818", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <title>Something went wrong | Bar Beats Bingo</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "18vh 24px" }}>
          <h1 style={{ fontSize: 40, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#b5bebd", fontSize: 18, lineHeight: 1.5 }}>
            Sorry, Bar Beats Bingo didn&apos;t load properly. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#d42f3c", color: "#fff", border: 0, borderRadius: 10, padding: "12px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
