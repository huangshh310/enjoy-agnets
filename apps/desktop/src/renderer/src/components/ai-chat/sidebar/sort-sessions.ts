/**
 * 会话排序器：flagged 旗标永久置顶；次级依优先级 (waiting_review > running > updatedAt) 或最近更新。
 */
import type { RepositoryNode } from "@renderer/stores/chat-store.types"

export type SessionSortOptions = {
  sortOrder: "priority" | "updated" | "manual"
  getActivity?: (sessionId: string) => { running: boolean; waitingReview: boolean }
}

export function sortSessions(
  sessions: RepositoryNode[],
  options: SessionSortOptions
): RepositoryNode[] {
  const { sortOrder, getActivity } = options
  return [...sessions].sort((a, b) => {
    // 1. 旗标永久置顶
    const aFlag = a.flagged ? 1 : 0
    const bFlag = b.flagged ? 1 : 0
    if (aFlag !== bFlag) return bFlag - aFlag

    // 2. 优先级排序（仅在 priority 模式且提供 getActivity 时计算运行时优先级）
    if (sortOrder === "priority" && getActivity) {
      const aAct = getActivity(a.id)
      const bAct = getActivity(b.id)

      const aWaiting = aAct.waitingReview ? 1 : 0
      const bWaiting = bAct.waitingReview ? 1 : 0
      if (aWaiting !== bWaiting) return bWaiting - aWaiting

      const aRunning = aAct.running ? 1 : 0
      const bRunning = bAct.running ? 1 : 0
      if (aRunning !== bRunning) return bRunning - aRunning
    }

    // 3. 兜底与 updated 模式均按 updatedAt 倒序
    return b.updatedAt - a.updatedAt
  })
}
