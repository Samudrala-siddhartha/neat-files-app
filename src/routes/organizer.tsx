import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Trash2, FolderTree, Eye } from "lucide-react";
import { useApp, formatBytes } from "@/lib/store";
import { FilePreview } from "@/components/FilePreview";
import type { StoredFile } from "@/lib/storage/db";

export const Route = createFileRoute("/organizer")({
  head: () => ({
    meta: [
      { title: "Organizer · File Organizer Pro" },
      { name: "description", content: "Browse files grouped by their extension folder." },
    ],
  }),
  component: Organizer,
});

function Organizer() {
  const { files, removeFile } = useApp();
  const [activeExt, setActiveExt] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof files>();
    for (const f of files) {
      if (!m.has(f.extension)) m.set(f.extension, []);
      m.get(f.extension)!.push(f);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [files]);

  const visible = activeExt ? files.filter((f) => f.extension === activeExt) : files;

  const download = (f: (typeof files)[number]) => {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8 grid lg:grid-cols-[260px_1fr] gap-6">
      <aside className="rounded-xl border border-border bg-card p-4 h-fit">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
          <FolderTree className="size-4" /> Folders
        </div>
        <button
          onClick={() => setActiveExt(null)}
          className={`w-full text-left text-sm rounded-md px-2 py-1.5 ${!activeExt ? "bg-accent" : "hover:bg-accent/60"}`}
        >
          All files <span className="text-muted-foreground">({files.length})</span>
        </button>
        <div className="mt-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
          {grouped.map(([ext, list]) => (
            <button
              key={ext}
              onClick={() => setActiveExt(ext)}
              className={`w-full text-left text-sm rounded-md px-2 py-1.5 flex items-center justify-between ${activeExt === ext ? "bg-accent" : "hover:bg-accent/60"}`}
            >
              <span className="font-mono uppercase">{ext}/</span>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </button>
          ))}
          {grouped.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">No folders yet.</p>
          )}
        </div>
      </aside>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {activeExt ? `${activeExt}/` : "All files"}
            <span className="ml-2 text-muted-foreground font-normal">
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </span>
          </h2>
        </div>
        {visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Nothing here yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Name</th>
                  <th className="text-left font-medium px-4 py-2">Ext</th>
                  <th className="text-left font-medium px-4 py-2">Size</th>
                  <th className="text-left font-medium px-4 py-2">Imported</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 500).map((f) => (
                  <tr key={f.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-2 truncate max-w-xs">{f.name}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs uppercase">{f.extension}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatBytes(f.size)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(f.importedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setPreview(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent" title="Preview">
                        <Eye className="size-3.5" />
                      </button>
                      <button onClick={() => download(f)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-accent" title="Download">
                        <Download className="size-3.5" />
                      </button>
                      <button onClick={() => removeFile(f.id)} className="ml-1 inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-destructive/20 text-destructive" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}