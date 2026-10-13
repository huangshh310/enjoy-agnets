/**
 * Attention 耐久层：error/complete 条目写穿到 SQLite。
 * 实况槽位仍在内存；这里只保证重启后 Inbox 档案还能看到历史。
 * 状态变化（如成功后出错 → resolved）也重写一次，重启后收件箱不再把已好的会话列成失败（luna #151）。
 */
import { getIde, hasIde } from "@renderer/lib/ide"
import { useAttentionStore } from "./attention-store"
import type { AttentionItem } from "./attention.types"
import { archivedErrorSeeds } from "./archived-error-seeds"

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
        !persistedKeys.has(`${item.id}:${item.occurredAt}:${item.status}`)
    )
    if (fresh.length === 0) return
    for (const item of fresh) {
      if (persistedKeys.size > 1000) persistedKeys.clear()
      persistedKeys.add(`${item.id}:${item.occurredAt}:${item.status}`)
    }
    void getIde()
      .inbox.putStates({ entries: fresh.map((item) => ({ id: item.id, item: toArchived(item) })) })
      .catch(() => undefined)
  }
  writeThrough(useAttentionStore.getState().items)
  void seedArchivedErrors()
  return useAttentionStore.subscribe((state) => writeThrough(state.items))
}

/**
 * 重启后 parks / 槽表是空的，但红卡会从库（#150 lastError）还原：侧栏红点 / 待处理条 / 收件箱也得认同一批失败。
 * 从档案把还没好的出错（active / focused，且之后没有成功）回填进槽表；关过（dismissed）的不回填（luna #150 P2）。
 */
export async function seedArchivedErrors(): Promise<void> {
  let entries: Array<{ hiddenAt?: number | null; item?: unknown }>
  try {
    entries = (await getIde().inbox.listStates()).entries
  } catch {
    return
  }
  const seeds = archivedErrorSeeds(entries)
  if (seeds.length === 0) return
  useAttentionStore.setState((state) => {
    const have = new Set(state.items.map((item) => item.id))
    const fresh = seeds.filter((item) => !have.has(item.id))
    if (fresh.length === 0) return state
    for (const item of fresh) persistedKeys.add(`${item.id}:${item.occurredAt}:${item.status}`)
    return { items: [...state.items, ...fresh] }
  })
}
