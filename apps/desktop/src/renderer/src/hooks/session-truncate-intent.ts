/**
 * regenerate / edit / rewind：算出保留点之后 renderer 看见的尾巴。
 */
export function tailIdsAfterKeep(
  messages: ReadonlyArray<{ id: string }>,
  keepId: string
): string[] {
  const index = messages.findIndex((message) => message.id === keepId)
  if (index < 0) return []
  return messages.slice(index + 1).map((message) => message.id)
}

export function tailIdsFromInclusive(
  messages: ReadonlyArray<{ id: string }>,
  fromId: string
): string[] {
  const index = messages.findIndex((message) => message.id === fromId)
  if (index < 0) return []
  return messages.slice(index).map((message) => message.id)
}

export type TailRow = { id: string; role: string; content?: string }

/**
 * jojo P1：活视图里助手气泡的 id 是 renderer 占位（`msg_pending_*`），库里是 main 另起的 `msg_*`，
 * 直接拿视图 id 当 expectedTailIds 永远对不上 → 误报 STALE / 有新内容。
 *
 * 这里把「视图尾巴」对到「库尾巴」，返回库 id 名单；对不上返回 null（调用方刷新 + 提示，不删任何东西）。
 * 规则（fail closed，MF-A 不放松）：
 * - 锚点（用户句）必须同 id 同时出现在视图与库里；
 * - 同 id：直接配对；
 * - 视图里的占位助手（id 不在库里）只能配一条**库里有、视图里没有**的助手行（一对一，不吞多行）；
 *   后面紧跟的不是助手行：说明这个气泡没落库（空轮），跳过，它不会让库里多删任何东西；
 * - 库里相邻重复的用户句（视图 dedupe 过）跟着前一条用户句走；
 * - 库尾里任何没被配上的行（心跳 hb_u / hb_a、后台多出的助手行）→ null。
 */
export function reconcileTailWithDb(input: {
  view: ReadonlyArray<TailRow>
  db: ReadonlyArray<TailRow>
  anchorId: string
  mode: "after" | "from"
}): string[] | null {
  const viewIndex = input.view.findIndex((row) => row.id === input.anchorId)
  const dbIndex = input.db.findIndex((row) => row.id === input.anchorId)
  if (viewIndex < 0 || dbIndex < 0) return null
  const offset = input.mode === "after" ? 1 : 0
  const viewTail = input.view.slice(viewIndex + offset)
  const dbTail = input.db.slice(dbIndex + offset)
  const dbIds = new Set(input.db.map((row) => row.id))
  const viewIds = new Set(input.view.map((row) => row.id))
  let cursor = 0
  const skipDedupedUsers = () => {
    while (cursor < dbTail.length) {
      const row = dbTail[cursor]!
      const prev = cursor > 0 ? dbTail[cursor - 1] : input.db[dbIndex + offset - 1]
      const deduped =
        row.role === "user" &&
        !viewIds.has(row.id) &&
        prev?.role === "user" &&
        prev.content != null &&
        prev.content === row.content
      if (!deduped) return
      cursor += 1
    }
  }
  for (const message of viewTail) {
    skipDedupedUsers()
    const row = dbTail[cursor]
    if (row && row.id === message.id) {
      cursor += 1
      continue
    }
    const placeholder = message.role === "assistant" && !dbIds.has(message.id)
    if (!placeholder) return null
    if (row && row.role === "assistant" && !viewIds.has(row.id)) {
      cursor += 1
      continue
    }
    // 没落库的空气泡：跳过。
  }
  skipDedupedUsers()
  if (cursor !== dbTail.length) return null
  return dbTail.map((row) => row.id)
}
