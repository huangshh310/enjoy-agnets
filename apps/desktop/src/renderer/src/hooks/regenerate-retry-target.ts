/**
 * jojo P1 / leo #147 MF-2：「有新内容」等截断闸红卡上的「重新生成」重跑**最初点的那一轮**。
 * 目标绑在那条错误上（`store.errorRetry`，`setError(text, target)`），不是模块级全局：
 * 换了错误（429 等）、新发送、切会话都会盖掉，旧目标不会被后来的红卡捡到。
 * 记用户句 id（稳定）；助手 id 刷新后会从占位换成库 id，按位置重新解析。
 */
export type RetryTarget =
  | { kind: "regenerate"; sessionId: string; userId: string }
  | { kind: "edit"; sessionId: string; userId: string; content: string }

export type ResolvedRetryTarget =
  | { kind: "regenerate"; assistantId: string }
  | { kind: "edit"; userId: string; content: string }

/** 只有当前错误就是挂目标的那一句才认。 */
export function retryTargetForError(
  error: string | null,
  errorRetry: { error: string; target: RetryTarget } | null
): RetryTarget | null {
  if (!error || !errorRetry || errorRetry.error !== error) return null
  return errorRetry.target
}

/** 按当前视图解析目标；会话变了或那句用户话已不在：null（调用方走原来的兜底）。 */
export function resolveRetryTarget(
  sessionId: string | null,
  messages: ReadonlyArray<{ id: string; role: string }>,
  target: RetryTarget | null
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
