import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp, formatBytes } from "@/lib/store";
import { FilePreview, kindOf } from "@/components/FilePreview";
import type { StoredFile } from "@/lib/storage/db";
import { ChevronRight, Download, Eye, Trash2, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/extensions")({
  head: () => ({
    meta: [
      { title: "Extensions · File Organizer Pro" },
      { name: "description", content: "Explore every extension folder, file counts and storage." },
    ],
  }),
  component: Extensions,
});

function Extensions() {
  const files = useApp((s) => s.files);
  const removeFile = useApp((s) => s.removeFile);
  const [openExt, setOpenExt] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const data = useMemo(() => {
    const m = new Map<string, { count: number; size: number; latest: number }>();
    for (const f of files) {
      const cur = m.get(f.extension) ?? { count: 0, size: 0, latest: 0 };
      cur.count++;
      cur.size += f.size;
      cur.latest = Math.max(cur.latest, f.importedAt);
      m.set(f.extension, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].size - a[1].size);
  }, [files]);

  const extFiles = useMemo(
    () => (openExt ? files.filter((f) => f.extension === openExt) : []),
    [files, openExt],
  );

  const downloadFile = (f: StoredFile) => {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Extension Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One virtual folder per file extension. Click a folder to browse and preview files.
        </p>
      </header>

      {data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No extensions yet. <Link to="/import" className="text-primary underline">Import files</Link> to populate.
        </div>
      ) : openExt ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setOpenExt(null)} className="text-muted-foreground hover:text-foreground">
              Extensions
            </button>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-mono font-semibold uppercase">{openExt}/</span>
            <span className="text-muted-foreground">· {extFiles.length} files</span>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {extFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                <button
                  onClick={() => setPreview(f)}
                  className="min-w-0 flex-1 text-left"
                  title={`Open ${f.name}`}
                >
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {kindOf(f.extension)} · {formatBytes(f.size)} · {new Date(f.importedAt).toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => setPreview(f)}
                  className="rounded-md p-1.5 hover:bg-accent"
                  aria-label="Preview"
                >
                  <Eye className="size-4" />
                </button>
                <button
                  onClick={() => downloadFile(f)}
                  className="rounded-md p-1.5 hover:bg-accent"
                  aria-label="Download"
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={() => removeFile(f.id)}
                  className="rounded-md p-1.5 hover:bg-accent text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(([ext, d]) => (
            <button
              key={ext}
              onClick={() => setOpenExt(ext)}
              className="group text-left rounded-xl border border-border bg-card p-5 hover:border-primary/60 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="size-4 text-primary" />
                  <div className="font-mono text-lg font-semibold uppercase">{ext}/</div>
                </div>
                <div className="text-xs text-muted-foreground">{d.count} files</div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {formatBytes(d.size)} · Last {new Date(d.latest).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}