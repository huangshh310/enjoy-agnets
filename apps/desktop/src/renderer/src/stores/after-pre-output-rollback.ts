/**
 * jojo P1 / P2（#136 gate2）：出字前回滚后，图跟字一起回输入框（并落本会话草稿附件），再通知自动标题复原。
 */
import { restoreComposerAssets } from "../hooks/composer-assets"
import type { ThreadAsset, ThreadMessage } from "./chat-store.types"
import { emitPreOutputRolledBack } from "./pre-output-rollback-listeners"
import { noteRestoredImages } from "./restored-images-snapshot"
import { forgetSentUserTurn, takeSentUserTurn } from "./sent-user-turns"
import { rememberDiscardedPreOutputRun } from "./discarded-pre-output-runs"

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
  forgetSentUserTurn(sessionId)
  restoreComposerAssets(items)
  if (!sessionId) return
  emitPreOutputRolledBack({
    sessionId,
    userTurnsLeft: messagesAfter.filter((message) => message.role === "user").length
  })
}

/**
 * leo r5 MUST 2：后台会话出字前回滚（用户已切走）：main 已把字和图写回草稿；这里按发出时记的那一句拍还稿快照，
 * 切回来白卡第二行和「再发一次」都在。没记到（别处发起的一轮）就不拍：卡上不给「再发一次」。
 */
export function noteBackgroundPreOutputRollback(sessionId: string | null | undefined, runId?: string): void {
  // jojo r5 P1：后台回滚同样记作已作废——迟到的 agent.run 回执走 discarded，不当孤儿 run 去还稿（会还进当前会话）。
  rememberDiscardedPreOutputRun(runId)
  const turn = takeSentUserTurn(sessionId)
  if (!turn || !sessionId) return
  noteRestoredImages(sessionId, turn.assets, turn.text)
  // jojo r5 P2：后台回滚同样让首句自动标题复原（main 只复原到开跑快照，renderer 之后写的乐观 / 精炼题要撤）。
  emitPreOutputRolledBack({ sessionId, userTurnsLeft: turn.first ? 0 : 1 })
}
