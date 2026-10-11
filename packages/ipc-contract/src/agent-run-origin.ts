/**
 * 开跑来源：叶子文件，node:test 可直接 value-import。
 */
import { z } from "zod"

export const AgentRunOrigin = z.enum(["user", "heartbeat", "automation", "catch_up"])
export type AgentRunOrigin = z.infer<typeof AgentRunOrigin>

/** 只认显式 user。缺省 / 未知一律当无人值守，禁止默认成用户开跑。 */
export function isUserInitiatedRunOrigin(origin: string | undefined): boolean {
  return origin === "user"
}

export function coerceAgentRunOrigin(value: unknown): AgentRunOrigin | undefined {
  const parsed = AgentRunOrigin.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** 检查点回挂：已写 origin 优先；否则看 automationSource。禁止用 hb_ 猜，也禁止默认成 user。 */
export function inferAgentRunOrigin(
  origin: unknown,
  automationSource?: unknown
): AgentRunOrigin | undefined {
  const parsed = coerceAgentRunOrigin(origin)
  if (parsed) return parsed
  if (automationSource && typeof automationSource === "object") {
    const row = automationSource as { automationId?: unknown; isCatchUp?: unknown }
    if (typeof row.automationId === "string") {
      return row.isCatchUp === true ? "catch_up" : "automation"
    }
  }
  return undefined
}
