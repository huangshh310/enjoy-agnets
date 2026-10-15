/**
 * 用户附件落库：只在发送时写 file part（绑定发送的会话 + 消息）。不做读时补挂。
 */
import { getAsset } from "@enjoy-agents/db"
import { resolveMediaType } from "@enjoy-agents/assets"
import type { UIMessagePart } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { persistMessageOutcome, type PersistedMessage } from "./persist-session"
import { linkedAssetIdsFromParts, userTurnParts, type UserFileAsset } from "./user-attachment-parts"
import { shouldSkipDuplicateUserTurn } from "./persist-user-turn-dedupe"
import { clearDraftAssetsInTx, clearSentDraftInTx } from "./session-drafts"

export function persistUserTurn(
  sessionId: string,
  content: string,
  attached: UserFileAsset[],
  messageId?: string,
  opts?: { inTransaction?: boolean; draftText?: string }
): string | undefined {
  return persistUserTurnOutcome(sessionId, content, attached, messageId, opts)?.id
}

/** inserted=false：同 id 已在本会话，只 UPDATE（重新生成 / 编辑重发）；首字前回滚只删 inserted=true 的行。 */
export function persistUserTurnOutcome(
  sessionId: string,
  content: string,
  attached: UserFileAsset[],
  messageId?: string,
  opts?: { inTransaction?: boolean; draftText?: string }
): PersistedMessage | undefined {
  const last = lastUserTurn(sessionId)
  const sentAssetIds = attached.map((a) => a.assetId)
  if (shouldSkipDuplicateUserTurn(last, content, Date.now(), undefined, sentAssetIds)) {
    // 去重跳过也算这句已在库：照样清掉已发出的稿（正文 + 附件，同一事务）。
    clearSentDraftOnDedupe(sessionId, content, sentAssetIds, opts)
    return undefined
  }
  const parts = userTurnParts(content, attached) as UIMessagePart[]
  // 草稿附件由 persistMessage 在同一事务里清（只清本会话）。
  return persistMessageOutcome(sessionId, "user", content, parts.length > 0 ? parts : undefined, messageId, opts)
}

function clearSentDraftOnDedupe(
  sessionId: string,
  content: string,
  sentAssetIds: string[],
  opts?: { inTransaction?: boolean; draftText?: string }
): void {
  const db = getDatabase()
  const nested = opts?.inTransaction === true
  if (!nested) db.exec("BEGIN IMMEDIATE;")
  try {
    clearSentDraftInTx(db, sessionId, content, opts?.draftText)
    clearDraftAssetsInTx(db, sessionId, sentAssetIds)
    if (!nested) db.exec("COMMIT;")
  } catch (err) {
    if (!nested) db.exec("ROLLBACK;")
    throw err
  }
}

function lastUserTurn(
  sessionId: string
): { content: string; createdAt: number; assetIds: string[] } | undefined {
  const db = getDatabase()
  const row = db
    .prepare(
      `SELECT id, content, created_at as createdAt
       FROM messages WHERE session_id = ? AND role = 'user'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(sessionId) as { id: string; content: string; createdAt: number } | undefined
  if (!row) return undefined
  // 去重键带附件（leo MUST 2）：读这条用户句已落的 file part。
  const parts = db
    .prepare("SELECT payload FROM message_parts WHERE message_id = ? AND type = 'file' ORDER BY idx")
    .all(row.id) as Array<{ payload: string }>
  const assetIds = linkedAssetIdsFromParts(parts.map((part) => safeJson(part.payload)))
  return { content: row.content, createdAt: row.createdAt, assetIds }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
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
