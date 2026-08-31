/**
 * 资产与 provider file ref 仓储。
 */
import type { AppDatabase } from "../client"

export type AssetRow = {
  id: string
  name: string
  kind: string
  mediaType: string
  size: number
  hash: string
  source: string
  createdAt: number
}

export function insertAsset(db: AppDatabase, row: AssetRow): AssetRow {
  db.prepare(
    `INSERT INTO assets (id, name, kind, media_type, size, hash, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(row.id, row.name, row.kind, row.mediaType, row.size, row.hash, row.source, row.createdAt)
  return row
}

export function getAsset(db: AppDatabase, id: string): AssetRow | undefined {
  return db
    .prepare(
      `SELECT id, name, kind, media_type as mediaType, size, hash, source, created_at as createdAt
       FROM assets WHERE id = ?`
    )
    .get(id) as AssetRow | undefined
}

export function listAssets(db: AppDatabase): AssetRow[] {
  return db
    .prepare(
      `SELECT id, name, kind, media_type as mediaType, size, hash, source, created_at as createdAt
       FROM assets ORDER BY created_at DESC`
    )
    .all() as AssetRow[]
}

export function deleteAsset(db: AppDatabase, id: string): void {
  db.prepare("DELETE FROM assets WHERE id = ?").run(id)
}

export function findProviderRef(
  db: AppDatabase,
  key: { providerId: string; modelFamily: string; fileHash: string }
): string | undefined {
  const row = db
    .prepare(
      `SELECT ref FROM provider_file_refs
       WHERE provider_id = ? AND model_family = ? AND file_hash = ?`
    )
    .get(key.providerId, key.modelFamily, key.fileHash) as { ref?: string } | undefined
  return row?.ref
}

export function upsertProviderRef(
  db: AppDatabase,
  row: {
    id: string
    providerId: string
    modelFamily: string
    fileHash: string
    ref: string
    scope?: string
  }
): void {
  db.prepare(
    `INSERT INTO provider_file_refs (id, provider_id, model_family, file_hash, ref, scope, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.providerId,
    row.modelFamily,
    row.fileHash,
    row.ref,
    row.scope ?? null,
    Date.now()
  )
}
