import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useApp, formatBytes } from "@/lib/store";
import { FilePreview } from "@/components/FilePreview";
import type { StoredFile } from "@/lib/storage/db";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search · File Organizer Pro" },
      { name: "description", content: "Instant offline search across filename, extension, size and date." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const files = useApp((s) => s.files);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<StoredFile | null>(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return files
      .filter((f) => f.name.toLowerCase().includes(query) || f.extension.includes(query))
      .slice(0, 200);
  }, [q, files]);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Instant, fully offline search across your local library.</p>
      </header>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search filename or extension…"
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {q.trim() === "" ? (
        <div className="text-sm text-muted-foreground">Type to search across {files.length} files.</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No matches.</div>
      ) : (
        <ul className="rounded-xl border border-border bg-card divide-y divide-border">
          {results.map((f) => (
            <li key={f.id} onClick={() => setPreview(f)} className="px-4 py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-accent/40">
              <span className="truncate">{f.name}</span>
              <span className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{f.extension}</span>
                {formatBytes(f.size)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}