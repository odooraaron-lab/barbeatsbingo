"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Download, FileUp, Loader2, RotateCcw, X } from "lucide-react";
import { linkProblem, slugify } from "@/lib/format";
import { SHOW_SLOTS } from "@/lib/show-files";
import { IMPORT_COLUMNS, TEMPLATE_CSV, parseImportSheet, type ImportRow } from "@/lib/sheet";
import { importShows, type ImportResult } from "./actions";

const BATCH = 5;

type Checked = ImportRow & { problems: string[]; isNewCategory: boolean; isNewShow: boolean };

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bar-beats-bingo-shows.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase() || slugify(a) === slugify(b);

export function ImportTool({ existing }: { existing: Record<string, string[]> }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [createCategories, setCreateCategories] = useState(true);
  const [publishNew, setPublishNew] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const sheet = useMemo(() => parseImportSheet(text), [text]);
  const checked: Checked[] = useMemo(() => {
    const categoryNames = Object.keys(existing);
    return sheet.rows.map((row) => {
      const problems: string[] = [];
      if (!row.category) problems.push("No category");
      if (!row.show) problems.push("No show name");
      for (const slot of SHOW_SLOTS) {
        const url = row.links[slot.key];
        const problem = url ? linkProblem(url) : null;
        if (problem) problems.push(`${slot.label}: ${problem}`);
      }
      const category = categoryNames.find((c) => same(c, row.category));
      const isNewCategory = !!row.category && !category;
      const isNewShow = !category || !existing[category].some((s) => same(s, row.show));
      if (isNewCategory && !createCategories) problems.push(`No category called "${row.category}"`);
      return { ...row, problems, isNewCategory, isNewShow };
    });
  }, [sheet, existing, createCategories]);

  const ready = checked.filter((r) => r.problems.length === 0);
  const newCategories = [...new Set(ready.filter((r) => r.isNewCategory).map((r) => r.category))];
  const resultByLine = new Map(results.map((r) => [r.line, r]));
  const failedLines = results.filter((r) => r.status === "error").map((r) => r.line);

  async function run(rows: ImportRow[]) {
    setRunning(true);
    setTotal(rows.length);
    setDone(0);
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      let out: ImportResult[];
      try {
        out = await importShows(batch, { createCategories, publishNew });
      } catch {
        out = batch.map((r) => ({
          line: r.line,
          status: "error" as const,
          label: `${r.category} › ${r.show}`,
          message: "Couldn't reach the website. Check your connection and retry.",
          warnings: [],
        }));
      }
      setResults((prev) => [...prev.filter((p) => !out.some((o) => o.line === p.line)), ...out].sort((a, b) => a.line - b.line));
      setDone((d) => d + batch.length);
    }
    setRunning(false);
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setResults([]);
    setText(await file.text());
  };

  const counts = {
    created: results.filter((r) => r.status === "created").length,
    updated: results.filter((r) => r.status === "updated").length,
    failed: failedLines.length,
    warned: results.filter((r) => r.status !== "error" && r.warnings.length).length,
  };

  return (
    <div className="grid gap-6">
      <section className="panel p-6 sm:p-7" aria-labelledby="step1">
        <h2 id="step1" className="font-sans text-lg font-bold">
          1. Fill in the template
        </h2>
        <p className="mt-1 text-sm text-mist">
          One row per show. Use the same category names as your library (new ones can be created). Paste each
          file&apos;s WorkDrive external share link (with downloads allowed). Leave a cell blank to skip it.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {IMPORT_COLUMNS.map((c) => (
            <li key={c.field} className="rounded-full border border-line px-3 py-1 text-mist">
              {c.heading}
              {(c.field === "description" || c.field === "visible") && <span className="text-fog"> (optional)</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-fog">
          Visible: yes or no. Blank keeps an existing show as it is; new shows follow the option below.
        </p>
        <button type="button" onClick={downloadTemplate} className="btn btn-ghost mt-5">
          <Download size={18} aria-hidden /> Download the template (CSV)
        </button>
      </section>

      <section className="panel p-6 sm:p-7" aria-labelledby="step2">
        <h2 id="step2" className="font-sans text-lg font-bold">
          2. Add your sheet
        </h2>
        <p className="mt-1 text-sm text-mist">
          Save it as CSV and choose the file, or copy the rows straight out of Excel or Google Sheets and paste them
          below.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            id="sheet-file"
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <label htmlFor="sheet-file" className="btn btn-red cursor-pointer">
            <FileUp size={18} aria-hidden /> Choose a CSV file
          </label>
          {fileName && <span className="text-sm text-mist">{fileName}</span>}
        </div>
        <label htmlFor="sheet-text" className="label mt-6">
          Or paste rows here
        </label>
        <textarea
          id="sheet-text"
          className="field min-h-40 font-mono text-sm"
          placeholder={IMPORT_COLUMNS.map((c) => c.heading).join("\t")}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName("");
            setResults([]);
          }}
        />
        {sheet.unknownHeadings.length > 0 && (
          <p className="hint">Ignoring columns we don&apos;t use: {sheet.unknownHeadings.join(", ")}.</p>
        )}
      </section>

      {checked.length > 0 && (
        <section className="panel p-6 sm:p-7" aria-labelledby="step3">
          <h2 id="step3" className="font-sans text-lg font-bold">
            3. Check and import
          </h2>
          <p className="mt-1 text-mist">
            {plural(checked.length, "row", "rows")}: {plural(ready.filter((r) => r.isNewShow).length, "new show", "new shows")}{" "}
            and {plural(ready.filter((r) => !r.isNewShow).length, "update", "updates")}
            {newCategories.length > 0 && <>, new categories: {newCategories.join(", ")}</>}.
            {checked.length - ready.length > 0 && (
              <span className="text-sun"> {checked.length - ready.length} with problems will be skipped.</span>
            )}
          </p>

          <div className="mt-4 grid gap-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={createCategories} onChange={(e) => setCreateCategories(e.target.checked)} />
              Create categories that don&apos;t exist yet
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={publishNew} onChange={(e) => setPublishNew(e.target.checked)} />
              Make new shows visible to customers straight away (when the Visible column is blank)
            </label>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Category</th>
                  <th>Show</th>
                  <th>Links</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {checked.map((r) => {
                  const result = resultByLine.get(r.line);
                  return (
                    <tr key={r.line} className="align-top">
                      <td className="text-fog">{r.line}</td>
                      <td>
                        {r.category || <span className="text-fog">–</span>}
                        {r.isNewCategory && r.category && <span className="tag ml-2">New</span>}
                      </td>
                      <td>{r.show || <span className="text-fog">–</span>}</td>
                      <td>
                        <span className="flex gap-1" aria-label={`${Object.values(r.links).filter(Boolean).length} of 4 links`}>
                          {SHOW_SLOTS.map((slot) => (
                            <span
                              key={slot.key}
                              title={`${slot.label}: ${r.links[slot.key] ? "yes" : "blank"}`}
                              className={`h-2.5 w-2.5 rounded-full ${r.links[slot.key] ? "bg-ok" : "bg-white/15"}`}
                            />
                          ))}
                        </span>
                      </td>
                      <td className="min-w-56">
                        {result ? (
                          <span className="grid gap-1">
                            <span
                              className={`flex items-center gap-1.5 font-semibold ${result.status === "error" ? "text-red-bright" : "text-ok"}`}
                            >
                              {result.status === "error" ? <X size={15} aria-hidden /> : <Check size={15} aria-hidden />}
                              {result.status === "created" ? "Added" : result.status === "updated" ? "Updated" : "Failed"}
                              {result.showId && (
                                <Link href={`/admin/library/playlist/${result.showId}`} className="font-normal text-mist underline">
                                  open
                                </Link>
                              )}
                            </span>
                            {result.message && <span className="whitespace-pre-line text-sm text-mist">{result.message}</span>}
                            {result.warnings.map((w) => (
                              <span key={w} className="flex gap-1.5 text-sm text-sun">
                                <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" /> {w}
                              </span>
                            ))}
                          </span>
                        ) : r.problems.length ? (
                          <span className="grid gap-1 text-sm text-sun">
                            {r.problems.map((p) => (
                              <span key={p}>{p}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-mist">{r.isNewShow ? "New show" : "Update"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-red" disabled={running || ready.length === 0} onClick={() => run(ready)}>
              {running ? <Loader2 size={18} aria-hidden className="animate-spin" /> : <FileUp size={18} aria-hidden />}
              {running ? `Importing… ${done} of ${total}` : `Import ${ready.length} ${ready.length === 1 ? "show" : "shows"}`}
            </button>
            {!running && failedLines.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => run(ready.filter((r) => failedLines.includes(r.line)))}
              >
                <RotateCcw size={16} aria-hidden /> Retry {failedLines.length} failed
              </button>
            )}
          </div>
          {running && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
              <div className="h-full bg-red transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          )}
          {!running && results.length > 0 && (
            <p className="alert alert-ok mt-5" role="status">
              Done: {counts.created} added, {counts.updated} updated
              {counts.failed > 0 && `, ${counts.failed} failed`}
              {counts.warned > 0 && `, ${counts.warned} with warnings to look at`}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
