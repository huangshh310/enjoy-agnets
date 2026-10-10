/**
 * Inbox / 轨徽标拍板数：向 main 拉 decision IS NULL 的活会话未决。
 */
import { useCallback, useEffect, useState } from "react"
import type { PendingApprovalItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"

export function useLivePendingApprovals(): PendingApprovalItem[] {
  const [items, setItems] = useState<PendingApprovalItem[]>([])
  const attentionTick = useAttentionStore((state) =>
    state.items.map((item) => `${item.id}:${item.status}:${item.kind}`).join("|")
  )
  const refresh = useCallback(() => {
    if (!hasIde()) return
    void getIde()
      .inbox.listPendingApprovals()
      .then((result: { items?: PendingApprovalItem[] }) => {
        setItems(Array.isArray(result.items) ? result.items : [])
      })
      .catch(() => undefined)
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh, attentionTick])
  return items
}
