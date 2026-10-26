/**
 * 这个会话的排队此刻是不是停着（E1 暂停：停止 / 出错 / 额度 / 换助手）。随排队模块的 notify 刷新。
 */
import { useEffect, useState } from "react"
import { followupPausedReason, subscribeFollowups } from "./followup-queue"

export function useQueuePaused(sessionId: string | null | undefined): boolean {
  const [paused, setPaused] = useState(() => followupPausedReason(sessionId) != null)
  useEffect(() => {
    const sync = () => setPaused(followupPausedReason(sessionId) != null)
    sync()
    return subscribeFollowups(sync)
  }, [sessionId])
  return paused
}
