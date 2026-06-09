import { createFileRoute } from "@tanstack/react-router";
import { useApp, type DuplicateStrategy, type Theme } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · File Organizer Pro" },
      { name: "description", content: "Configure themes, duplicate handling and performance." },
    ],
  }),
  component: SettingsPage,
});

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings, removeAll } = useApp();

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">All preferences are saved locally in your browser.</p>
      </header>

      <div className="rounded-xl border border-border bg-card px-5">
        <Row title="Theme" description="Light, dark or follow the system.">
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as Theme })}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </Row>
        <Row title="Duplicate handling" description="What to do when an imported file name already exists in its folder.">
          <select
            value={settings.duplicateStrategy}
            onChange={(e) => updateSettings({ duplicateStrategy: e.target.value as DuplicateStrategy })}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="rename">Auto-rename (recommended)</option>
            <option value="skip">Skip duplicate</option>
            <option value="replace">Replace</option>
          </select>
        </Row>
        <Row title="Notifications" description="Show toast notifications for important events.">
          <input type="checkbox" checked={settings.notifications} onChange={(e) => updateSettings({ notifications: e.target.checked })} className="size-4 accent-primary" />
        </Row>
        <Row title="Performance mode" description="Limit rendering of very large lists.">
          <input type="checkbox" checked={settings.performanceMode} onChange={(e) => updateSettings({ performanceMode: e.target.checked })} className="size-4 accent-primary" />
        </Row>
      </div>

      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground mt-1">Permanently delete every file stored in your local library.</p>
        <button
          onClick={async () => {
            if (confirm("Delete ALL local files? This cannot be undone.")) {
              await removeAll();
              toast.success("All files removed");
            }
          }}
          className="mt-3 inline-flex rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90"
        >
          Delete all files
        </button>
      </div>
    </div>
  );
}