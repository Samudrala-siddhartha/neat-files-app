import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllFiles,
  getLogs,
  putFile,
  putLog,
  deleteFile as dbDeleteFile,
  clearAllFiles,
  clearLogs as dbClearLogs,
  getSetting,
  setSetting,
  type StoredFile,
  type LogEntry,
} from "./storage/db";

export type Theme = "light" | "dark" | "system";
export type DuplicateStrategy = "rename" | "skip" | "replace";

export interface Settings {
  theme: Theme;
  duplicateStrategy: DuplicateStrategy;
  notifications: boolean;
  performanceMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  duplicateStrategy: "rename",
  notifications: true,
  performanceMode: false,
};

interface State {
  ready: boolean;
  files: StoredFile[];
  logs: LogEntry[];
  settings: Settings;
  online: boolean;
  hydrate: () => Promise<void>;
  importFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  removeAll: () => Promise<void>;
  log: (
    level: LogEntry["level"],
    category: string,
    message: string,
  ) => Promise<void>;
  clearLogs: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setOnline: (v: boolean) => void;
}

function rid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return "unknown";
  return name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "unknown";
}

function uniqueName(name: string, existing: Set<string>) {
  if (!existing.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let n = 1;
  while (existing.has(`${base} (${n})${ext}`)) n++;
  return `${base} (${n})${ext}`;
}

export const useApp = create<State>((set, get) => ({
  ready: false,
  files: [],
  logs: [],
  settings: DEFAULT_SETTINGS,
  online: typeof navigator === "undefined" ? true : navigator.onLine,

  hydrate: async () => {
    const [files, logs, settings] = await Promise.all([
      getAllFiles(),
      getLogs(),
      getSetting<Settings>("settings", DEFAULT_SETTINGS),
    ]);
    set({
      ready: true,
      files: files.sort((a, b) => b.importedAt - a.importedAt),
      logs: logs.sort((a, b) => b.timestamp - a.timestamp),
      settings: { ...DEFAULT_SETTINGS, ...settings },
    });
    applyTheme(settings.theme ?? DEFAULT_SETTINGS.theme);
  },

  importFiles: async (incoming) => {
    const { files, settings } = get();
    const namesByExt = new Map<string, Set<string>>();
    for (const f of files) {
      if (!namesByExt.has(f.extension)) namesByExt.set(f.extension, new Set());
      namesByExt.get(f.extension)!.add(f.name);
    }
    const added: StoredFile[] = [];
    for (const raw of incoming) {
      const extension = getExt(raw.name);
      const set = namesByExt.get(extension) ?? new Set<string>();
      let name = raw.name;
      if (set.has(name)) {
        if (settings.duplicateStrategy === "skip") {
          await get().log("warn", "import", `Skipped duplicate ${name}`);
          continue;
        } else if (settings.duplicateStrategy === "rename") {
          name = uniqueName(name, set);
        }
      }
      set.add(name);
      namesByExt.set(extension, set);
      const file: StoredFile = {
        id: rid(),
        name,
        extension,
        size: raw.size,
        type: raw.type || "application/octet-stream",
        importedAt: Date.now(),
        blob: raw,
      };
      try {
        await putFile(file);
        added.push(file);
        await get().log(
          "success",
          "organize",
          `Filed ${name} → ${extension}/`,
        );
      } catch (e) {
        await get().log("error", "import", `Failed ${name}: ${String(e)}`);
      }
    }
    set({ files: [...added, ...get().files] });
  },

  removeFile: async (id) => {
    await dbDeleteFile(id);
    set({ files: get().files.filter((f) => f.id !== id) });
    await get().log("info", "organize", `Removed file ${id}`);
  },

  removeAll: async () => {
    await clearAllFiles();
    set({ files: [] });
    await get().log("warn", "organize", "Cleared all files");
  },

  log: async (level, category, message) => {
    const entry: LogEntry = {
      id: rid(),
      timestamp: Date.now(),
      level,
      category,
      message,
    };
    await putLog(entry);
    set({ logs: [entry, ...get().logs].slice(0, 2000) });
  },

  clearLogs: async () => {
    await dbClearLogs();
    set({ logs: [] });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await setSetting("settings", next);
    set({ settings: next });
    if (patch.theme) applyTheme(patch.theme);
  },

  setOnline: (v) => set({ online: v }),
}));

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}