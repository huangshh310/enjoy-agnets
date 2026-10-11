/**
 * 开跑 / 回挂共用：会话覆盖 > 入参 > 偏好 > Enjoy Local。不拉 ACP 客户端。
 */
import { z } from "zod"
import { getSetting } from "./database"
import type { AppPreferences } from "./preferences"

export function resolveRuntimeId(
  input: { runtimeId?: string; sessionId: string },
  prefs: Pick<AppPreferences, "runtimeId">
): string {
  return (
    readSessionRuntime(input.sessionId) ||
    input.runtimeId ||
    prefs.runtimeId ||
    "enjoy-local"
  )
}

function readSessionRuntime(sessionId: string): string | undefined {
  const raw = getSetting("session.runtimes")
  if (!raw) return undefined
  try {
    const parsed = z.record(z.string(), z.string()).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data[sessionId] : undefined
  } catch {
    return undefined
  }
}
