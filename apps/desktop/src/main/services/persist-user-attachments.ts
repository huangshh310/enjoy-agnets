/**
 * 用户附件落库：发送时写 file part；旧消息按导入时间窗补回。
 */
import { getAsset, insertMessageParts, listAssets } from "@enjoy-agents/db"
import { resolveMediaType } from "@enjoy-agents/assets"
import type { UIMessagePart } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { persistMessage } from "./persist-session"
import {
  linkedAssetIdsFromParts,
  matchOrphanedAssets,
  userTurnParts,
  type UserFileAsset
} from "./user-attachment-parts"
import { shouldSkipDuplicateUserTurn } from "./persist-user-turn-dedupe"

export type MessageRowWithParts = {
  id: string
  role: string
  createdAt: number
  parts: unknown[]
}

export function persistUserTurn(
  sessionId: string,
  content: string,
  attached: UserFileAsset[],
  messageId?: string
): string | undefined {
  const last = lastUserTurn(sessionId)
  if (shouldSkipDuplicateUserTurn(last, content, Date.now())) return undefined
  const parts = userTurnParts(content, attached) as UIMessagePart[]
  return persistMessage(sessionId, "user", content, parts.length > 0 ? parts : undefined, messageId)
}

function lastUserTurn(sessionId: string): { content: string; createdAt: number } | undefined {
  return getDatabase()
    .prepare(
      `SELECT content, created_at as createdAt
       FROM messages WHERE session_id = ? AND role = 'user'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(sessionId) as { content: string; createdAt: number } | undefined
}

export function metasFromAssetIds(ids: string[]): UserFileAsset[] {
  return ids.flatMap((id) => {
    const row = getAsset(getDatabase(), id)
    if (!row) return []
    return [
      {
        assetId: row.id,
        mediaType: resolveMediaType(row.name, row.mediaType),
        name: row.name
      }
    ]
  })
}

/** 列出消息时：旧用户轮只有 text 则按时间窗补 file part 并写回。 */
export function backfillUserFileParts<T extends MessageRowWithParts>(rows: T[]): T[] {
  const alreadyLinked = new Set(rows.flatMap((row) => linkedAssetIdsFromParts(row.parts)))
  const turns = rows
    .filter((row) => row.role === "user")
    .map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      hasFileParts: linkedAssetIdsFromParts(row.parts).length > 0
    }))
  const imported = listAssets(getDatabase())
    .filter((asset) => asset.source === "import")
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      mediaType: resolveMediaType(asset.name, asset.mediaType),
      createdAt: asset.createdAt
    }))
  const matched = matchOrphanedAssets(turns, imported, alreadyLinked)
  if (matched.size === 0) return rows
  return rows.map((row) => {
    const extras = matched.get(row.id)
    if (!extras?.length) return row
    writeFileParts(row.id, row.parts.length, extras)
    return { ...row, parts: [...row.parts, ...userTurnParts("", extras)] }
  })
}

function writeFileParts(messageId: string, startIdx: number, assets: UserFileAsset[]) {
  const now = Date.now()
  insertMessageParts(
    getDatabase(),
    userTurnParts("", assets).map((part, idx) => ({
      id: createId("prt"),
      messageId,
      idx: startIdx + idx,
      type: part.type,
      payload: JSON.stringify(part),
      createdAt: now
    }))
  )
}
