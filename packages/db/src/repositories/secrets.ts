/**
 * secrets_vault 仓储：safeStorage 加密后的敏感 JSON 专表。
 * 明文永不落库；这里只搬密文串。
 */
import type { AppDatabase } from "../client"

export function getSecretValue(db: AppDatabase, key: string): string | undefined {
  const row = db
    .prepare("SELECT value FROM secrets_vault WHERE key = ?")
    .get(key) as { value: string } | undefined
  return row?.value
}

export function setSecretValue(db: AppDatabase, key: string, value: string): void {
  db.prepare(
    `INSERT INTO secrets_vault (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, Date.now())
}

export function deleteSecretValue(db: AppDatabase, key: string): void {
  db.prepare("DELETE FROM secrets_vault WHERE key = ?").run(key)
}
