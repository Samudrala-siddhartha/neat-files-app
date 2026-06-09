import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Files,
  Layers,
  HardDrive,
  Activity,
  Upload,
  WifiOff,
  Wifi,
  CheckCircle2,
} from "lucide-react";
import { useApp, formatBytes } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · File Organizer Pro" },
      { name: "description", content: "Overview of your local file library, extensions and activity." },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-20 blur-2xl ${accent}`} />
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { files, logs, online } = useApp();

  const stats = useMemo(() => {
    const exts = new Set(files.map((f) => f.extension));
    const totalSize = files.reduce((a, f) => a + f.size, 0);
    return {
      count: files.length,
      exts: exts.size,
      size: formatBytes(totalSize),
    };
  }, [files]);

  const recent = files.slice(0, 6);
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Local-first workspace · everything stays in your browser.
          </p>
        </div>
        <Link
          to="/import"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Upload className="size-4" /> Import files
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total files" value={stats.count} icon={Files} accent="bg-indigo-500" />
        <Stat label="Extensions" value={stats.exts} icon={Layers} accent="bg-violet-500" />
        <Stat label="Storage" value={stats.size} icon={HardDrive} accent="bg-emerald-500" />
        <Stat label="Events logged" value={logs.length} icon={Activity} accent="bg-amber-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent files</h2>
            <Link to="/organizer" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No files yet. <Link to="/import" className="text-primary underline">Import some</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((f) => (
                <li key={f.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="truncate">{f.name}</span>
                  <span className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{f.extension}</span>
                    {formatBytes(f.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">System health</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              {online ? <Wifi className="size-4 text-emerald-500" /> : <WifiOff className="size-4 text-amber-500" />}
              {online ? "Online" : "Offline — local features still work"}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              IndexedDB ready
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Watcher idle
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Queue empty
            </li>
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Recent activity
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {recentLogs.length === 0 && <li>No activity yet.</li>}
              {recentLogs.map((l) => (
                <li key={l.id} className="truncate">
                  <span className="text-foreground/80">[{l.category}]</span> {l.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
