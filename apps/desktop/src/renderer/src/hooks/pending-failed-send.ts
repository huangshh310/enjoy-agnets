/**
 * luna P1（#163 巡检 m211）：「失败的那一条还没发出去」按会话显式记一份，排队暂停行据此决定能不能给「继续」。
 *
 * 规则（luna 锁定）：失败的那一条只要还没发出去——还在失败卡上（「再发一次 / 再试一次」），或已经写回输入框——
 * 暂停行就停在「先发这一条」的状态：不给「继续」，不给「改一下再发」；它发出去成功后排队的自己接着发。
 * 关卡片、换模型、改好密钥都不算发出去。
 *
 * - 记：失败那一刻（出字前回滚写回输入框 / 起跑失败还稿 / 发送闸拦住还稿 → where "composer"；
 *   重新生成 / 编辑重发时用户句留在线程里 → where "thread"）。
 * - 发：用户从输入框（或卡上「再发一次 / 再试一次」）发出它时标 inFlight。
 * - 清：① inFlight 的那一发跑完（run.end）；② 那一发出了字后才报错（已经发出去了；出字前失败会立刻重新记上）；
 *   ③ 用户把它从输入框里整条清掉（放弃，见 failedSendAbandoned）。
 * 纯模块：不依赖 store / DOM，测试直接调。
 */

export type PendingFailedSendWhere = "composer" | "thread"

export type PendingFailedSend = {
  sessionId: string
  where: PendingFailedSendWhere
  /** 写回输入框的那一句；不知道原文（后台回滚没记到）为空串。 */
  text: string
  assetIds: readonly string[]
  /** 用户已经把它发出去、这一轮还没结束。 */
  inFlight: boolean
}

let pending: Readonly<Record<string, PendingFailedSend>> = {}
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** 失败那一刻记下（同会话覆盖：再失败一次就是新的「还没发出去」）。 */
export function notePendingFailedSend(
  sessionId: string | null | undefined,
  input: { where: PendingFailedSendWhere; text?: string; assetIds?: readonly string[] }
): void {
  if (!sessionId) return
  pending = {
    ...pending,
    [sessionId]: { sessionId, where: input.where, text: input.text ?? "", assetIds: [...(input.assetIds ?? [])], inFlight: false }
  }
  emit()
}

export function pendingFailedSendFor(sessionId: string | null | undefined): PendingFailedSend | null {
  return sessionId ? (pending[sessionId] ?? null) : null
}

/** 用户把它发出去了（输入框发送 / 卡上再发一次 / 再试一次）。 */
export function markPendingFailedSendInFlight(sessionId: string | null | undefined): void {
  const current = pendingFailedSendFor(sessionId)
  if (!current || current.inFlight) return
  pending = { ...pending, [current.sessionId]: { ...current, inFlight: true } }
  emit()
}

export function clearPendingFailedSend(sessionId: string | null | undefined): void {
  if (!sessionId || !pending[sessionId]) return
  const { [sessionId]: _dropped, ...rest } = pending
  pending = rest
  emit()
}

/**
 * 这一会话有一轮正常跑完：
 * - "cleared"：跑完的就是失败的那一条（inFlight）→ 清掉，排队可以按原规则接着发；
 * - "kept"：跑完的是别的（比如排队行上「马上发给它」）→ 失败那条还没发，排队不能自己接着发；
 * - "none"：本来就没有。
 */
export function settlePendingFailedSendOnRunEnd(sessionId: string | null | undefined): "cleared" | "kept" | "none" {
  const current = pendingFailedSendFor(sessionId)
  if (!current) return "none"
  if (!current.inFlight) return "kept"
  clearPendingFailedSend(sessionId)
  return "cleared"
}

/** run.error：在飞的那一发出了字后才报错 = 已经发出去了，清掉（出字前失败随后的回滚会重新记上）。 */
export function settlePendingFailedSendOnRunError(sessionId: string | null | undefined): void {
  if (pendingFailedSendFor(sessionId)?.inFlight) clearPendingFailedSend(sessionId)
}

const contentLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)

/**
 * 用户是不是已经把失败的那一条从输入框里整条清掉了（放弃它）。定义：
 * - 输入框空了（没字、没有它的附件），或
 * - 写回的那一句被整条删掉：它的每一个非空行（去掉行首行尾空白）都不再原样出现在输入框里，它的附件也一张不剩。
 * 改了几个字但原句的某一行还在 → 仍算没放弃。留在线程里的（where "thread"）和正在发的（inFlight）不会被「清掉」。
 */
export function failedSendAbandoned(
  entry: PendingFailedSend,
  composer: { text: string; assetIds: readonly string[] }
): boolean {
  if (entry.where === "thread" || entry.inFlight) return false
  const have = new Set(composer.assetIds)
  const assetsLeft = entry.assetIds.some((id) => have.has(id))
  if (!composer.text.trim() && !assetsLeft) return true
  const lines = contentLines(entry.text)
  if (lines.length === 0) return false
  const textLeft = lines.some((line) => composer.text.includes(line))
  return !textLeft && !assetsLeft
}

/**
 * 暂停行该说哪种「先发这一条」：
 * - "card"：失败卡上的「再发一次 / 再试一次」露着，或用户句留在线程里 →「先发上面这条」；
 * - "composer"：卡关了 / 卡上没有重发按钮（密钥没通过），稿在输入框里 →「先发输入框里这条」；
 * - null：没有还没发出去的失败消息（或用户已经放弃它）→ 可以给「继续」。
 */
export function pendingFailedSendPlace(
  entry: PendingFailedSend | null,
  input: { composerText: string; composerAssetIds: readonly string[]; failureCardRetryShowing: boolean }
): "card" | "composer" | null {
  if (!entry) return input.failureCardRetryShowing ? "card" : null
  if (failedSendAbandoned(entry, { text: input.composerText, assetIds: input.composerAssetIds })) return null
  if (input.failureCardRetryShowing || entry.where === "thread") return "card"
  return "composer"
}

export function getPendingFailedSends(): Readonly<Record<string, PendingFailedSend>> {
  return pending
}

export function subscribePendingFailedSend(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 测试用。 */
export function resetPendingFailedSendForTest(): void {
  pending = {}
  emit()
}
