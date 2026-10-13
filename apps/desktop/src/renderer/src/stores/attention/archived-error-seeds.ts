/**
 * 档案 → 槽表回填：只要还没好的出错（active / focused，之后同会话没有成功跑完，没被隐藏）。
 */
import type { AttentionItem } from "./attention.types.ts"

type Entry = { hiddenAt?: number | null; item?: unknown }
type Archived = Partial<AttentionItem> & { id: string; sessionId: string; kind: AttentionItem["kind"] }

export function archivedErrorSeeds(entries: readonly Entry[]): AttentionItem[] {
  const items: Archived[] = []
  for (const entry of entries) {
    const item = entry.item as Archived | null | undefined
    if (!item || entry.hiddenAt != null) continue
    if (item.kind === "error" || item.kind === "complete") items.push(item)
  }
  const lastOk = new Map<string, number>()
  for (const item of items) {
    if (item.kind !== "complete") continue
    lastOk.set(item.sessionId, Math.max(lastOk.get(item.sessionId) ?? -Infinity, item.occurredAt ?? 0))
  }
  return items
    .filter((item) => item.kind === "error" && (item.status === "active" || item.status === "focused"))
    .filter((item) => !((lastOk.get(item.sessionId) ?? -Infinity) > (item.occurredAt ?? 0)))
    .map((item) => ({
      runId: "",
      summary: "",
      sessionTitle: "",
      occurredAt: 0,
      ...item,
      status: "active"
    }) as AttentionItem)
}
