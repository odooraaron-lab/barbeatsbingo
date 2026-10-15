"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/format";

type Item = {
  id: string;
  file: File;
  loaded: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

type StartResponse =
  | { mode: "single"; key: string; contentType: string; url: string }
  | { mode: "multipart"; key: string; contentType: string; uploadId: string; partSize: number; urls: string[] };

const PART_CONCURRENCY = 3;

async function api<T>(payload: unknown): Promise<T> {
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
  return json as T;
}

function put(url: string, body: Blob, contentType: string | null, onProgress: (loaded: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.getResponseHeader("ETag") ?? "")
        : reject(new Error(`Storage refused the upload (${xhr.status}). Check the bucket's CORS settings.`));
    xhr.onerror = () => reject(new Error("Network error. Check the bucket's CORS settings and your connection."));
    xhr.send(body);
  });
}

export function Uploader({ playlistId, enabled }: { playlistId: string; enabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [group, setGroup] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function uploadOne(item: Item, groupLabel: string) {
    const { file } = item;
    update(item.id, { status: "uploading", loaded: 0 });
    let started: StartResponse | null = null;
    try {
      started = await api<StartResponse>({
        action: "start",
        playlistId,
        fileName: file.name,
        size: file.size,
        contentType: file.type,
      });

      if (started.mode === "single") {
        await put(started.url, file, started.contentType, (loaded) => update(item.id, { loaded }));
        await api({ action: "complete", playlistId, key: started.key, fileName: file.name, size: file.size, contentType: file.type, groupLabel });
      } else {
        const { urls, partSize, key, uploadId } = started;
        const progress = new Array(urls.length).fill(0);
        const parts: { partNumber: number; etag: string }[] = [];
        let next = 0;
        const worker = async () => {
          while (next < urls.length) {
            const index = next++;
            const blob = file.slice(index * partSize, Math.min(file.size, (index + 1) * partSize));
            let etag = "";
            for (let attempt = 1; ; attempt++) {
              try {
                etag = await put(urls[index], blob, null, (loaded) => {
                  progress[index] = loaded;
                  update(item.id, { loaded: progress.reduce((a, b) => a + b, 0) });
                });
                break;
              } catch (err) {
                if (attempt >= 3) throw err;
                await new Promise((r) => setTimeout(r, 1500 * attempt));
              }
            }
            if (!etag) throw new Error("Storage didn't return an ETag. Add ETag to the bucket's CORS ExposeHeaders.");
            parts.push({ partNumber: index + 1, etag });
          }
        };
        await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, urls.length) }, worker));
        await api({ action: "complete", playlistId, key, uploadId, parts, fileName: file.name, size: file.size, contentType: file.type, groupLabel });
      }
      update(item.id, { status: "done", loaded: file.size });
    } catch (err) {
      if (started?.mode === "multipart") {
        api({ action: "abort", playlistId, key: started.key, uploadId: started.uploadId }).catch(() => {});
      }
      update(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const added: Item[] = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      loaded: 0,
      status: "waiting",
    }));
    setItems((prev) => [...prev.filter((i) => i.status !== "done"), ...added]);
    setBusy(true);
    const groupLabel = group.trim();
    for (const item of added) await uploadOne(item, groupLabel);
    setBusy(false);
    router.refresh();
  }

  if (!enabled) {
    return (
      <p className="alert alert-info">
        File uploads switch on once storage is set up (see the README). You can add Dropbox or Google Drive links below
        in the meantime.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="group" className="label">
          Group these files under (optional)
        </label>
        <input
          id="group"
          className="field"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="e.g. Round 1, or Printables"
          disabled={busy}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) addFiles(e.dataTransfer.files);
        }}
        className={`grid place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? "border-sun bg-sun/5" : "border-line"}`}
      >
        <UploadCloud size={36} aria-hidden className="text-mist" />
        <p className="mt-3 font-semibold">Drag files here</p>
        <p className="text-sm text-mist">Videos, audio, PDFs or zips. Big files are fine.</p>
        <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {items.map((it) => {
            const pct = it.file.size ? Math.round((it.loaded / it.file.size) * 100) : 0;
            return (
              <li key={it.id} className="rounded-xl border border-line bg-ink/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium">{it.file.name}</span>
                  <span className="shrink-0 text-sm text-mist">
                    {it.status === "done"
                      ? "Uploaded"
                      : it.status === "error"
                        ? "Failed"
                        : it.status === "waiting"
                          ? `Waiting · ${formatBytes(it.file.size)}`
                          : `${pct}% of ${formatBytes(it.file.size)}`}
                  </span>
                  {it.status !== "uploading" && (
                    <button
                      type="button"
                      className="rounded p-1 text-fog hover:text-white"
                      aria-label={`Remove ${it.file.name} from the list`}
                      onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${it.status === "error" ? "bg-red" : it.status === "done" ? "bg-ok" : "bg-sun"}`}
                    style={{ width: `${it.status === "done" ? 100 : pct}%` }}
                  />
                </div>
                {it.error && <p className="mt-2 text-sm text-red-bright">{it.error}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {busy && <p className="text-sm text-mist">Keep this page open until the uploads finish.</p>}
    </div>
  );
}
