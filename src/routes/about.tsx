import { createFileRoute } from "@tanstack/react-router";
import { HardDrive, Shield, WifiOff, Database } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · File Organizer Pro" },
      { name: "description", content: "About the local-first, offline-capable File Organizer Pro PWA." },
    ],
  }),
  component: About,
});

const POINTS = [
  { icon: Shield, title: "No accounts, ever", body: "No login, no signup, no telemetry. Nothing leaves your device." },
  { icon: WifiOff, title: "Offline-first", body: "Works without internet. State persists between sessions." },
  { icon: Database, title: "IndexedDB powered", body: "Files, logs, and settings live in your browser's local database." },
  { icon: HardDrive, title: "Installable", body: "Add to home screen on mobile, install as a desktop app on Windows, macOS or Linux." },
];

function About() {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground mt-1">File Organizer Pro · a private, local-first PWA.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-xl border border-border bg-card p-5">
            <p.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">{p.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground space-y-2">
        <p>
          <strong className="text-foreground">How it works.</strong> Drop files into the Import Center. Each file is sorted into a virtual folder based on its extension. Duplicate names are auto-renamed using the <code>(1)</code>, <code>(2)</code> convention so nothing is overwritten.
        </p>
        <p>
          <strong className="text-foreground">Where data lives.</strong> Your browser's IndexedDB for files, logs, and settings — with a graceful in-memory fallback if storage is blocked.
        </p>
      </div>
    </div>
  );
}