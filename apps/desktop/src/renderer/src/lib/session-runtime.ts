/**
 * 会话绑定的 Agent runtime：有覆盖用覆盖，否则用偏好。
 * 不引用 ipc-contract，方便 node:test 直接跑。
 */
export const DEFAULT_RUNTIME_ID = "enjoy-local"

export function pickSessionRuntime(
  sessionId: string | null,
  sessionRuntimes: Record<string, string> | undefined,
  preferred?: string
): string {
  if (sessionId) {
    const bound = sessionRuntimes?.[sessionId]
    if (bound) return bound
  }
  if (preferred) return preferred
  return DEFAULT_RUNTIME_ID
}
