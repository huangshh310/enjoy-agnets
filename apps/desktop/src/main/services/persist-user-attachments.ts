/**
 * 用户附件落库：只在发送时写 file part（绑定发送的会话 + 消息）。不做读时补挂。
 */
import { getAsset } from "@enjoy-agents/db"
import { resolveMediaType } from "@enjoy-agents/assets"
import type { UIMessagePart } from "@enjoy-agents/ipc-contract"
import { getDatabase } from "./database"
import { persistMessage } from "./persist-session"
import { userTurnParts, type UserFileAsset } from "./user-attachment-parts"
import { shouldSkipDuplicateUserTurn } from "./persist-user-turn-dedupe"
import { clearDraftAssetsInTx, clearSentDraftInTx } from "./session-drafts"

export function persistUserTurn(
  sessionId: string,
  content: string,
  attached: UserFileAsset[],
  messageId?: string,
  opts?: { inTransaction?: boolean; draftText?: string }
) {
  const last = lastUserTurn(sessionId)
  if (shouldSkipDuplicateUserTurn(last, content, Date.now())) {
    // 去重跳过也算这句已在库：照样清掉已发出的稿（正文 + 附件，同一事务）。
    clearSentDraftOnDedupe(sessionId, content, attached.length > 0, opts)
    return
  }
  const parts = userTurnParts(content, attached) as UIMessagePart[]
  // 草稿附件由 persistMessage 在同一事务里清（只清本会话）。
  persistMessage(sessionId, "user", content, parts.length > 0 ? parts : undefined, messageId, opts)
}

function clearSentDraftOnDedupe(
  sessionId: string,
  content: string,
  hadAssets: boolean,
  opts?: { inTransaction?: boolean; draftText?: string }
): void {
  const db = getDatabase()
  const nested = opts?.inTransaction === true
  if (!nested) db.exec("BEGIN IMMEDIATE;")
  try {
    clearSentDraftInTx(db, sessionId, content, opts?.draftText)
    if (hadAssets) clearDraftAssetsInTx(db, sessionId)
    if (!nested) db.exec("COMMIT;")
  } catch (err) {
    if (!nested) db.exec("ROLLBACK;")
    throw err
  }
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
