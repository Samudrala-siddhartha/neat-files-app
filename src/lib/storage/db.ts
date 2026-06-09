import { openDB, type IDBPDatabase } from "idb";

export interface StoredFile {
  id: string;
  name: string;
  extension: string;
  size: number;
  type: string;
  importedAt: number;
  blob: Blob;
  tags?: string[];
  favorite?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  category: string;
  message: string;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

const DB_NAME = "file-organizer-pro";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;
let useMemoryFallback = false;
const memory = {
  files: new Map<string, StoredFile>(),
  logs: new Map<string, LogEntry>(),
  settings: new Map<string, unknown>(),
};

export function isOfflineFallback() {
  return useMemoryFallback;
}

export async function getDB(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined") return null;
  if (useMemoryFallback) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("files")) {
          const store = db.createObjectStore("files", { keyPath: "id" });
          store.createIndex("extension", "extension");
          store.createIndex("importedAt", "importedAt");
        }
        if (!db.objectStoreNames.contains("logs")) {
          const store = db.createObjectStore("logs", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    }).catch((err) => {
      console.warn("IndexedDB unavailable, falling back to memory", err);
      useMemoryFallback = true;
      return null as unknown as IDBPDatabase;
    });
  }
  return dbPromise;
}

export async function putFile(file: StoredFile) {
  const db = await getDB();
  if (!db) {
    memory.files.set(file.id, file);
    return;
  }
  await db.put("files", file);
}

export async function getAllFiles(): Promise<StoredFile[]> {
  const db = await getDB();
  if (!db) return Array.from(memory.files.values());
  return (await db.getAll("files")) as StoredFile[];
}

export async function deleteFile(id: string) {
  const db = await getDB();
  if (!db) {
    memory.files.delete(id);
    return;
  }
  await db.delete("files", id);
}

export async function clearAllFiles() {
  const db = await getDB();
  if (!db) {
    memory.files.clear();
    return;
  }
  await db.clear("files");
}

export async function putLog(entry: LogEntry) {
  const db = await getDB();
  if (!db) {
    memory.logs.set(entry.id, entry);
    return;
  }
  await db.put("logs", entry);
}

export async function getLogs(): Promise<LogEntry[]> {
  const db = await getDB();
  if (!db) return Array.from(memory.logs.values());
  return (await db.getAll("logs")) as LogEntry[];
}

export async function clearLogs() {
  const db = await getDB();
  if (!db) {
    memory.logs.clear();
    return;
  }
  await db.clear("logs");
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDB();
  if (!db) {
    return (memory.settings.get(key) as T) ?? fallback;
  }
  const rec = (await db.get("settings", key)) as SettingsRecord | undefined;
  return (rec?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDB();
  if (!db) {
    memory.settings.set(key, value);
    return;
  }
  await db.put("settings", { key, value });
}