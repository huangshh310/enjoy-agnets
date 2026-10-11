/**
 * jojo P1：「有新内容」提示卡上的「重新生成」必须重跑**最初点的那一轮**，不能回落「最后一轮」。
 * regenerate / edit 起跑前记下目标（用户句 id 稳定；助手 id 刷新后会从占位换成库 id），起跑成功清掉。
 */
export type RetryTarget =
  | { kind: "regenerate"; sessionId: string; userId: string }
  | { kind: "edit"; sessionId: string; userId: string; content: string }

export type ResolvedRetryTarget =
  | { kind: "regenerate"; assistantId: string }
  | { kind: "edit"; userId: string; content: string }

let current: RetryTarget | null = null

export function rememberRetryTarget(target: RetryTarget): void {
  current = target
}

export function clearRetryTarget(): void {
  current = null
}

export function peekRetryTarget(): RetryTarget | null {
  return current
}

/** 按当前视图解析记住的目标；会话变了或那句用户话已不在：null（调用方走原来的兜底）。 */
export function resolveRetryTarget(
  sessionId: string | null,
  messages: ReadonlyArray<{ id: string; role: string }>,
  target: RetryTarget | null = current
): ResolvedRetryTarget | null {
  if (!target || !sessionId || target.sessionId !== sessionId) return null
  const userIndex = messages.findIndex((message) => message.id === target.userId)
  if (userIndex < 0) return null
  if (target.kind === "edit") return { kind: "edit", userId: target.userId, content: target.content }
  for (let index = userIndex + 1; index < messages.length; index += 1) {
    const message = messages[index]!
    if (message.role === "user") break
    if (message.role === "assistant") return { kind: "regenerate", assistantId: message.id }
  }
  return null
}

/** 这条助手回复后面还有几轮（按用户句计）。>0 时重新生成要先确认。 */
export function laterTurnCount(
  messages: ReadonlyArray<{ id: string; role: string }>,
  assistantId: string
): number {
  const index = messages.findIndex((message) => message.id === assistantId)
  if (index < 0) return 0
  return messages.slice(index + 1).filter((message) => message.role === "user").length
}
