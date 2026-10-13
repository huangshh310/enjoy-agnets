/**
 * session.dismissError 的处理体（纯函数，便于测）：入参校验 → e2e 失败桩（仅 isE2eStub）→ 主进程结果原样返回。
 */
import { z } from "zod"

const SessionErrorInput = z.object({ sessionId: z.string().min(1), runId: z.string().min(1).optional() })

export function handleDismissError(
  raw: unknown,
  deps: {
    dismiss: (sessionId: string, runId?: string) => boolean
    isE2eStub: () => boolean
    env?: Record<string, string | undefined>
  }
): boolean {
  const input = SessionErrorInput.safeParse(raw)
  if (!input.success) return false
  // e2e：ENJOY_E2E_DISMISS_ERROR=fail 时关卡落库恒失败，用来验渲染层重试一次 + toast；打包版 / 非桩模式不起作用。
  if (deps.isE2eStub() && (deps.env ?? process.env).ENJOY_E2E_DISMISS_ERROR === "fail") return false
  return deps.dismiss(input.data.sessionId, input.data.runId)
}
