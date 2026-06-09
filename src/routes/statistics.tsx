import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApp, formatBytes } from "@/lib/store";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics · File Organizer Pro" },
      { name: "description", content: "Visualize distribution of files across extensions." },
    ],
  }),
  component: Statistics,
});

function Statistics() {
  const files = useApp((s) => s.files);

  const byExt = useMemo(() => {
    const m = new Map<string, { count: number; size: number }>();
    for (const f of files) {
      const cur = m.get(f.extension) ?? { count: 0, size: 0 };
      cur.count++;
      cur.size += f.size;
      m.set(f.extension, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [files]);

  const maxCount = Math.max(1, ...byExt.map(([, v]) => v.count));
  const totalSize = files.reduce((a, f) => a + f.size, 0);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Statistics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Distribution across extension folders · {files.length} files · {formatBytes(totalSize)}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Files by extension</h2>
        {byExt.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-2">
            {byExt.map(([ext, v]) => (
              <li key={ext} className="text-sm">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono uppercase">{ext}/</span>
                  <span className="text-muted-foreground">{v.count} · {formatBytes(v.size)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(v.count / maxCount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}