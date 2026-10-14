/**
 * #153 P1 善后：旧版 listMessages 读时回填（backfillUserFileParts / matchOrphanedAssets）曾把别的会话刚导入的图
 * 以「读取时刻」写进本会话**纯文字**用户消息。fail-closed：命中的部件整行搬进 message_parts_quarantine
 * （原行 + reason + migrated_at），不硬删。只搬同时满足以下全部条件的 file 部件 p（消息 m、资产 a）：
 * 1. m 是用户消息，p.created_at 比 m 晚 5s 以上（正常发送：部件与消息同一个 now 写入）；
 * 2. m 有更早写入的其它部件（只追加了 file；checkpoint 整条重写会把所有部件同刻重写 → 不命中）；
 * 3. m 发送时是纯文字：同一消息里没有「随消息写入」（≤ m+5s）的 file 部件——批量上传 / 多图同发都保留；
 * 4. a 落在旧回填的导入窗：m 之前 120s 内导入（资产库里更早的图被复用 → 不命中）；
 * 5. a 的原始会话不是本会话：a 最早的 file 引用在另一个会话（p 自己也是引用，故这条引用必然不晚于 p）；
 * 6. a 从没在本会话被正常选用过：本会话里没有随消息写入的 a 部件，本会话草稿附件里也没有 a。
 * 幂等：已搬走的不再命中；不动 assets。
 */
import type { DatabaseSync } from "node:sqlite"
import { tableExists } from "./column-guard.ts"
import type { Migration } from "./types.ts"

export const MISBACKFILL_LATE_MS = 5000
/** 旧回填的回看窗口（ORPHAN_ASSET_LOOKBACK_MS）。 */
export const MISBACKFILL_WINDOW_MS = 120_000
export const MISBACKFILL_REASON = "read-time-backfill-cross-session"

const ASSET = "json_extract(p.payload, '$.assetId')"

function matchSql(withDraftAssets: boolean): string {
  return `
  SELECT p.id FROM message_parts p
  JOIN messages m ON m.id = p.message_id
  JOIN assets a ON a.id = ${ASSET}
  WHERE m.role = 'user' AND p.type = 'file' AND json_valid(p.payload)
    AND p.created_at > m.created_at + ${MISBACKFILL_LATE_MS}
    AND EXISTS (
      SELECT 1 FROM message_parts o
      WHERE o.message_id = p.message_id AND o.id <> p.id AND o.created_at < p.created_at
    )
    AND NOT EXISTS (
      SELECT 1 FROM message_parts f
      WHERE f.message_id = p.message_id AND f.id <> p.id AND f.type = 'file' AND f.created_at <= m.created_at + ${MISBACKFILL_LATE_MS}
    )
    AND a.created_at <= m.created_at AND a.created_at > m.created_at - ${MISBACKFILL_WINDOW_MS}
    AND (
      SELECT qm.session_id FROM message_parts q JOIN messages qm ON qm.id = q.message_id
      WHERE q.type = 'file' AND json_valid(q.payload) AND json_extract(q.payload, '$.assetId') = ${ASSET}
      ORDER BY q.created_at ASC, q.id ASC LIMIT 1
    ) <> m.session_id
    AND NOT EXISTS (
      SELECT 1 FROM message_parts s JOIN messages sm ON sm.id = s.message_id
      WHERE sm.session_id = m.session_id AND s.id <> p.id AND s.type = 'file' AND json_valid(s.payload)
        AND json_extract(s.payload, '$.assetId') = ${ASSET}
        AND s.created_at <= sm.created_at + ${MISBACKFILL_LATE_MS}
    )
    ${
      withDraftAssets
        ? `AND NOT EXISTS (
      SELECT 1 FROM session_draft_assets d, json_each(d.assets_json) j
      WHERE d.session_id = m.session_id AND json_valid(d.assets_json)
        AND json_extract(j.value, '$.id') = ${ASSET}
    )`
        : ""
    }`
}

export function findMisbackfilledFileParts(sqlite: DatabaseSync): string[] {
  const sql = matchSql(tableExists(sqlite, "session_draft_assets"))
  return (sqlite.prepare(sql).all() as Array<{ id: string }>).map((row) => row.id)
}

function ensureQuarantineTable(sqlite: DatabaseSync): void {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS message_parts_quarantine (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    created_at INTEGER,
    reason TEXT NOT NULL,
    migrated_at INTEGER NOT NULL
  )`)
}

/** 命中的部件整行搬进隔离表后再从 message_parts 移走；返回搬走的行数。调用方负责事务（迁移执行器已包）。 */
export function quarantineMisbackfilledFileParts(sqlite: DatabaseSync, now = Date.now()): number {
  ensureQuarantineTable(sqlite)
  const ids = findMisbackfilledFileParts(sqlite)
  const copy = sqlite.prepare(
    `INSERT OR IGNORE INTO message_parts_quarantine (id, message_id, idx, type, payload, created_at, reason, migrated_at)
     SELECT id, message_id, idx, type, payload, created_at, ?, ? FROM message_parts WHERE id = ?`
  )
  const move = sqlite.prepare(
    "DELETE FROM message_parts WHERE id = ? AND EXISTS (SELECT 1 FROM message_parts_quarantine WHERE id = ?)"
  )
  let moved = 0
  for (const id of ids) {
    copy.run(MISBACKFILL_REASON, now, id)
    moved += Number(move.run(id, id).changes)
  }
  if (moved > 0) console.info(`[migration] misbackfilled-file-parts: quarantined ${moved} part(s)`)
  return moved
}

export const misbackfilledFilePartsMigration: Migration = {
  version: 17,
  name: "misbackfilled-file-parts",
  apply(sqlite) {
    quarantineMisbackfilledFileParts(sqlite)
  }
}
