"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";
import { formatDate } from "@/lib/format";

/** "Downloaded 12 Oct 2026", for a show in a list or at the top of its page. */
export function DownloadedTag({ at, className = "" }: { at: string; className?: string }) {
  return (
    <span className={`tag shrink-0 bg-ok/15 text-ok ${className}`}>
      <CircleCheck size={13} aria-hidden /> Downloaded {formatDate(at)}
    </span>
  );
}

type Marks = {
  files: Record<string, string>;
  show: string | null;
  mark: (fileId: string) => void;
};

const MarksContext = createContext<Marks>({ files: {}, show: null, mark: () => {} });

/**
 * What this customer has downloaded from a show before (file id → ISO date), so the page
 * can say so. Pressing Download marks the file (and the show, for the show file) straight away.
 */
export function DownloadMarks({
  files: initialFiles,
  show: initialShow,
  showFileIds,
  children,
}: {
  files: Record<string, string>;
  show: string | null;
  showFileIds: string[];
  children: React.ReactNode;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [show, setShow] = useState(initialShow);
  const mark = useCallback(
    (fileId: string) => {
      const now = new Date().toISOString();
      setFiles((f) => ({ ...f, [fileId]: now }));
      if (showFileIds.includes(fileId)) setShow(now);
    },
    [showFileIds],
  );
  const value = useMemo(() => ({ files, show, mark }), [files, show, mark]);
  return <MarksContext.Provider value={value}>{children}</MarksContext.Provider>;
}

/** A download link that marks the file as downloaded when it's used. */
export function DownloadLink({
  fileId,
  href,
  className,
  children,
}: {
  fileId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { mark } = useContext(MarksContext);
  return (
    <a href={href} className={className} onClick={() => mark(fileId)} onAuxClick={() => mark(fileId)}>
      {children}
    </a>
  );
}

/** At the top of the show page, once its show file has been downloaded. */
export function ShowDownloadedTag() {
  const { show } = useContext(MarksContext);
  return show ? <DownloadedTag at={show} /> : null;
}

/** On a file's card, once it has been downloaded. */
export function FileDownloadedNote({ fileId }: { fileId: string }) {
  const { files } = useContext(MarksContext);
  const at = files[fileId];
  if (!at) return null;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-sm text-ok">
      <CircleCheck size={14} aria-hidden /> You downloaded this on {formatDate(at)}
    </p>
  );
}
