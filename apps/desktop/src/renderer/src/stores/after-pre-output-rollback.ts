/**
 * jojo P1 / P2（#136 gate2）：出字前回滚后，图跟字一起回输入框（并落本会话草稿附件），再通知自动标题复原。
 */
import { restoreComposerAssets } from "../hooks/composer-assets"
import type { ThreadAsset, ThreadMessage } from "./chat-store.types"
import { emitPreOutputRolledBack } from "./pre-output-rollback-listeners"

export function afterPreOutputRollback(
  sessionId: string | null,
  assets: readonly ThreadAsset[],
  messagesAfter: readonly ThreadMessage[]
): void {
  restoreComposerAssets(
    assets.map((asset) => ({
      id: asset.assetId,
      name: asset.name,
      mediaType: asset.mediaType,
      ...(asset.url ? { url: asset.url } : {})
    }))
  )
  if (!sessionId) return
  emitPreOutputRolledBack({
    sessionId,
    userTurnsLeft: messagesAfter.filter((message) => message.role === "user").length
  })
}
