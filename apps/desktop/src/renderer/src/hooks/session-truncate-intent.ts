import { parseAssistantPayload } from "@enjoy-agents/ipc-contract/assistant-payload"
/**
 * regenerate / edit / rewind：算出保留点之后 renderer 看见的尾巴（只用**权威**落库 id）。
 *
 * leo #147 MF-1：不按位置 / 内容猜。活视图助手气泡是占位 id（`msg_pending_*` / `msg_${runId}`），
 * 权威 id 只有三种来源：① main 落库后发 `message.persisted` 回报真 id，绑在 `persistedId` 上
 * （只绑占位气泡，见 bindPersistedMessage）；② 回灌来的行本身就是库 id；③ 开截前读库，按
 * `bindPlaceholdersByRunId` **严格**按信封 runId 绑（同 runId 恰好一条助手行且未被占用才绑）。
 * 三者都没有的占位（出错 / 中断 / 空轮没落库，或切走漏了回报）当**不存在**于视图：不进名单。库里若真有对应行（或任何后台行），main 尾巴比对不上 → STALE → 刷新后原名单仍不同
 * → 「有新内容」，什么都不删。用户句 id 是 renderer 生成并原样落库的，本来就权威。
 */
export type TailMessage = { id: string; runId?: string; persistedId?: string }

export function isPlaceholderMessage(message: TailMessage): boolean {
  if (message.persistedId) return false
  if (message.id.startsWith("msg_pending_")) return true
  if (!message.runId) return false
  return message.id === `msg_${message.runId}` || message.id === `msg_user_${message.runId}`
}

/** 截断名单里用的 id：权威落库 id；占位返回 null（当不存在）。 */
export function persistedIdOf(message: TailMessage): string | null {
  if (message.persistedId) return message.persistedId
  return isPlaceholderMessage(message) ? null : message.id
}

function persistedIds(messages: ReadonlyArray<TailMessage>): string[] {
  return messages.map(persistedIdOf).filter((id): id is string => id != null)
}

export function tailIdsAfterKeep(messages: ReadonlyArray<TailMessage>, keepId: string): string[] {
  const index = messages.findIndex((message) => message.id === keepId)
  if (index < 0) return []
  return persistedIds(messages.slice(index + 1))
}

export function tailIdsFromInclusive(messages: ReadonlyArray<TailMessage>, fromId: string): string[] {
  const index = messages.findIndex((message) => message.id === fromId)
  if (index < 0) return []
  return persistedIds(messages.slice(index))
}

export type DbTailRow = { id: string; role: string; content: string }

/** 助手行信封里的 runId（旧行 / 纯文本没有 → undefined，永远绑不上）。 */
export function runIdOfAssistantContent(content: string): string | undefined {
  try {
    return parseAssistantPayload(content).runId ?? undefined
  } catch {
    return undefined
  }
}

/**
 * leo #147 MF-1（host 定的主方案）：占位气泡**只**能绑库里 `parseAssistantPayload(content).runId === bubble.runId`
 * 的那一条助手行（恰好一条、且没被视图别的消息占用）。绑不上 → 气泡当不在视图里（不进名单）。
 * 不按位置猜、不吞「视图里没有的助手行」、不跳过重复用户句；库里任何没被解释的行留给 main 精确比对
 * → STALE → 刷新后原名单仍不同 → 「有新内容」，什么都不删。心跳 / 自动化行的 runId 不会等于前台气泡的 runId。
 * main `message.persisted` 已绑的 persistedId 优先（它本身就是权威 id）。
 */
export function bindPlaceholdersByRunId<T extends TailMessage>(
  view: ReadonlyArray<T>,
  db: ReadonlyArray<DbTailRow>,
  runIdOf: (content: string) => string | undefined
): T[] {
  const byRun = new Map<string, string[]>()
  for (const row of db) {
    if (row.role !== "assistant") continue
    const runId = runIdOf(row.content)
    if (!runId) continue
    byRun.set(runId, [...(byRun.get(runId) ?? []), row.id])
  }
  const used = new Set<string>()
  for (const message of view) {
    const id = persistedIdOf(message)
    if (id) used.add(id)
  }
  return view.map((message) => {
    if (!isPlaceholderMessage(message) || !message.runId) return message
    const ids = byRun.get(message.runId) ?? []
    if (ids.length !== 1 || used.has(ids[0]!)) return message
    used.add(ids[0]!)
    return { ...message, persistedId: ids[0]! }
  })
}
