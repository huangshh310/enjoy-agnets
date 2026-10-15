/**
 * jojo P1 / P2（#136 gate2）：出字前回滚后，图跟字一起回输入框（并落本会话草稿附件），再通知自动标题复原。
 */
import { restoreComposerAssets } from "../hooks/composer-assets"
import type { ThreadAsset, ThreadMessage } from "./chat-store.types"
import { emitPreOutputRolledBack } from "./pre-output-rollback-listeners"
import { noteRestoredImages } from "./restored-images-snapshot"

export function afterPreOutputRollback(
  sessionId: string | null,
  assets: readonly ThreadAsset[],
  messagesAfter: readonly ThreadMessage[],
  restoredText = ""
): void {
  const items = assets.map((asset) => ({
    id: asset.assetId,
    name: asset.name,
    mediaType: asset.mediaType,
    ...(asset.url ? { url: asset.url } : {})
  }))
  // leo r4 soft4：白卡第二行按这次还回的图 / 字拍快照，不实时数输入框；
  // jojo P2：同时记下还回的这一句，「再发一次」只重发它。
  noteRestoredImages(sessionId, items, restoredText)
  restoreComposerAssets(items)
  if (!sessionId) return
  emitPreOutputRolledBack({
    sessionId,
    userTurnsLeft: messagesAfter.filter((message) => message.role === "user").length
  })
}
