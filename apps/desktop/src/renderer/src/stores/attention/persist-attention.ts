/**
 * Attention 耐久层：error/complete 条目写穿到 SQLite。
 * 实况槽位仍在内存；这里只保证重启后 Inbox 档案还能看到历史。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "./attention-store"
import type { AttentionItem } from "./attention.types"

const persistedKeys = new Set<string>()

function toArchived(item: AttentionItem) {
  return {
    id: item.id,
    sessionId: item.sessionId,
    kind: item.kind,
    status: item.status,
    runId: item.runId,
    occurredAt: item.occurredAt,
    summary: item.summary,
    sessionTitle: item.sessionTitle,
    workspaceId: item.workspaceId,
    errorMessage: item.errorMessage
  }
}

/** RootLayout 挂载时调用一次；返回退订函数。 */
export function startAttentionPersistence(): () => void {
  if (!hasIde()) return () => undefined
  const writeThrough = (items: AttentionItem[]) => {
    const fresh = items.filter(
      (item) =>
        (item.kind === "error" || item.kind === "complete") &&
        !persistedKeys.has(`${item.id}:${item.occurredAt}`)
    )
    if (fresh.length === 0) return
    for (const item of fresh) {
      if (persistedKeys.size > 1000) persistedKeys.clear()
      persistedKeys.add(`${item.id}:${item.occurredAt}`)
    }
    void getIde()
      .inbox.putStates({ entries: fresh.map((item) => ({ id: item.id, item: toArchived(item) })) })
      .catch(() => undefined)
  }
  writeThrough(useAttentionStore.getState().items)
  return useAttentionStore.subscribe((state) => writeThrough(state.items))
}
