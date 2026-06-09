import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Upload, FolderOpen, Loader2 } from "lucide-react";
import { useApp, formatBytes } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Center · File Organizer Pro" },
      { name: "description", content: "Drag and drop files or folders to import into your local library." },
    ],
  }),
  component: ImportCenter,
});

function ImportCenter() {
  const { importFiles } = useApp();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      setProgress({ done: 0, total: files.length });
      try {
        const batch = 25;
        for (let i = 0; i < files.length; i += batch) {
          await importFiles(files.slice(i, i + batch));
          setProgress({ done: Math.min(i + batch, files.length), total: files.length });
        }
        toast.success(`Imported ${files.length} file${files.length > 1 ? "s" : ""}`);
      } catch (e) {
        toast.error("Some files failed to import");
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [importFiles],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Import Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop anything — files are categorized by extension automatically. Duplicates are renamed, never overwritten.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <div className="mx-auto size-14 rounded-full bg-primary/10 grid place-items-center mb-4">
          <Upload className="size-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Drag and drop files or folders</h2>
        <p className="text-sm text-muted-foreground mt-1">
          or use the buttons below — works offline, no upload server.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Upload className="size-4" /> Select files
          </button>
          <button
            onClick={() => folderInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <FolderOpen className="size-4" /> Select folder
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          // @ts-expect-error non-standard but widely supported
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />

        {busy && progress && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                Importing…
              </span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <RecentImports />
    </div>
  );
}

function RecentImports() {
  const files = useApp((s) => s.files.slice(0, 10));
  if (!files.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold mb-3">Most recent imports</h2>
      <ul className="divide-y divide-border text-sm">
        {files.map((f) => (
          <li key={f.id} className="py-2 flex items-center justify-between">
            <span className="truncate">{f.name}</span>
            <span className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{f.extension}</span>
              {formatBytes(f.size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}