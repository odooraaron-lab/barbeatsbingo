// pdf.js ships no types for its worker module; we only hand it back to pdf.js.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
