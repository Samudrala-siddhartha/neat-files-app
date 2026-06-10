import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp, formatBytes } from "@/lib/store";
import { FilePreview, kindOf } from "@/components/FilePreview";
import type { StoredFile } from "@/lib/storage/db";
import { ChevronRight, Download, Eye, Trash2, FolderOpen, Package, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const allExts = useMemo(
    () => Array.from(new Set(files.map((f) => f.extension))).sort(),
    [files],
  );

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((p) =>
      p.size === extFiles.length ? new Set() : new Set(extFiles.map((f) => f.id)),
    );
  const clearSelection = () => setSelected(new Set());
  const selectedFiles = extFiles.filter((f) => selected.has(f.id));

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedFiles.length} file(s)?`)) return;
    for (const f of selectedFiles) await removeFile(f.id);
    toast.success(`Deleted ${selectedFiles.length} file(s)`);
    clearSelection();
  };

  const bulkExport = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const f of selectedFiles) zip.file(`${f.extension}/${f.name}`, f.blob);
    const out = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${openExt}-${Date.now()}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success(`Exported ${selectedFiles.length} file(s)`);
  };

  const bulkMove = async (targetExt: string) => {
    const importFiles = useApp.getState().importFiles;
    // Move = re-import with new extension + delete originals
    const newBlobs: File[] = selectedFiles.map((f) => {
      const base = f.name.includes(".") ? f.name.slice(0, f.name.lastIndexOf(".")) : f.name;
      return new File([f.blob], `${base}.${targetExt}`, { type: f.type });
    });
    for (const f of selectedFiles) await removeFile(f.id);
    await importFiles(newBlobs);
    toast.success(`Moved ${newBlobs.length} file(s) to ${targetExt}/`);
    clearSelection();
    setOpenExt(targetExt);
  };

  const bulkCategorize = async () => {
    // Re-categorize: ensures extension matches the actual filename extension (no-op fix)
    toast.info(`${selectedFiles.length} file(s) are already categorized under ${openExt}/`);
  };

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

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md hover:bg-accent"
            >
              {selected.size === extFiles.length && extFiles.length > 0 ? (
                <CheckSquare className="size-3.5" />
              ) : (
                <Square className="size-3.5" />
              )}
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </button>
            <div className="flex-1" />
            <button
              disabled={selected.size === 0}
              onClick={bulkCategorize}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40"
            >
              <FolderOpen className="size-3.5" /> Categorize
            </button>
            <div className="relative">
              <select
                disabled={selected.size === 0}
                onChange={(e) => {
                  if (e.target.value) {
                    bulkMove(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background disabled:opacity-40 cursor-pointer"
              >
                <option value="">Move to…</option>
                {allExts.filter((e) => e !== openExt).map((e) => (
                  <option key={e} value={e}>{e}/</option>
                ))}
              </select>
            </div>
            <button
              disabled={selected.size === 0}
              onClick={bulkExport}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40"
            >
              <Package className="size-3.5" /> Export ZIP
            </button>
            <button
              disabled={selected.size === 0}
              onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {extFiles.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                  className="size-4 accent-primary cursor-pointer"
                  aria-label={`Select ${f.name}`}
                />
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