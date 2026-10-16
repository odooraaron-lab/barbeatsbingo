"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import type { PageViewport, PDFDocumentProxy } from "pdfjs-dist";
import { formatClock, parseCallList, songAt, type PdfTextItem, type PlacedSong } from "@/lib/call-list";
import { useShowSession } from "./show-session";

type Status = "loading" | "ready" | "error";
type PageSize = { width: number; height: number };
/** A song's spot on its page, as percentages so it scales with the page. */
type Spot = PlacedSong & { left: number; top: number; width: number; height: number };

/**
 * Draws the track list PDF onto the page, one canvas per page, so it sits in the
 * layout on every device (phones don't show PDFs inside pages reliably).
 *
 * When it's a call list with times, the song that's playing lights up as the player
 * plays, and tapping a song jumps the show there.
 */
export function TrackListViewer({ src, downloadHref, title }: { src: string; downloadHref: string; title: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pages, setPages] = useState<PageSize[]>([]);
  const [pageText, setPageText] = useState<string[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const session = useShowSession();
  const offerCallList = session?.offerCallList;

  // Load the PDF and read its text.
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
        if (cancelled) return;
        docRef.current = doc;

        const sizes: PageSize[] = [];
        const items: PdfTextItem[][] = [];
        const texts: string[] = [];
        const viewports: PageViewport[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1 });
          viewports.push(viewport);
          sizes.push({ width: viewport.width, height: viewport.height });
          const content = await page.getTextContent();
          const pageItems = content.items.flatMap((item) =>
            "str" in item ? [{ str: item.str, transform: item.transform, width: item.width, height: item.height }] : [],
          );
          items.push(pageItems);
          texts.push(
            content.items
              .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
              .join("")
              .replace(/[ \t]+\n/g, "\n")
              .trim(),
          );
        }
        if (cancelled) return;

        const parsed = parseCallList(items);
        if (parsed) {
          offerCallList?.(parsed.list);
          setSpots(
            parsed.placed.map((song) => {
              const vp = viewports[song.page - 1];
              const [ax, ay] = vp.convertToViewportPoint(song.box[0], song.box[1]) as number[];
              const [bx, by] = vp.convertToViewportPoint(song.box[2], song.box[3]) as number[];
              const left = Math.max(0, Math.min(ax, bx));
              const top = Math.max(0, Math.min(ay, by));
              return {
                ...song,
                left: (left / vp.width) * 100,
                top: (top / vp.height) * 100,
                width: (Math.min(vp.width, Math.max(ax, bx)) - left) / vp.width * 100,
                height: (Math.min(vp.height, Math.max(ay, by)) - top) / vp.height * 100,
              };
            }),
          );
        }
        setPageText(texts);
        setPages(sizes);
      } catch (err) {
        if (!cancelled) {
          console.error("Track list could not be shown", err);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
      destroy?.();
    };
  }, [src, offerCallList]);

  // Draw each page once its canvas is on the page.
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || !pages.length) return;
    let cancelled = false;
    (async () => {
      try {
        const width = wrapRef.current?.clientWidth || 800;
        const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
        for (let n = 1; n <= pages.length; n++) {
          const canvas = canvasRefs.current[n - 1];
          if (!canvas || cancelled) return;
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: (width / pages[n - 1].width) * ratio });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvas, viewport }).promise;
          if (n === 1 && !cancelled) setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Track list could not be drawn", err);
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pages]);

  const songs = session?.callList?.songs ?? null;
  const current = songs && spots.length ? songAt(songs, session?.time ?? 0) : -1;
  const currentN = current >= 0 && songs ? songs[current].n : 0;
  const interactive = spots.length > 0 && !!session;

  return (
    <div ref={wrapRef}>
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
      {interactive && status === "ready" && (
        <p className="mb-3 text-sm text-mist">
          The song that&apos;s playing lights up. Tap a song to jump there.
        </p>
      )}
      <div className={`grid gap-4 ${status === "ready" ? "" : "h-0 overflow-hidden"}`}>
        {pages.map((size, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg bg-white shadow-lg shadow-black/30"
            style={{ aspectRatio: `${size.width} / ${size.height}` }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              aria-hidden
              className="block h-full w-full"
            />
            {interactive &&
              spots
                .filter((s) => s.page === i + 1)
                .map((s) => {
                  const isCurrent = s.n === currentN;
                  const played = currentN > 0 && s.n < currentN;
                  return (
                    <button
                      key={s.n}
                      type="button"
                      onClick={() => session.seekTo(s.time)}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`Song ${s.n}, ${s.letter}: ${s.title}, at ${formatClock(s.time)}${isCurrent ? ", playing now" : ""}. Jump here.`}
                      className={`absolute rounded-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sun ${
                        isCurrent
                          ? "bg-red/25 ring-2 ring-red"
                          : played
                            ? "bg-red/[0.07] hover:bg-sun/25"
                            : "hover:bg-sun/25"
                      }`}
                      style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.width}%`, height: `${s.height}%` }}
                    />
                  );
                })}
          </div>
        ))}
      </div>
      {pageText.length > 0 && !interactive && (
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
