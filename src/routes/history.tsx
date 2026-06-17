import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History as HistoryIcon, Loader2, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History · File Organizer Pro" }] }),
  component: HistoryPage,
});

type Row = {
  id: string;
  category: string;
  action: string;
  detail: string | null;
  created_at: string;
};

function HistoryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("activity_history")
      .select("id, category, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setBusy(false);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function clearAll() {
    if (!user) return;
    if (!confirm("Delete all activity history? This cannot be undone.")) return;
    const { error } = await supabase.from("activity_history").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("History cleared");
      setRows([]);
    }
  }

  if (loading || !user) {
    return (
      <div className="p-8 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const groups = groupByDay(rows);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <HistoryIcon className="size-6" /> History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account activity, newest first.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm hover:bg-destructive/20"
          >
            <Trash2 className="size-4" /> Clear all
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No activity yet. Import or organize files to see entries here.
          <div className="mt-3">
            <Link to="/import" className="text-primary hover:underline">Go to Import →</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {g.label}
              </h2>
              <ul className="rounded-xl border border-border bg-card divide-y divide-border">
                {g.items.map((r) => (
                  <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.action}</div>
                      {r.detail && (
                        <div className="text-xs text-muted-foreground truncate">{r.detail}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(rows: Row[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const d = new Date(r.created_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yest.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(r);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}