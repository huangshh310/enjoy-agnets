/**
 * 左栏收件箱徽标用：Attention 实况 + SQLite 档案里的出错（重启后 parks 空，失败只在档案里，luna #151）。
 * 实况同 id 优先；档案里错后有成功的当已好。实况变化时重读一次档案（成功后档案被重写为 resolved）。
 */
import { useEffect, useMemo, useState } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "@renderer/stores/attention/attention-store"
import type { AttentionItem } from "@renderer/stores/attention/attention.types"
import { settleSupersededErrors } from "./lib/filter-inbox"

type Row = Pick<AttentionItem, "id" | "sessionId" | "kind" | "status" | "occurredAt">

export function useLiveAndArchivedAttention(): Row[] {
  const live = useAttentionStore((state) => state.items)
  const [archived, setArchived] = useState<Row[]>([])
  useEffect(() => {
    if (!hasIde()) return
    let alive = true
    // 等写穿落盘后再读，避免读到旧状态。
    const timer = setTimeout(() => {
      void getIde()
        .inbox.listStates()
        .then((result) => {
          if (!alive) return
          const rows: Row[] = []
          for (const entry of result.entries) {
            const item = entry.item
            if (!item || entry.hiddenAt != null) continue
            if (item.kind !== "error" && item.kind !== "complete") continue
            rows.push({
              id: item.id,
              sessionId: item.sessionId,
              kind: item.kind,
              status: (item as { status?: AttentionItem["status"] }).status ?? "resolved",
              occurredAt: (item as { occurredAt?: number }).occurredAt ?? 0
            })
          }
          setArchived(rows)
        })
        .catch(() => undefined)
    }, 300)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [live])
  return useMemo(() => {
    const liveIds = new Set(live.map((item) => item.id))
    return settleSupersededErrors<Row>([...live, ...archived.filter((item) => !liveIds.has(item.id))])
  }, [live, archived])
}
