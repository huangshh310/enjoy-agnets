import { join } from "node:path";
import { app } from "electron";
import { openDatabase, type AppDatabase } from "@enjoy-agents/db";

let database: AppDatabase | undefined;

export function getDatabase(): AppDatabase {
  if (!database) {
    database = openDatabase(join(app.getPath("userData"), "app.db"));
  }
  return database;
}

export function getSetting(key: string): string | undefined {
  const row = getDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDatabase().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
