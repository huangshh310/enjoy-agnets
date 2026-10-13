/**
 * #153 P1 善后：旧版 listMessages 读时回填（backfillUserFileParts）曾把别的会话刚导入的图
 * 以「读取时刻」写进本会话纯文字用户消息。只删同时满足以下全部条件的 file 部件：
 * 1. 用户消息的 file 部件，created_at 比消息晚 5s 以上（正常发送部件与消息同一个 now 写入）；
 * 2. 同一消息里有更早写入的其它部件（只追加了 file，不是整条重写——重写会把所有部件同刻重写）；
 * 3. 同一 asset 更早已作为 file 部件挂在「另一个会话」的消息上（图来自别的会话）。
 * 幂等：删过即不再命中；不碰 assets 本身。
 */
import type { DatabaseSync } from "node:sqlite"
import type { Migration } from "./types.ts"

export const MISBACKFILL_LATE_MS = 5000

const MATCH_SQL = `
  SELECT p.id FROM message_parts p
  JOIN messages m ON m.id = p.message_id
  WHERE m.role = 'user' AND p.type = 'file' AND json_valid(p.payload)
    AND p.created_at > m.created_at + ${MISBACKFILL_LATE_MS}
    AND EXISTS (
      SELECT 1 FROM message_parts o
      WHERE o.message_id = p.message_id AND o.id <> p.id AND o.created_at < p.created_at
    )
    AND EXISTS (
      SELECT 1 FROM message_parts q JOIN messages qm ON qm.id = q.message_id
      WHERE q.type = 'file' AND json_valid(q.payload)
        AND json_extract(q.payload, '$.assetId') = json_extract(p.payload, '$.assetId')
        AND qm.session_id <> m.session_id
        AND q.created_at < p.created_at
    )`

export function findMisbackfilledFileParts(sqlite: DatabaseSync): string[] {
  return (sqlite.prepare(MATCH_SQL).all() as Array<{ id: string }>).map((row) => row.id)
}

export function cleanMisbackfilledFileParts(sqlite: DatabaseSync): number {
  const ids = findMisbackfilledFileParts(sqlite)
  const del = sqlite.prepare("DELETE FROM message_parts WHERE id = ?")
  for (const id of ids) del.run(id)
  if (ids.length > 0) console.info(`[migration] misbackfilled-file-parts: removed ${ids.length} part(s)`)
  return ids.length
}

export const misbackfilledFilePartsMigration: Migration = {
  version: 17,
  name: "misbackfilled-file-parts",
  apply(sqlite) {
    cleanMisbackfilledFileParts(sqlite)
  }
}
