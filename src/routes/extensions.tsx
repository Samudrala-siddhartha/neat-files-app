import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApp, formatBytes } from "@/lib/store";

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

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Extension Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One virtual folder per file extension. Unlimited extensions supported.
        </p>
      </header>

      {data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No extensions yet. <Link to="/import" className="text-primary underline">Import files</Link> to populate.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(([ext, d]) => (
            <Link key={ext} to="/organizer" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/60 transition">
              <div className="flex items-center justify-between">
                <div className="font-mono text-lg font-semibold uppercase">{ext}/</div>
                <div className="text-xs text-muted-foreground">{d.count} files</div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {formatBytes(d.size)} · Last {new Date(d.latest).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}