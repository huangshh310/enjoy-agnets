/**
 * E1 暂停说明行上的三个按钮：全部清空 · 改一下再发 · 继续。
 * - 继续：解除暂停，自启从第一条按顺序发。
 * - 改一下再发：第一条（字 + 图 + Chip）放进输入框，队列保持暂停（复用「退回输入框」）；输入框里已有东西就不动（返回 null）。
 * - 全部清空：不弹确认；排队图片的标记一起释放；5 秒内可撤回——撤回时排队项按原顺序回来，图片重新打上排队标记，仍是暂停。
 */
import { markDraftAssetsQueued, releaseQueuedDraftAssets } from "../../lib/session-draft-storage"
import {
  followupPausedReason,
  listFollowups,
  restoreFollowups,
  resumeFollowups,
  takeAllFollowups,
  type FollowupItem,
  type FollowupPausedReason
} from "../followup-queue"
import { returnFollowupToComposer } from "./followup-actions"
import { listComposerAssets } from "../composer-assets"
import { useChatStore } from "../../stores/chat-store"
import { readComposerForMerge } from "../../stores/composer-io"
import { clearPendingFailedSend, failedSendAbandoned, pendingFailedSendFor } from "../pending-failed-send"
import { markQueueResumedByUser } from "../../components/ai-chat/thread/scroll-on-send.ts"

/**
 * luna P1（m211）：失败的那一条还没发出去（卡上 / 输入框里）时，「继续」「改一下再发」都不该有——按钮本就隐藏，
 * 这里再兜一次（fail closed）。用户已经把它从输入框整条清掉 = 放弃，顺手清掉记录，返回 false。
 */
export function failedSendStillPending(sessionId: string | null | undefined): boolean {
  const entry = pendingFailedSendFor(sessionId)
  if (!entry) return false
  const store = useChatStore.getState()
  if (store.sessionId !== entry.sessionId) return true
  const composer = { text: readComposerForMerge(store.composer), assetIds: listComposerAssets().map((a) => a.id) }
  if (!failedSendAbandoned(entry, composer)) return true
  clearPendingFailedSend(sessionId)
  return false
}

export function continueFollowups(sessionId: string | null | undefined): void {
  if (failedSendStillPending(sessionId)) return
  // 没停着（双击「继续」的第二下、按钮还没收起时又点）：resume 本来就是空操作，也不打贴底记号——
  // 否则这个记号留到 10 秒内下一条排队自启，把不是用户刚点的那一发也拽到底（leo #170 N2）。
  if (!followupPausedReason(sessionId)) return
  // 「继续」是用户点的：接着发出的第一条要贴底（先记再解除——解除会同步 kick 自启）（luna #170 r-luna ②）。
  // 记在 #169 的「失败那条还没发」闸之后：被拦下的「继续」什么都没解除，不能留一个 10 秒内的一次性贴底标记。
  markQueueResumedByUser(sessionId)
  resumeFollowups(sessionId)
}

export function editFirstFollowup(sessionId: string | null | undefined): FollowupItem | null {
  if (failedSendStillPending(sessionId)) return null
  const first = sessionId ? listFollowups(sessionId)[0] : undefined
  if (!first) return null
  // leo BLOCK #163 ④：输入框（以 DOM 为准）已有东西就不动，这条留在队里、仍暂停。
  if (!returnFollowupToComposer(first, "refuse")) return null
  return first
}

export type ClearedFollowups = {
  sessionId: string
  items: FollowupItem[]
  reason: FollowupPausedReason | null
}

export function clearAllFollowups(sessionId: string | null | undefined): ClearedFollowups | null {
  if (!sessionId) return null
  const reason = followupPausedReason(sessionId)
  const taken = takeAllFollowups(sessionId)
  if (taken.length === 0) return null
  for (const item of taken) {
    if (item.assets.length) releaseQueuedDraftAssets(item.sessionId, item.id)
  }
  return { sessionId, items: taken, reason }
}

export function undoClearFollowups(cleared: ClearedFollowups): void {
  // 放回和停住在同一次 notify 里：自启不能抢着发。
  restoreFollowups(cleared.items, cleared.reason ?? "stopped")
  for (const item of cleared.items) {
    if (item.assets.length) markDraftAssetsQueued(item.sessionId, item.id, item.draft || item.prompt, item.assets)
  }
}
