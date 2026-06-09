import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs · File Organizer Pro" },
      { name: "description", content: "System activity, imports, warnings and errors." },
    ],
  }),
  component: Logs,
});

const COLORS: Record<string, string> = {
  info: "text-sky-500",
  success: "text-emerald-500",
  warn: "text-amber-500",
  error: "text-destructive",
};

function Logs() {
  const { logs, clearLogs } = useApp();

  const exportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `file-organizer-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">{logs.length} event{logs.length === 1 ? "" : "s"} stored locally.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLogs} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">
            <Download className="size-4" /> Export
          </button>
          <button onClick={clearLogs} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-destructive/20 text-destructive">
            <Trash2 className="size-4" /> Clear
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-border max-h-[65vh] overflow-y-auto text-sm">
            {logs.map((l) => (
              <li key={l.id} className="px-4 py-2 flex items-start gap-3">
                <span className={`text-xs font-mono uppercase ${COLORS[l.level]}`}>{l.level}</span>
                <span className="text-xs text-muted-foreground w-40 shrink-0">{new Date(l.timestamp).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">[{l.category}]</span>
                <span className="flex-1 truncate">{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}