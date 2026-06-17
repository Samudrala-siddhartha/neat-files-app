import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Upload,
  FolderTree,
  Layers,
  Search,
  BarChart3,
  ScrollText,
  Settings as SettingsIcon,
  Info,
  WifiOff,
  Wifi,
  HardDrive,
  History as HistoryIcon,
  LogIn,
  UserCircle2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { InstallPWA } from "@/components/InstallPWA";
import { registerAppSw } from "@/lib/pwa/register-sw";
import { useAuth } from "@/hooks/use-auth";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/import", label: "Import Center", icon: Upload },
  { to: "/organizer", label: "Organizer", icon: FolderTree },
  { to: "/extensions", label: "Extensions", icon: Layers },
  { to: "/search", label: "Search", icon: Search },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/about", label: "About", icon: Info },
];

export function AppShell() {
  const { hydrate, ready, online, setOnline, files } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  useEffect(() => {
    hydrate();
    registerAppSw();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [hydrate, setOnline]);

  return (
    <div className="min-h-dvh flex w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center shadow-lg shadow-indigo-500/30">
              <HardDrive className="size-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">File Organizer</div>
              <div className="text-[10px] text-muted-foreground mt-1 tracking-wider uppercase">
                Pro · Local-first
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as string}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-xs text-muted-foreground">
          <div className="mb-2"><InstallPWA /></div>
          <div className="mb-2">
            {user ? (
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 hover:bg-accent"
              >
                <div className="size-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white text-[10px] font-semibold">
                  {(user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="truncate text-foreground">{user.email}</span>
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary px-2.5 py-1.5 font-medium hover:bg-primary/20"
              >
                <LogIn className="size-3.5" /> Sign in
              </Link>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {online ? (
                <Wifi className="size-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="size-3.5 text-amber-500" />
              )}
              {online ? "Online" : "Offline"}
            </span>
            <span>{files.length} files</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center">
              <HardDrive className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold">File Organizer Pro</span>
          </Link>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <Link
              to={user ? "/account" : "/auth"}
              aria-label={user ? "Account" : "Sign in"}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              {user ? <UserCircle2 className="size-5" /> : <LogIn className="size-5" />}
            </Link>
            {!online && <WifiOff className="size-4 text-amber-500" />}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {ready ? <Outlet /> : (
            <div className="p-8 text-sm text-muted-foreground">Loading local storage…</div>
          )}
        </main>

        <nav className="md:hidden grid grid-cols-5 border-t border-border bg-sidebar text-xs">
          {NAV.slice(0, 5).map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as string}
                className={cn(
                  "flex flex-col items-center justify-center py-2 gap-1",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-4" />
                <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function OfflineBanner() {
  const online = useApp((s) => s.online);
  if (online) return null;
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs px-4 py-1.5 flex items-center gap-2">
      <WifiOff className="size-3.5" />
      You're offline — File Organizer Pro continues to work entirely on this device.
    </div>
  );
}