import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Save, User as UserIcon, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account · File Organizer Pro" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setCreatedAt(data.created_at);
        }
      });
  }, [user, loading, navigate]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  if (loading || !user) {
    return (
      <div className="p-8 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and session.</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white text-xl font-semibold">
            {(displayName || user.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{displayName || user.email}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="size-3" /> {user.email}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Display name</label>
            <div className="relative mt-1">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {createdAt && (
            <div className="text-xs text-muted-foreground">
              Member since {new Date(createdAt).toLocaleDateString()}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Activity history</h2>
        <p className="text-xs text-muted-foreground mt-1">
          See everything your account has done in this app.
        </p>
        <Link
          to="/history"
          className="mt-3 inline-flex text-sm text-primary hover:underline"
        >
          Open history →
        </Link>
      </section>
    </div>
  );
}