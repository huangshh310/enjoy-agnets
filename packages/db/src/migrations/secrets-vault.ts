/**
 * 密钥专表：safeStorage 加密后的敏感 JSON（providers vault / harness 凭证）
 * 从 settings KV 迁到独立表，避免 settings.get 每次都拖上解密大对象。
 */
import type { Migration } from "./types.ts"

export const secretsVaultMigration: Migration = {
  version: 4,
  name: "secrets-vault",
  sql: `
    CREATE TABLE IF NOT EXISTS secrets_vault (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `
}
