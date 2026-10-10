/**
 * Inbox 待验收：向 main 拉 workflow_status = needs_review 的未归档会话。
 */
import { useCallback, useEffect, useState } from "react"
import type { SessionNeedsReviewItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import { useChatStore } from "@renderer/stores/chat-store"

export function useLiveNeedsReview(): SessionNeedsReviewItem[] {
  const [items, setItems] = useState<SessionNeedsReviewItem[]>([])
  const attentionTick = useAttentionStore((state) =>
    state.items.map((item) => `${item.id}:${item.status}:${item.kind}`).join("|")
  )
  const workflowTick = useChatStore((state) =>
    state.repositories.map((node) => `${node.id}:${node.workflowStatus ?? ""}`).join("|")
  )
  const refresh = useCallback(() => {
    if (!hasIde()) return
    void getIde()
      .inbox.listNeedsReview()
      .then((result: { items?: SessionNeedsReviewItem[] }) => {
        setItems(Array.isArray(result.items) ? result.items : [])
      })
      .catch(() => undefined)
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh, attentionTick, workflowTick])
  return items
}
