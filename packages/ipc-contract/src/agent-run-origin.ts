/**
 * 开跑来源：叶子文件，node:test 可直接 value-import。
 */
import { z } from "zod"

export const AgentRunOrigin = z.enum(["user", "heartbeat", "automation", "catch_up"])
export type AgentRunOrigin = z.infer<typeof AgentRunOrigin>

export function isUserInitiatedRunOrigin(origin: string | undefined): boolean {
  return origin !== "heartbeat" && origin !== "automation" && origin !== "catch_up"
}

export function coerceAgentRunOrigin(value: unknown): AgentRunOrigin | undefined {
  const parsed = AgentRunOrigin.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** 检查点回挂：已写 origin 优先；否则看 automationSource。禁止用 hb_ commandId 猜。 */
export function inferAgentRunOrigin(origin: unknown, automationSource?: unknown): AgentRunOrigin {
  const parsed = coerceAgentRunOrigin(origin)
  if (parsed) return parsed
  if (automationSource && typeof automationSource === "object") {
    const row = automationSource as { automationId?: unknown; isCatchUp?: unknown }
    if (typeof row.automationId === "string") {
      return row.isCatchUp === true ? "catch_up" : "automation"
    }
  }
  return "user"
}
