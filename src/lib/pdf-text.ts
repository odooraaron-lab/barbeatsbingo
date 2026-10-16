import "server-only";
import type { PdfTextItem } from "./call-list";

/** Reads the text (with positions) from each page of a PDF, on the server. */
export async function pdfTextPages(data: Uint8Array, maxPages = 300): Promise<PdfTextItem[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Run pdf.js's worker in this process rather than loading it as a separate file.
  const g = globalThis as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

  const task = pdfjs.getDocument({ data, verbosity: 0, disableFontFace: true });
  try {
    const doc = await task.promise;
    const pages: PdfTextItem[][] = [];
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(
        content.items.flatMap((item) =>
          "str" in item ? [{ str: item.str, transform: item.transform, width: item.width, height: item.height }] : [],
        ),
      );
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
