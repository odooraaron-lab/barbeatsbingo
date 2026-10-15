// Copies pdf.js's worker into public/ so the track list viewer can load it.
// Runs before dev and build, so it always matches the installed pdf.js version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("pdfjs-dist/package.json"));
mkdirSync("public/pdfjs", { recursive: true });
copyFileSync(join(pkgDir, "legacy/build/pdf.worker.min.mjs"), "public/pdfjs/pdf.worker.min.mjs");
console.log("[pdf] worker copied to public/pdfjs");
