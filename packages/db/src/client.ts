/**
 * SQLite 入口：WAL + 外键 + 版本化迁移。
 */
import { DatabaseSync } from "node:sqlite"
import { applyMigrations } from "./migrations/index.ts"

export type AppDatabase = DatabaseSync

export function openDatabase(filePath: string): AppDatabase {
  const sqlite = new DatabaseSync(filePath)
  sqlite.exec("PRAGMA journal_mode = WAL;")
  sqlite.exec("PRAGMA busy_timeout = 5000;")
  sqlite.exec("PRAGMA foreign_keys = ON;")
  applyMigrations(sqlite)
  return sqlite
}
