"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

type Status = "loading" | "ready" | "error";

/**
 * Draws a PDF onto the page, one canvas per page, so the track list sits in
 * the layout on every device (phones don't show PDFs inside pages reliably).
 */
export function TrackListViewer({ src, downloadHref, title }: { src: string; downloadHref: string; title: string }) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pageText, setPageText] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs?v=${pdfjs.version}`;
        const task = pdfjs.getDocument({ url: src });
        destroy = () => void task.destroy();
        const doc = await task.promise;

        const container = pagesRef.current;
        if (!container || cancelled) return;
        container.replaceChildren();
        const width = container.clientWidth || 800;
        const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
        const texts: string[] = [];

        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "block h-auto w-full rounded-lg bg-white shadow-lg shadow-black/30";
          canvas.setAttribute("aria-hidden", "true");
          container.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;

          const content = await page.getTextContent();
          texts.push(
            content.items
              .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
              .join("")
              .replace(/[ \t]+\n/g, "\n")
              .trim(),
          );
          if (n === 1 && !cancelled) setStatus("ready");
        }
        if (!cancelled) setPageText(texts);
      } catch (err) {
        if (!cancelled) {
          console.error("Track list could not be shown", err);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src]);

  return (
    <div>
      {status === "loading" && (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-line text-mist" role="status">
          Loading the track list…
        </div>
      )}
      {status === "error" && (
        <div className="alert alert-info flex flex-wrap items-center justify-between gap-3" role="status">
          <span>The track list can&apos;t be shown here right now, but you can still download it.</span>
          <a href={downloadHref} className="btn btn-sun btn-sm">
            <Download size={16} aria-hidden /> Download track list
          </a>
        </div>
      )}
      <div ref={pagesRef} className={`grid gap-4 ${status === "error" ? "hidden" : ""}`} />
      {pageText.length > 0 && (
        <div className="sr-only">
          <h3>{title}, as text</h3>
          {pageText.map((t, i) => (
            <p key={i} className="whitespace-pre-line">
              {t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
