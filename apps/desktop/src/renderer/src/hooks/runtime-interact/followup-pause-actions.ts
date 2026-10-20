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

export function continueFollowups(sessionId: string | null | undefined): void {
  resumeFollowups(sessionId)
}

export function editFirstFollowup(sessionId: string | null | undefined): FollowupItem | null {
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
